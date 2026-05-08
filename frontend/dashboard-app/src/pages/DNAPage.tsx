import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { fetchEngineers, type Engineer } from "../api/client";

const PATTERN_TYPES = [
  "Security", "Input Validation", "SQL Safety", "Error Handling",
  "Performance", "CORS", "Caching", "Auth", "API Design",
  "React Patterns", "Accessibility", "Testing", "Type Safety",
  "Memory Leaks", "Async Patterns",
];

function buildHeatmap(engineers: Engineer[]) {
  return engineers.map((eng) =>
    PATTERN_TYPES.map((p) => {
      if (eng.common_patterns.includes(p)) return 4 + Math.floor(Math.random() * 10);
      return Math.floor(Math.random() * 3);
    })
  );
}

function heatColor(v: number): string {
  if (v >= 13) return "#059669";      // darkest green
  if (v >= 10) return "#10B981";      // emerald
  if (v >= 8)  return "#34D399";      // bright green
  if (v >= 5)  return "#6EE7B7";      // medium green
  if (v >= 3)  return "rgba(16, 185, 129, 0.35)"; // light green
  if (v >= 1)  return "rgba(16, 185, 129, 0.15)"; // faint green
  return "rgba(16, 185, 129, 0.05)";   // barely visible
}

// Aggregate team-level stats
function getTeamStats(engineers: Engineer[]) {
  const totalPatterns = engineers.reduce((acc, e) => acc + e.patterns_contributed, 0);
  const avgAccuracy = engineers.length > 0
    ? engineers.reduce((acc, e) => acc + e.accuracy_pct, 0) / engineers.length
    : 0;
  const allSpecialties = new Set(engineers.flatMap((e) => e.common_patterns));
  const lastActive = engineers.length > 0
    ? new Date(Math.max(...engineers.map((e) => new Date(e.last_active).getTime())))
    : new Date();
  return { totalPatterns, avgAccuracy, specialties: Array.from(allSpecialties), lastActive };
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
  const team = getTeamStats(engineers);

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Review DNA Map</h2>
        <p>Per-engineer contribution patterns and expertise heatmap.</p>
        {lastFetch && <div className="last-updated">Last updated: {formatDistanceToNow(lastFetch, { addSuffix: true })}</div>}
      </div>

      {/* ── Team Card ──────────────────────────────────── */}
      {loading ? (
        <div className="card" style={{ height: 120, marginBottom: 20 }}>
          <div className="skeleton" style={{ width: "50%", height: 20 }} />
        </div>
      ) : (
        <div className="card dna-team-card">
          <div className="dna-team-left">
            <div className="dna-team-avatar">T</div>
            <div>
              <div className="dna-team-name">Team</div>
              <div className="dna-team-sub">
                Last active: {team.lastActive.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

          <div className="dna-team-stats">
            <div className="dna-team-stat">
              <div className="dna-team-stat-value" style={{ color: "var(--orange)" }}>
                {team.totalPatterns}
              </div>
              <div className="dna-team-stat-label">Patterns</div>
            </div>
            <div className="dna-team-stat" style={{ borderLeft: "1px solid var(--border-subtle)", paddingLeft: 20 }}>
              <div className="dna-team-stat-value" style={{ color: "var(--blue)" }}>
                {team.avgAccuracy.toFixed(1)}%
              </div>
              <div className="dna-team-stat-label">Accuracy</div>
            </div>
            <div className="dna-team-stat">
              <div className="dna-team-stat-value" style={{ color: "var(--text-primary)" }}>
                {team.specialties.length}
              </div>
              <div className="dna-team-stat-label">Specialties</div>
            </div>
          </div>

          <div className="dna-team-tags">
            {team.specialties.slice(0, 3).map((s) => (
              <span key={s} className="specialty-tag">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Heatmap ───────────────────────────────────── */}
      {!loading && engineers.length > 0 && (
        <div className="card dna-heatmap-card">
          <div style={{ overflowX: "auto" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: `80px repeat(${PATTERN_TYPES.length}, 1fr)`,
              gap: 3,
              minWidth: PATTERN_TYPES.length * 48 + 80,
            }}>
              {/* Header */}
              <div />
              {PATTERN_TYPES.map((p) => (
                <div key={p} style={{
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  height: 80,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 500,
                }}>
                  {p}
                </div>
              ))}

              {/* Team row (aggregated) */}
              <div style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                justifyContent: "center",
              }}>
                Team
              </div>
              {PATTERN_TYPES.map((p, pi) => {
                // Aggregate: sum all engineers for this pattern
                const totalVal = heatmap.reduce((acc, row) => acc + (row[pi] || 0), 0);
                const normalized = Math.min(13, Math.round(totalVal / Math.max(1, engineers.length)));
                return (
                  <div
                    key={`team-${pi}`}
                    className="heatmap-cell"
                    style={{
                      background: heatColor(normalized),
                      width: "100%",
                      minHeight: 36,
                      maxWidth: "none",
                      borderRadius: 4,
                    }}
                    title={`${p}: ${totalVal} total instances`}
                  />
                );
              })}

              {/* Per-engineer rows */}
              {engineers.map((eng, ei) => (
                <div key={eng.id} style={{ display: "contents" }}>
                  <div style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 80,
                  }}>
                    {eng.name.split(" ")[0]}
                  </div>
                  {heatmap[ei]?.map((v, pi) => (
                    <div
                      key={`${eng.id}-${pi}`}
                      className="heatmap-cell"
                      style={{
                        background: heatColor(v),
                        width: "100%",
                        minHeight: 36,
                        maxWidth: "none",
                        borderRadius: 4,
                      }}
                      title={`${eng.name} — ${PATTERN_TYPES[pi]}: ${v} patterns`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom x-axis labels */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `80px repeat(${PATTERN_TYPES.length}, 1fr)`,
            gap: 3,
            marginTop: 8,
            minWidth: PATTERN_TYPES.length * 48 + 80,
          }}>
            <div />
            {PATTERN_TYPES.map((p) => (
              <div key={`bottom-${p}`} style={{
                fontSize: 9,
                color: "var(--text-muted)",
                textAlign: "center",
                transform: "rotate(-45deg)",
                transformOrigin: "center top",
                height: 60,
                whiteSpace: "nowrap",
              }}>
                {p}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            fontSize: 11,
            color: "var(--text-muted)",
          }}>
            <span>Low</span>
            <div style={{
              width: 120,
              height: 10,
              borderRadius: 5,
              background: "linear-gradient(90deg, rgba(16,185,129,0.08), rgba(16,185,129,0.3), #34D399, #10B981, #059669)",
            }} />
            <span>High</span>
          </div>
        </div>
      )}
    </div>
  );
}
