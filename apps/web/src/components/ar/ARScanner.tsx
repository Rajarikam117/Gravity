import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, ScanLine, Volume2, VolumeX, AlertCircle, ArrowLeft } from "lucide-react";
import { useMindAR } from "../../hooks/useMindAR";

interface ARTarget {
  mindUrl: string;
  videoUrl: string;
}

interface ARScannerProps {
  /** Legacy single-target props */
  mindUrl?: string;
  videoUrl?: string;
  /** Multi-target props */
  targets?: ARTarget[];
  eventTitle: string;
  onScanRecorded?: () => void;
  /** Called when user taps back — if not provided, uses history.back() */
  onBack?: () => void;
}

export function ARScanner({
  mindUrl,
  videoUrl,
  targets,
  eventTitle,
  onScanRecorded,
  onBack,
}: ARScannerProps) {
  const [muted, setMuted] = useState(true);
  const scanRecorded = useRef(false);

  const handleTrackingStart = useCallback(() => {
    // Haptic feedback on first detection (supported on most Android/iOS)
    if (!scanRecorded.current) {
      try { navigator.vibrate?.(50); } catch { /* unsupported */ }
    }
    if (!scanRecorded.current && onScanRecorded) {
      scanRecorded.current = true;
      onScanRecorded();
    }
  }, [onScanRecorded]);

  const { containerRef, status, error, unmute } = useMindAR({
    mindUrl,
    videoUrl,
    targets,
    onTrackingStart: handleTrackingStart,
  });

  // Prevent default touch behaviors on the AR container
  // (pinch-zoom, double-tap zoom, long-press context menu)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prevent = (e: Event) => {
      e.preventDefault();
    };

    // Prevent context menu (long press on mobile)
    el.addEventListener("contextmenu", prevent, { passive: false });
    // Prevent gesture zoom on iOS
    el.addEventListener("gesturestart", prevent, { passive: false });
    el.addEventListener("gesturechange", prevent, { passive: false });

    return () => {
      el.removeEventListener("contextmenu", prevent);
      el.removeEventListener("gesturestart", prevent);
      el.removeEventListener("gesturechange", prevent);
    };
  }, [containerRef]);

  const toggleSound = () => {
    if (muted) {
      unmute();
      setMuted(false);
    } else {
      const videos = containerRef.current?.querySelectorAll("video");
      videos?.forEach((v) => { v.muted = true; });
      setMuted(true);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const targetCount = targets?.length ?? (mindUrl ? 1 : 0);

  return (
    <div className="ar-container">
      {/* WebGL / camera container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* UI overlay — pointer-events-none so touches pass to camera */}
      <div className="absolute inset-0 pointer-events-none">

        {/* ─── Top bar: back button + title ─────────────────────── */}
        <div className="absolute top-0 inset-x-0 px-4 pt-safe bg-gradient-to-b from-black/70 to-transparent"
          style={{ paddingTop: `max(env(safe-area-inset-top, 16px), 16px)` }}
        >
          <div className="flex items-center gap-3 pb-3">
            <button
              onClick={handleBack}
              className="pointer-events-auto w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md active:bg-white/20 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-display text-base text-white/90 truncate">{eventTitle}</p>
              {targetCount > 1 && (
                <p className="text-white/50 text-[11px] mt-0.5">
                  {targetCount} photos to discover
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Loading state ────────────────────────────────────── */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gravity-950/80">
            <ScanLine className="w-12 h-12 text-gravity-400 animate-pulse mb-4" />
            <p className="text-white/80 text-sm">Preparing your experience...</p>
            <p className="text-white/40 text-xs mt-2">
              Loading {targetCount > 1 ? `${targetCount} AR targets` : "AR assets"}
            </p>
            <p className="text-white/30 text-[10px] mt-4 px-6 text-center">
              Make sure to allow camera access when prompted
            </p>
          </div>
        )}

        {/* ─── Ready state: viewfinder ──────────────────────────── */}
        {status === "ready" && (
          <div className="absolute inset-x-0 flex flex-col items-center gap-3 px-6"
            style={{ bottom: `max(env(safe-area-inset-bottom, 24px), 96px)` }}
          >
            <div className="glass rounded-2xl px-5 py-3 text-center max-w-xs">
              <Camera className="w-5 h-5 text-gravity-gold mx-auto mb-1.5" />
              <p className="text-white text-sm font-medium">Point at the printed photo</p>
              <p className="text-white/50 text-[11px] mt-0.5">Hold steady for 1–2 seconds</p>
            </div>
            {/* Viewfinder brackets */}
            <div className="w-44 h-44 border-2 border-gravity-gold/40 rounded-lg relative">
              <div className="absolute inset-0 border border-gravity-gold/20 rounded-lg animate-pulse" />
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-gravity-gold rounded-tl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gravity-gold rounded-tr" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-gravity-gold rounded-bl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gravity-gold rounded-br" />
            </div>
          </div>
        )}

        {/* ─── Tracking state: sound toggle ─────────────────────── */}
        {status === "tracking" && (
          <div
            className="absolute inset-x-0 flex justify-center pointer-events-auto"
            style={{ bottom: `max(env(safe-area-inset-bottom, 8px), 32px)` }}
          >
            <button
              onClick={toggleSound}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 text-white text-sm font-medium active:scale-95 transition-transform"
            >
              {muted ? (
                <>
                  <VolumeX className="w-5 h-5" />
                  Tap for sound
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5" />
                  Sound on
                </>
              )}
            </button>
          </div>
        )}

        {/* ─── Error state ──────────────────────────────────────── */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gravity-950/90 px-6">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-white text-center text-base mb-2">Unable to start AR</p>
            <p className="text-white/50 text-sm text-center max-w-xs">{error}</p>
            <div className="mt-6 space-y-2 text-center">
              <p className="text-white/40 text-xs">
                Make sure camera permissions are enabled
              </p>
              <p className="text-white/30 text-[11px]">
                Works best on Chrome (Android) or Safari (iPhone)
              </p>
            </div>
            <button
              onClick={handleBack}
              className="pointer-events-auto mt-6 px-6 py-2.5 rounded-full bg-white/10 border border-white/20 text-white text-sm active:bg-white/20 transition-colors"
            >
              Go back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
