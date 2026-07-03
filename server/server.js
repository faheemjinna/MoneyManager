import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import dataRoutes from "./routes/data.js";
import plaidRoutes from "./routes/plaid.js";

if (!env.mongoUri) {
  throw new Error("MONGODB_URI is required. Create a private .env from .env.example.");
}

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = new Set(env.clientOrigin.split(",").map((item) => item.trim()).filter(Boolean));
      const isLocalDev = env.nodeEnv !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      return callback(null, allowed.has(origin) || isLocalDev);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/data", requireAuth, dataRoutes);
app.use("/api/plaid", requireAuth, plaidRoutes);

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get(/.*/, (_req, res) => res.sendFile(path.join(distPath, "index.html")));

app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: "Invalid request", issues: error.issues });
  }
  console.error(error);
  return res.status(500).json({ message: error.message || "Server error" });
});

await mongoose.connect(env.mongoUri, { autoIndex: env.nodeEnv !== "production" });
app.listen(env.port, () => {
  console.log(`Money Manager API listening on http://localhost:${env.port}`);
});
