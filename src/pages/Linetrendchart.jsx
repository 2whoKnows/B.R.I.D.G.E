import "../styles/Linetrendchart.css";

// Small dependency-free line chart so the project doesn't need to pull in
// a charting library just for this. Swap for recharts/etc. if preferred.
export default function LineTrendChart({ data, height = 220 }) {
  if (!data || data.length === 0) {
    return <div className="ltc-empty">No data yet</div>;
  }

  const width = 700;
  const padding = { top: 16, right: 12, bottom: 28, left: 34 };
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const niceMax = Math.ceil(maxVal / 5) * 5 || 5;

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * innerW;
    const y = padding.top + innerH - (d.value / niceMax) * innerH;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padding.top + innerH).toFixed(1)} ` +
    `L ${points[0].x.toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`;

  const gridLines = 4;

  return (
    <svg className="ltc-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ltcFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3fa9f5" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3fa9f5" stopOpacity="0" />
        </linearGradient>
      </defs>

      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padding.top + (innerH / gridLines) * i;
        const val = Math.round(niceMax - (niceMax / gridLines) * i);
        return (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#e7edf3"
              strokeWidth="1"
            />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" className="ltc-axis-label">
              {val}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#ltcFill)" />
      <path d={linePath} fill="none" stroke="#0a3d62" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.2" fill="#0a3d62" />
          <text x={p.x} y={height - 6} textAnchor="middle" className="ltc-axis-label">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}