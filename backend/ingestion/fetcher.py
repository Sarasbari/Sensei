"""
fetcher.py — GitHub PR History Fetcher

Pulls merged PRs, diffs, and review comments from target repositories
using the GitHub REST API. Handles pagination, rate limiting, and
incremental fetching (only new PRs since last sync).
"""

import httpx
from typing import AsyncGenerator
from datetime import datetime


class GitHubFetcher:
    """Fetches PR data from GitHub REST API."""

    BASE_URL = "https://api.github.com"

    def __init__(self, token: str, owner: str, repo: str):
        self.token = token
        self.owner = owner
        self.repo = repo
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
        }

    async def fetch_merged_prs(
        self, since: datetime | None = None, per_page: int = 100
    ) -> AsyncGenerator[dict, None]:
        """
        Fetch all merged PRs, optionally since a given date.
        Handles pagination automatically.
        """
        # TODO: Implement paginated PR fetching
        # GET /repos/{owner}/{repo}/pulls?state=closed&sort=updated&per_page=100
        pass

    async def fetch_pr_diff(self, pr_number: int) -> str:
        """
        Fetch the raw diff for a specific PR.
        Uses Accept: application/vnd.github.v3.diff header.
        """
        # TODO: Implement diff fetching
        pass

    async def fetch_pr_reviews(self, pr_number: int) -> list[dict]:
        """
        Fetch all review comments for a specific PR.
        GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews
        """
        # TODO: Implement review fetching
        pass

    async def fetch_review_comments(self, pr_number: int) -> list[dict]:
        """
        Fetch inline review comments for a specific PR.
        GET /repos/{owner}/{repo}/pulls/{pr_number}/comments
        """
        # TODO: Implement inline comment fetching
        pass

    async def fetch_pr_files(self, pr_number: int) -> list[dict]:
        """
        Fetch list of files changed in a PR.
        GET /repos/{owner}/{repo}/pulls/{pr_number}/files
        """
        # TODO: Implement file list fetching
        pass
