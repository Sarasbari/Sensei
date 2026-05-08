import { useEffect, useState, useCallback } from "react";
import { Terminal, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fetchReviews, fetchRAGTrace, type Review, type RAGTrace } from "../api/client";
import OutcomeBadge from "../components/OutcomeBadge";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [traces, setTraces] = useState<RAGTrace[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = useCallback(() => {
    fetchReviews().then((r) => { setReviews(r); setLoading(false); setLastFetch(new Date()); });
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  const toggleRow = async (review: Review) => {
    if (expandedId === review.id) { setExpandedId(null); return; }
    setExpandedId(review.id);
    setTracesLoading(true);
    const t = await fetchRAGTrace(review.id);
    setTraces(t);
    setTracesLoading(false);
  };

  const confColor = (c: number) => c >= 0.8 ? "var(--teal)" : c >= 0.6 ? "var(--amber)" : "var(--red)";

  if (!loading && reviews.length === 0) {
    return (
      <div className="main-content">
        <div className="page-header">
          <h2>Explainability Log</h2>
          <p>Every Sensei review comment with full RAG trace and decision rationale</p>
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
        <p>Every Sensei review comment with full RAG trace and decision rationale</p>
        {lastFetch && <div className="last-updated">Last updated: {formatDistanceToNow(lastFetch, { addSuffix: true })}</div>}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>PR</th><th>File</th><th>Issue</th><th>Severity</th>
                <th>Confidence</th><th>Source</th><th>Outcome</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (<td key={j}><div className="skeleton" style={{ width: "80%", height: 14 }} /></td>))}</tr>
                  ))
                : reviews.map((r) => (
                    <>
                      <tr key={r.id} onClick={() => toggleRow(r)} style={{ cursor: "pointer" }}>
                        <td><span className="pr-badge">#{r.pr_number}</span></td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--text-secondary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.file_path}
                        </td>
                        <td style={{ color: "var(--text-primary)" }}>{r.issue || "—"}</td>
                        <td><span className={`badge ${r.severity === "high" ? "high" : r.severity === "medium" ? "medium" : "low"}`}>{r.severity || "—"}</span></td>
                        <td>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 2 }}>
                            {((r.confidence || 0) * 100).toFixed(0)}%
                          </div>
                          <div className="confidence-bar">
                            <div className="confidence-fill" style={{ width: `${(r.confidence || 0) * 100}%`, background: confColor(r.confidence || 0) }} />
                          </div>
                        </td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--purple)" }}>
                          @{r.source_engineer || "unknown"}
                        </td>
                        <td><OutcomeBadge outcome={r.outcome} /></td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </td>
                      </tr>
                      {expandedId === r.id && (
                        <tr key={`exp-${r.id}`}>
                          <td colSpan={8} style={{ padding: 0 }}>
                            <div className="expanded-row">
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Review Comment</div>
                              <div className="code-block">{r.body || "No comment body available"}</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Retrieved from DNA</div>
                              {tracesLoading ? (
                                <div>{[1,2,3].map((i) => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 8 }} />)}</div>
                              ) : traces.length > 0 ? (
                                traces.slice(0, 3).map((t) => (
                                  <div key={t.rank} className="trace-item">
                                    <span className="trace-rank">{t.rank}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                        <span className="pr-badge" style={{ fontSize: 10, padding: "1px 5px", marginRight: 6 }}>#{t.pr_number}</span>
                                        <span style={{ color: "var(--purple)" }}>@{t.engineer}</span>
                                        <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                                          {(t.similarity * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>{t.document}</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No trace data available</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
