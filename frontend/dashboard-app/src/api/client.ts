/**
 * API Client — Sensei Dashboard
 *
 * All data-fetching functions for the 4 dashboard screens.
 * In production these hit /api/*; for now they return realistic mock data
 * so the UI can be developed independently of the backend.
 */

// ── Types ──────────────────────────────────────────────────────────

export interface Review {
  id: number;
  pr_number: number;
  repo_full_name: string;
  file_path: string;
  line_number: number;
  body: string;
  outcome: "posted" | "accepted" | "corrected" | "dismissed" | "posted_fallback";
  created_at: string;
  issue?: string;
  severity?: string;
  confidence?: number;
  source_engineer?: string;
  source_pr?: string;
}

export interface Escalation {
  id: number;
  pr_number: number;
  repo_full_name: string;
  reason: string;
  senior_username: string;
  created_at: string;
  pr_title?: string;
  file_path?: string;
  confidence?: number;
  resolved?: boolean;
}

export interface Engineer {
  id: string;
  name: string;
  patterns_contributed: number;
  accuracy_pct: number;
  common_patterns: string[];
  last_active: string;
}

export interface CycleTimePoint {
  week: string;
  before: number;
  after: number;
}

export interface RAGTrace {
  rank: number;
  document: string;
  similarity: number;
  engineer: string;
  pr_number: string;
  file_path: string;
}

export interface DashboardStats {
  reviews_today: number;
  escalation_rate: number;
  accuracy: number;
  total_patterns: number;
  cycle_time: CycleTimePoint[];
  accuracy_trend: number[];
}

// ── Mock Data ──────────────────────────────────────────────────────

const MOCK_STATS: DashboardStats = {
  reviews_today: 23,
  escalation_rate: 12.5,
  accuracy: 94.2,
  total_patterns: 847,
  cycle_time: [
    { week: "W1", before: 48, after: 48 },
    { week: "W2", before: 46, after: 42 },
    { week: "W3", before: 50, after: 36 },
    { week: "W4", before: 47, after: 30 },
    { week: "W5", before: 52, after: 28 },
    { week: "W6", before: 49, after: 24 },
    { week: "W7", before: 51, after: 20 },
    { week: "W8", before: 48, after: 18 },
  ],
  accuracy_trend: [88, 89, 91, 90, 92, 93, 94, 94.2],
};

const MOCK_REVIEWS: Review[] = [
  { id: 1, pr_number: 42, repo_full_name: "Sarasbari/Sensei", file_path: "src/services/auth.ts", line_number: 87, body: "Missing input validation on user-supplied JWT claims", outcome: "accepted", created_at: "2026-05-08T06:30:00Z", issue: "Missing input validation", severity: "high", confidence: 0.94, source_engineer: "alice", source_pr: "38" },
  { id: 2, pr_number: 42, repo_full_name: "Sarasbari/Sensei", file_path: "src/db/queries.ts", line_number: 23, body: "SQL injection risk with template literal interpolation", outcome: "corrected", created_at: "2026-05-08T06:31:00Z", issue: "SQL injection risk", severity: "high", confidence: 0.89, source_engineer: "bob", source_pr: "35" },
  { id: 3, pr_number: 41, repo_full_name: "Sarasbari/Sensei", file_path: "src/utils/cache.ts", line_number: 15, body: "Unbounded cache growth — no TTL or max-size configured", outcome: "accepted", created_at: "2026-05-08T05:20:00Z", issue: "Unbounded cache", severity: "medium", confidence: 0.78, source_engineer: "carol", source_pr: "30" },
  { id: 4, pr_number: 40, repo_full_name: "Sarasbari/Sensei", file_path: "src/routes/webhook.ts", line_number: 55, body: "Missing rate limiting on webhook endpoint", outcome: "dismissed", created_at: "2026-05-07T14:10:00Z", issue: "Missing rate limit", severity: "medium", confidence: 0.62, source_engineer: "alice", source_pr: "28" },
  { id: 5, pr_number: 39, repo_full_name: "Sarasbari/Sensei", file_path: "src/services/email.ts", line_number: 102, body: "Hardcoded SMTP credentials in source", outcome: "accepted", created_at: "2026-05-07T11:00:00Z", issue: "Hardcoded credentials", severity: "high", confidence: 0.97, source_engineer: "bob", source_pr: "25" },
  { id: 6, pr_number: 39, repo_full_name: "Sarasbari/Sensei", file_path: "src/middleware/cors.ts", line_number: 8, body: "Wildcard CORS origin allows any domain", outcome: "corrected", created_at: "2026-05-07T11:02:00Z", issue: "Wildcard CORS", severity: "high", confidence: 0.85, source_engineer: "carol", source_pr: "22" },
  { id: 7, pr_number: 38, repo_full_name: "Sarasbari/Sensei", file_path: "src/lib/logger.ts", line_number: 44, body: "Logging sensitive data (password field) in plain text", outcome: "accepted", created_at: "2026-05-06T16:00:00Z", issue: "Sensitive data logging", severity: "high", confidence: 0.91, source_engineer: "alice", source_pr: "20" },
  { id: 8, pr_number: 37, repo_full_name: "Sarasbari/Sensei", file_path: "src/components/Form.tsx", line_number: 130, body: "Unnecessary re-renders due to missing useMemo", outcome: "accepted", created_at: "2026-05-06T10:30:00Z", issue: "Performance: re-renders", severity: "low", confidence: 0.72, source_engineer: "dave", source_pr: "18" },
];

