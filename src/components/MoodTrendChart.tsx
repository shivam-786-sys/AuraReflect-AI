import React, { useState } from "react";
import { TrendingUp, Smile, Calendar, Sparkles } from "lucide-react";
import { JournalEntry } from "../types";

interface MoodTrendChartProps {
  entries: JournalEntry[];
  onSelectEntry?: (entry: JournalEntry) => void;
}

export const MoodTrendChart: React.FC<MoodTrendChartProps> = ({
  entries,
  onSelectEntry,
}) => {
  const [hoveredEntry, setHoveredEntry] = useState<JournalEntry | null>(null);

  // Filter entries that have moodScore and sort chronologically (oldest to newest)
  const chartEntries = entries
    .filter((e) => typeof e.moodScore === "number" && e.moodScore > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (chartEntries.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-orange-400 mx-auto mb-3 flex items-center justify-center">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">
          Weekly Mood Trend
        </div>
        <h3 className="text-base font-serif font-light text-white/90 mb-1">Mood Trend Tracker</h3>
        <p className="text-xs text-white/40 max-w-sm mx-auto">
          Complete your first journal reflection to begin charting your emotional trajectory over time.
        </p>
      </div>
    );
  }

  // Calculate average
  const totalScore = chartEntries.reduce((acc, curr) => acc + curr.moodScore, 0);
  const avgScore = (totalScore / chartEntries.length).toFixed(1);

  // SVG Chart dimensions
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  // Map entries to coordinates
  const points = chartEntries.map((entry, index) => {
    const x =
      chartEntries.length === 1
        ? width / 2
        : paddingX + (index / (chartEntries.length - 1)) * innerWidth;
    // Mood score is 1 to 10
    const normalizedY = (entry.moodScore - 1) / 9; // 0 to 1
    const y = height - paddingY - normalizedY * innerHeight;
    return { x, y, entry };
  });

  // Generate SVG path string
  const pathD =
    points.length === 1
      ? ""
      : points.reduce((acc, pt, idx) => {
          return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
        }, "");

  // Area under line
  const areaD =
    points.length <= 1
      ? ""
      : `${pathD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">
            Weekly Mood Trend
          </div>
          <h3 className="text-lg font-serif font-light text-white/95">Emotional Resonance Arc</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-white/40 block">Average Mood</span>
            <span className="text-sm font-semibold text-orange-300 font-mono">
              {avgScore} / 10
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto py-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Guideline levels */}
          {[10, 7, 4, 1].map((val) => {
            const normY = (val - 1) / 9;
            const y = height - paddingY - normY * innerHeight;
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  fill="rgba(255, 255, 255, 0.3)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Filled Area */}
          {areaD && <path d={areaD} fill="url(#moodGradient)" />}

          {/* Stroke Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#f97316"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {points.map((pt, i) => {
            const isHovered = hoveredEntry?.id === pt.entry.id;
            const dotColor =
              pt.entry.moodScore >= 8
                ? "#34d399"
                : pt.entry.moodScore >= 5
                ? "#f97316"
                : "#60a5fa";

            return (
              <g
                key={pt.entry.id || i}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredEntry(pt.entry)}
                onMouseLeave={() => setHoveredEntry(null)}
                onClick={() => onSelectEntry && onSelectEntry(pt.entry)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 7 : 4.5}
                  fill={dotColor}
                  stroke="#050302"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating or Selected Tooltip */}
      {hoveredEntry && (
        <div className="mt-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-medium text-[11px] border border-orange-500/30">
              Mood: {hoveredEntry.moodScore}/10 ({hoveredEntry.moodLabel})
            </span>
            <span className="font-medium text-white/95 truncate max-w-[220px]">
              {hoveredEntry.title}
            </span>
          </div>
          <div className="flex items-center gap-3 text-white/50 text-[11px]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-white/40" />
              {new Date(hoveredEntry.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="text-orange-400 hover:underline cursor-pointer">
              Click to view entry →
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
