import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Image,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import {
  compileMindFile,
  validatePhotoFile,
  validateVideoFile,
} from "../lib/mindCompiler";
import type { Event } from "@gravity/shared";
import { Button, Card } from "../components/ui";

type UploadStep = "idle" | "compiling" | "uploading" | "done" | "error";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [compileProgress, setCompileProgress] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const scanUrl = event
    ? `${window.location.origin}/scan/${event.slug}`
    : "";

  const fetchEvent = useCallback(async () => {
    if (!session?.access_token || !id) return;

    try {
      const res = await apiFetch<{ data: Event }>(
        `/api/events/${id}`,
        {},
        session.access_token
      );
      setEvent(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [id, session?.access_token]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleUpload = async () => {
    if (!photoFile || !videoFile || !session?.access_token || !id) return;

    const photoError = validatePhotoFile(photoFile);
    const videoError = validateVideoFile(videoFile);
    if (photoError || videoError) {
      setError(photoError ?? videoError ?? "Invalid files");
      return;
    }

    setError("");
    setUploadStep("compiling");

    try {
      const mindBlob = await compileMindFile(photoFile, setCompileProgress);
      const mindFile = new File([mindBlob], "target.mind", {
        type: "application/octet-stream",
      });

      setUploadStep("uploading");

      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("video", videoFile);
      formData.append("mind", mindFile);

      const res = await apiFetch<{ data: { event: Event } }>(
        `/api/uploads/${id}`,
        { method: "POST", body: formData },
        session.access_token
      );

      setEvent(res.data.event);
      setUploadStep("done");
      setPhotoFile(null);
      setVideoFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadStep("error");
    }
  };

  const togglePublish = async () => {
    if (!event || !session?.access_token) return;

    try {
      const res = await apiFetch<{ data: Event }>(
        `/api/events/${event.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_published: !event.is_published }),
        },
        session.access_token
      );
      setEvent(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const deleteEvent = async () => {
    if (!event || !session?.access_token) return;
    if (!confirm("Delete this event permanently?")) return;

    try {
      await apiFetch(
        `/api/events/${event.id}`,
        { method: "DELETE" },
        session.access_token
      );
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const copyScanUrl = () => {
    navigator.clipboard.writeText(scanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        Loading...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">Event not found</p>
      </div>
    );
  }

  const hasAssets = !!(event.photo_url && event.video_url && event.mind_url);

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-6 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-white/50 hover:text-white text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to dashboard
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl mb-1">{event.title}</h1>
          {event.description && (
            <p className="text-white/50 text-sm">{event.description}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={deleteEvent}>
          <Trash2 className="w-4 h-4 text-red-400" />
        </Button>
      </div>

      {hasAssets && (
        <Card className="mb-6">
          <h2 className="font-display text-lg mb-3">Scan URL</h2>
          <p className="text-white/50 text-sm mb-3">
            Share this link with guests — they open it on their phone and point at the printed photo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-black/30 rounded-lg px-3 py-2 truncate text-gravity-300">
              {scanUrl}
            </code>
            <Button variant="secondary" size="sm" onClick={copyScanUrl}>
              <Copy className="w-4 h-4" />
              {copied ? "Copied!" : ""}
            </Button>
            {event.is_published && (
              <a href={scanUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-sm">
                Status:{" "}
                {event.is_published ? (
                  <span className="text-green-400">Published</span>
                ) : (
                  <span className="text-yellow-400">Draft</span>
                )}
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                {event.scan_count} scans recorded
              </p>
            </div>
            <Button
              size="sm"
              variant={event.is_published ? "secondary" : "primary"}
              onClick={togglePublish}
              disabled={!hasAssets}
            >
              {event.is_published ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-display text-lg mb-1">
          {hasAssets ? "Replace assets" : "Upload assets"}
        </h2>
        <p className="text-white/50 text-sm mb-6">
          Upload the printed photo and cinematic video. We compile the AR tracking fingerprint automatically.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <label className="glass rounded-xl p-6 cursor-pointer hover:bg-white/10 transition-colors text-center">
            <Image className="w-8 h-8 text-gravity-400 mx-auto mb-2" />
            <p className="text-sm font-medium">Printed photo</p>
            <p className="text-white/40 text-xs mt-1">JPG or PNG, max 10MB</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
            {photoFile && (
              <p className="text-gravity-300 text-xs mt-2 truncate">{photoFile.name}</p>
            )}
            {event.photo_url && !photoFile && (
              <p className="text-green-400 text-xs mt-2">Uploaded</p>
            )}
          </label>

          <label className="glass rounded-xl p-6 cursor-pointer hover:bg-white/10 transition-colors text-center">
            <Video className="w-8 h-8 text-gravity-400 mx-auto mb-2" />
            <p className="text-sm font-medium">Cinematic video</p>
            <p className="text-white/40 text-xs mt-1">MP4, max 50MB</p>
            <input
              type="file"
              accept="video/mp4"
              className="hidden"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            {videoFile && (
              <p className="text-gravity-300 text-xs mt-2 truncate">{videoFile.name}</p>
            )}
            {event.video_url && !videoFile && (
              <p className="text-green-400 text-xs mt-2">Uploaded</p>
            )}
          </label>
        </div>

        {uploadStep === "compiling" && (
          <div className="mb-4">
            <p className="text-sm text-white/70 mb-2">
              Compiling AR fingerprint... {compileProgress}%
            </p>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gravity-500 transition-all duration-300"
                style={{ width: `${compileProgress}%` }}
              />
            </div>
          </div>
        )}

        {uploadStep === "uploading" && (
          <p className="text-sm text-white/70 mb-4">Uploading to ImageKit...</p>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <Button
          onClick={handleUpload}
          disabled={!photoFile || !videoFile || uploadStep === "compiling" || uploadStep === "uploading"}
          loading={uploadStep === "compiling" || uploadStep === "uploading"}
        >
          <Upload className="w-4 h-4 mr-2" />
          {hasAssets ? "Replace & recompile" : "Upload & compile"}
        </Button>
      </Card>
    </div>
  );
}
