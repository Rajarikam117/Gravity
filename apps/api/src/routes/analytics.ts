import { Router, Response } from "express";
import { AuthRequest, requireAuth, supabase } from "../lib/supabase.js";
import type { AnalyticsSummary } from "@gravity/shared";

const router = Router();

router.get("/summary", requireAuth, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from("events")
    .select("scan_count, is_published")
    .eq("user_id", req.user!.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const events = data ?? [];
  const summary: AnalyticsSummary = {
    total_events: events.length,
    total_scans: events.reduce((sum, e) => sum + (e.scan_count ?? 0), 0),
    published_events: events.filter((e) => e.is_published).length,
  };

  res.json({ data: summary });
});

export default router;
