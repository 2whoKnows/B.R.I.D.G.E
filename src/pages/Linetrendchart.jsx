import "../styles/Linetrendchart.css";

export default function LineTrendChart({ data, height = 220 }) {
  if (!data || data.length === 0) {
    return <div className="ltc-empty">No trend data available</div>;
  }

  const width = 700;
  const padding = { top: 20, right: 16, bottom: 28, left: 36 };
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
          <stop offset="0%" stopColor="#0F172A" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid Lines & Y-Axis Labels */}
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
              stroke="#F1F5F9"
              strokeWidth="1"
            />
            <text x={padding.left - 8} y={y + 3.5} textAnchor="end" className="ltc-axis-label">
              {val}
            </text>
          </g>
        );
      })}

      {/* Trend Area & Stroke */}
      <path d={areaPath} fill="url(#ltcFill)" />
      <path 
        d={linePath} 
        fill="none" 
        stroke="#0F172A" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Data Points & X-Axis Labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle 
            cx={p.x} 
            cy={p.y} 
            r="3.5" 
            fill="#0F172A" 
            stroke="#FFFFFF" 
            strokeWidth="2" 
          />
          <text x={p.x} y={height - 6} textAnchor="middle" className="ltc-axis-label">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}