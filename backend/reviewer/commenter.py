"""
commenter.py — GitHub PR Comment Poster

Posts Sensei's review comments to GitHub PRs.
Each comment includes:
  - The review finding
  - Confidence score badge
  - Source citations (which PR, which engineer)
  - Escalation notice if confidence < threshold
"""

from typing import Optional


class GitHubCommenter:
    """Posts explainable review comments to GitHub PRs."""

    def __init__(self, github_token: str):
        self.token = github_token
        self.headers = {
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github.v3+json",
        }

    async def post_review(
        self,
        owner: str,
        repo: str,
        pr_number: int,
        comments: list,
        overall_verdict: str = "COMMENT",
    ):
        """
        Post a full review with inline comments to a GitHub PR.

        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: PR number
            comments: List of ReviewComment objects
            overall_verdict: APPROVE, REQUEST_CHANGES, or COMMENT
        """
        # TODO: Build GitHub review payload
        # TODO: Format each comment with citations
        # TODO: POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews
        pass

    def _format_comment_body(self, comment) -> str:
        """
        Format a review comment with explainability metadata.

        Example output:
        ---
        🤖 **Sensei Review** | Confidence: 92% | Category: Security

        Potential SQL injection vulnerability. Use parameterized queries.

        📎 *Based on reviews by @senior-dev in PR #142, #287*
        ---
        """
        # TODO: Build markdown body with confidence badge
        # TODO: Add source PR and engineer citations
        # TODO: Add escalation notice if low confidence
        pass

    async def post_escalation_comment(
        self,
        owner: str,
        repo: str,
        pr_number: int,
        low_confidence_comments: list,
    ):
        """
        Post an escalation notice when confidence is below threshold.
        Tags relevant senior engineers for manual review.
        """
        # TODO: Build escalation comment body
        # TODO: Tag engineers whose DNA was matched
        pass
