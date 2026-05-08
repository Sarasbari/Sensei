import { useEffect, useState, useCallback } from "react";
import { Terminal, ExternalLink, X } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fetchReviews, fetchRAGTrace, type Review, type RAGTrace } from "../api/client";
import OutcomeBadge from "../components/OutcomeBadge";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [traces, setTraces] = useState<RAGTrace[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = useCallback(() => {
    fetchReviews().then((r) => { setReviews(r); setLoading(false); setLastFetch(new Date()); });
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  const openDrawer = async (review: Review) => {
    setSelectedReview(review);
    setTracesLoading(true);
    const t = await fetchRAGTrace(review.id);
    setTraces(t);
    setTracesLoading(false);
  };

  const closeDrawer = () => {
    setSelectedReview(null);
    setTraces([]);
  };

  const confColor = (c: number) => c >= 0.8 ? "var(--emerald)" : c >= 0.6 ? "var(--amber)" : "var(--red)";

  const severityDot = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case "critical": return { color: "#EF4444", bg: "rgba(239,68,68,0.15)" };
      case "high": return { color: "#F97316", bg: "rgba(249,115,22,0.15)" };
      case "medium": return { color: "#F59E0B", bg: "rgba(245,158,11,0.15)" };
      default: return { color: "#3B82F6", bg: "rgba(59,130,246,0.15)" };
    }
  };

  if (!loading && reviews.length === 0) {
    return (
      <div className="main-content">
        <div className="page-header">
          <h2>Explainability Log</h2>
          <p>Every Sensei review comment with full RAG trace and decision rationale.</p>
        </div>
        <div className="empty-state">
          <div className="icon"><Terminal size={40} /></div>
          <h3>No reviews yet</h3>
          <p>Connect a repo and open a PR — Sensei will review it and log every decision here</p>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn btn-orange">
            Go to GitHub <ExternalLink size={14} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Explainability Log</h2>
        <p>Every Sensei review comment with full RAG trace and decision rationale.</p>
        {lastFetch && <div className="last-updated">Last updated: {formatDistanceToNow(lastFetch, { addSuffix: true })}</div>}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>PR ID</th>
                <th>File</th>
                <th>Issue</th>
                <th>Severity</th>
                <th>AI Confidence</th>
                <th>Source (RAG Trace)</th>
                <th>Outcome</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (<td key={j}><div className="skeleton" style={{ width: "80%", height: 14 }} /></td>))}</tr>
                  ))
                : reviews.map((r) => {
                    const sev = severityDot(r.severity || "low");
                    const confPct = ((r.confidence || 0) * 100);
                    return (
                      <tr key={r.id} onClick={() => openDrawer(r)} style={{ cursor: "pointer" }}>
                        <td>
                          <span className="review-pr-id">PR-{r.pr_number}</span>
                        </td>
                        <td style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {r.file_path}
                        </td>
                        <td style={{ color: "var(--text-primary)", fontSize: 13, maxWidth: 180 }}>
                          {r.issue || "—"}
                        </td>
                        <td>
                          <span className="severity-indicator">
                            <span className="severity-indicator-dot" style={{ background: sev.color }} />
                            <span style={{ color: sev.color, fontWeight: 600, textTransform: "capitalize" }}>
                              {r.severity || "Low"}
                            </span>
                          </span>
                        </td>
                        <td>
                          <div className="review-confidence">
                            <div className="review-confidence-icon" style={{ color: confColor(r.confidence || 0) }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                            </div>
                            <span className="review-confidence-text">{confPct.toFixed(0)}%</span>
                            <div className="review-confidence-bar">
                              <div className="review-confidence-fill" style={{
                                width: `${confPct}%`,
                                background: confColor(r.confidence || 0),
                              }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          <div>Document A,</div>
                          <div>Code Snippet B</div>
                        </td>
                        <td><OutcomeBadge outcome={r.outcome} /></td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {format(new Date(r.created_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RAG Trace Drawer ────────────────────────────── */}
      {selectedReview && (() => {
        // Parse the markdown body
        const body = selectedReview.body || "";
        const whyMatch = body.match(/\*\*Why:\*\*([\s\S]*?)\*\*Suggested Fix:\*\*/);
        const rationale = whyMatch ? whyMatch[1].trim() : (selectedReview.explanation || "No rationale provided.");
        
        const snippetMatch = body.match(/```[a-z]*\n([\s\S]*?)```/);
        const snippet = snippetMatch ? snippetMatch[1].trim() : (selectedReview.suggestion || "No code snippet provided.");

        const sourceMatch = body.match(/\*\*Source:\*\*([^\n]+)/);
        const source = sourceMatch ? sourceMatch[1].trim() : "AI identified pattern";

        return (
          <div className="modal-overlay" onClick={closeDrawer}>
            <div className="modal-drawer rag-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>RAG Trace Details</h3>
                <button className="modal-close" onClick={closeDrawer}>
                  <X size={16} />
                </button>
              </div>

              <div className="rag-drawer-section">
                <div className="rag-drawer-section-title">AI Rationale:</div>
                <p className="rag-drawer-text" style={{ whiteSpace: "pre-wrap" }}>
                  {rationale}
                </p>
              </div>

              <div className="rag-drawer-section">
                <div className="rag-drawer-section-title">Code Snippet ({selectedReview.file_path?.split("/").pop() || "file"})</div>
                <div className="rag-code-block">
                  <pre>{snippet}</pre>
                </div>
              </div>

              {tracesLoading ? (
                <div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8 }} />
                  ))}
                </div>
              ) : (
                <>
                  <div className="rag-drawer-section">
                    <div className="rag-drawer-section-title">Historical Knowledge Source:</div>
                    <div className="rag-doc-link" style={{ cursor: 'default', textDecoration: 'none', color: 'var(--text-secondary)' }}>
                      {source}
                    </div>
                  </div>

                  <div className="rag-drawer-section">
                    <div className="rag-drawer-section-title">Decision Path:</div>
                    <div className="rag-decision-flow">
                      {[1, 2, 3].map((t, i) => (
                        <div key={i} className="rag-decision-step">
                          <span className="rag-decision-badge" style={{
                            background: i === 0 ? "var(--blue-dim)" : i === 1 ? "var(--emerald-dim)" : "var(--amber-dim)",
                            color: i === 0 ? "var(--blue)" : i === 1 ? "var(--emerald)" : "var(--amber)",
                          }}>
                            {i === 0 ? "Vector Search" : i === 1 ? "Context Injection" : "LLM Inference"}
                          </span>
                          {i < 2 && <span className="rag-decision-arrow">→</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
