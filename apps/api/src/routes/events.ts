import { Router, Response } from "express";
import { AuthRequest, requireAuth, supabase } from "../lib/supabase.js";
import { generateSlug } from "../lib/slug.js";
import { imagekit } from "../lib/imagekit.js";
import type { CreateEventInput, UpdateEventInput } from "@gravity/shared";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data });
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const body = req.body as CreateEventInput;

  if (!body.title?.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const slug = generateSlug(body.title);

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: req.user!.id,
      title: body.title.trim(),
      slug,
      description: body.description?.trim() ?? null,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json({ data });
});

router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id)
    .single();

  if (error) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  // Fetch associated event files
  const { data: files } = await supabase
    .from("event_files")
    .select("*")
    .eq("event_id", data.id)
    .order("sort_order", { ascending: true });

  res.json({ data: { ...data, files: files ?? [] } });
});

router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const body = req.body as UpdateEventInput;
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() ?? null;
  if (body.is_published !== undefined) updates.is_published = body.is_published;

  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data });
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  // Get event files to clean up ImageKit storage
  const { data: eventFiles } = await supabase
    .from("event_files")
    .select("imagekit_photo_path, imagekit_video_path, imagekit_mind_path")
    .eq("event_id", req.params.id);

  // Delete event (cascades to event_files in DB)
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Clean up ImageKit files in background (best effort)
  if (eventFiles) {
    for (const ef of eventFiles) {
      const paths = [
        ef.imagekit_photo_path,
        ef.imagekit_video_path,
        ef.imagekit_mind_path,
      ].filter(Boolean);
      for (const p of paths) {
        try {
          const found = await imagekit.listFiles({ path: p as string });
          for (const f of found) {
            if ("fileId" in f) await imagekit.deleteFile(f.fileId);
          }
        } catch { /* best effort */ }
      }
    }
  }

  res.status(204).send();
});

export default router;
