/**
 * queue.js — BullMQ Queue Service
 *
 * Manages multiple queues:
 *   - pr-review-queue     → generateReview + postReviewComment
 *   - correction-queue    → handleCorrection
 *   - ingestion-queue     → fetchMergedPRs + embedAndStore
 *
 * Provides:
 *   - enqueue(data)              → add to pr-review-queue
 *   - enqueueCorrection(data)    → add to correction-queue
 *   - enqueueIngestion(data)     → add to ingestion-queue
 *   - getQueuedJobCount()        → waiting + active jobs in review queue
 *   - closeQueue()               → graceful shutdown
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";

const QUEUE_NAMES = {
  review: "pr-review-queue",
  correction: "correction-queue",
  ingestion: "ingestion-queue",
};

/** @type {IORedis | null} */
let redis = null;

/** @type {Record<string, Queue>} */
const queues = {};

/**
 * Initialize all BullMQ queues and their shared Redis connection.
 * Called once at server startup.
 */
export function initQueue() {
  redis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
  });

  redis.on("error", (err) => console.error("🔴 Redis error:", err.message));
  redis.on("connect", () => console.log("🟢 Redis connected"));

  for (const [key, name] of Object.entries(QUEUE_NAMES)) {
    queues[key] = new Queue(name, { connection: redis });
    console.log(`📦 BullMQ queue "${name}" initialized`);
  }
}

/**
 * Add a job to the pr-review-queue.
 * Fire-and-forget: pushes to Redis and returns the job ID.
 *
 * @param {object} data — The PR data payload
 * @returns {Promise<string>} — The BullMQ job ID
 */
export async function enqueue(data) {
  if (!queues.review) throw new Error("Queue not initialized");

  const job = await queues.review.add("review-pr", data, {
    jobId: data.delivery_id,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 30 * 24 * 3600 },
  });

  return job.id;
}

/**
 * Add a job to the correction-queue.
 *
 * @param {object} data — Correction event payload
 * @returns {Promise<string>}
 */
export async function enqueueCorrection(data) {
  if (!queues.correction) throw new Error("Queue not initialized");

  const job = await queues.correction.add("handle-correction", data, {
    jobId: `correction-${data.delivery_id}`,
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 14 * 24 * 3600 },
  });

  return job.id;
}

/**
 * Add a job to the ingestion-queue.
 *
 * @param {object} data — { repo_full_name, installation_id }
 * @returns {Promise<string>}
 */
export async function enqueueIngestion(data) {
  if (!queues.ingestion) throw new Error("Queue not initialized");

  const job = await queues.ingestion.add("ingest-repo", data, {
    jobId: `ingest-${data.repo_full_name}-${Date.now()}`,
    attempts: 2,
    backoff: { type: "fixed", delay: 10000 },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 14 * 24 * 3600 },
  });

  return job.id;
}

/**
 * Get the count of waiting + active jobs in the review queue.
 * Used by the /health endpoint.
 *
 * @returns {Promise<number|null>}
 */
export async function getQueuedJobCount() {
  if (!queues.review) return null;
  const counts = await queues.review.getJobCounts("waiting", "active", "delayed");
  return counts.waiting + counts.active + counts.delayed;
}

/**
 * Gracefully close all queues and Redis connection.
 */
export async function closeQueue() {
  for (const [key, q] of Object.entries(queues)) {
    await q.close();
    console.log(`📦 Queue "${key}" closed`);
  }
  if (redis) {
    await redis.quit();
    console.log("🔴 Redis disconnected");
  }
}
