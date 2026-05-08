# 🥋 Sensei

> Generative + Agentic AI platform for autonomous code review

## Problem

Engineering teams scale headcount but cannot scale senior code review quality:
- **1:8** senior-to-junior ratio → PRs wait **3.2 days** for review
- **40%** of production bugs trace to unreviewed or rubber-stamped PRs
- When seniors leave, their judgment leaves with them

## Solution

Sensei is an AI platform that captures senior review knowledge and applies it autonomously:

| Capability | Description |
|---|---|
| **Review DNA Mining** | Passively mines GitHub PR history to build per-engineer review profiles |
| **Autonomous Review** | RAG over Review DNA via Groq LLaMA 3.3 70B |
| **Explainable Comments** | Every comment cites source PRs and engineers |
| **Human Escalation** | Escalates to humans when confidence < 80% |
| **Self-Improvement** | Re-embeds senior corrections each sprint |
| **Proactive Scanning** | Nightly codebase scans for risky patterns |

## Architecture

```
GitHub PR History → Ingestion Pipeline → Review DNA (ChromaDB)
                                              ↓
New PR Webhook → RAG Retrieval → Groq LLaMA 3.3 70B → Review Comments
                                              ↓
                                  Confidence < 80%? → Escalate to Human
                                              ↓
                                  Senior Corrections → Re-embed (sprint)
                                              ↓
                                  Nightly Cron → Proactive Codebase Scan
```

## Project Structure

```
Sensei/
├── backend/
│   ├── webhooks/       → GitHub PR event receiver
│   ├── ingestion/      → Fetch + chunk + embed PR history
│   ├── dna/            → Build + query + update Review DNA
│   ├── reviewer/       → RAG + Groq generation + confidence
│   ├── escalation/     → GitHub review request trigger
│   ├── scanner/        → Nightly codebase scan agent
│   └── api/            → REST endpoints for dashboard
├── frontend/
│   ├── dashboard/      → PR metrics, DNA map, explainability log
│   └── components/     → Charts, tables, review cards
├── db/
│   ├── chromadb/       → Vector store (Review DNA)
│   └── postgres/       → PR metadata, escalation logs, accuracy
├── config.py           → Centralized configuration
├── pyproject.toml      → Dependencies and project metadata
└── .env.example        → Environment variable template
```

## Tech Stack

- **LLM**: Groq LLaMA 3.3 70B
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2)
- **Vector Store**: ChromaDB
- **Database**: PostgreSQL (async via SQLAlchemy + asyncpg)
- **Backend**: FastAPI + uvicorn
- **Frontend**: Vanilla HTML/CSS/JS dashboard
- **Integration**: GitHub REST API + Webhooks

## Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/your-org/Sensei.git
cd Sensei

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# 3. Install dependencies
pip install -e ".[dev]"

# 4. Configure environment
copy .env.example .env
# Edit .env with your GitHub token, Groq API key, and database URL

# 5. Run the backend
uvicorn backend.api.app:app --reload
```

## License

MIT