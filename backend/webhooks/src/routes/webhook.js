/**
 * webhook.js — GitHub Webhook Route
 *
 * POST /webhooks/github
 *
 * Accepts GitHub App webhook events, verifies the HMAC signature,
 * filters for the events we care about, and pushes PR data to
 * the BullMQ pr-review-queue. Responds 200 immediately — never
 * awaits the queue job.
 */

import { Router } from "express";
import { verifySignature } from "../middleware/verifySignature.js";
import { enqueue, enqueueCorrection } from "../services/queue.js";
import { upsertRepo } from "../db/pool.js";

export const webhookRouter = Router();

/**
 * Map of GitHub event + action combinations we process.
 * Everything else is acknowledged but ignored.
 */
const ACCEPTED_EVENTS = new Set([
  "pull_request.opened",
  "pull_request.synchronize",
  "pull_request_review_comment.edited",
  "pull_request.closed"
]);

webhookRouter.post("/github", verifySignature, async (req, res) => {
  const event = req.headers["x-github-event"];
  const delivery = req.headers["x-github-delivery"];
  const payload = req.body;
  const action = payload.action;
  const eventAction = `${event}.${action}`;

  console.log(`📩 Webhook ${delivery} — ${eventAction}`);

  // ── Always respond 200 first ──────────────────────────────────────────
  // GitHub retries on non-2xx, so ack immediately even if we skip the event.
  if (!ACCEPTED_EVENTS.has(eventAction)) {
    return res.status(200).json({ status: "ignored", event: eventAction });
  }

  // ── Extract PR data ───────────────────────────────────────────────────
  const pr = payload.pull_request;
  const repo = payload.repository;
  const installation = payload.installation;

  const jobData = {
    delivery_id: delivery,
    event: eventAction,
    pr: {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      html_url: pr.html_url,
      diff_url: pr.diff_url,
      state: pr.state,
      author: pr.user.login,
      head_sha: pr.head.sha,
      base_ref: pr.base.ref,
      head_ref: pr.head.ref,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      merged: pr.merged,
    },
    repo: {
      id: repo.id,
      full_name: repo.full_name,
      default_branch: repo.default_branch,
    },
    installation_id: installation?.id ?? null,
    received_at: new Date().toISOString(),
  };

  // If it's a comment event, attach comment data
  if (event === "pull_request_review_comment") {
    jobData.comment = {
      id: payload.comment.id,
      body: payload.comment.body,
      path: payload.comment.path,
      user: payload.comment.user.login,
      original_body: payload.changes?.body?.from || "",
    };
  }

  // ── Persist the repo if we haven't seen it ────────────────────────────
  try {
    await upsertRepo(repo.id, repo.full_name, installation?.id ?? null);
  } catch (err) {
    // Non-fatal — we still want to enqueue the job
    console.error("⚠️  Failed to upsert repo:", err.message);
  }

  // ── Fire-and-forget enqueue ───────────────────────────────────────────
  // enqueue() does NOT await the job — it only adds to Redis and returns the
  // job ID. The worker process picks it up separately.
  try {
    let jobId;
    if (eventAction === "pull_request_review_comment.edited") {
      jobId = await enqueueCorrection(jobData);
      console.log(`✅ Queued correction job ${jobId} for PR #${pr.number} (${repo.full_name})`);
    } else {
      jobId = await enqueue(jobData);
      console.log(`✅ Queued review job ${jobId} for PR #${pr.number} (${repo.full_name})`);
    }
  } catch (err) {
    console.error("⚠️  Failed to enqueue:", err.message);
    // Still return 200 — we don't want GitHub to retry because of our queue issue.
  }

  return res.status(200).json({ status: "queued", event: eventAction });
});
