import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { fetchEngineers, type Engineer } from "../api/client";

const PATTERN_TYPES = [
  "Security", "Input Validation", "SQL Safety", "Error Handling",
  "Performance", "CORS", "Caching", "Auth", "API Design",
  "React Patterns", "Accessibility", "Testing", "Type Safety",
  "Memory Leaks", "Async Patterns",
];

const GRADIENTS = [
  ["#FF6B2B", "#FF8C5A"], ["#00D4AA", "#00A37A"], ["#38BDF8", "#0284C7"],
  ["#A78BFA", "#7C3AED"], ["#F59E0B", "#D97706"], ["#22C55E", "#15803D"],
];

function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildHeatmap(engineers: Engineer[]) {
  return engineers.map((eng) =>
    PATTERN_TYPES.map((p) => {
      if (eng.common_patterns.includes(p)) return 4 + Math.floor(Math.random() * 10);
      return Math.floor(Math.random() * 3);
    })
  );
}

function heatColor(v: number): string {
  if (v >= 13) return "var(--orange)";
  if (v >= 8) return "rgba(255,107,43,0.6)";
  if (v >= 4) return "rgba(0,212,170,0.6)";
  if (v >= 1) return "rgba(0,212,170,0.2)";
  return "var(--bg-elevated)";
}

export default function DNAPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = useCallback(() => {
    fetchEngineers().then((e) => { setEngineers(e); setLoading(false); setLastFetch(new Date()); });
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  const heatmap = buildHeatmap(engineers);

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Review DNA Map</h2>
        <p>Per-engineer contribution patterns and expertise heatmap</p>
        {lastFetch && <div className="last-updated">Last updated: {formatDistanceToNow(lastFetch, { addSuffix: true })}</div>}
      </div>

      {/* ── Engineer Cards ────────────────────────────── */}
      {loading ? (
        <div className="engineer-grid">
          {[1,2,3,4].map((i) => (
            <div key={i} className="card" style={{ height: 200 }}>
              <div className="skeleton" style={{ width: "50%", height: 20 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="engineer-grid">
          {engineers.map((eng) => {
            const grad = GRADIENTS[nameHash(eng.name) % GRADIENTS.length];
            return (
              <div key={eng.id} className="card engineer-card">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="engineer-avatar" style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>
                    {eng.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{eng.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Last active: {formatDistanceToNow(new Date(eng.last_active), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                <div className="engineer-stats">
                  <div className="engineer-stat">
                    <div className="engineer-stat-value" style={{ color: "var(--orange)" }}>
                      {Math.round(eng.patterns_contributed).toLocaleString()}
                    </div>
                    <div className="engineer-stat-label">Patterns</div>
                  </div>
                  <div className="engineer-stat">
                    <div className="engineer-stat-value" style={{ color: "var(--teal)" }}>
                      {parseFloat(String(eng.accuracy_pct)).toFixed(1)}%
                    </div>
                    <div className="engineer-stat-label">Accuracy</div>
                  </div>
                  <div className="engineer-stat">
                    <div className="engineer-stat-value" style={{ color: "var(--blue)" }}>
                      {eng.common_patterns.length}
                    </div>
                    <div className="engineer-stat-label">Specialties</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                  {eng.common_patterns.map((p) => (
                    <span key={p} className="specialty-tag">{p}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Heatmap ───────────────────────────────────── */}
      {!loading && engineers.length > 0 && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-header">
            <span className="card-title">Pattern Types × Engineers</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: `140px repeat(${PATTERN_TYPES.length}, 32px)`,
              gap: 3, minWidth: PATTERN_TYPES.length * 35 + 140,
            }}>
              {/* Header */}
              <div />
              {PATTERN_TYPES.map((p) => (
                <div key={p} style={{
                  fontSize: 9, color: "var(--text-muted)", textAlign: "center",
                  writingMode: "vertical-rl", transform: "rotate(180deg)",
                  height: 80, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {p}
                </div>
              ))}
              {/* Rows */}
              {engineers.map((eng, ei) => (
                <div key={eng.id} style={{ display: "contents" }}>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                    {eng.name}
                  </div>
                  {heatmap[ei]?.map((v, pi) => (
                    <div key={`${eng.id}-${pi}`} className="heatmap-cell"
                      style={{ background: heatColor(v), width: 32, minHeight: 32 }}
                      title={`${eng.name} — ${PATTERN_TYPES[pi]}: ${v} patterns`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, fontSize: 10, color: "var(--text-muted)" }}>
            <span>Low</span>
            <div style={{ width: 120, height: 8, borderRadius: 4, background: "linear-gradient(90deg, var(--bg-elevated), var(--teal), var(--orange))" }} />
            <span>High</span>
          </div>
        </div>
      )}
    </div>
  );
}
