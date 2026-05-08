import { useEffect, useState, useCallback } from "react";
import { CheckCircle, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  fetchEscalations, resolveEscalation, type Escalation,
} from "../api/client";

function getSeverityLevel(confidence?: number): { label: string; color: string; bg: string } {
  const c = confidence ?? 0;
  if (c < 0.55) return { label: "CRITICAL", color: "#fff", bg: "#DC2626" };
  if (c < 0.70) return { label: "HIGH", color: "#fff", bg: "#F59E0B" };
  return { label: "MEDIUM", color: "#fff", bg: "#3B82F6" };
}

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = useCallback(() => {
    fetchEscalations().then((e) => { setEscalations(e); setLoading(false); setLastFetch(new Date()); });
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  const handleResolve = async (id: number) => {
    await resolveEscalation(id);
    setEscalations((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
  };

  const open = escalations.filter((e) => !e.resolved);
  const resolved = escalations.filter((e) => e.resolved);

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Escalation Queue</h2>
        <p>PRs flagged for senior review due to low AI confidence</p>
        {lastFetch && <div className="last-updated">Last updated: {formatDistanceToNow(lastFetch, { addSuffix: true })}</div>}
      </div>

      {/* ── Status Banner ──────────────────────────────── */}
      <div className="card escalation-status-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div className="skeleton" style={{ width: 60, height: 60, borderRadius: "50%", margin: "0 auto 16px" }} />
            <div className="skeleton" style={{ width: "40%", height: 20, margin: "0 auto 8px" }} />
            <div className="skeleton" style={{ width: "60%", height: 14, margin: "0 auto" }} />
          </div>
        ) : open.length === 0 ? (
          <div className="escalation-status-content">
            <div className="escalation-status-icon scale-in">
              <CheckCircle size={56} strokeWidth={2.5} style={{ color: "var(--emerald)" }} />
            </div>
            <h3 className="escalation-status-title">All systems clear. AI confidence is high.</h3>
            <p className="escalation-status-sub">
              No open escalations at this time. The AI is confidently handling code reviews.
            </p>
          </div>
        ) : (
          <div className="escalation-status-content">
            <div className="escalation-status-icon" style={{ color: "var(--amber)" }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 className="escalation-status-title" style={{ color: "var(--amber)" }}>
              {open.length} escalation{open.length > 1 ? "s" : ""} require attention
            </h3>
            <p className="escalation-status-sub">
              Some PRs need senior review due to low AI confidence scores.
            </p>
          </div>
        )}
      </div>

      {/* ── Escalation Cards ───────────────────────────── */}
      <div className="escalation-section-title">
        ESCALATIONS ({open.length})
      </div>

      {loading ? (
        <div className="escalation-cards-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card escalation-card-item">
              <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 14 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: "60%", height: 16, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: "40%", height: 12 }} />
              </div>
              <div className="skeleton" style={{ width: 100, height: 14 }} />
              <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      ) : open.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>
          No escalations pending.
        </div>
      ) : (
        <div className="escalation-cards-list">
          {open.map((esc) => {
            const severity = getSeverityLevel(esc.confidence);
            const confPct = ((esc.confidence || 0) * 100);
            return (
              <div key={esc.id} className="card escalation-card-item">
                <span className="escalation-severity-badge" style={{ background: severity.bg, color: severity.color }}>
                  {severity.label}
                </span>

                <div className="escalation-card-meta">
                  <div className="escalation-card-title">
                    PR #{esc.pr_number}: {esc.pr_title || "Implement Auth Service Refactor"}
                  </div>
                  <div className="escalation-card-reason">
                    Reason: {esc.reason || "Low AI Confidence (Complex Logic)"}
                  </div>
                </div>

                <div className="escalation-card-confidence">
                  <div className="escalation-confidence-label">
                    Confidence Score: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{confPct.toFixed(0)}%</span>
                  </div>
                  <div className="escalation-confidence-bar">
                    <div
                      className="escalation-confidence-fill"
                      style={{
                        width: `${confPct}%`,
                        background: confPct >= 70 ? "var(--emerald)" : confPct >= 50 ? "var(--blue)" : "var(--red)",
                      }}
                    />
                  </div>
                </div>

                <button className="btn escalation-review-btn" onClick={() => handleResolve(esc.id)}>
                  Review Now
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Resolved ─────────────────────────────────── */}
      {resolved.length > 0 && (
        <>
          <div className="escalation-section-title" style={{ marginTop: 24 }}>
            RESOLVED ({resolved.length})
          </div>
          <div className="escalation-cards-list">
            {resolved.map((esc) => (
              <div key={esc.id} className="card escalation-card-item" style={{ opacity: 0.5 }}>
                <span className="escalation-severity-badge" style={{ background: "var(--emerald)", color: "#fff" }}>
                  RESOLVED
                </span>
                <div className="escalation-card-meta">
                  <div className="escalation-card-title">
                    PR #{esc.pr_number}: {esc.pr_title || "Untitled"}
                  </div>
                  <div className="escalation-card-reason">
                    Resolved • @{esc.senior_username}
                  </div>
                </div>
                <CheckCircle size={20} style={{ color: "var(--emerald)" }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
