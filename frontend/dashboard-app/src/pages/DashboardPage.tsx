import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { MessageSquareCode, AlertTriangle, Target, Layers } from "lucide-react";
import { fetchDashboardStats, type DashboardStats } from "../api/client";
import StatCard from "../components/StatCard";
import Gauge from "../components/Gauge";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="main-content">
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Loading...</p>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ height: 140 }}>
              <div className="skeleton" style={{ width: "60%", height: 16, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: "40%", height: 36 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sparkData = stats.accuracy_trend.map((v, i) => ({ x: i, y: v }));

  return (
    <div className="main-content">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Real-time impact and performance of Sensei AI reviews</p>
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
          value={`${stats.escalation_rate}%`}
          label="Escalated to seniors this week"
          color="yellow"
          icon={<AlertTriangle size={20} />}
        />
        <StatCard
          title="Accuracy"
          value={`${stats.accuracy}%`}
          label="Reviews accepted without edits"
          color="teal"
          icon={<Target size={20} />}
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
                <span style={{ width: 10, height: 3, borderRadius: 2, background: "var(--text-muted)", display: "inline-block" }} />
                Before Sensei
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 3, borderRadius: 2, background: "var(--accent-orange)", display: "inline-block" }} />
                After Sensei
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats.cycle_time}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#121A30",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#F1F5F9",
                }}
              />
              <Line
                type="monotone"
                dataKey="before"
                stroke="#64748B"
                strokeWidth={2}
                dot={false}
                strokeDasharray="6 4"
              />
              <Line
                type="monotone"
                dataKey="after"
                stroke="#FF6B2B"
                strokeWidth={3}
                dot={{ fill: "#FF6B2B", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Escalation Gauge */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Escalation Rate</span>
          </div>
          <Gauge value={stats.escalation_rate} label="This week" />
        </div>
      </div>

      {/* ── Accuracy Sparkline ────────────────────────── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <span className="card-title">Accuracy Trend (last 8 weeks)</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-teal)" }}>
            {stats.accuracy}%
          </span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={sparkData}>
            <defs>
              <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00D4AA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="y"
              stroke="#00D4AA"
              strokeWidth={2.5}
              fill="url(#tealGrad)"
              dot={false}
            />
            <Tooltip
              contentStyle={{
                background: "#121A30",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
                color: "#F1F5F9",
              }}
              formatter={(v: number) => [`${v}%`, "Accuracy"]}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
