import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchReviews, fetchRAGTrace, type Review, type RAGTrace } from "../api/client";
import OutcomeBadge from "../components/OutcomeBadge";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [traces, setTraces] = useState<RAGTrace[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);

  useEffect(() => {
    fetchReviews().then((r) => {
      setReviews(r);
      setLoading(false);
    });
  }, []);

  const openTrace = async (review: Review) => {
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

  const severityClass = (s?: string) =>
    s === "high" ? "high" : s === "medium" ? "medium" : "low";

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Explainability Log</h2>
        <p>Every Sensei review comment with full RAG trace and decision rationale</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>PR</th>
                <th>File</th>
                <th>Issue</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Source</th>
                <th>Outcome</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j}>
                          <div className="skeleton" style={{ width: "80%", height: 14 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : reviews.map((r) => (
                    <tr key={r.id} onClick={() => openTrace(r)}>
                      <td style={{ fontWeight: 600, color: "var(--accent-orange)" }}>
                        #{r.pr_number}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.file_path}</td>
                      <td style={{ color: "var(--text-primary)" }}>{r.issue || "—"}</td>
                      <td>
                        <span className={`badge ${severityClass(r.severity)}`}>
                          {r.severity || "—"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="confidence-bar">
                            <div
                              className="confidence-fill"
                              style={{
                                width: `${(r.confidence || 0) * 100}%`,
                                background:
                                  (r.confidence || 0) > 0.8
                                    ? "var(--accent-teal)"
                                    : (r.confidence || 0) > 0.6
                                    ? "var(--accent-yellow)"
                                    : "var(--accent-red)",
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12 }}>
                            {((r.confidence || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td>{r.source_engineer || "—"}</td>
                      <td>
                        <OutcomeBadge outcome={r.outcome} />
                      </td>
                      <td style={{ fontSize: 12 }}>{formatTime(r.created_at)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RAG Trace Drawer ──────────────────────────── */}
      {selectedReview && (
        <div className="modal-overlay" onClick={closeDrawer}>
          <div className="modal-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>RAG Trace — PR #{selectedReview.pr_number}</h3>
              <button className="modal-close" onClick={closeDrawer}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                FILE
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 13 }}>
                {selectedReview.file_path}:{selectedReview.line_number}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                ISSUE
              </div>
              <div style={{ fontSize: 14, color: "var(--text-primary)" }}>
                {selectedReview.issue}
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
              Top 5 Retrieved Review DNA Records
            </div>

            {tracesLoading ? (
              <div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rag-trace-item">
                    <div className="skeleton" style={{ width: "100%", height: 60 }} />
                  </div>
                ))}
              </div>
            ) : (
              traces.map((t) => (
                <div key={t.rank} className="rag-trace-item">
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <span className="trace-rank">{t.rank}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                        PR #{t.pr_number} • {t.engineer} •{" "}
                        <span style={{ fontFamily: "monospace" }}>{t.file_path}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                        {t.document}
                      </div>
                    </div>
                  </div>
                  <div className="similarity-bar">
                    <div
                      className="similarity-fill"
                      style={{ width: `${t.similarity * 100}%` }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 4,
                      textAlign: "right",
                    }}
                  >
                    Similarity: {(t.similarity * 100).toFixed(1)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
