import { useRef, useState, useCallback } from "react";
import { Camera, ScanLine, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { useMindAR } from "../../hooks/useMindAR";
import { Button } from "../ui";

interface ARScannerProps {
  mindUrl: string;
  videoUrl: string;
  eventTitle: string;
  onScanRecorded?: () => void;
}

export function ARScanner({
  mindUrl,
  videoUrl,
  eventTitle,
  onScanRecorded,
}: ARScannerProps) {
  const [muted, setMuted] = useState(true);
  const scanRecorded = useRef(false);

  const handleTrackingStart = useCallback(() => {
    if (!scanRecorded.current && onScanRecorded) {
      scanRecorded.current = true;
      onScanRecorded();
    }
  }, [onScanRecorded]);

  const { containerRef, status, error, unmute } = useMindAR({
    mindUrl,
    videoUrl,
    onTrackingStart: handleTrackingStart,
  });

  const toggleSound = () => {
    if (muted) {
      unmute();
      setMuted(false);
    } else {
      const video = containerRef.current?.querySelector("video");
      if (video) video.muted = true;
      setMuted(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 inset-x-0 p-4 pt-safe bg-gradient-to-b from-black/70 to-transparent">
          <p className="text-center font-display text-lg text-white/90">{eventTitle}</p>
        </div>

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gravity-950/80">
            <ScanLine className="w-12 h-12 text-gravity-400 animate-pulse mb-4" />
            <p className="text-white/80 text-sm">Preparing your experience...</p>
            <p className="text-white/40 text-xs mt-2">Loading AR assets</p>
          </div>
        )}

        {status === "ready" && (
          <div className="absolute bottom-24 inset-x-0 flex flex-col items-center gap-3 px-6">
            <div className="glass rounded-2xl px-6 py-4 text-center max-w-sm">
              <Camera className="w-6 h-6 text-gravity-gold mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Point at the printed photo</p>
              <p className="text-white/50 text-xs mt-1">Hold steady for 1–2 seconds</p>
            </div>
            <div className="w-48 h-48 border-2 border-gravity-gold/40 rounded-lg relative">
              <div className="absolute inset-0 border border-gravity-gold/20 rounded-lg animate-pulse" />
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-gravity-gold" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gravity-gold" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-gravity-gold" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gravity-gold" />
            </div>
          </div>
        )}

        {status === "tracking" && (
          <div className="absolute bottom-8 inset-x-0 flex justify-center pointer-events-auto">
            <Button variant="secondary" size="sm" onClick={toggleSound}>
              {muted ? (
                <>
                  <VolumeX className="w-4 h-4 mr-2" />
                  Tap for sound
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Sound on
                </>
              )}
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gravity-950/90 px-6">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-white text-center mb-2">Unable to start AR</p>
            <p className="text-white/50 text-sm text-center">{error}</p>
            <p className="text-white/40 text-xs text-center mt-4">
              Try Chrome on Android with camera permissions enabled
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
