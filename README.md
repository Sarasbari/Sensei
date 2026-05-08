<div align="center">
  <img src="./assets/banner.jpg" alt="Sensei AI Banner" width="100%" />

  <h1>Sensei 🥷</h1>
  <p><strong>Autonomous, Context-Aware AI Code Reviewer & Explainability Dashboard</strong></p>

  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#tech-stack">Tech Stack</a>
  </p>
</div>

---

## 📖 Overview

**Sensei** is a next-generation AI code review system designed to augment engineering teams, not replace them. 

Unlike standard AI reviewers that offer generic linting advice, Sensei uses **Retrieval-Augmented Generation (RAG)** to learn from your team's historical code changes and past PR reviews. It builds a **"Review DNA"** of your organization, ensuring its feedback is highly contextual, culturally aligned, and practically useful. 

Coupled with a stunning, professional-grade dashboard, Sensei provides full explainability for every AI decision, allowing engineers to look under the hood of the AI's rationale.

## ✨ Features

- **🧠 Context-Aware Reviews (RAG)**: Sensei queries a vector database (ChromaDB) of past reviews before commenting, ensuring feedback aligns with your team's specific architectural patterns.
- **⚡ Real-Time GitHub Integration**: Listens to PR events via webhooks and automatically posts inline code review comments.
- **🎯 Escalation Queue**: Calculates a confidence score for every AI suggestion. Low-confidence flags are automatically routed to a human Senior Engineer for review.
- **🔍 Explainability Log**: A sleek dashboard UI that demystifies AI decisions. View the exact documentation, historical PRs, and decision path the AI took to generate a comment.
- **📈 Review DNA Map**: Visualize your team's coding patterns and AI interaction hotspots via an interactive, gradient heatmap.
- **🔁 Self-Correcting Pipeline**: If an engineer modifies or corrects an AI comment on GitHub, Sensei ingests the correction to improve future reviews.

---

## 🏗️ Architecture

Sensei is built with a decoupled, event-driven architecture designed for scale and responsiveness.

1. **GitHub App Webhook**: Receives `pull_request` events.
2. **Message Queue (Redis + BullMQ)**: Distributes events to specialized background workers (`pr-review-queue`, `ingestion-queue`, `correction-queue`).
3. **Vector Knowledge Base (ChromaDB)**: Embeds and stores historical code changes, providing context to the LLM.
4. **LLM Inference (Groq + LLaMA 3.3 70B)**: Ultra-fast generation of JSON-structured review feedback.
5. **PostgreSQL**: Stores relational metadata (escalations, review outcomes, proactive scans).
6. **React Dashboard**: Consumes the metadata to present real-time analytics and RAG traces.

---

## 🛠️ Tech Stack

### Frontend (Dashboard)
- **React 19 & Vite** — Lightning-fast development and optimized builds.
- **CSS3 Variables & Grid** — Custom "Emerald" professional theme with responsive layouts.
- **Recharts** — Dynamic, data-driven charts.
- **Lucide React** — Crisp, modern iconography.

### Backend (Webhooks & Workers)
- **Node.js & Express** — Webhook ingestion server.
- **BullMQ & Redis** — Robust job queuing and rate-limit handling.
- **ChromaDB** — Vector database for RAG context retrieval.
- **PostgreSQL (Neon)** — Relational storage for metadata and escalations.
- **Groq API (LLaMA 3.3 70B)** — High-speed, high-quality AI inference.
- **Octokit** — GitHub App authentication and API interactions.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Redis Server (running locally or via Docker)
- PostgreSQL Database (local or Neon.tech)
- ChromaDB instance
- Groq API Key
- GitHub App Credentials

### 1. Clone the repository
```bash
git clone https://github.com/your-username/sensei.git
cd sensei
```

### 2. Setup the Backend
```bash
cd backend/webhooks
npm install

# Copy environment variables
cp .env.example .env
# Fill in your GROQ_API_KEY, DATABASE_URL, CHROMADB_URL, and GitHub App credentials
```

### 3. Setup the Frontend Dashboard
```bash
cd ../../frontend/dashboard-app
npm install
```

### 4. Run the Platform

You will need three terminal windows to run the full stack locally:

**Terminal 1: Webhook Server**
```bash
cd backend/webhooks
npm start
```

**Terminal 2: Background Workers**
```bash
cd backend/webhooks
npm run worker
```

**Terminal 3: Frontend Dashboard**
```bash
cd frontend/dashboard-app
npm run dev
```

*(Note: For local GitHub webhook testing, use a tunneling service like [ngrok](https://ngrok.com/) pointing to your webhook server port).*

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <i>Built with ❤️ by Saras</i>
</div>