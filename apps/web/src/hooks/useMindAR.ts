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

interface UseMindAROptions {
  mindUrl: string;
  videoUrl: string;
  onTrackingStart?: () => void;
  onTrackingLost?: () => void;
}

export function useMindAR({
  mindUrl,
  videoUrl,
  onTrackingStart,
  onTrackingLost,
}: UseMindAROptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ARStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const mindarRef = useRef<MindARThreeInstance | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const isTrackingRef = useRef(false);

  const cleanup = useCallback(() => {
    const video = videoElRef.current;
    if (video) {
      video.pause();
      video.src = "";
      videoElRef.current = null;
    }

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
    if (!containerRef.current || !mindUrl || !videoUrl) return;

    let cancelled = false;
    let resizeListener: (() => void) | null = null;

    async function init() {
      setStatus("loading");
      setError(null);

      try {
        const video = document.createElement("video");
        video.src = videoUrl;
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.preload = "auto";
        videoElRef.current = video;

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

        const MindARThree = await loadMindARThree();

        const mindarThree = new MindARThree({
          container: containerRef.current!,
          imageTargetSrc: mindUrl,
          maxTrack: 1,
          filterMinCF: 0.0001,
          filterBeta: 1000,
          warmupTolerance: 5,
          missTolerance: 5,
        });

        mindarRef.current = mindarThree;

        const { renderer } = mindarThree;
        const anchor = mindarThree.addAnchor(0);

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

        if (video.videoWidth && video.videoHeight) {
          const aspect = video.videoWidth / video.videoHeight;
          plane.scale.set(aspect, 1, 1);
        }

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
          if (isTrackingRef.current) {
            isTrackingRef.current = false;
            setStatus("ready");
            video.pause();
            onTrackingLost?.();
          }
        };

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        await mindarThree.start();
        if (cancelled) return;

        setStatus("ready");

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
  }, [mindUrl, videoUrl, cleanup, onTrackingStart, onTrackingLost]);

  const unmute = useCallback(() => {
    const video = videoElRef.current;
    if (video) {
      video.muted = false;
      video.play().catch(() => {});
    }
  }, []);

  return { containerRef, status, error, unmute };
}
