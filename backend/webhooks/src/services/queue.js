/**
 * queue.js — BullMQ Queue Service
 *
 * Manages the `pr-review-queue` backed by Redis via ioredis.
 * Provides:
 *   - enqueue(data) → adds a job and returns the job ID (fire-and-forget)
 *   - getQueuedJobCount() → returns the number of waiting + active jobs
 *   - closeQueue() → graceful shutdown
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";

const QUEUE_NAME = "pr-review-queue";

/** @type {IORedis | null} */
let redis = null;

/** @type {Queue | null} */
let queue = null;

/**
 * Initialize the BullMQ queue and its Redis connection.
 * Called once at server startup.
 */
export function initQueue() {
  redis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
  });

  redis.on("error", (err) => console.error("🔴 Redis error:", err.message));
  redis.on("connect", () => console.log("🟢 Redis connected"));

  queue = new Queue(QUEUE_NAME, { connection: redis });
  console.log(`📦 BullMQ queue "${QUEUE_NAME}" initialized`);
}

/**
 * Add a job to the pr-review-queue.
 *
 * This is fire-and-forget: it pushes to Redis and returns the job ID
 * without waiting for the job to be processed.
 *
 * @param {object} data — The PR data payload
 * @returns {Promise<string>} — The BullMQ job ID
 */
export async function enqueue(data) {
  if (!queue) throw new Error("Queue not initialized");

  const job = await queue.add("review-pr", data, {
    // Unique per delivery to prevent duplicate processing on GitHub retries
    jobId: data.delivery_id,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 7 * 24 * 3600 },   // keep completed jobs 7 days
    removeOnFail: { age: 30 * 24 * 3600 },       // keep failed jobs 30 days
  });

  return job.id;
}

/**
 * Get the count of waiting + active jobs in the queue.
 * Used by the /health endpoint.
 *
 * @returns {Promise<number|null>}
 */
export async function getQueuedJobCount() {
  if (!queue) return null;
  const counts = await queue.getJobCounts("waiting", "active", "delayed");
  return counts.waiting + counts.active + counts.delayed;
}

/**
 * Gracefully close the queue and Redis connection.
 */
export async function closeQueue() {
  if (queue) {
    await queue.close();
    console.log("📦 Queue closed");
  }
  if (redis) {
    await redis.quit();
    console.log("🔴 Redis disconnected");
  }
}
