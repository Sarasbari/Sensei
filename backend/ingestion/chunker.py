"""
chunker.py — PR Diff & Comment Chunker

Splits raw PR diffs and review comments into semantically meaningful
chunks suitable for embedding. Each chunk preserves:
  - File path context
  - Hunk-level diff boundaries
  - Reviewer identity and comment thread context
  - Language/framework metadata
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ReviewChunk:
    """A single reviewable unit extracted from a PR."""
    chunk_id: str
    pr_number: int
    repo: str
    reviewer: str
    chunk_type: str  # "diff_hunk", "review_comment", "review_body"
    content: str
    file_path: Optional[str] = None
    language: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    metadata: dict = field(default_factory=dict)


class PRChunker:
    """Chunks PR diffs and comments into embeddable segments."""

    def __init__(self, max_chunk_tokens: int = 512, overlap_tokens: int = 64):
        self.max_chunk_tokens = max_chunk_tokens
        self.overlap_tokens = overlap_tokens

    def chunk_diff(self, diff_text: str, pr_number: int, repo: str) -> list[ReviewChunk]:
        """
        Split a unified diff into hunk-level chunks.
        Each hunk becomes one ReviewChunk with file path and line context.
        """
        # TODO: Parse unified diff format
        # TODO: Split into per-file, per-hunk chunks
        # TODO: Detect language from file extension
        pass

    def chunk_review_comments(
        self, comments: list[dict], pr_number: int, repo: str
    ) -> list[ReviewChunk]:
        """
        Convert inline review comments into chunks.
        Groups threaded comments together for context preservation.
        """
        # TODO: Group comments by thread/conversation
        # TODO: Include surrounding diff context
        pass

    def chunk_review_body(
        self, review: dict, pr_number: int, repo: str
    ) -> list[ReviewChunk]:
        """
        Chunk top-level review body text (approve/request changes).
        """
        # TODO: Extract review body with reviewer identity
        pass
