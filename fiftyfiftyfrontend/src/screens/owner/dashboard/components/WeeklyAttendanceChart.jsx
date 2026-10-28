import React, { useState } from 'react';
import { TrendingUp, BarChart2, Activity } from 'lucide-react';
import './weeklyAttendanceChart.css';

export const WeeklyAttendanceChart = ({
  data = [
    { day: 'Mon', count: 48, fullDay: 'Monday' },
    { day: 'Tue', count: 52, fullDay: 'Tuesday' },
    { day: 'Wed', count: 45, fullDay: 'Wednesday' },
    { day: 'Thu', count: 58, fullDay: 'Thursday' },
    { day: 'Fri', count: 54, fullDay: 'Friday' },
    { day: 'Sat', count: 60, fullDay: 'Saturday' },
    { day: 'Sun', count: 32, fullDay: 'Sunday' }
  ],
  highlightDay = 'Sat'
}) => {
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
  const maxVal = 80;
  const yTicks = [0, 20, 40, 60, 80];

  const colStep = plotWidth / data.length;
  const barWidth = 34;

  // Calculate points for line chart
  const points = data.map((item, idx) => {
    const x = padLeft + (idx + 0.5) * colStep;
    const y = padTop + plotHeight - (item.count / maxVal) * plotHeight;
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
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`;

  // Summary figures
  const totalCheckIns = data.reduce((acc, curr) => acc + curr.count, 0);
  const dailyAverage = Math.round(totalCheckIns / data.length);
  const peakDay = [...data].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="attendance-chart-widget">
      {/* Chart Top Header & View Controls */}
      <div className="attendance-chart-header">
        <div>
          <div className="attendance-chart-title-row">
            <h2 className="dashboard-panel-title">Weekly Attendance Activity</h2>
            <span className="attendance-trend-pill">
              <TrendingUp size={13} /> +14% vs Last Week
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
            title="Display Trend Area Line"
          >
            <Activity size={14} />
            <span>Trend</span>
          </button>
        </div>
      </div>

      {/* Real SVG Analytics Chart */}
      <div className="attendance-svg-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="attendance-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Primary Orange Gradient for active/highlighted bar */}
            <linearGradient id="chartOrangeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF6B00" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>

            {/* Standard Theme Bar Gradient */}
            <linearGradient id="chartNeutralGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CBD5E1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.8" />
            </linearGradient>

            {/* Dark Theme Neutral Bar Gradient */}
            <linearGradient id="chartNeutralGradDark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1E293B" stopOpacity="0.85" />
            </linearGradient>

            {/* Area Fill Gradient for Trend Line */}
            <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FF6B00" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Markers */}
          {yTicks.map((val) => {
            const y = padTop + plotHeight - (val / maxVal) * plotHeight;
            return (
              <g key={val} className="chart-grid-group">
                <line
                  x1={padLeft - 6}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  className="chart-grid-line"
                />
                <text
                  x={padLeft - 10}
                  y={y + 3.5}
                  className="chart-axis-y-text"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Render Trend Area Line View */}
          {chartType === 'trend' && (
            <g className="chart-trend-group">
              <path d={areaPath} fill="url(#chartAreaGrad)" />
              <path
                d={linePath}
                fill="none"
                stroke="#FF6B00"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((pt, idx) => {
                const isHovered = hoveredIndex === idx;
                const isHigh = pt.day === highlightDay;
                return (
                  <circle
                    key={pt.day}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : isHigh ? 5 : 4}
                    fill={isHigh || isHovered ? '#FF6B00' : 'var(--bg-surface)'}
                    stroke="#FF6B00"
                    strokeWidth={isHovered ? 3 : 2}
                    className="chart-point-circle"
                  />
                );
              })}
            </g>
          )}

          {/* Render Bars and Columns */}
          {points.map((item, idx) => {
            const isHighlighted = item.day === highlightDay;
            const isHovered = hoveredIndex === idx;
            const barHeight = (item.count / maxVal) * plotHeight;
            const barX = item.x - barWidth / 2;
            const barY = padTop + plotHeight - barHeight;

            return (
              <g
                key={item.day}
                className="chart-col-interactive"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible hover trigger area covering whole column height */}
                <rect
                  x={padLeft + idx * colStep}
                  y={padTop}
                  width={colStep}
                  height={plotHeight + 30}
                  fill="transparent"
                  className="chart-col-hover-area"
                />

                {/* Background track pillar in Bar Mode */}
                {chartType === 'bars' && (
                  <rect
                    x={barX}
                    y={padTop}
                    width={barWidth}
                    height={plotHeight}
                    rx="6"
                    className="chart-bar-track"
                  />
                )}

                {/* Animated / Colored Bar Fill in Bar Mode */}
                {chartType === 'bars' && (
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    rx="6"
                    fill={
                      isHighlighted || isHovered
                        ? 'url(#chartOrangeGrad)'
                        : 'var(--chart-bar-fill, url(#chartNeutralGradLight))'
                    }
                    className={`chart-bar-rect ${isHighlighted ? 'bar-highlighted' : ''} ${isHovered ? 'bar-hovered' : ''}`}
                  />
                )}

                {/* X-Axis Weekday Label */}
                <text
                  x={item.x}
                  y={svgHeight - 16}
                  className={`chart-axis-x-text ${isHighlighted ? 'active-day-label' : ''}`}
                >
                  {item.day}
                </text>

                {/* Highlight Indicator Pill for Active Day */}
                {isHighlighted && (
                  <circle
                    cx={item.x}
                    cy={svgHeight - 6}
                    r="2.5"
                    fill="#FF6B00"
                  />
                )}

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
                      {item.fullDay}: {item.count}
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
            <strong>{peakDay.fullDay}</strong> ({peakDay.count} visits)
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyAttendanceChart;
