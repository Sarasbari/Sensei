# 🥋 Sensei — Autonomous AI Code Review Platform

Sensei is an autonomous code review bot that learns from your team's senior engineers and reviews every PR using RAG-powered AI. It posts inline GitHub comments, escalates uncertain reviews to humans, improves from corrections, and proactively scans for risks.

---

## 🏗️ Architecture

```
GitHub PR → Webhook → BullMQ → AI Review (Groq + ChromaDB RAG) → GitHub Comments
                                    ↕
                           Self-Improvement Loop
                     (senior corrections → re-embed)
                                    ↕
                        React Explainability Dashboard
```

### Components

| Component | Directory | Description |
|---|---|---|
| **Webhook Server** | `backend/webhooks/` | Express server receiving GitHub App events |
| **Worker** | `backend/webhooks/src/worker.js` | BullMQ workers for reviews, corrections, ingestion |
| **AI Reviewer** | `backend/webhooks/src/services/reviewer.js` | RAG engine: ChromaDB retrieval + Groq LLM |
| **Ingestion Pipeline** | `backend/ingestion/` | Fetches merged PRs, builds DNA records, embeds |
| **Nightly Scanner** | `backend/webhooks/src/services/scanner.js` | Proactive risk detection via cron |
| **Dashboard** | `frontend/dashboard-app/` | React + TypeScript explainability UI |

---

## 🚀 Quick Start (3 commands)

### Prerequisites
- **Node.js** ≥ 20
- **Docker** (for Postgres, Redis, ChromaDB)
- **GitHub App** created ([guide](https://docs.github.com/en/apps/creating-github-apps))
- **Groq API Key** ([free at console.groq.com](https://console.groq.com/keys))

### 1. Start infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL (port 5433), Redis (6379), and ChromaDB (8000) with persistent named volumes.

### 2. Install & configure

```bash
# Backend
cd backend/webhooks
npm install
cp .env.example .env
# Edit .env with your GitHub App credentials and Groq API key

# Seed demo data (optional — creates 50 DNA records + 2 weeks of reviews)
npm run seed

# Frontend
cd ../../frontend/dashboard-app
npm install
```

### 3. Run

```bash
# Terminal 1: Backend server
cd backend/webhooks && npm run start

# Terminal 2: Worker (processes review jobs)
cd backend/webhooks && npm run worker

# Terminal 3: Dashboard
cd frontend/dashboard-app && npx vite

# Terminal 4: Expose to GitHub (optional)
ngrok http 3001
```

Then open **http://localhost:5173** for the dashboard.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/webhooks/github` | GitHub App webhook receiver |
| `POST` | `/api/repos/connect` | Connect a repo + start ingestion |
| `GET` | `/api/metrics/cycle-time` | PR cycle time before/after Sensei |
| `GET` | `/api/reviews` | Review log with pagination |
| `GET` | `/api/reviews/:id/trace` | RAG trace for a specific review |
| `GET` | `/api/escalations` | Escalation queue |
| `POST` | `/api/escalations/:id/resolve` | Resolve an escalation |
| `GET` | `/api/engineers` | Engineer DNA profiles |
| `GET` | `/api/dashboard/stats` | Dashboard overview stats |
| `GET` | `/health` | Service health check |

### Connect a repo

```bash
curl -X POST http://localhost:3001/api/repos/connect \
  -H "Content-Type: application/json" \
  -d '{"github_repo_full_name": "owner/repo", "installation_id": 12345}'
```

---

## 🧪 BullMQ Queues

| Queue | Worker | What it does |
|---|---|---|
| `pr-review-queue` | Review Worker | Fetches diff → RAG retrieval → Groq review → GitHub comment |
| `correction-queue` | Correction Worker | Processes senior edits → re-embeds corrected patterns |
| `ingestion-queue` | Ingestion Worker | Fetches 6mo merged PRs → builds DNA → embeds in ChromaDB |

---

## 📊 Dashboard Screens

| Route | Screen | Features |
|---|---|---|
| `/dashboard` | Overview | Stat cards, cycle time chart, escalation gauge, accuracy sparkline |
| `/reviews` | Explainability Log | Review table with RAG trace drawer |
| `/dna` | Review DNA Map | Engineer cards + pattern heatmap |
| `/escalations` | Escalation Queue | Open/resolved with resolve actions |

---

## 🔧 Environment Variables

See [`.env.example`](backend/webhooks/.env.example) for the complete list. Required:

| Variable | Description |
|---|---|
| `GITHUB_APP_ID` | Your GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Base64-encoded private key |
| `WEBHOOK_SECRET` | GitHub webhook secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `GROQ_API_KEY` | Groq API key for LLM inference |

---

## 📁 Project Structure

```
Sensei/
├── docker-compose.yml          # Local infrastructure
├── backend/
│   ├── ingestion/              # Phase 1: PR DNA ingestion pipeline
│   │   └── src/
│   │       ├── fetcher.js      # GitHub API: fetch merged PRs
│   │       ├── chunker.js      # Build DNA records from diffs + comments
│   │       └── embedder.js     # Embed and store in ChromaDB
│   └── webhooks/               # Phase 1-3: Webhook server + workers
│       ├── src/
│       │   ├── server.js       # Express entry point
│       │   ├── worker.js       # Unified BullMQ worker (3 queues)
│       │   ├── routes/
│       │   │   ├── webhook.js  # POST /webhooks/github
│       │   │   ├── api.js      # REST API for dashboard
│       │   │   └── health.js   # GET /health
│       │   ├── services/
│       │   │   ├── github.js   # Octokit GitHub App client
│       │   │   ├── queue.js    # BullMQ queue manager (3 queues)
│       │   │   ├── reviewer.js # RAG + Groq AI review engine
│       │   │   ├── feedback.js # Self-improvement loop
│       │   │   └── scanner.js  # Nightly proactive scanner
│       │   ├── middleware/
│       │   │   └── verifySignature.js
│       │   └── db/
│       │       └── pool.js     # PostgreSQL pool + migrations
│       ├── scripts/
│       │   └── seed-demo.js    # Demo data seed script
│       └── .env.example        # Environment template
└── frontend/
    └── dashboard-app/          # Phase 4: React dashboard
        └── src/
            ├── App.tsx
            ├── api/client.ts   # API client (mock → real)
            ├── components/     # Sidebar, StatCard, Gauge, OutcomeBadge
            └── pages/          # DashboardPage, ReviewsPage, DNAPage, EscalationsPage
```

---

## 🪪 License

MIT