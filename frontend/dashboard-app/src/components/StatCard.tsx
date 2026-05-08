import { type ReactNode, useEffect, useRef, useState } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  label: string;
  color: "orange" | "amber" | "teal" | "blue";
  icon: ReactNode;
  isPercentage?: boolean;
}

export default function StatCard({ title, value, label, color, icon, isPercentage }: StatCardProps) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const numVal = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numVal)) { setDisplay(String(value)); return; }

    const duration = 800;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = numVal * eased;

      if (isPercentage) {
        setDisplay(parseFloat(current.toFixed(1)).toFixed(1) + "%");
      } else {
        setDisplay(Math.round(current).toLocaleString());
      }

      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, isPercentage]);

  return (
    <div ref={ref} className={`card stat-card ${color}`}>
      <div className="card-header">
        <span className="card-title">{title}</span>
        <div className="stat-icon">{icon}</div>
      </div>
      <div className="stat-value">{display}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
