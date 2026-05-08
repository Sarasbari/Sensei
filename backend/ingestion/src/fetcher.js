import { Octokit } from "@octokit/rest";

/**
 * Fetches merged PRs from a repository within the last `months`
 * @param {string} repoFullName - Format "owner/repo"
 * @param {number} months - Number of months to go back
 * @returns {Array} Array of PR objects with files and reviewComments
 */
export async function fetchMergedPRs(repoFullName, months = 6) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = repoFullName.split("/");

  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - months);

  const mergedPRs = [];
  console.log(`📡 Fetching PRs for ${repoFullName} merged since ${sinceDate.toISOString()}...`);

  // We paginate through closed PRs. Sorted by updated descending.
  for await (const response of octokit.paginate.iterator(octokit.rest.pulls.list, {
    owner,
    repo,
    state: "closed",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  })) {
    for (const pr of response.data) {
      const updatedAt = new Date(pr.updated_at);
      
      // Since it's sorted by updated desc, if we see one older than our date, we can stop fetching pages.
      if (updatedAt < sinceDate) {
        return mergedPRs;
      }

      // We only care about merged PRs
      if (pr.merged_at) {
        const mergedAt = new Date(pr.merged_at);
        if (mergedAt >= sinceDate) {
          console.log(`   - Found merged PR #${pr.number}`);
          
          // Fetch files (the diff)
          const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
            owner,
            repo,
            pull_number: pr.number,
          });

          // Fetch review comments
          const reviewComments = await octokit.paginate(octokit.rest.pulls.listReviewComments, {
            owner,
            repo,
            pull_number: pr.number,
          });

          mergedPRs.push({
            pr_number: pr.number,
            files: files,
            reviewComments: reviewComments,
            engineer: pr.user.login,
          });
        }
      }
    }
  }

  return mergedPRs;
}
