import { useEffect, useState } from "react";
import { fetchEngineers, type Engineer } from "../api/client";

const PATTERN_TYPES = [
  "Security",
  "Input Validation",
  "SQL Safety",
  "Error Handling",
  "Performance",
  "CORS",
  "Caching",
  "Auth",
  "API Design",
  "React Patterns",
  "Accessibility",
  "Testing",
  "Type Safety",
  "Memory Leaks",
  "Async Patterns",
];

// Generate heatmap intensity (0–1) for each engineer × pattern
function buildHeatmap(engineers: Engineer[]) {
  return engineers.map((eng) =>
    PATTERN_TYPES.map((p) => (eng.common_patterns.includes(p) ? 0.7 + Math.random() * 0.3 : Math.random() * 0.15))
  );
}

function heatColor(v: number): string {
  if (v > 0.6) return `rgba(255,107,43,${0.4 + v * 0.6})`;
  if (v > 0.3) return `rgba(0,212,170,${0.3 + v * 0.5})`;
  return `rgba(255,255,255,${v * 0.15})`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DNAPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngineers().then((e) => {
      setEngineers(e);
      setLoading(false);
    });
  }, []);

  const heatmap = buildHeatmap(engineers);

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Review DNA Map</h2>
        <p>Per-engineer contribution patterns and expertise heatmap</p>
      </div>

      {/* ── Engineer Cards ────────────────────────────── */}
      {loading ? (
        <div className="engineer-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ height: 200 }}>
              <div className="skeleton" style={{ width: "50%", height: 20 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="engineer-grid">
          {engineers.map((eng) => (
            <div key={eng.id} className="card engineer-card">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div className="engineer-avatar">
                  {eng.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{eng.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Last active: {formatDate(eng.last_active)}
                  </div>
                </div>
              </div>

              <div className="engineer-stats">
                <div className="engineer-stat">
                  <div className="engineer-stat-value" style={{ color: "var(--accent-orange)" }}>
                    {eng.patterns_contributed}
                  </div>
                  <div className="engineer-stat-label">Patterns</div>
                </div>
                <div className="engineer-stat">
                  <div className="engineer-stat-value" style={{ color: "var(--accent-teal)" }}>
                    {eng.accuracy_pct}%
                  </div>
                  <div className="engineer-stat-label">Accuracy</div>
                </div>
                <div className="engineer-stat">
                  <div className="engineer-stat-value">
                    {eng.common_patterns.length}
                  </div>
                  <div className="engineer-stat-label">Specialties</div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                {eng.common_patterns.map((p) => (
                  <span
                    key={p}
                    style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 12,
                      background: "var(--accent-orange-dim)",
                      color: "var(--accent-orange)",
                      fontWeight: 600,
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Heatmap ───────────────────────────────────── */}
      {!loading && engineers.length > 0 && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-header">
            <span className="card-title">Pattern Types × Engineers</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `140px repeat(${PATTERN_TYPES.length}, 1fr)`,
                gap: 3,
                minWidth: PATTERN_TYPES.length * 48 + 140,
              }}
            >
              {/* Header row */}
              <div />
              {PATTERN_TYPES.map((p) => (
                <div
                  key={p}
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    textAlign: "center",
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    height: 80,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    letterSpacing: 0.3,
                  }}
                >
                  {p}
                </div>
              ))}

              {/* Data rows */}
              {engineers.map((eng, ei) => (
                <>
                  <div
                    key={`label-${eng.id}`}
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      fontWeight: 600,
                    }}
                  >
                    {eng.name}
                  </div>
                  {heatmap[ei]?.map((v, pi) => (
                    <div
                      key={`${eng.id}-${pi}`}
                      className="heatmap-cell"
                      style={{
                        background: heatColor(v),
                        width: "100%",
                        minHeight: 32,
                      }}
                      title={`${eng.name} — ${PATTERN_TYPES[pi]}: ${(v * 100).toFixed(0)}%`}
                    />
                  ))}
                </>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 16,
              fontSize: 10,
              color: "var(--text-muted)",
            }}
          >
            <span>Low</span>
            <div
              style={{
                width: 120,
                height: 8,
                borderRadius: 4,
                background: "linear-gradient(90deg, rgba(255,255,255,0.05), var(--accent-teal), var(--accent-orange))",
              }}
            />
            <span>High</span>
          </div>
        </div>
      )}
    </div>
  );
}
