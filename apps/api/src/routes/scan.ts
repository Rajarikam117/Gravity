import { Router, Response } from "express";
import type { PublicEvent } from "@gravity/shared";
import { supabase } from "../lib/supabase.js";

const router = Router();

router.get("/:slug", async (req, res: Response) => {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, slug, photo_url, video_url, mind_url, is_published")
    .eq("slug", req.params.slug)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  if (!data.is_published) {
    res.status(404).json({ error: "Event not published" });
    return;
  }

  // Fetch multi-file entries
  const { data: files } = await supabase
    .from("event_files")
    .select("*")
    .eq("event_id", data.id)
    .order("sort_order", { ascending: true });

  const hasFiles = files && files.length > 0;
  const hasLegacy = !!(data.photo_url && data.video_url && data.mind_url);

  if (!hasFiles && !hasLegacy) {
    res.status(400).json({ error: "Event assets not ready" });
    return;
  }

  const publicEvent: PublicEvent = {
    id: data.id,
    title: data.title,
    slug: data.slug,
    photo_url: data.photo_url ?? "",
    video_url: data.video_url ?? "",
    mind_url: data.mind_url ?? "",
    files: files ?? [],
  };

  res.json({ data: publicEvent });
});

router.post("/:slug/scan", async (req, res: Response) => {
  const { data: event } = await supabase
    .from("events")
    .select("id, is_published")
    .eq("slug", req.params.slug)
    .single();

  if (!event?.is_published) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const { error } = await supabase.rpc("increment_scan_count", {
    event_id: event.id,
  });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data: { ok: true } });
});

export default router;
