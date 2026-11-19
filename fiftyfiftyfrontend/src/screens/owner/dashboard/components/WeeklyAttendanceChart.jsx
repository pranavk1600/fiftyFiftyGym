import React, { useState } from 'react';
import { BarChart2, Activity } from 'lucide-react';
import './weeklyAttendanceChart.css';

const defaultEmptyWeek = [
  { day: 'Mon', count: 0, fullDay: 'Monday' },
  { day: 'Tue', count: 0, fullDay: 'Tuesday' },
  { day: 'Wed', count: 0, fullDay: 'Wednesday' },
  { day: 'Thu', count: 0, fullDay: 'Thursday' },
  { day: 'Fri', count: 0, fullDay: 'Friday' },
  { day: 'Sat', count: 0, fullDay: 'Saturday' },
  { day: 'Sun', count: 0, fullDay: 'Sunday' }
];

export const WeeklyAttendanceChart = ({
  data = defaultEmptyWeek,
  highlightDay
}) => {
  const chartData = Array.isArray(data) && data.length > 0 ? data : defaultEmptyWeek;
  const [chartType, setChartType] = useState('bars'); // 'bars' | 'trend'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Chart coordinates
  const svgWidth = 620;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 24;
  const padTop = 28;
  const padBottom = 42;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom; // 150px
  const maxVal = Math.max(20, ...chartData.map((d) => d.count || 0));
  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  const colStep = plotWidth / chartData.length;
  const barWidth = 34;

  // Calculate points for line chart
  const points = chartData.map((item, idx) => {
    const x = padLeft + (idx + 0.5) * colStep;
    const y = padTop + plotHeight - ((item.count || 0) / maxVal) * plotHeight;
    return { x, y, ...item };
  });

  // Generate smooth SVG curve path
  const generateSmoothPath = (pts) => {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const linePath = generateSmoothPath(points);
  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z` : '';

  // Summary figures
  const totalCheckIns = chartData.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const dailyAverage = Math.round(totalCheckIns / (chartData.length || 1));
  const peakDay = [...chartData].sort((a, b) => (b.count || 0) - (a.count || 0))[0];

  return (
    <div className="attendance-chart-widget">
      {/* Chart Top Header & View Controls */}
      <div className="attendance-chart-header">
        <div>
          <div className="attendance-chart-title-row">
            <h2 className="dashboard-panel-title">Weekly Attendance Activity</h2>
            <span className="attendance-trend-pill">
              <Activity size={13} /> 7-Day Overview
            </span>
          </div>
          <p className="attendance-chart-subtitle">
            Daily member check-in volume and footfall trends over the last 7 days
          </p>
        </div>

        {/* View mode toggle (Bars / Trend Line) */}
        <div className="chart-mode-toggle" role="group" aria-label="Chart display type">
          <button
            type="button"
            className={`chart-mode-btn ${chartType === 'bars' ? 'active' : ''}`}
            onClick={() => setChartType('bars')}
            title="Display Bar Analytics"
          >
            <BarChart2 size={14} />
            <span>Bars</span>
          </button>
          <button
            type="button"
            className={`chart-mode-btn ${chartType === 'trend' ? 'active' : ''}`}
            onClick={() => setChartType('trend')}
            title="Display Line Trend"
          >
            <Activity size={14} />
            <span>Trend</span>
          </button>
        </div>
      </div>

      {/* Interactive Responsive SVG Canvas */}
      <div className="attendance-svg-wrap">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="attendance-chart-svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Gradient for bar fills */}
            <linearGradient id="gymBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#EA580C" stopOpacity="0.75" />
            </linearGradient>

            {/* Gradient for highlight peak day */}
            <linearGradient id="gymBarHighlight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#16A34A" stopOpacity="0.8" />
            </linearGradient>

            {/* Area gradient for line chart mode */}
            <linearGradient id="gymAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FF6B00" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines and Y-axis scale */}
          {yTicks.map((tickVal, idx) => {
            const yPos = padTop + plotHeight - (tickVal / maxVal) * plotHeight;
            return (
              <g key={idx} className="chart-grid-line-group">
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={svgWidth - padRight}
                  y2={yPos}
                  className="chart-grid-line"
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 4}
                  className="chart-axis-label y-axis"
                  textAnchor="end"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Area fill under trend curve */}
          {chartType === 'trend' && areaPath && (
            <path d={areaPath} fill="url(#gymAreaGrad)" />
          )}

          {/* Trend line curve */}
          {chartType === 'trend' && linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#FF6B00"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Trend line point markers */}
          {chartType === 'trend' &&
            points.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === idx ? 6 : 4}
                fill={pt.day === highlightDay ? '#22C55E' : '#FF6B00'}
                stroke="var(--bg-surface)"
                strokeWidth="2"
                className="chart-point-marker"
              />
            ))}

          {/* Bars & Labels */}
          {points.map((item, idx) => {
            const barH = ((item.count || 0) / maxVal) * plotHeight;
            const barX = item.x - barWidth / 2;
            const barY = padTop + plotHeight - barH;
            const isHighlight = item.day === highlightDay && item.count > 0;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                className="chart-column-group"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Background hover bar highlight */}
                <rect
                  x={item.x - colStep / 2 + 2}
                  y={padTop}
                  width={colStep - 4}
                  height={plotHeight}
                  fill="currentColor"
                  className={`chart-hover-backdrop ${isHovered ? 'visible' : ''}`}
                />

                {/* Primary Data Bar */}
                {chartType === 'bars' && (
                  <rect
                    x={barX}
                    y={barH > 0 ? barY : padTop + plotHeight - 2}
                    width={barWidth}
                    height={barH > 0 ? barH : 2}
                    rx="6"
                    ry="6"
                    fill={isHighlight ? 'url(#gymBarHighlight)' : 'url(#gymBarGrad)'}
                    className={`chart-bar-rect ${isHovered ? 'hovered' : ''}`}
                  />
                )}

                {/* Day of Week Label */}
                <text
                  x={item.x}
                  y={svgHeight - 16}
                  className={`chart-axis-label x-axis ${isHighlight ? 'highlight' : ''}`}
                  textAnchor="middle"
                >
                  {item.day}
                </text>

                {/* Tooltip Overlay displayed on hover */}
                {isHovered && (
                  <g className="chart-tooltip-group" pointerEvents="none">
                    <rect
                      x={item.x - 52}
                      y={barY - 34 > 8 ? barY - 34 : padTop + 6}
                      width="104"
                      height="26"
                      rx="6"
                      className="chart-tooltip-box"
                    />
                    <text
                      x={item.x}
                      y={barY - 34 > 8 ? barY - 17 : padTop + 23}
                      className="chart-tooltip-text"
                      textAnchor="middle"
                    >
                      {item.fullDay}: {item.count || 0}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom KPI Highlights Footer */}
      <div className="attendance-chart-footer">
        <div className="chart-footer-stat">
          <span className="chart-footer-label">Total 7-Day Footfall</span>
          <span className="chart-footer-value">
            <strong>{totalCheckIns}</strong> check-ins
          </span>
        </div>
        <div className="chart-footer-stat">
          <span className="chart-footer-label">Daily Average</span>
          <span className="chart-footer-value">
            <strong>{dailyAverage}</strong> members/day
          </span>
        </div>
        <div className="chart-footer-stat">
          <span className="chart-footer-label">Peak Attendance</span>
          <span className="chart-footer-value" style={{ color: 'var(--brand-primary)' }}>
            <strong>
              {peakDay && peakDay.count > 0 ? `${peakDay.fullDay} (${peakDay.count} visits)` : 'No check-ins yet'}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyAttendanceChart;
