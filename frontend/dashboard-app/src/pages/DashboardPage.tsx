import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { MessageSquareCode, AlertTriangle, Target, Layers, CheckCircle, Info } from "lucide-react";
import { fetchDashboardStats, type DashboardStats } from "../api/client";
import StatCard from "../components/StatCard";
import { formatDistanceToNow } from "date-fns";

// Mock escalation data matching the reference
const recentEscalations = [
  { pr: "realistic/ecom/ravlistao...", files: 12, severity: "success" as const },
  { pr: "realistic/ecom/ravlistao...", files: 10, severity: "warning" as const },
  { pr: "realistic/ecom/ravlistao...", files: 8, severity: "info" as const },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = useCallback(() => {
    fetchDashboardStats().then((s) => { setStats(s); setLastFetch(new Date()); });
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  if (!stats) {
    return (
      <div className="main-content">
        <div className="page-header"><h2>Overview</h2></div>
        <div className="stats-grid">
          {[1,2,3,4].map((i) => (
            <div key={i} className="card" style={{ height: 120 }}>
              <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 14 }} />
              <div className="skeleton" style={{ width: "40%", height: 32 }} />
            </div>
          ))}
        </div>
        <div className="charts-grid">
          <div className="card" style={{ height: 340 }}>
            <div className="skeleton" style={{ width: "40%", height: 14, marginBottom: 20 }} />
            <div className="skeleton" style={{ width: "100%", height: 260 }} />
          </div>
          <div className="card" style={{ height: 340 }}>
            <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 20 }} />
            <div className="skeleton" style={{ width: "100%", height: 260 }} />
          </div>
        </div>
      </div>
    );
  }

  const hasCycleData = stats.cycle_time && stats.cycle_time.length > 0;
  const sparkData = stats.accuracy_trend.map((v, i) => ({ x: i, y: v }));

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Overview</h2>
        {lastFetch && (
          <div className="last-updated">
            Last updated: {formatDistanceToNow(lastFetch, { addSuffix: true })}
          </div>
        )}
      </div>

      {/* ── Stat Cards ────────────────────────────────── */}
      <div className="stats-grid">
        <StatCard
          title="Reviews Today"
          value={stats.reviews_today}
          label="Success Emerald"
          color="emerald"
          icon={<MessageSquareCode size={20} />}
        />
        <StatCard
          title="Escalation Rate"
          value={stats.escalation_rate}
          label="Success Emerald"
          color="amber"
          icon={<AlertTriangle size={20} />}
          isPercentage
        />
        <StatCard
          title="Accuracy"
          value={stats.accuracy}
          label="Success Emerald"
          color="emerald"
          icon={<Target size={20} />}
          isPercentage
        />
        <StatCard
          title="Review DNA"
          value={stats.total_patterns}
          label="Success Emerald"
          color="emerald"
          icon={<Layers size={20} />}
        />
      </div>

      {/* ── Charts Row ────────────────────────────────── */}
      <div className="charts-grid">
        {/* PR Cycle Time */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">PR Cycle Time (hours)</span>
            <div style={{ display: "flex", gap: 20, fontSize: 11, color: "var(--text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 3, background: "#3B82F6", display: "inline-block", borderRadius: 2 }} />
                Before Sensei
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 3, background: "#10B981", display: "inline-block", borderRadius: 2 }} />
                After Sensei
              </span>
            </div>
          </div>
          {hasCycleData ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.cycle_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 45, 74, 0.5)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#475569", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fill: "#475569", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-8}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text-primary)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="before"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ fill: "#3B82F6", r: 3.5, stroke: "#3B82F6" }}
                  activeDot={{ r: 5, fill: "#3B82F6", stroke: "rgba(59,130,246,0.3)", strokeWidth: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="after"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ fill: "#10B981", r: 3.5, stroke: "#10B981" }}
                  activeDot={{ r: 5, fill: "#10B981", stroke: "rgba(16,185,129,0.3)", strokeWidth: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 13 }}>
              No PR data yet — open a PR on a connected repo
            </div>
          )}
        </div>

        {/* Right column: Recent Escalations + Accuracy Trend stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Recent Escalations */}
          <div className="recent-escalations-card">
            <div className="card-title" style={{ marginBottom: 14 }}>Recent Escalations</div>
            <table className="escalations-mini-table">
              <thead>
                <tr>
                  <th>PR</th>
                  <th>Files</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {recentEscalations.map((esc, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {esc.pr}
                    </td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                      {esc.files}
                    </td>
                    <td>
                      <span className={`severity-dot ${esc.severity}`}>
                        {esc.severity === "success" && <CheckCircle size={12} />}
                        {esc.severity === "warning" && <AlertTriangle size={12} />}
                        {esc.severity === "info" && <Info size={12} />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Review Accuracy Trend */}
          <div className="accuracy-trend-card" style={{ flex: 1 }}>
            <div className="card-title" style={{ marginBottom: 4 }}>Review Accuracy Trend</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-muted)" }}>94%</span>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#emeraldGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              <span>80%</span>
              <span></span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>75%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
