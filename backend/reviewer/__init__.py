"""
Reviewer Module — RAG + Groq Generation + Confidence Scoring

Core autonomous review engine:
  1. Receives a new PR diff
  2. Retrieves relevant Review DNA via RAG
  3. Generates review comments using Groq LLaMA 3.3 70B
  4. Scores confidence per comment
  5. Posts explainable comments citing source PRs/engineers
"""
