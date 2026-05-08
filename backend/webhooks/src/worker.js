/**
 * worker.js — Unified BullMQ Worker
 *
 * Processes three queues:
 *   1. pr-review-queue    → generateReview() then postReviewComment()
 *   2. correction-queue   → handleCorrection()
 *   3. ingestion-queue    → fetchMergedPRs() + buildDNARecords() + embedAndStore()
 */

import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { initGitHubApp, getInstallationOctokit, postReviewComment, escalatePR } from "./services/github.js";
import { generateReview } from "./services/reviewer.js";
import { handleCorrection, validateAccepted } from "./services/feedback.js";
import { initPool, pool } from "./db/pool.js";
// Ingestion pipeline (Phase 1)
import { fetchMergedPRs } from "../../ingestion/src/fetcher.js";
import { buildDNARecords } from "../../ingestion/src/chunker.js";
import { embedAndStore } from "../../ingestion/src/embedder.js";

async function startWorker() {
  await initPool();
  initGitHubApp();

  const redis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

  // ─── Worker 1: PR Review Queue ────────────────────────────────────────
  const reviewWorker = new Worker(
    "pr-review-queue",
    async (job) => {
      const data = job.data;
      console.log(`\n🤖 Processing Job ${job.id} for PR #${data.pr.number} in ${data.repo.full_name}`);

      try {
        if (data.event === "pull_request_review_comment.edited") {
          await handleCorrection(data);
          return;
        }

        if (data.event === "pull_request.closed") {
          if (data.pr.merged) {
            await validateAccepted(data);
          } else {
            console.log(`PR #${data.pr.number} closed without merging. Ignoring.`);
          }
          return;
        }

        // Default review generation for PR opened/synchronize
        const octokit = await getInstallationOctokit(data.installation_id);
        const [owner, repo] = data.repo.full_name.split("/");

        const diffResponse = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
          owner,
          repo,
          pull_number: data.pr.number,
          headers: { accept: "application/vnd.github.v3.diff" },
        });
        const diffStr = diffResponse.data;

        if (!diffStr || typeof diffStr !== "string") {
          console.log("No diff found or diff empty. Skipping.");
          return;
        }

        const repoId = data.repo.full_name;
        const { comments, escalate } = await generateReview(diffStr, repoId);

        if (comments.length > 0) {
          console.log(`💬 Posting ${comments.length} review comments to PR #${data.pr.number}...`);

          for (const c of comments) {
            await postReviewComment(octokit, data.pr.number, repoId, c, data.pr.head_sha);
          }

          if (escalate) {
            const seniorUsername = process.env.SENIOR_ENGINEER_USERNAME || data.pr.author;
            await escalatePR(octokit, data.pr.number, repoId, "Some AI review comments had low confidence.", seniorUsername);
          }

          console.log("✅ Review posted successfully.");
        } else {
          console.log("✅ Code looks solid, no comments to post.");
          await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
            owner,
            repo,
            issue_number: data.pr.number,
            body: "### 🥋 Sensei Autonomous Review\n\nLooks good to me! No major issues found in this PR. 🚀",
          });
        }
      } catch (err) {
        console.error("🔴 Error processing review job:", err);
        throw err;
      }
    },
    { connection: redis, concurrency: 2 }
  );

  reviewWorker.on("completed", (job) => console.log(`🎉 Review Job ${job.id} completed.`));
  reviewWorker.on("failed", (job, err) => console.error(`❌ Review Job ${job.id} failed: ${err.message}`));

  // ─── Worker 2: Correction Queue ───────────────────────────────────────
  const correctionWorker = new Worker(
    "correction-queue",
    async (job) => {
      const data = job.data;
      console.log(`\n🛠️ Correction Job ${job.id} for PR #${data.pr.number}`);
      await handleCorrection(data);
    },
    { connection: redis, concurrency: 1 }
  );

  correctionWorker.on("completed", (job) => console.log(`🎉 Correction Job ${job.id} completed.`));
  correctionWorker.on("failed", (job, err) => console.error(`❌ Correction Job ${job.id} failed: ${err.message}`));

  // ─── Worker 3: Ingestion Queue ────────────────────────────────────────
  const ingestionWorker = new Worker(
    "ingestion-queue",
    async (job) => {
      const data = job.data;
      const { repo_full_name } = data;
      console.log(`\n📥 Ingestion Job ${job.id} for ${repo_full_name}`);

      try {
        // Phase 1: Fetch merged PRs
        const prs = await fetchMergedPRs(repo_full_name, 6);
        console.log(`   📡 Fetched ${prs.length} merged PRs`);

        // Phase 1: Build DNA records
        const records = buildDNARecords(prs);
        console.log(`   🧬 Built ${records.length} DNA records`);

        // Phase 1: Embed and store in ChromaDB
        await embedAndStore(records, repo_full_name);

        // Update repo status in DB
        await pool().query(
          `UPDATE repos SET ingestion_status = 'complete', ingested_at = NOW() WHERE full_name = $1`,
          [repo_full_name]
        );

        console.log(`✅ Ingestion complete for ${repo_full_name}`);
      } catch (err) {
        await pool().query(
          `UPDATE repos SET ingestion_status = 'failed' WHERE full_name = $1`,
          [repo_full_name]
        );
        console.error(`🔴 Ingestion failed for ${repo_full_name}:`, err);
        throw err;
      }
    },
    { connection: redis, concurrency: 1 }
  );

  ingestionWorker.on("completed", (job) => console.log(`🎉 Ingestion Job ${job.id} completed.`));
  ingestionWorker.on("failed", (job, err) => console.error(`❌ Ingestion Job ${job.id} failed: ${err.message}`));

  console.log(`👷 Workers started: pr-review-queue, correction-queue, ingestion-queue`);
}

startWorker().catch((err) => {
  console.error("💥 Failed to start worker:", err);
  process.exit(1);
});
