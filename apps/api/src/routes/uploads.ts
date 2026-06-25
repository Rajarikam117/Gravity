import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import { AuthRequest, requireAuth, supabase } from "../lib/supabase.js";
import { uploadBuffer, imagekit, getUploadAuthParams } from "../lib/imagekit.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const router = Router();

// ─── ImageKit auth for client-side uploads ──────────────────────────────────
// Returns a token, signature, and expire timestamp that the browser uses
// to upload files directly to ImageKit (bypassing the 4.5MB Vercel limit).
router.get(
  "/auth",
  requireAuth,
  (_req: AuthRequest, res: Response) => {
    try {
      const authParams = getUploadAuthParams();
      res.json(authParams);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate auth";
      res.status(500).json({ error: message });
    }
  }
);

// ─── Register files uploaded from the browser ───────────────────────────────
// The browser uploads photo, video, and mind directly to ImageKit,
// then sends the resulting URLs here so we can create the DB record.
router.post(
  "/:eventId/files/register",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const eventId = req.params.eventId;
    const {
      photo_url,
      video_url,
      mind_url,
      imagekit_photo_file_id,
      imagekit_video_file_id,
      imagekit_mind_file_id,
      imagekit_photo_path,
      imagekit_video_path,
      imagekit_mind_path,
      label,
    } = req.body;

    if (!photo_url || !video_url || !mind_url) {
      res.status(400).json({ error: "photo_url, video_url, and mind_url are required" });
      return;
    }

    // Verify event ownership
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("id, user_id")
      .eq("id", eventId)
      .eq("user_id", req.user!.id)
      .single();

    if (fetchError || !event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    // Check file count limit (max 20 per event)
    const { count } = await supabase
      .from("event_files")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    if ((count ?? 0) >= 20) {
      res.status(400).json({ error: "Maximum 20 files per event reached" });
      return;
    }

    try {
      // Get next sort order
      const { data: maxOrder } = await supabase
        .from("event_files")
        .select("sort_order")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

      // Insert event_files row
      const { data: eventFile, error: insertError } = await supabase
        .from("event_files")
        .insert({
          event_id: eventId,
          label: label?.trim() || null,
          photo_url,
          video_url,
          mind_url,
          imagekit_photo_path: imagekit_photo_path || null,
          imagekit_video_path: imagekit_video_path || null,
          imagekit_mind_path: imagekit_mind_path || null,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      res.status(201).json({ data: eventFile });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      res.status(500).json({ error: message });
    }
  }
);

// ─── Legacy single-file upload (backward compat) ───────────────────────────
router.post(
  "/:eventId",
  requireAuth,
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "mind", maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response) => {
    const eventId = req.params.eventId;
    const files = req.files as Record<string, Express.Multer.File[]>;

    const hasPhoto = !!files.photo?.[0];
    const hasVideo = !!files.video?.[0];
    const hasMind = !!files.mind?.[0];

    if (!hasPhoto && !hasVideo && !hasMind) {
      res.status(400).json({ error: "At least one file (photo, video, or mind) is required" });
      return;
    }

    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("id, user_id")
      .eq("id", eventId)
      .eq("user_id", req.user!.id)
      .single();

    if (fetchError || !event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const folder = `/gravity/events/${eventId}`;
    const uploadedFileIds: string[] = [];
    const updates: Record<string, any> = {};

    try {
      if (hasPhoto) {
        const photoFile = files.photo[0];
        const photoResult = await uploadBuffer(
          photoFile.buffer,
          "photo.jpg",
          folder,
          photoFile.mimetype
        );
        uploadedFileIds.push(photoResult.fileId);
        updates.photo_url = photoResult.url;
        updates.imagekit_photo_path = photoResult.filePath;
      }

      if (hasVideo) {
        const videoFile = files.video[0];
        const ext = path.extname(videoFile.originalname) || ".mp4";
        const videoResult = await uploadBuffer(
          videoFile.buffer,
          `video${ext}`,
          folder,
          videoFile.mimetype
        );
        uploadedFileIds.push(videoResult.fileId);
        updates.video_url = videoResult.url;
        updates.imagekit_video_path = videoResult.filePath;
      }

      if (hasMind) {
        const mindFile = files.mind[0];
        const mindResult = await uploadBuffer(
          mindFile.buffer,
          "target.mind",
          folder,
          "application/octet-stream"
        );
        uploadedFileIds.push(mindResult.fileId);
        updates.mind_url = mindResult.url;
        updates.imagekit_mind_path = mindResult.filePath;
      }

      const { data, error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", eventId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        data: {
          photo_url: data.photo_url,
          video_url: data.video_url,
          mind_url: data.mind_url,
          event: data,
        },
      });
    } catch (err) {
      // Rollback and delete successfully uploaded files to avoid storage leaks
      for (const fileId of uploadedFileIds) {
        try {
          await imagekit.deleteFile(fileId);
        } catch (deleteErr) {
          console.error(`Failed to delete file ${fileId} during upload rollback:`, deleteErr);
        }
      }
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(500).json({ error: message });
    }
  }
);

