/**
 * seed-demo.js — Demo Data Seed Script for Sensei
 *
 * Seeds PostgreSQL and ChromaDB with realistic demo data:
 *   - 50 review DNA records in ChromaDB
 *   - 2 weeks of review history in Postgres
 *   - Sample escalations
 *   - A connected repo entry
 *
 * Usage:
 *   node scripts/seed-demo.js
 */

import "dotenv/config";
import pg from "pg";
import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import crypto from "crypto";

const { Pool } = pg;

// ─── Config ─────────────────────────────────────────────────────────────────
const REPO_FULL_NAME = "Sarasbari/Sensei";
const COLLECTION_NAME = `review_dna_${REPO_FULL_NAME.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

const ENGINEERS = ["Saras", "Prajval", "Abhay", "Tushar"];

const PATTERN_TYPES = [
  "Security", "Input Validation", "SQL Safety", "Error Handling",
  "Performance", "CORS", "Caching", "Auth", "API Design",
  "React Patterns", "Accessibility", "Testing", "Type Safety",
  "Memory Leaks", "Async Patterns",
];

const SEVERITIES = ["low", "medium", "high"];
const OUTCOMES = ["accepted", "accepted", "accepted", "corrected", "posted", "posted_fallback"];

const FILE_PATHS = [
  "src/services/auth.ts", "src/db/queries.ts", "src/utils/cache.ts",
  "src/routes/webhook.ts", "src/middleware/rateLimit.ts", "src/services/email.ts",
  "src/components/Dashboard.tsx", "src/hooks/useAuth.ts", "src/api/client.ts",
  "src/utils/validation.ts", "src/services/payment.ts", "src/db/migrations.ts",
  "src/routes/api.ts", "src/services/notification.ts", "src/utils/crypto.ts",
];

const ISSUES = [
  "Missing input validation on user-supplied data",
  "SQL injection risk — use parameterized queries",
  "Unbounded cache growth — add TTL or LRU eviction",
  "Missing rate limiting on public endpoint",
  "CORS headers too permissive — restrict origins",
  "Password stored in plaintext — use bcrypt hashing",
  "Missing error boundary in React component",
  "Async function missing try-catch — unhandled promise rejection",
  "Memory leak — event listener not cleaned up in useEffect",
  "Missing CSRF token validation on form submit",
  "Hardcoded API key — move to environment variable",
  "N+1 query pattern — use JOIN or batch loading",
  "Missing null check on optional chaining fallback",
  "Deprecated API usage — migrate to v2 endpoint",
  "Missing Content-Security-Policy header",
  "XSS vulnerability — sanitize HTML output",
  "Missing authentication middleware on admin route",
  "Race condition in concurrent database writes",
  "Insecure random number generation for tokens",
  "Missing request timeout — potential DoS vector",
];

const SUGGESTIONS = [
  "Add Joi/Zod schema validation before processing",
  "Use $1, $2 parameterized placeholders instead of string interpolation",
  "Add maxSize option with LRU eviction policy",
  "Wrap with express-rate-limit middleware (100 req/15min)",
  "Set Access-Control-Allow-Origin to specific domain list",
  "Replace with await bcrypt.hash(password, 12)",
  "Wrap component tree with ErrorBoundary component",
  "Add try-catch with proper error logging and fallback",
  "Return cleanup function from useEffect to remove listener",
  "Add csurf middleware to the Express app",
  "Move to process.env.API_KEY with .env file",
  "Use Promise.all with batch queries or SQL JOIN",
  "Add explicit null/undefined check before access",
  "Update to @api/v2 package and update call signatures",
  "Add helmet() middleware with CSP directives",
  "Use DOMPurify.sanitize() before rendering",
  "Add requireAuth middleware to route definition",
  "Use database transactions with SELECT FOR UPDATE",
  "Replace Math.random() with crypto.randomBytes()",
  "Set timeout: 30000 in fetch/axios options",
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 12) + 8); // 8am–8pm
  d.setMinutes(Math.floor(Math.random() * 60));
  return d;
}

// ─── Seed ChromaDB ──────────────────────────────────────────────────────────
async function seedChromaDB() {
  console.log("\n🧬 Seeding ChromaDB with 50 review DNA records...");

  const chroma = new ChromaClient({ path: process.env.CHROMADB_URL || "http://localhost:8000" });
  const embedder = new DefaultEmbeddingFunction();

  const collection = await chroma.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction: embedder,
  });

  const ids = [];
  const documents = [];
  const metadatas = [];

  for (let i = 0; i < 50; i++) {
    const engineer = randomPick(ENGINEERS);
    const file = randomPick(FILE_PATHS);
    const issue = ISSUES[i % ISSUES.length];
    const suggestion = SUGGESTIONS[i % SUGGESTIONS.length];
    const prNum = 30 + Math.floor(Math.random() * 15);
    const pattern = randomPick(PATTERN_TYPES);

    ids.push(crypto.randomUUID());

    documents.push(
      `File: ${file}\nDiff:\n- // old vulnerable code\n+ // ${suggestion}\nComment:\n${issue}\nSuggestion: ${suggestion}`
    );

    metadatas.push({
      engineer_id: engineer,
      pr_number: String(prNum),
      file_path: file,
      review_comment: issue,
      pattern_type: pattern,
      severity: randomPick(SEVERITIES),
      validated: true,
      weight: 0.8 + Math.random() * 0.4,
      times_referenced: Math.floor(Math.random() * 10),
      deprecated: false,
    });
  }

  // Batch upsert in chunks of 25
  for (let i = 0; i < 50; i += 25) {
    await collection.upsert({
      ids: ids.slice(i, i + 25),
      documents: documents.slice(i, i + 25),
      metadatas: metadatas.slice(i, i + 25),
    });
    console.log(`   ✅ Batch ${i / 25 + 1} embedded (${Math.min(25, 50 - i)} records)`);
  }

  console.log(`🧬 ChromaDB seeded: ${COLLECTION_NAME} now has 50 review DNA records.`);
}

