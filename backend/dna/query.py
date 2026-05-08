"""
query.py — Review DNA Retriever

Queries the Review DNA vector store to find the most relevant
review patterns for a given code diff. Returns ranked results
with source attribution (which engineer, which PR, which comment).
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class DNAMatch:
    """A single match from the Review DNA vector store."""
    chunk_id: str
    content: str
    reviewer: str
    source_pr: int
    source_repo: str
    similarity_score: float
    category: Optional[str] = None
    file_path: Optional[str] = None
    metadata: dict = None


class DNARetriever:
    """Retrieves relevant review patterns from Review DNA."""

    def __init__(self, chroma_client, collection_name: str = "review_dna"):
        self.client = chroma_client
        self.collection_name = collection_name

    def query(
        self,
        query_embedding: list[float],
        n_results: int = 10,
        filter_engineer: str | None = None,
        filter_language: str | None = None,
    ) -> list[DNAMatch]:
        """
        Query Review DNA for similar review patterns.

        Args:
            query_embedding: Vector embedding of the code to review
            n_results: Number of results to return
            filter_engineer: Optional filter to a specific engineer's DNA
            filter_language: Optional filter by programming language

        Returns:
            Ranked list of DNAMatch objects with source attribution
        """
        # TODO: Build ChromaDB where clause from filters
        # TODO: Query collection with embedding
        # TODO: Parse results into DNAMatch objects
        pass

    def query_by_text(
        self,
        text: str,
        n_results: int = 10,
        **filters,
    ) -> list[DNAMatch]:
        """
        Query Review DNA using raw text (ChromaDB handles embedding).
        Convenience method for direct text search.
        """
        # TODO: Use ChromaDB's built-in text query
        pass
