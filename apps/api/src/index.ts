// original

// import dotenv from "dotenv";
// import path from "path";
// import { fileURLToPath } from "url";

// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
// dotenv.config({ path: path.resolve(__dirname, "../.env") });


// console.log("ENV PATH:", path.resolve(__dirname, "../../../.env"));
// console.log("SUPABASE_URL:", process.env.SUPABASE_URL);

// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import eventsRouter from "./routes/events.js";
// import scanRouter from "./routes/scan.js";
// import uploadsRouter from "./routes/uploads.js";
// import analyticsRouter from "./routes/analytics.js";

// const app = express();
// const port = Number(process.env.PORT) || 3001;
// const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

// app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// app.use(
//   cors({
//     origin: corsOrigin.split(",").map((o) => o.trim()),
//     credentials: true,
//   })
// );
// app.use(express.json({ limit: "2mb" }));

// app.get("/health", (_req, res) => {
//   res.json({ status: "ok", service: "gravity-api" });
// });

// app.use("/api/events", eventsRouter);
// app.use("/api/scan", scanRouter);
// app.use("/api/uploads", uploadsRouter);
// app.use("/api/analytics", analyticsRouter);

// app.use((_req, res) => {
//   res.status(404).json({ error: "Not found" });
// });

// app.listen(port, () => {
//   console.log(`GRAVITY API running on http://localhost:${port}`);
// });

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root env first, fallback to app env or current directory path
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";

import eventsRouter from "./routes/events.js";
import scanRouter from "./routes/scan.js";
import uploadsRouter from "./routes/uploads.js";
import analyticsRouter from "./routes/analytics.js";

const app = express();

const port = Number(process.env.PORT) || 3001;
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

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

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "gravity-api",
  });
});

app.use("/api/events", eventsRouter);
app.use("/api/scan", scanRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/analytics", analyticsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(port, () => {
  console.log(`GRAVITY API running on http://localhost:${port}`);
});