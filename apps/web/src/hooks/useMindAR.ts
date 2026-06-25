import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { loadMindARThree, type MindARThreeInstance } from "../lib/mindarLoader";

// Expose THREE globally for CDN MindAR script to resolve UMD dependency
(window as any).THREE = THREE;

export type ARStatus =
  | "idle"
  | "loading"
  | "ready"
  | "tracking"
  | "error";

interface ARTarget {
  mindUrl: string;
  videoUrl: string;
}

interface UseMindAROptions {
  /** Single target (legacy) */
  mindUrl?: string;
  videoUrl?: string;
  /** Multiple targets */
  targets?: ARTarget[];
  onTrackingStart?: () => void;
  onTrackingLost?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────

/** Mobile-friendly pixel-ratio cap (high DPR murders perf on budget phones) */
function getDevicePixelRatio(): number {
  const dpr = window.devicePixelRatio || 1;
  // Cap at 2 on mobile to save GPU — most users can't tell above 2x anyway
  return Math.min(dpr, 2);
}

/** Attempt to keep screen awake while AR is active */
async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    if ("wakeLock" in navigator) {
      return await navigator.wakeLock.request("screen");
    }
  } catch {
    // Wake Lock request failed — usually means low battery or unsupported
  }
  return null;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useMindAR({
  mindUrl,
  videoUrl,
  targets,
  onTrackingStart,
  onTrackingLost,
}: UseMindAROptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ARStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const mindarRef = useRef<MindARThreeInstance | null>(null);
  const videoElsRef = useRef<HTMLVideoElement[]>([]);
  const isTrackingRef = useRef(false);
  const rafRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Resolve final targets: prefer multi-target array, fallback to legacy single target
  const resolvedTargets = targets && targets.length > 0
    ? targets
    : mindUrl && videoUrl
      ? [{ mindUrl, videoUrl }]
      : [];

  // Stable serialized key for the targets array
  const targetsKey = JSON.stringify(resolvedTargets.map((t) => `${t.mindUrl}|${t.videoUrl}`));

  const cleanup = useCallback(() => {
    // Cancel render loop
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    // Release wake lock
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }

    // Stop & dispose videos
    for (const video of videoElsRef.current) {
      video.pause();
      video.removeAttribute("src");
      video.load(); // Reset the video element fully
    }
    videoElsRef.current = [];

    // Stop MindAR
    if (mindarRef.current) {
      mindarRef.current.stop();
      mindarRef.current = null;
    }

    // Clean DOM
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    isTrackingRef.current = false;
  }, []);

  useEffect(() => {
    if (!containerRef.current || resolvedTargets.length === 0) return;

    let cancelled = false;
    let resizeListener: (() => void) | null = null;
    let visibilityHandler: (() => void) | null = null;

    async function init() {
      setStatus("loading");
      setError(null);

      try {
        // Request wake lock to prevent screen sleep
        wakeLockRef.current = await requestWakeLock();

        // ── Pre-load all videos ──────────────────────────────────
        const videos: HTMLVideoElement[] = [];
        for (const target of resolvedTargets) {
          const video = document.createElement("video");
          video.src = target.videoUrl;
          video.crossOrigin = "anonymous";
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute("playsinline", "");
          video.setAttribute("webkit-playsinline", "");
          // Use 'metadata' first to reduce initial bandwidth, then switch to 'auto' later
          video.preload = "auto";
          // Prevents iOS from going fullscreen when video plays
          video.setAttribute("x-webkit-airplay", "deny");

          await new Promise<void>((resolve) => {
            let resolved = false;
            const handleLoaded = () => {
              if (!resolved) {
                resolved = true;
                resolve();
              }
            };
            video.onloadedmetadata = handleLoaded;
            video.oncanplay = handleLoaded;
            video.oncanplaythrough = handleLoaded;
            video.onerror = () => {
              console.warn("Video preloading warning — proceeding anyway");
              handleLoaded();
            };
            // Mobile networks may be slow — give more time but don't block forever
            setTimeout(handleLoaded, 6000);
            video.load();
          });

          if (cancelled) return;
          videos.push(video);
        }

        videoElsRef.current = videos;

        if (cancelled) return;

        // ── Initialize MindAR ────────────────────────────────────
        const MindARThree = await loadMindARThree();

        const mindUrls = resolvedTargets.map((t) => t.mindUrl);

        const mindarThree = new MindARThree({
          container: containerRef.current!,
          imageTargetSrc: mindUrls.length === 1 ? mindUrls[0] : mindUrls.join(","),
          maxTrack: Math.min(resolvedTargets.length, 4),
          // Tuned for mobile: slightly more tolerant to reduce jitter
          filterMinCF: 0.0001,
          filterBeta: 1000,
          warmupTolerance: 5,
          missTolerance: 8, // Bumped: prevents flicker on unsteady hands
        });

        mindarRef.current = mindarThree;

        const { renderer, scene, camera } = mindarThree;

        // ── Create video planes for each target ──────────────────
        const textures: THREE.VideoTexture[] = [];

        for (let i = 0; i < resolvedTargets.length; i++) {
          const anchor = mindarThree.addAnchor(i);
          const video = videos[i];

          const texture = new THREE.VideoTexture(video);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          // Don't generate mipmaps for video — saves GPU memory
          texture.generateMipmaps = false;
          textures.push(texture);

          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
          });

          const plane = new THREE.Mesh(geometry, material);
          plane.position.z = 0.01;

          // Set aspect ratio now if available, otherwise update when ready
          const updateAspect = () => {
            if (video.videoWidth && video.videoHeight) {
              const aspect = video.videoWidth / video.videoHeight;
              plane.scale.set(aspect, 1, 1);
            }
          };
          updateAspect();
          video.addEventListener("loadeddata", updateAspect);
          video.addEventListener("playing", updateAspect);

          anchor.group.add(plane);

          anchor.onTargetFound = () => {
            if (!isTrackingRef.current) {
              isTrackingRef.current = true;
              setStatus("tracking");
              onTrackingStart?.();
            }
            video.play().catch(() => {});
          };

          anchor.onTargetLost = () => {
            video.pause();
            if (isTrackingRef.current) {
              isTrackingRef.current = false;
              setStatus("ready");
              onTrackingLost?.();
            }
          };
        }

        // ── Renderer setup for mobile ────────────────────────────
        renderer.setPixelRatio(getDevicePixelRatio());

        await mindarThree.start();
        if (cancelled) return;

        setStatus("ready");

        // ── Render loop ──────────────────────────────────────────
        // Runs at full speed; on low-end mobile the rAF itself adapts to
        // the device's refresh rate (usually 60fps, sometimes 30fps).
        let lastRender = 0;
        const IDLE_INTERVAL = 1000 / 15; // 15fps when not tracking (save battery)

        const renderLoop = (now: number) => {
          rafRef.current = requestAnimationFrame(renderLoop);

          // Throttle to ~15fps when not tracking to save battery
          if (!isTrackingRef.current) {
            if (now - lastRender < IDLE_INTERVAL) return;
          }
          lastRender = now;

          // Update textures only for playing videos
          for (const tex of textures) {
            if (tex.source.data && !tex.source.data.paused) {
              tex.needsUpdate = true;
            }
          }

          renderer.render(scene, camera);
        };
        rafRef.current = requestAnimationFrame(renderLoop);

        // ── Resize handling ──────────────────────────────────────
        resizeListener = () => {
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", resizeListener);
        // Also handle orientation change (some older mobile browsers)
        window.addEventListener("orientationchange", resizeListener);
        resizeListener();

        // ── Visibility change (app backgrounded) ─────────────────
        // Pause everything when user switches tabs or locks phone to
        // save battery and prevent GL context loss
        visibilityHandler = () => {
          if (document.hidden) {
            // Pause all videos
            for (const video of videoElsRef.current) {
              video.pause();
            }
          } else {
            // Re-acquire wake lock (OS releases it when page becomes hidden)
            requestWakeLock().then((wl) => {
              wakeLockRef.current = wl;
            });
            // Resume playing video if we were tracking
            if (isTrackingRef.current) {
              for (const video of videoElsRef.current) {
                video.play().catch(() => {});
              }
            }
          }
        };
        document.addEventListener("visibilitychange", visibilityHandler);

      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "AR initialization failed";
          setError(message);
          setStatus("error");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      cleanup();
      if (resizeListener) {
        window.removeEventListener("resize", resizeListener);
        window.removeEventListener("orientationchange", resizeListener);
      }
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsKey, cleanup, onTrackingStart, onTrackingLost]);

  const unmute = useCallback(() => {
    for (const video of videoElsRef.current) {
      video.muted = false;
      video.play().catch(() => {});
    }
  }, []);

  return { containerRef, status, error, unmute };
}
