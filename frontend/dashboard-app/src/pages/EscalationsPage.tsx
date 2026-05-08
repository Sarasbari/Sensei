import { useEffect, useState } from "react";
import { CheckCircle, Clock } from "lucide-react";
import {
  fetchEscalations,
  resolveEscalation,
  type Escalation,
} from "../api/client";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEscalations().then((e) => {
      setEscalations(e);
      setLoading(false);
    });
  }, []);

  const handleResolve = async (id: number) => {
    await resolveEscalation(id);
    setEscalations((prev) =>
      prev.map((e) => (e.id === id ? { ...e, resolved: true } : e))
    );
  };

  const open = escalations.filter((e) => !e.resolved);
  const resolved = escalations.filter((e) => e.resolved);

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Escalation Queue</h2>
        <p>PRs flagged for senior review due to low AI confidence</p>
      </div>

      {/* ── Open Escalations ─────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">
            Open ({open.length})
          </span>
          <span
            style={{
              fontSize: 11,
              color: open.length > 0 ? "var(--accent-red)" : "var(--accent-teal)",
              fontWeight: 600,
            }}
          >
            {open.length > 0 ? "Action Needed" : "All Clear ✓"}
          </span>
        </div>

        {loading ? (
          <div className="escalation-list">
            {[1, 2].map((i) => (
              <div key={i} className="card" style={{ padding: 16 }}>
                <div className="skeleton" style={{ width: "60%", height: 16, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: "40%", height: 12 }} />
              </div>
            ))}
          </div>
        ) : open.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            <CheckCircle
              size={40}
              style={{ color: "var(--accent-teal)", marginBottom: 12 }}
            />
            <div>No open escalations — the AI is confident today! 🎉</div>
          </div>
        ) : (
          <div className="escalation-list">
            {open.map((esc) => (
              <div key={esc.id} className="card escalation-item" style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>
                  <Clock size={16} style={{ color: "var(--accent-yellow)" }} />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--accent-yellow)",
                    }}
                  >
                    {timeAgo(esc.created_at)}
                  </span>
                </div>

                <div className="escalation-meta">
                  <div className="escalation-title">
                    PR #{esc.pr_number}: {esc.pr_title || "Untitled"}
                  </div>
                  <div className="escalation-sub">
                    {esc.file_path || esc.repo_full_name} • Assigned to @{esc.senior_username}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginTop: 4,
                    }}
                  >
                    {esc.reason}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div className="confidence-bar" style={{ width: 60 }}>
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${(esc.confidence || 0) * 100}%`,
                          background: "var(--accent-red)",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {((esc.confidence || 0) * 100).toFixed(0)}%
                    </div>
                  </div>

                  <button
                    className="btn btn-teal"
                    onClick={() => handleResolve(esc.id)}
                  >
                    <CheckCircle size={14} />
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Resolved ─────────────────────────────────── */}
      {resolved.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Resolved ({resolved.length})</span>
          </div>
          <div className="escalation-list">
            {resolved.map((esc) => (
              <div
                key={esc.id}
                className="escalation-item"
                style={{ padding: "12px 0", opacity: 0.6 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>
                  <CheckCircle size={16} style={{ color: "var(--accent-teal)" }} />
                </div>
                <div className="escalation-meta">
                  <div className="escalation-title">
                    PR #{esc.pr_number}: {esc.pr_title || "Untitled"}
                  </div>
                  <div className="escalation-sub">
                    Resolved • @{esc.senior_username}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
