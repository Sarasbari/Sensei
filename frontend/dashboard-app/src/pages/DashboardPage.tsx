import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { MessageSquareCode, AlertTriangle, Target, Layers } from "lucide-react";
import { fetchDashboardStats, type DashboardStats } from "../api/client";
import StatCard from "../components/StatCard";
import Gauge from "../components/Gauge";
import { formatDistanceToNow } from "date-fns";

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
        <div className="page-header"><h2>Dashboard</h2><p>Loading...</p></div>
        <div className="stats-grid">
          {[1,2,3,4].map((i) => (
            <div key={i} className="card" style={{ height: 140 }}>
              <div className="skeleton" style={{ width: "60%", height: 16, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: "40%", height: 36 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasCycleData = stats.cycle_time && stats.cycle_time.length > 0;
  const sparkData = stats.accuracy_trend.map((v, i) => ({ x: i, y: v }));

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Real-time impact and performance of Sensei AI reviews</p>
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
          label="Comments posted to PRs"
          color="orange"
          icon={<MessageSquareCode size={20} />}
        />
        <StatCard
          title="Escalation Rate"
          value={stats.escalation_rate}
          label="Escalated to seniors this week"
          color="amber"
          icon={<AlertTriangle size={20} />}
          isPercentage
        />
        <StatCard
          title="Accuracy"
          value={stats.accuracy}
          label="Reviews accepted without edits"
          color="teal"
          icon={<Target size={20} />}
          isPercentage
        />
        <StatCard
          title="Review DNA"
          value={stats.total_patterns}
          label="Total patterns in knowledge base"
          color="blue"
          icon={<Layers size={20} />}
        />
      </div>

      {/* ── Charts ────────────────────────────────────── */}
      <div className="charts-grid">
        {/* PR Cycle Time */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">PR Cycle Time (hours)</span>
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 12, height: 2, background: "var(--text-muted)", display: "inline-block", borderRadius: 1 }} />
                Before Sensei
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 12, height: 3, background: "var(--orange)", display: "inline-block", borderRadius: 1 }} />
                After Sensei
              </span>
            </div>
          </div>
          {hasCycleData ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.cycle_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="week" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }} />
                <Line type="monotone" dataKey="before" stroke="var(--text-muted)" strokeWidth={2} dot={false} strokeDasharray="6 4" />
                <Line type="monotone" dataKey="after" stroke="var(--orange)" strokeWidth={2.5} dot={{ fill: "#FF6B2B", r: 4, stroke: "#FF6B2B" }} activeDot={{ r: 6, fill: "#FF6B2B", stroke: "rgba(255,107,43,0.3)", strokeWidth: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>
              No PR data yet — open a PR on a connected repo
            </div>
          )}
        </div>

        {/* Escalation Gauge */}
        <div className="card">
          <div className="card-header"><span className="card-title">Escalation Rate</span></div>
          <Gauge value={stats.escalation_rate} label="THIS WEEK" />
        </div>
      </div>

      {/* ── Accuracy Trend ────────────────────────────── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <span className="card-title">Accuracy Trend (last 8 weeks)</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, color: "var(--teal)" }}>
            {parseFloat(String(stats.accuracy)).toFixed(1)}%
          </span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={sparkData}>
            <defs>
              <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#00D4AA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <Area type="monotone" dataKey="y" stroke="var(--teal)" strokeWidth={2} fill="url(#tealGrad)" dot={false} />
            <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }} formatter={(v: number) => [`${v}%`, "Accuracy"]} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
