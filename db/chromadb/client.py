"""
ChromaDB — Vector Store for Review DNA

Configuration and client initialization for ChromaDB.
Stores per-engineer review pattern embeddings with rich metadata.

Collections:
  - review_dna: Main collection for all review pattern embeddings
"""

import chromadb
from chromadb.config import Settings


def get_chroma_client(
    persist_directory: str = "./db/chromadb/data",
    host: str | None = None,
    port: int = 8000,
) -> chromadb.ClientAPI:
    """
    Initialize ChromaDB client.

    Args:
        persist_directory: Path for local persistent storage
        host: If set, connect to remote ChromaDB server
        port: Port for remote ChromaDB server

    Returns:
        ChromaDB client instance
    """
    if host:
        # Remote ChromaDB server
        return chromadb.HttpClient(host=host, port=port)
    else:
        # Local persistent storage
        return chromadb.PersistentClient(path=persist_directory)


def init_collections(client: chromadb.ClientAPI) -> dict:
    """
    Initialize all required ChromaDB collections.

    Returns:
        Dictionary of collection name → collection object
    """
    collections = {}

    # Main Review DNA collection
    collections["review_dna"] = client.get_or_create_collection(
        name="review_dna",
        metadata={
            "description": "Per-engineer review pattern embeddings",
            "hnsw:space": "cosine",  # Cosine similarity for semantic search
        },
    )

    # Nightly scan patterns collection
    collections["scan_patterns"] = client.get_or_create_collection(
        name="scan_patterns",
        metadata={
            "description": "Known risky patterns from corrections",
            "hnsw:space": "cosine",
        },
    )

    return collections
