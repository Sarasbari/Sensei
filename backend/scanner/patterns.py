"""
patterns.py — Risk Pattern Definitions

Defines the risky patterns that the nightly scanner looks for.
Patterns are derived from:
  - Review DNA corrections (learned patterns)
  - Static rule definitions (OWASP, code smells)
  - Custom team-defined rules
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RiskPattern:
    """A defined risk pattern to scan for."""
    pattern_id: str
    name: str
    description: str
    severity: str
    category: str  # "security", "performance", "logic", "style"
    detection_method: str  # "regex", "ast", "embedding_similarity"
    pattern_data: dict = field(default_factory=dict)  # regex, AST rule, or embedding
    languages: list[str] = field(default_factory=list)
    enabled: bool = True


# Built-in risk patterns
BUILTIN_PATTERNS = [
    RiskPattern(
        pattern_id="SEC-001",
        name="Hardcoded Secrets",
        description="Detects hardcoded API keys, passwords, and tokens",
        severity="critical",
        category="security",
        detection_method="regex",
        pattern_data={
            "patterns": [
                r"(?i)(api[_-]?key|secret|password|token)\s*=\s*['\"][^'\"]+['\"]",
                r"(?i)bearer\s+[a-zA-Z0-9\-._~+/]+=*",
            ]
        },
    ),
    RiskPattern(
        pattern_id="SEC-002",
        name="SQL Injection Risk",
        description="Detects string concatenation in SQL queries",
        severity="critical",
        category="security",
        detection_method="regex",
        pattern_data={
            "patterns": [
                r"f['\"].*(?:SELECT|INSERT|UPDATE|DELETE).*\{.*\}",
                r"\".*(?:SELECT|INSERT|UPDATE|DELETE).*\"\s*\+",
            ]
        },
        languages=["python", "javascript", "typescript"],
    ),
    RiskPattern(
        pattern_id="PERF-001",
        name="N+1 Query Pattern",
        description="Detects potential N+1 query patterns in ORM usage",
        severity="high",
        category="performance",
        detection_method="embedding_similarity",
    ),
]
