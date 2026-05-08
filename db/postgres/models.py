"""
models.py — SQLAlchemy ORM Models

Database models for Sensei's relational data.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime


class Base(DeclarativeBase):
    pass


class Repository(Base):
    """Tracked GitHub repository."""
    __tablename__ = "repositories"

    id = Column(String, primary_key=True)
    owner = Column(String, nullable=False)
    name = Column(String, nullable=False)
    full_name = Column(String, unique=True, nullable=False)
    default_branch = Column(String, default="main")
    webhook_active = Column(Boolean, default=False)
    last_ingested_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    reviews = relationship("Review", back_populates="repository")


class Review(Base):
    """A Sensei review of a PR."""
    __tablename__ = "reviews"

    id = Column(String, primary_key=True)
    pr_number = Column(Integer, nullable=False)
    pr_title = Column(String, nullable=False)
    pr_author = Column(String, nullable=False)
    repo_id = Column(String, ForeignKey("repositories.id"), nullable=False)
    status = Column(String, default="pending")  # pending, completed, escalated
    avg_confidence = Column(Float, nullable=True)
    comment_count = Column(Integer, default=0)
    escalated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    repository = relationship("Repository", back_populates="reviews")
    comments = relationship("ReviewComment", back_populates="review")


class ReviewComment(Base):
    """Individual review comment posted by Sensei."""
    __tablename__ = "review_comments"

    id = Column(String, primary_key=True)
    review_id = Column(String, ForeignKey("reviews.id"), nullable=False)
    file_path = Column(String, nullable=False)
    line_number = Column(Integer, nullable=False)
    body = Column(Text, nullable=False)
    severity = Column(String, nullable=False)  # critical, warning, suggestion, nitpick
    confidence = Column(Float, nullable=False)
    category = Column(String, nullable=False)  # logic, security, performance, style, testing
    source_prs = Column(JSON, default=list)  # List of PR numbers
    source_engineers = Column(JSON, default=list)  # List of engineer logins
    created_at = Column(DateTime, default=datetime.utcnow)

    review = relationship("Review", back_populates="comments")


class Escalation(Base):
    """Escalation event when confidence < threshold."""
    __tablename__ = "escalations"

    id = Column(String, primary_key=True)
    review_id = Column(String, ForeignKey("reviews.id"), nullable=False)
    pr_number = Column(Integer, nullable=False)
    repo_full_name = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    assigned_reviewers = Column(JSON, default=list)
    low_confidence_comments = Column(JSON, default=list)
    status = Column(String, default="pending")  # pending, resolved, dismissed
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Correction(Base):
    """Senior correction for self-improvement loop."""
    __tablename__ = "corrections"

    id = Column(String, primary_key=True)
    review_comment_id = Column(String, ForeignKey("review_comments.id"), nullable=False)
    original_body = Column(Text, nullable=False)
    corrected_body = Column(Text, nullable=False)
    corrector_login = Column(String, nullable=False)
    correction_type = Column(String, nullable=False)  # edit, dismiss, override
    sprint_id = Column(String, nullable=True)
    re_embedded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScanRun(Base):
    """A nightly scan execution."""
    __tablename__ = "scan_runs"

    id = Column(String, primary_key=True)
    repo_full_name = Column(String, nullable=False)
    branch = Column(String, default="main")
    files_scanned = Column(Integer, default=0)
    findings_count = Column(Integer, default=0)
    status = Column(String, default="running")  # running, completed, failed
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class ScanFinding(Base):
    """Individual finding from a nightly scan."""
    __tablename__ = "scan_findings"

    id = Column(String, primary_key=True)
    scan_run_id = Column(String, ForeignKey("scan_runs.id"), nullable=False)
    file_path = Column(String, nullable=False)
    line_start = Column(Integer, nullable=False)
    line_end = Column(Integer, nullable=False)
    pattern_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=True)
    github_issue_url = Column(String, nullable=True)
    status = Column(String, default="open")  # open, resolved, ignored
    created_at = Column(DateTime, default=datetime.utcnow)


class AccuracyMetric(Base):
    """Per-sprint accuracy tracking."""
    __tablename__ = "accuracy_metrics"

    id = Column(String, primary_key=True)
    sprint_id = Column(String, nullable=False)
    total_reviews = Column(Integer, default=0)
    total_comments = Column(Integer, default=0)
    corrections_count = Column(Integer, default=0)
    escalations_count = Column(Integer, default=0)
    accuracy_rate = Column(Float, nullable=True)  # 1 - (corrections / total_comments)
    avg_confidence = Column(Float, nullable=True)
    measured_at = Column(DateTime, default=datetime.utcnow)