const MOCK_ESCALATIONS: Escalation[] = [
  { id: 1, pr_number: 42, repo_full_name: "Sarasbari/Sensei", reason: "Multiple high-severity findings with low model confidence", senior_username: "alice", created_at: "2026-05-08T06:35:00Z", pr_title: "feat: add OAuth2 provider integration", file_path: "src/services/auth.ts", confidence: 0.58, resolved: false },
  { id: 2, pr_number: 40, repo_full_name: "Sarasbari/Sensei", reason: "New code pattern not in review DNA — no historical matches", senior_username: "bob", created_at: "2026-05-07T14:15:00Z", pr_title: "refactor: webhook validation pipeline", file_path: "src/routes/webhook.ts", confidence: 0.45, resolved: false },
  { id: 3, pr_number: 36, repo_full_name: "Sarasbari/Sensei", reason: "Conflicting review patterns between two engineers", senior_username: "carol", created_at: "2026-05-05T09:00:00Z", pr_title: "fix: rate limiter memory leak", file_path: "src/middleware/rateLimit.ts", confidence: 0.52, resolved: true },
];

const MOCK_ENGINEERS: Engineer[] = [
  { id: "alice", name: "Alice Chen", patterns_contributed: 234, accuracy_pct: 96.1, common_patterns: ["Security", "Input Validation", "Auth"], last_active: "2026-05-08T06:30:00Z" },
  { id: "bob", name: "Bob Martinez", patterns_contributed: 189, accuracy_pct: 93.4, common_patterns: ["SQL Safety", "API Design", "Error Handling"], last_active: "2026-05-07T14:00:00Z" },
  { id: "carol", name: "Carol Park", patterns_contributed: 156, accuracy_pct: 91.8, common_patterns: ["Performance", "CORS", "Caching"], last_active: "2026-05-07T11:00:00Z" },
  { id: "dave", name: "Dave Kumar", patterns_contributed: 98, accuracy_pct: 88.5, common_patterns: ["React Patterns", "Accessibility", "Testing"], last_active: "2026-05-06T10:30:00Z" },
  { id: "eve", name: "Eve Johnson", patterns_contributed: 170, accuracy_pct: 95.0, common_patterns: ["Type Safety", "Memory Leaks", "Async Patterns"], last_active: "2026-05-08T02:00:00Z" },
];

const MOCK_RAG_TRACES: Record<number, RAGTrace[]> = {
  1: [
    { rank: 1, document: "Diff: Missing JWT claim validation in auth middleware\nComment: Always validate 'iss' and 'aud' claims before trusting JWT payload", similarity: 0.94, engineer: "alice", pr_number: "38", file_path: "src/middleware/auth.ts" },
    { rank: 2, document: "Diff: Token parsing without schema validation\nComment: Use zod or joi to validate token structure", similarity: 0.87, engineer: "bob", pr_number: "35", file_path: "src/services/token.ts" },
    { rank: 3, document: "Diff: Auth bypass via manipulated headers\nComment: Check for header injection attacks on Authorization header", similarity: 0.81, engineer: "alice", pr_number: "32", file_path: "src/routes/api.ts" },
    { rank: 4, document: "Diff: Session fixation vulnerability\nComment: Regenerate session ID after authentication state change", similarity: 0.74, engineer: "carol", pr_number: "28", file_path: "src/services/session.ts" },
    { rank: 5, document: "Diff: Weak password hashing algorithm\nComment: Migrate from MD5 to bcrypt with cost factor ≥ 12", similarity: 0.68, engineer: "bob", pr_number: "22", file_path: "src/utils/crypto.ts" },
  ],
};

// ── API Functions ──────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchDashboardStats(): Promise<DashboardStats> {
  await delay(600);
  return MOCK_STATS;
}

export async function fetchReviews(): Promise<Review[]> {
  await delay(400);
  return MOCK_REVIEWS;
}

export async function fetchEscalations(): Promise<Escalation[]> {
  await delay(400);
  return MOCK_ESCALATIONS;
}

export async function fetchEngineers(): Promise<Engineer[]> {
  await delay(500);
  return MOCK_ENGINEERS;
}

export async function fetchRAGTrace(reviewId: number): Promise<RAGTrace[]> {
  await delay(300);
  return MOCK_RAG_TRACES[reviewId] || MOCK_RAG_TRACES[1]!;
}

export async function resolveEscalation(id: number): Promise<void> {
  await delay(300);
  const esc = MOCK_ESCALATIONS.find((e) => e.id === id);
  if (esc) esc.resolved = true;
}
