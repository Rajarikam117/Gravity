// Vercel Serverless Function Entry Point
// Imports from the pre-compiled API dist (built by `npm run build`)

import express from "express";
import cors from "cors";
import helmet from "helmet";

import eventsRouter from "../apps/api/dist/routes/events.js";
import scanRouter from "../apps/api/dist/routes/scan.js";
import uploadsRouter from "../apps/api/dist/routes/uploads.js";
import analyticsRouter from "../apps/api/dist/routes/analytics.js";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN ?? "*";

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: corsOrigin.split(",").map((o) => o.trim()),
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "gravity-api",
    runtime: "vercel-serverless",
  });
});

app.use("/api/events", eventsRouter);
app.use("/api/scan", scanRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/analytics", analyticsRouter);

app.use("/api/*", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
