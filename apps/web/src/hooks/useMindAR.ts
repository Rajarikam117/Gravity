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

  // Resolve final targets: prefer multi-target array, fallback to legacy single target
  const resolvedTargets = targets && targets.length > 0
    ? targets
    : mindUrl && videoUrl
      ? [{ mindUrl, videoUrl }]
      : [];

  // Stable serialized key for the targets array
  const targetsKey = JSON.stringify(resolvedTargets.map((t) => `${t.mindUrl}|${t.videoUrl}`));

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    for (const video of videoElsRef.current) {
      video.pause();
      video.src = "";
    }
    videoElsRef.current = [];

    if (mindarRef.current) {
      mindarRef.current.stop();
      mindarRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    isTrackingRef.current = false;
  }, []);

  useEffect(() => {
    if (!containerRef.current || resolvedTargets.length === 0) return;

    let cancelled = false;
    let resizeListener: (() => void) | null = null;

    async function init() {
      setStatus("loading");
      setError(null);

      try {
        // Pre-load all videos
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
          video.preload = "auto";

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
            setTimeout(handleLoaded, 4000);
            video.load();
          });

          if (cancelled) return;
          videos.push(video);
        }

        videoElsRef.current = videos;

        if (cancelled) return;

        const MindARThree = await loadMindARThree();

        // For multi-target: compile all .mind URLs into a single array for MindAR
        // MindAR supports multiple image targets from separate .mind files
        // We use the first target's mind URL for a single-target setup,
        // or concatenated approach for multi-target
        const mindUrls = resolvedTargets.map((t) => t.mindUrl);

        const mindarThree = new MindARThree({
          container: containerRef.current!,
          imageTargetSrc: mindUrls.length === 1 ? mindUrls[0] : mindUrls.join(","),
          maxTrack: Math.min(resolvedTargets.length, 4),
          filterMinCF: 0.0001,
          filterBeta: 1000,
          warmupTolerance: 5,
          missTolerance: 5,
        });

        mindarRef.current = mindarThree;

        const { renderer } = mindarThree;

        const { scene, camera } = mindarThree;

        // Create an anchor + video plane for each target
        for (let i = 0; i < resolvedTargets.length; i++) {
          const anchor = mindarThree.addAnchor(i);
          const video = videos[i];

          const texture = new THREE.VideoTexture(video);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

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
            // Check if any anchor is still tracking
            // For simplicity, set to ready when the last anchor loses tracking
            // In practice MindAR manages this internally
            if (isTrackingRef.current) {
              isTrackingRef.current = false;
              setStatus("ready");
              onTrackingLost?.();
            }
          };
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        await mindarThree.start();
        if (cancelled) return;

        setStatus("ready");

        // Start the render loop — without this, VideoTexture frames are never
        // drawn to the WebGL canvas (audio plays but nothing is visible).
        const renderLoop = () => {
          renderer.render(scene, camera);
          rafRef.current = requestAnimationFrame(renderLoop);
        };
        rafRef.current = requestAnimationFrame(renderLoop);

        resizeListener = () => {
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", resizeListener);
        resizeListener();
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
