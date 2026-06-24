import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import { AuthRequest, requireAuth, supabase } from "../lib/supabase.js";
import { uploadBuffer, imagekit } from "../lib/imagekit.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const router = Router();

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

export default router;