// ─── Seed PostgreSQL ────────────────────────────────────────────────────────
async function seedPostgres() {
  console.log("\n🗄️  Seeding PostgreSQL with 2 weeks of history...");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

  // Run migrations first
  await pool.query(`
    CREATE TABLE IF NOT EXISTS repos (
      id              SERIAL PRIMARY KEY,
      github_repo_id  BIGINT UNIQUE NOT NULL,
      full_name       TEXT NOT NULL,
      installation_id BIGINT,
      ingestion_status TEXT DEFAULT 'pending',
      ingested_at     TIMESTAMPTZ,
      connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id              SERIAL PRIMARY KEY,
      pr_number       INT NOT NULL,
      repo_full_name  TEXT NOT NULL,
      file_path       TEXT,
      line_number     INT,
      body            TEXT,
      outcome         TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS escalations (
      id              SERIAL PRIMARY KEY,
      pr_number       INT NOT NULL,
      repo_full_name  TEXT NOT NULL,
      reason          TEXT NOT NULL,
      senior_username TEXT NOT NULL,
      resolved        BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS proactive_scans (
      id              SERIAL PRIMARY KEY,
      repo_id         TEXT NOT NULL,
      files_scanned   INT NOT NULL,
      risks_found     INT NOT NULL,
      issues_created  INT NOT NULL,
      scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Safely add new columns to existing tables (idempotent)
  const alterStatements = [
    `ALTER TABLE repos ADD COLUMN IF NOT EXISTS ingestion_status TEXT DEFAULT 'pending'`,
    `ALTER TABLE repos ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ`,
    `ALTER TABLE escalations ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT FALSE`,
  ];
  for (const stmt of alterStatements) {
    try { await pool.query(stmt); } catch (_) { /* column already exists */ }
  }

  // Clear old demo data
  await pool.query(`DELETE FROM reviews WHERE repo_full_name = $1`, [REPO_FULL_NAME]);
  await pool.query(`DELETE FROM escalations WHERE repo_full_name = $1`, [REPO_FULL_NAME]);

  // Seed connected repo
  await pool.query(
    `INSERT INTO repos (github_repo_id, full_name, installation_id, ingestion_status, ingested_at)
     VALUES ($1, $2, $3, 'complete', NOW())
     ON CONFLICT (github_repo_id) DO UPDATE SET ingestion_status = 'complete', ingested_at = NOW()`,
    [123456789, REPO_FULL_NAME, 1234567]
  );
  console.log("   ✅ Repo entry created");

  // Seed 80 reviews over 2 weeks
  const reviewValues = [];
  for (let i = 0; i < 80; i++) {
    const prNum = 36 + Math.floor(i / 5);
    const file = randomPick(FILE_PATHS);
    const line = 10 + Math.floor(Math.random() * 200);
    const issue = ISSUES[i % ISSUES.length];
    const suggestion = SUGGESTIONS[i % SUGGESTIONS.length];
    const outcome = randomPick(OUTCOMES);
    const date = randomDate(14);
    const engineer = randomPick(ENGINEERS);

    const body = `## Sensei Review — \`${file}:${line}\`\n**Issue:** ${issue} | **Severity:** ${randomPick(SEVERITIES)}\n**Why:** ${issue}\n**Suggested Fix:**\n\`\`\`javascript\n${suggestion}\n\`\`\`\n**Source:** ${engineer} flagged this in PR #${prNum - 5}\n**Confidence:** ${(70 + Math.random() * 28).toFixed(1)}% | Powered by Groq LLaMA 3.3 70B`;

    reviewValues.push([prNum, REPO_FULL_NAME, file, line, body, outcome, date.toISOString()]);
  }

  for (const vals of reviewValues) {
    await pool.query(
      `INSERT INTO reviews (pr_number, repo_full_name, file_path, line_number, body, outcome, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      vals
    );
  }
  console.log(`   ✅ ${reviewValues.length} reviews seeded`);

  // Seed escalations
  const escalationData = [
    {
      pr: 42, reason: "Multiple high-severity findings with low model confidence",
      senior: "alice", resolved: false, daysAgo: 0,
    },
    {
      pr: 40, reason: "New code pattern not in review DNA — no historical matches",
      senior: "bob", resolved: false, daysAgo: 1,
    },
    {
      pr: 36, reason: "Complex auth flow change — escalated for security review",
      senior: "carol", resolved: true, daysAgo: 5,
    },
    {
      pr: 35, reason: "Database migration with potential data loss",
      senior: "alice", resolved: true, daysAgo: 8,
    },
  ];

  for (const esc of escalationData) {
    const date = new Date();
    date.setDate(date.getDate() - esc.daysAgo);
    date.setHours(10 + Math.floor(Math.random() * 8));

    await pool.query(
      `INSERT INTO escalations (pr_number, repo_full_name, reason, senior_username, resolved, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [esc.pr, REPO_FULL_NAME, esc.reason, esc.senior, esc.resolved, date.toISOString()]
    );
  }
  console.log(`   ✅ ${escalationData.length} escalations seeded`);

  // Seed proactive scans
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(2, 0, 0);

    await pool.query(
      `INSERT INTO proactive_scans (repo_id, files_scanned, risks_found, issues_created, scanned_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        REPO_FULL_NAME,
        15 + Math.floor(Math.random() * 20),
        Math.floor(Math.random() * 5),
        Math.floor(Math.random() * 3),
        date.toISOString(),
      ]
    );
  }
  console.log("   ✅ 7 proactive scan logs seeded");

  await pool.end();
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Sensei Demo Data Seed");
  console.log("========================");
  console.log(`Repo: ${REPO_FULL_NAME}`);
  console.log(`ChromaDB: ${process.env.CHROMADB_URL || "http://localhost:8000"}`);
  console.log(`Postgres: ${process.env.DATABASE_URL?.replace(/:[^:]+@/, ":***@")}`);

  await seedChromaDB();
  await seedPostgres();

  console.log("\n🎉 Demo data seeded successfully!");
  console.log("   You can now start the dashboard and see real-looking data.");
  console.log("   Run: npm run start   (backend)");
  console.log("   Run: npm run dev     (dashboard)");
}

main().catch((err) => {
  console.error("💥 Seed failed:", err);
  process.exit(1);
});
