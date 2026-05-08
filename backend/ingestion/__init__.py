"""
Ingestion Module — Fetch + Chunk + Embed PR History

Pipeline for mining GitHub PR history:
  1. Fetch: Pull merged PRs, diffs, review comments via GitHub API
  2. Chunk: Split diffs and comments into reviewable segments
  3. Embed: Generate vector embeddings for Review DNA storage
"""
