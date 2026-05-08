import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  label: string;
  color: "orange" | "teal" | "yellow" | "blue";
  icon: ReactNode;
}

export default function StatCard({ title, value, label, color, icon }: StatCardProps) {
  return (
    <div className={`card stat-card ${color}`}>
      <div className="card-header">
        <span className="card-title">{title}</span>
        <div className={`stat-icon ${color}`}>{icon}</div>
      </div>
      <div className={`stat-value ${color}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
