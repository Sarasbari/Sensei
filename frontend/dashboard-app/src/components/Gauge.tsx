interface GaugeProps {
  value: number; // 0–100
  label: string;
  color?: string;
}

export default function Gauge({ value, label, color = "#FF6B2B" }: GaugeProps) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="gauge-container">
      <div className="gauge-ring">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 800ms ease" }}
          />
        </svg>
        <div className="gauge-center">
          <div className="gauge-value" style={{ color }}>
            {value.toFixed(1)}%
          </div>
        </div>
      </div>
      <span className="gauge-label">{label}</span>
    </div>
  );
}
