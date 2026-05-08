"""
config.py — Sensei Configuration

Centralized configuration loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class SenseiConfig(BaseSettings):
    """Application configuration from environment variables."""

    # --- GitHub ---
    GITHUB_TOKEN: str = ""
    GITHUB_WEBHOOK_SECRET: str = ""

    # --- Groq ---
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://sensei:sensei@localhost:5432/sensei"

    # --- ChromaDB ---
    CHROMA_PERSIST_DIR: str = "./db/chromadb/data"
    CHROMA_HOST: Optional[str] = None
    CHROMA_PORT: int = 8000

    # --- Embedding ---
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # --- Review Engine ---
    CONFIDENCE_THRESHOLD: float = 0.80
    MAX_REVIEW_COMMENTS: int = 20

    # --- Scanner ---
    SCAN_CRON_SCHEDULE: str = "0 2 * * *"
    SCAN_ENABLED: bool = True

    # --- Server ---
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        env_prefix = "SENSEI_"


def get_config() -> SenseiConfig:
    """Load and return the application config."""
    return SenseiConfig()
