"""
Scanner Module — Nightly Codebase Scan Agent

Proactively scans the codebase on a nightly schedule to identify
risky patterns before PRs are even raised. Finds:
  - Anti-patterns matching past review corrections
  - Security vulnerabilities
  - Code smells that historically caused production bugs
  - Consistency violations across the codebase
"""
