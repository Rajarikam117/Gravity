import { Router, Response } from "express";
import { AuthRequest, requireAuth, supabase } from "../lib/supabase.js";
import { generateSlug } from "../lib/slug.js";
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

  res.json({ data });
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
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(204).send();
});

export default router;
