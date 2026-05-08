import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { initGitHubApp, getInstallationOctokit, postReviewComment, escalatePR } from "./services/github.js";
import { generateReview } from "./services/reviewer.js";
import { handleCorrection, validateAccepted } from "./services/feedback.js";

initGitHubApp();

const QUEUE_NAME = "pr-review-queue";

const redis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
  QUEUE_NAME,
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
      // 1. Get Octokit for this installation
      const octokit = await getInstallationOctokit(data.installation_id);

      // 2. Fetch the PR diff
      const [owner, repo] = data.repo.full_name.split("/");
      const diffResponse = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
        owner,
        repo,
        pull_number: data.pr.number,
        headers: {
          accept: "application/vnd.github.v3.diff",
        },
      });
      const diffStr = diffResponse.data;

      if (!diffStr || typeof diffStr !== "string") {
        console.log("No diff found or diff empty. Skipping.");
        return;
      }

      // 3. Generate structured review using Phase 2A RAG Engine
      const repoId = data.repo.full_name;
      const { comments, escalate } = await generateReview(diffStr, repoId);

      // 4. Post review to GitHub
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
      console.error("🔴 Error processing job:", err);
      throw err; // triggers BullMQ retry
    }
  },
  { connection: redis }
);

worker.on("completed", (job) => console.log(`🎉 Job ${job.id} completed.`));
worker.on("failed", (job, err) => console.error(`❌ Job ${job.id} failed with ${err.message}`));

console.log(`👷 Worker started for queue "${QUEUE_NAME}"`);
