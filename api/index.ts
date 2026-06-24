import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";

import eventsRouter from "../apps/api/src/routes/events";
import scanRouter from "../apps/api/src/routes/scan";
import uploadsRouter from "../apps/api/src/routes/uploads";
import analyticsRouter from "../apps/api/src/routes/analytics";

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
