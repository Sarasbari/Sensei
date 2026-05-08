/**
 * server.js — Sensei Webhook Server Entry Point
 *
 * Express server that:
 *   1. Receives GitHub App webhook events
 *   2. Verifies HMAC-SHA256 signatures
 *   3. Pushes PR data to BullMQ queue for async processing
 *   4. Exposes a health check endpoint
 */

import "dotenv/config";
import express from "express";
import { webhookRouter } from "./routes/webhook.js";
import { healthRouter } from "./routes/health.js";
import { initQueue, closeQueue } from "./services/queue.js";
import { initGitHubApp } from "./services/github.js";
import { initPool, closePool } from "./db/pool.js";
import { startNightlyCron } from "./services/scanner.js";

const PORT = process.env.PORT || 3000;

const app = express();

// ─── Raw body parsing for signature verification ────────────────────────────
// Express must provide the raw Buffer for HMAC verification, so we capture it
// before JSON parsing takes over.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name: "Sensei",
    description: "Autonomous Code Review Platform",
    endpoints: {
      health: "GET /health",
      webhook: "POST /webhooks/github",
    },
  });
});

app.use("/webhooks", webhookRouter);
app.use(healthRouter);

// ─── Startup ────────────────────────────────────────────────────────────────
async function start() {
  // Validate required env vars
  const required = [
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
    "WEBHOOK_SECRET",
    "DATABASE_URL",
    "REDIS_URL",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Initialize services
  await initPool();
  initQueue();
  initGitHubApp();
  startNightlyCron();

  app.listen(PORT, () => {
    console.log(`🥋 Sensei webhook server listening on :${PORT}`);
  });
}

// ─── Graceful shutdown ──────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n🛑 ${signal} received — shutting down…`);
  await closeQueue();
  await closePool();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((err) => {
  console.error("💥 Failed to start:", err);
  process.exit(1);
});
