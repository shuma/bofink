"use client";

interface GaugeChartProps {
  value: number;
  max?: number;
}

export function GaugeChart({ value, max = 100 }: GaugeChartProps) {
  const pct = Math.min(value, max) / max;
  const R = 54;
  const cx = 70;
  const cy = 68;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const totalArc = endAngle - startAngle;
  const angle = startAngle + pct * totalArc;

  const arc = (a: number): [number, number] => [
    cx + R * Math.cos(a),
    cy + R * Math.sin(a),
  ];

  const pathD = (from: number, to: number) => {
    const [x1, y1] = arc(from);
    const [x2, y2] = arc(to);
    const large = to - from > Math.PI ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };

  // Threshold angles
  const t50 = startAngle + 0.5 * totalArc;
  const t70 = startAngle + 0.7 * totalArc;
  const t85 = startAngle + 0.85 * totalArc;

  // Softer colors based on value
  const color = value > 85 ? "hsl(0 65% 55%)" : value > 70 ? "hsl(45 85% 55%)" : "hsl(145 55% 50%)";
  const [nx, ny] = arc(angle);

  // Status text with matching soft colors
  const statusText = value > 85 ? "Hög risk" : value > 70 ? "Måttlig" : "Bra";
  const statusColor =
    value > 85 ? "hsl(0 65% 45%)" : value > 70 ? "hsl(45 75% 40%)" : "hsl(145 55% 35%)";

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="78" viewBox="0 0 140 78">
        {/* Track segments - soft warm colors */}
        <path
          d={pathD(startAngle, t50)}
          fill="none"
          stroke="hsl(145 40% 90%)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={pathD(t50, t70)}
          fill="none"
          stroke="hsl(50 60% 90%)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={pathD(t70, t85)}
          fill="none"
          stroke="hsl(30 60% 90%)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={pathD(t85, endAngle)}
          fill="none"
          stroke="hsl(0 50% 92%)"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Filled value arc */}
        <path
          d={pathD(startAngle, angle)}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Needle dot */}
        <circle
          cx={nx.toFixed(2)}
          cy={ny.toFixed(2)}
          r="5"
          fill={color}
          stroke="#fff"
          strokeWidth="2"
        />

        {/* Value text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="17"
          fontWeight="600"
          fill="currentColor"
          fontFamily="var(--font-heading), sans-serif"
        >
          {value.toFixed(1).replace(".", ",")}%
        </text>

        {/* Tick labels */}
        {[
          { label: "0%", a: startAngle },
          { label: "50%", a: t50 },
          { label: "85%", a: t85 },
          { label: "100%", a: endAngle },
        ].map(({ label, a }, i) => {
          const [lx, ly] = [cx + (R + 14) * Math.cos(a), cy + (R + 14) * Math.sin(a)];
          return (
            <text
              key={i}
              x={lx.toFixed(1)}
              y={ly.toFixed(1)}
              textAnchor="middle"
              fontSize="8"
              fill="hsl(220 10% 50%)"
              fontFamily="var(--font-sans), sans-serif"
            >
              {label}
            </text>
          );
        })}
      </svg>
      <span
        className="-mt-1 text-[11px] font-semibold"
        style={{ color: statusColor }}
      >
        {statusText}
      </span>
    </div>
  );
}
