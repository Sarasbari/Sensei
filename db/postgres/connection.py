"""
PostgreSQL — Relational Database for Metadata & Logs

Schema and connection management for PostgreSQL.
Stores:
  - PR metadata (numbers, authors, repos, timestamps)
  - Review records (Sensei's reviews, comments, confidence scores)
  - Escalation logs (triggers, assigned reviewers, resolutions)
  - Correction records (senior overrides for self-improvement)
  - Scan results (nightly findings, resolution status)
  - Accuracy metrics (per-sprint improvement tracking)
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker


def get_engine(database_url: str):
    """Create async SQLAlchemy engine."""
    return create_async_engine(
        database_url,
        echo=False,
        pool_size=10,
        max_overflow=20,
    )


def get_session_factory(engine) -> sessionmaker:
    """Create async session factory."""
    return sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
