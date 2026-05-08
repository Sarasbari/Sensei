interface GaugeProps {
  value: number; // 0–100
  label: string;
}

export default function Gauge({ value, label }: GaugeProps) {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc from 135° to 405° (270° sweep)
  const startAngle = 135;
  const endAngle = 405;
  const range = endAngle - startAngle;
  const valueAngle = startAngle + (value / 100) * range;

  const polarToCartesian = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const color = value <= 15 ? "var(--teal)" : value <= 30 ? "var(--amber)" : "var(--red)";

  return (
    <div className="gauge-container">
      <div className="gauge-ring">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <path
            d={describeArc(startAngle, endAngle)}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {value > 0 && (
            <path
              d={describeArc(startAngle, valueAngle)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{ transition: "all 800ms ease" }}
            />
          )}
        </svg>
        <div className="gauge-center">
          <div className="gauge-value" style={{ color }}>
            {parseFloat(value.toFixed(1))}%
          </div>
        </div>
      </div>
      <span className="gauge-label">{label}</span>
    </div>
  );
}
