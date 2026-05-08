/**
 * pool.js — PostgreSQL Connection Pool
 *
 * Manages a pg Pool for the repos table and other metadata.
 * Provides:
 *   - initPool() → creates the pool and runs auto-migration
 *   - pool() → returns the Pool instance for raw queries
 *   - upsertRepo() → inserts or updates a connected repo
 *   - closePool() → graceful shutdown
 */

import pg from "pg";

const { Pool } = pg;

/** @type {pg.Pool | null} */
let _pool = null;

/**
 * Initialize the PostgreSQL connection pool and run migrations.
 */
export async function initPool() {
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  _pool.on("error", (err) => {
    console.error("🔴 PostgreSQL pool error:", err.message);
  });

  // Verify connectivity
  const client = await _pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("🟢 PostgreSQL connected");
  } finally {
    client.release();
  }

  // Auto-migrate on startup
  await migrate();
}

/**
 * Get the raw Pool instance for ad-hoc queries.
 * @returns {pg.Pool}
 */
export function pool() {
  if (!_pool) throw new Error("Pool not initialized — call initPool() first");
  return _pool;
}

/**
 * Create the repos table if it doesn't exist.
 */
async function migrate() {
  const createTable = `
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
  `;

  await _pool.query(createTable);
  console.log("🗄️  Database migrated (repos, reviews, escalations, proactive_scans tables ready)");
}

/**
 * Insert or update a connected repository.
 *
 * Uses ON CONFLICT to upsert — if the repo already exists we update
 * the installation_id (it can change if the app is reinstalled).
 *
 * @param {number} githubRepoId
 * @param {string} fullName
 * @param {number|null} installationId
 */
export async function upsertRepo(githubRepoId, fullName, installationId) {
  const upsert = `
    INSERT INTO repos (github_repo_id, full_name, installation_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (github_repo_id) DO UPDATE SET
      full_name       = EXCLUDED.full_name,
      installation_id = EXCLUDED.installation_id;
  `;

  await _pool.query(upsert, [githubRepoId, fullName, installationId]);
}

/**
 * Get installation ID for a repo.
 */
export async function getInstallationId(repoFullName) {
  const q = `SELECT installation_id FROM repos WHERE full_name = $1 LIMIT 1`;
  const res = await _pool.query(q, [repoFullName]);
  if (res.rows.length === 0) return null;
  return res.rows[0].installation_id;
}

/**
 * Record a review outcome.
 */
export async function recordReview(prNumber, repoFullName, filePath, lineNumber, body, outcome) {
  const q = `
    INSERT INTO reviews (pr_number, repo_full_name, file_path, line_number, body, outcome)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await _pool.query(q, [prNumber, repoFullName, filePath, lineNumber, body, outcome]);
}

/**
 * Record an escalation.
 */
export async function recordEscalation(prNumber, repoFullName, reason, seniorUsername) {
  const q = `
    INSERT INTO escalations (pr_number, repo_full_name, reason, senior_username)
    VALUES ($1, $2, $3, $4)
  `;
  await _pool.query(q, [prNumber, repoFullName, reason, seniorUsername]);
}

/**
 * Update outcome of a specific review (e.g. when corrected).
 */
export async function updateReviewOutcome(prNumber, repoFullName, filePath, outcome) {
  const q = `
    UPDATE reviews 
    SET outcome = $1 
    WHERE pr_number = $2 AND repo_full_name = $3 AND file_path = $4
  `;
  await _pool.query(q, [outcome, prNumber, repoFullName, filePath]);
}

/**
 * Update outcome of all reviews in a PR (e.g. when accepted).
 */
export async function updateAllReviewsOutcome(prNumber, repoFullName, outcome) {
  const q = `
    UPDATE reviews
    SET outcome = $1
    WHERE pr_number = $2 AND repo_full_name = $3 AND outcome != 'corrected'
  `;
  await _pool.query(q, [outcome, prNumber, repoFullName]);
}

/**
 * Gracefully close the pool.
 */
export async function closePool() {
  if (_pool) {
    await _pool.end();
    console.log("🗄️  PostgreSQL pool closed");
  }
}

/**
 * Log proactive scan results.
 */
export async function logScanResult(repoId, filesScanned, risksFound, issuesCreated) {
  const q = `
    INSERT INTO proactive_scans (repo_id, files_scanned, risks_found, issues_created)
    VALUES ($1, $2, $3, $4)
  `;
  await _pool.query(q, [repoId, filesScanned, risksFound, issuesCreated]);
}
