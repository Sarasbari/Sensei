/**
 * github.js — Octokit GitHub App Client
 *
 * Authenticates as a GitHub App using the private key and app ID.
 * Provides per-installation authenticated Octokit instances for
 * making API calls on behalf of the installed app.
 */

import { App } from "@octokit/app";

/** @type {App | null} */
let githubApp = null;

/**
 * Initialize the Octokit App singleton.
 * Called once at server startup.
 */
export function initGitHubApp() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!appId || !privateKey) {
    throw new Error("GITHUB_APP_ID and GITHUB_PRIVATE_KEY are required");
  }

  // The private key may come as a base64-encoded string in env
  // (common for single-line env vars in CI/CD). Decode if needed.
  let decodedKey = privateKey;
  if (!privateKey.startsWith("-----BEGIN")) {
    decodedKey = Buffer.from(privateKey, "base64").toString("utf8");
  }

  githubApp = new App({
    appId,
    privateKey: decodedKey,
    webhooks: { secret: webhookSecret },
  });

  console.log(`🐙 GitHub App initialized (ID: ${appId})`);
}

/**
 * Get an authenticated Octokit instance for a specific installation.
 *
 * This returns a client that can make API calls as the app installed
 * on a particular organization/user account.
 *
 * @param {number} installationId — The GitHub App installation ID
 * @returns {Promise<import("@octokit/core").Octokit>}
 */
export async function getInstallationOctokit(installationId) {
  if (!githubApp) {
    throw new Error("GitHub App not initialized — call initGitHubApp() first");
  }
  return githubApp.getInstallationOctokit(installationId);
}

/**
 * Get the raw App instance (for direct use if needed).
 * @returns {App}
 */
export function getApp() {
  if (!githubApp) {
    throw new Error("GitHub App not initialized");
  }
  return githubApp;
}

import { recordReview, recordEscalation } from "../db/pool.js";

/**
 * Post inline review comment to specific file + line on GitHub PR
 */
export async function postReviewComment(octokit, prNumber, repoFullName, comment, commitId) {
  const [owner, repo] = repoFullName.split("/");

  const markdown = `## Sensei Review — \`${comment.file}:${comment.line}\`
**Issue:** ${comment.issue} | **Severity:** ${comment.severity}
**Why:** ${comment.explanation}
**Suggested Fix:**
\`\`\`javascript
${comment.suggestion}
\`\`\`
**Source:** ${comment.source_engineer || 'Unknown'} flagged this in PR #${comment.source_pr || 'N/A'}
**Confidence:** ${(comment.confidence * 100).toFixed(1)}% | Powered by Groq LLaMA 3.3 70B`;

  try {
    // Try posting as an inline PR review comment
    await octokit.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/comments", {
      owner,
      repo,
      pull_number: prNumber,
      body: markdown,
      commit_id: commitId,
      path: comment.file,
      line: comment.line,
      side: "RIGHT",
    });
    
    await recordReview(prNumber, repoFullName, comment.file, comment.line, markdown, "posted");
  } catch (err) {
    // Fallback if line is not part of the diff
    console.warn(`Could not post inline comment at ${comment.file}:${comment.line}, falling back to general comment. Reason: ${err.message}`);
    await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
      owner,
      repo,
      issue_number: prNumber,
      body: markdown,
    });
    await recordReview(prNumber, repoFullName, comment.file, comment.line, markdown, "posted_fallback");
  }
}

/**
 * Escalate PR to a senior engineer.
 */
export async function escalatePR(octokit, prNumber, repoFullName, reason, seniorUsername) {
  const [owner, repo] = repoFullName.split("/");

  try {
    // Request review
    if (seniorUsername) {
      await octokit.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers", {
        owner,
        repo,
        pull_number: prNumber,
        reviewers: [seniorUsername],
      });
    }

    // Add label
    try {
      await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/labels", {
        owner,
        repo,
        issue_number: prNumber,
        labels: ["sensei-escalated"],
      });
    } catch (labelErr) {
      console.warn("Failed to add label, might need to create it first:", labelErr.message);
    }

    // Post comment
    await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
      owner,
      repo,
      issue_number: prNumber,
      body: `⚠️ **Sensei Escalation** ⚠️\n\n@${seniorUsername}, Sensei has flagged this PR for human review.\n\n**Reason:** ${reason}`,
    });

    await recordEscalation(prNumber, repoFullName, reason, seniorUsername || "none");
    console.log(`Escalated PR #${prNumber} to @${seniorUsername}`);
  } catch (err) {
    console.error("Failed to escalate PR:", err.message);
  }
}
