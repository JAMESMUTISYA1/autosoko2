"use client";

import { useState } from "react";
import { formatPrice } from "@/data/sampleData";

const WIDTH = 600;
const HEIGHT = 180;
const PADDING = 24;

// A small, dependency-free SVG line chart — no charting library assumed
// to be installed. Trades some polish for zero new dependencies; swap for
// recharts/etc. later if you add one to the project.
export default function RevenueChart({ data, currency }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">No revenue data yet.</p>;
  }

  const values = data.map((d) => d.totalMinor);
  const max = Math.max(...values, 1);
  const stepX = (WIDTH - PADDING * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = PADDING + i * stepX;
    const y = HEIGHT - PADDING - (d.totalMinor / max) * (HEIGHT - PADDING * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${HEIGHT - PADDING} L ${points[0].x} ${HEIGHT - PADDING} Z`;

  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;
  const mid = data[Math.floor(data.length / 2)]?.date;

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const idx = Math.round((relX - PADDING) / stepX);
    if (idx >= 0 && idx < points.length) setHoverIndex(idx);
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-40"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={handleMove}
      >
        <line
          x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING}
          stroke="currentColor" className="text-line" strokeWidth="1"
        />

        <path d={areaPath} fill="currentColor" className="text-blue-900/10" stroke="none" />
        <path d={linePath} fill="none" stroke="currentColor" className="text-blue-900" strokeWidth="2" />

        {hoverIndex !== null && (
          <>
            <line
              x1={points[hoverIndex].x} y1={PADDING}
              x2={points[hoverIndex].x} y2={HEIGHT - PADDING}
              stroke="currentColor" className="text-line" strokeDasharray="3 3"
            />
            <circle
              cx={points[hoverIndex].x} cy={points[hoverIndex].y} r="4"
              fill="currentColor" className="text-yellow-400"
              stroke="currentColor" strokeWidth="1.5"
            />
          </>
        )}
      </svg>

      <div className="flex justify-between text-[10px] text-muted mt-1">
        <span>{formatShortDate(first)}</span>
        <span>{formatShortDate(mid)}</span>
        <span>{formatShortDate(last)}</span>
      </div>

      {hoverIndex !== null && (
        <div className="mt-2 text-xs bg-bg border border-line rounded-sm px-2.5 py-1.5 inline-block">
          <span className="text-muted">{formatShortDate(points[hoverIndex].date)}: </span>
          <span className="font-medium">{formatPrice(points[hoverIndex].totalMinor, currency)}</span>
        </div>
      )}
    </div>
  );
}

function formatShortDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
