import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { apiFetch } from "../lib/api";
import type { PublicEvent } from "@gravity/shared";
import { ARScanner } from "../components/ar/ARScanner";

export default function ScannerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    apiFetch<{ data: PublicEvent }>(`/api/scan/${slug}`)
      .then((res) => setEvent(res.data))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Event not found");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const recordScan = useCallback(() => {
    if (!slug) return;
    apiFetch(`/api/scan/${slug}/scan`, { method: "POST" }).catch(() => {});
  }, [slug]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gravity-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gravity-500/30 border-t-gravity-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading experience...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="fixed inset-0 bg-gravity-950 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="font-display text-xl mb-2">Experience unavailable</h1>
          <p className="text-white/50 text-sm">{error || "This event is not available."}</p>
        </div>
      </div>
    );
  }

  return (
    <ARScanner
      mindUrl={event.mind_url}
      videoUrl={event.video_url}
      eventTitle={event.title}
      onScanRecorded={recordScan}
    />
  );
}
