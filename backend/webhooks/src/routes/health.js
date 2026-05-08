/**
 * health.js — Health Check Route
 *
 * GET /health
 *
 * Returns system status and the number of queued jobs in pr-review-queue.
 */

import { Router } from "express";
import { getQueuedJobCount } from "../services/queue.js";
import { pool } from "../db/pool.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  try {
    const queuedJobs = await getQueuedJobCount();

    // Quick DB connectivity check
    let dbOk = false;
    try {
      await pool().query("SELECT 1");
      dbOk = true;
    } catch {
      /* db unreachable */
    }

    return res.status(200).json({
      status: "ok",
      queued_jobs: queuedJobs,
      services: {
        redis: queuedJobs !== null,
        postgres: dbOk,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: "degraded",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});
