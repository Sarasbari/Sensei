import { useEffect, useState, useCallback } from "react";
import { CheckCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  fetchEscalations, resolveEscalation, type Escalation,
} from "../api/client";

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

      {/* ── Open Escalations ─────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Open ({open.length})</span>
          <span style={{ fontSize: 11, color: open.length > 0 ? "var(--red)" : "var(--teal)", fontWeight: 600 }}>
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
          <div className="empty-state" style={{ border: "none", padding: "40px 0" }}>
            <div className="scale-in" style={{ marginBottom: 12 }}>
              <CheckCircle size={40} style={{ color: "var(--teal)" }} />
            </div>
            <h3 style={{ fontSize: 14, color: "var(--text-secondary)" }}>No open escalations</h3>
            <p style={{ color: "var(--teal)", fontSize: 13 }}>The AI is confident today! 🎉</p>
          </div>
        ) : (
          <div className="escalation-list">
            {open.map((esc) => (
              <div key={esc.id} className="escalation-item">
                <div className="accent-bar" />

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0, minWidth: 50 }}>
                  <Clock size={16} style={{ color: "var(--amber)" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)" }}>
                    Waiting {formatDistanceToNow(new Date(esc.created_at))}
                  </span>
                </div>

                <div className="escalation-meta">
                  <div className="escalation-title">
                    <span className="pr-badge" style={{ marginRight: 8 }}>#{esc.pr_number}</span>
                    {esc.pr_title || "Untitled"}
                  </div>
                  <div className="escalation-sub" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {esc.file_path || esc.repo_full_name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{esc.reason}</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                    {esc.confidence != null && (
                      <span className="badge high" style={{ fontSize: 10 }}>
                        {((esc.confidence || 0) * 100).toFixed(0)}% confidence
                      </span>
                    )}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--purple)" }}>
                      @{esc.senior_username}
                    </span>
                  </div>
                </div>

                <button className="btn btn-teal" onClick={() => handleResolve(esc.id)}>
                  <CheckCircle size={14} /> Resolve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Resolved ─────────────────────────────────── */}
      {resolved.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Resolved ({resolved.length})</span></div>
          <div className="escalation-list">
            {resolved.map((esc) => (
              <div key={esc.id} className="escalation-item" style={{ opacity: 0.5 }}>
                <CheckCircle size={16} style={{ color: "var(--teal)", flexShrink: 0 }} />
                <div className="escalation-meta">
                  <div className="escalation-title">
                    <span className="pr-badge" style={{ marginRight: 8 }}>#{esc.pr_number}</span>
                    {esc.pr_title || "Untitled"}
                  </div>
                  <div className="escalation-sub">
                    Resolved • <span style={{ color: "var(--purple)" }}>@{esc.senior_username}</span>
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