// ─── Multi-file upload via server (kept for local dev, limited to ~4MB on Vercel) ──
router.post(
  "/:eventId/files",
  requireAuth,
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "mind", maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response) => {
    const eventId = req.params.eventId;
    const files = req.files as Record<string, Express.Multer.File[]>;
    const label = (req.body.label as string)?.trim() || null;

    if (!files.photo?.[0] || !files.video?.[0] || !files.mind?.[0]) {
      res.status(400).json({ error: "photo, video, and mind files are all required" });
      return;
    }

    // Verify event ownership
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("id, user_id")
      .eq("id", eventId)
      .eq("user_id", req.user!.id)
      .single();

    if (fetchError || !event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    // Check file count limit (max 20 per event)
    const { count } = await supabase
      .from("event_files")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    if ((count ?? 0) >= 20) {
      res.status(400).json({ error: "Maximum 20 files per event reached" });
      return;
    }

    const folder = `/gravity/events/${eventId}/files`;
    const timestamp = Date.now();
    const uploadedFileIds: string[] = [];

    try {
      // Upload photo
      const photoFile = files.photo[0];
      const photoResult = await uploadBuffer(
        photoFile.buffer,
        `photo_${timestamp}.jpg`,
        folder,
        photoFile.mimetype
      );
      uploadedFileIds.push(photoResult.fileId);

      // Upload video
      const videoFile = files.video[0];
      const ext = path.extname(videoFile.originalname) || ".mp4";
      const videoResult = await uploadBuffer(
        videoFile.buffer,
        `video_${timestamp}${ext}`,
        folder,
        videoFile.mimetype
      );
      uploadedFileIds.push(videoResult.fileId);

      // Upload mind file
      const mindFile = files.mind[0];
      const mindResult = await uploadBuffer(
        mindFile.buffer,
        `target_${timestamp}.mind`,
        folder,
        "application/octet-stream"
      );
      uploadedFileIds.push(mindResult.fileId);

      // Get next sort order
      const { data: maxOrder } = await supabase
        .from("event_files")
        .select("sort_order")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

      // Insert event_files row
      const { data: eventFile, error: insertError } = await supabase
        .from("event_files")
        .insert({
          event_id: eventId,
          label,
          photo_url: photoResult.url,
          video_url: videoResult.url,
          mind_url: mindResult.url,
          imagekit_photo_path: photoResult.filePath,
          imagekit_video_path: videoResult.filePath,
          imagekit_mind_path: mindResult.filePath,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      res.status(201).json({ data: eventFile });
    } catch (err) {
      // Rollback uploaded files
      for (const fileId of uploadedFileIds) {
        try {
          await imagekit.deleteFile(fileId);
        } catch (deleteErr) {
          console.error(`Failed to delete file ${fileId} during rollback:`, deleteErr);
        }
      }
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(500).json({ error: message });
    }
  }
);

// ─── Delete a specific event file ──────────────────────────────────────────
router.delete(
  "/:eventId/files/:fileId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { eventId, fileId } = req.params;

    // Verify event ownership
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("user_id", req.user!.id)
      .single();

    if (eventErr || !event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    // Get the file record
    const { data: file, error: fileErr } = await supabase
      .from("event_files")
      .select("*")
      .eq("id", fileId)
      .eq("event_id", eventId)
      .single();

    if (fileErr || !file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Delete from ImageKit
    const pathsToDelete = [
      file.imagekit_photo_path,
      file.imagekit_video_path,
      file.imagekit_mind_path,
    ].filter(Boolean);

    for (const ikPath of pathsToDelete) {
      try {
        // Search by file path and delete
        const files = await imagekit.listFiles({ path: ikPath as string });
        for (const f of files) {
          if ("fileId" in f) await imagekit.deleteFile(f.fileId);
        }
      } catch (err) {
        console.error(`Failed to delete ImageKit file at ${ikPath}:`, err);
      }
    }

    // Delete DB record
    const { error: deleteError } = await supabase
      .from("event_files")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      res.status(500).json({ error: deleteError.message });
      return;
    }

    res.status(204).send();
  }
);

export default router;
