import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Image,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import {
  compileMindFile,
  validatePhotoFile,
  validateVideoFile,
} from "../lib/mindCompiler";
import type { Event, EventFile } from "@gravity/shared";
import { Button, Card, Input } from "../components/ui";

type UploadStep = "idle" | "compiling" | "uploading" | "done" | "error";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Multi-file upload state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [compileProgress, setCompileProgress] = useState(0);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

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

  // ─── Add new file pair ───────────────────────────────────────
  const handleAddFile = async () => {
    if (!newPhotoFile || !newVideoFile || !session?.access_token || !id) return;

    const photoError = validatePhotoFile(newPhotoFile);
    const videoError = validateVideoFile(newVideoFile);
    if (photoError || videoError) {
      setError(photoError ?? videoError ?? "Invalid files");
      return;
    }

    setError("");
    setUploadStep("compiling");

    try {
      const mindBlob = await compileMindFile(newPhotoFile, setCompileProgress);
      const mindFile = new File([mindBlob], "target.mind", {
        type: "application/octet-stream",
      });

      setUploadStep("uploading");

      const formData = new FormData();
      formData.append("photo", newPhotoFile);
      formData.append("video", newVideoFile);
      formData.append("mind", mindFile);
      if (newLabel.trim()) {
        formData.append("label", newLabel.trim());
      }

      const res = await apiFetch<{ data: EventFile }>(
        `/api/uploads/${id}/files`,
        { method: "POST", body: formData },
        session.access_token
      );

      // Add new file to local state
      setEvent((prev) =>
        prev
          ? { ...prev, files: [...(prev.files ?? []), res.data] }
          : prev
      );
      setUploadStep("done");
      setNewPhotoFile(null);
      setNewVideoFile(null);
      setNewLabel("");
      setShowAddForm(false);

      // Reset upload step after a moment
      setTimeout(() => setUploadStep("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadStep("error");
    }
  };

  // ─── Delete a file ───────────────────────────────────────────
  const handleDeleteFile = async (fileId: string) => {
    if (!session?.access_token || !id) return;
    if (!confirm("Delete this file permanently?")) return;

    setDeletingFileId(fileId);
    try {
      await apiFetch(
        `/api/uploads/${id}/files/${fileId}`,
        { method: "DELETE" },
        session.access_token
      );
      setEvent((prev) =>
        prev
          ? { ...prev, files: (prev.files ?? []).filter((f) => f.id !== fileId) }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setDeletingFileId(null);
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
      setEvent((prev) => (prev ? { ...prev, ...res.data, files: prev.files } : prev));
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

  const files = event.files ?? [];
  const hasFiles = files.length > 0;
  const hasLegacyAssets = !!(event.photo_url && event.video_url && event.mind_url);
  const hasAssets = hasFiles || hasLegacyAssets;

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

      {/* ─── Scan URL & Publish ─────────────────────────────────── */}
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

      {/* ─── Uploaded Files List ─────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg">
              Files{" "}
              <span className="text-white/40 text-sm font-normal">
                ({files.length}/20)
              </span>
            </h2>
            <p className="text-white/50 text-sm mt-1">
              Each file is a photo + video pair. Guests point their phone at the printed photo to see the video.
            </p>
          </div>
        </div>

        {files.length === 0 && !hasLegacyAssets && (
          <div className="text-center py-8">
            <Upload className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No files uploaded yet</p>
            <p className="text-white/30 text-xs mt-1">
              Add a photo + video pair to get started
            </p>
          </div>
        )}

        {/* Legacy single file display */}
        {hasLegacyAssets && !hasFiles && (
          <div className="glass rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gravity-500/20 flex items-center justify-center">
                  <Image className="w-5 h-5 text-gravity-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Legacy upload</p>
                  <p className="text-white/40 text-xs">Single photo + video pair</p>
                </div>
              </div>
              <span className="text-green-400 text-xs">Active</span>
            </div>
          </div>
        )}

        {/* Multi-file list */}
        <div className="space-y-3">
          {files.map((file, index) => (
            <div
              key={file.id}
              className="glass rounded-xl p-4 transition-all duration-200 hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black/30">
                    <img
                      src={file.photo_url}
                      alt={file.label ?? `File ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.label || `File ${index + 1}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-white/40 text-xs flex items-center gap-1">
                        <Image className="w-3 h-3" /> Photo
                      </span>
                      <span className="text-white/40 text-xs flex items-center gap-1">
                        <Video className="w-3 h-3" /> Video
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteFile(file.id)}
                  disabled={deletingFileId === file.id}
                >
                  {deletingFileId === file.id ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-400" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Add new file form ────────────────────────────────── */}
        {showAddForm ? (
          <div className="mt-4 glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm">Add new file</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewPhotoFile(null);
                  setNewVideoFile(null);
                  setNewLabel("");
                  setUploadStep("idle");
                }}
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Label (optional)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Reception entrance photo"
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="glass rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors text-center">
                  <Image className="w-6 h-6 text-gravity-400 mx-auto mb-1.5" />
                  <p className="text-xs font-medium">Printed photo</p>
                  <p className="text-white/40 text-[10px] mt-0.5">JPG/PNG, max 10MB</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => setNewPhotoFile(e.target.files?.[0] ?? null)}
                  />
                  {newPhotoFile && (
                    <p className="text-gravity-300 text-xs mt-1.5 truncate">
                      {newPhotoFile.name}
                    </p>
                  )}
                </label>

                <label className="glass rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors text-center">
                  <Video className="w-6 h-6 text-gravity-400 mx-auto mb-1.5" />
                  <p className="text-xs font-medium">Cinematic video</p>
                  <p className="text-white/40 text-[10px] mt-0.5">MP4, max 50MB</p>
                  <input
                    type="file"
                    accept="video/mp4"
                    className="hidden"
                    onChange={(e) => setNewVideoFile(e.target.files?.[0] ?? null)}
                  />
                  {newVideoFile && (
                    <p className="text-gravity-300 text-xs mt-1.5 truncate">
                      {newVideoFile.name}
                    </p>
                  )}
                </label>
              </div>

              {uploadStep === "compiling" && (
                <div>
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
                <p className="text-sm text-white/70">Uploading to ImageKit...</p>
              )}

              {uploadStep === "done" && (
                <p className="text-sm text-green-400">✓ File added successfully!</p>
              )}

              {error && (
                <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                onClick={handleAddFile}
                disabled={
                  !newPhotoFile ||
                  !newVideoFile ||
                  uploadStep === "compiling" ||
                  uploadStep === "uploading"
                }
                loading={uploadStep === "compiling" || uploadStep === "uploading"}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload & compile
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setShowAddForm(true);
              setError("");
            }}
            disabled={files.length >= 20}
            className="mt-4 w-full glass rounded-xl p-4 flex items-center justify-center gap-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add photo + video pair
          </button>
        )}
      </Card>

      {/* Global error outside cards */}
      {error && !showAddForm && (
        <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}
    </div>
  );
}
