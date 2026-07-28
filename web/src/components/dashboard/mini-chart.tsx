'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Hand-rolled SVG charts. The project has no charting dependency and these two
 * shapes are all the dashboard needs, so adding one would be overkill.
 */

interface SparklineProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  values,
  color = '#E8231A',
  width = 84,
  height = 32,
  className,
}: SparklineProps) {
  const gradientId = useId();
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * stepX;
    // Leave 2px of padding so the stroke is not clipped.
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return `${x},${y}`;
  });

  const line = `M ${points.join(' L ')}`;
  const area = `${line} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  color?: string;
  height?: number;
  /** Formats the tooltip / accessible value. */
  formatValue?: (value: number) => string;
  className?: string;
}

/** Vertical bar chart with an accessible table fallback. */
export function BarChart({
  data,
  color = '#E8231A',
  height = 160,
  formatValue = (value) => new Intl.NumberFormat('en-NZ').format(value),
  className,
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <p className={cn('py-8 text-center text-sm text-slate-500 dark:text-slate-400', className)}>
        No data yet.
      </p>
    );
  }

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className={className}>
      <div className="flex items-end gap-2" style={{ height }} role="presentation">
        {data.map((item) => {
          const ratio = item.value / max;
          return (
            <div key={item.label} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                {formatValue(item.value)}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${Math.max(ratio * 100, item.value > 0 ? 4 : 1)}%`,
                    backgroundColor: color,
                    opacity: 0.35 + ratio * 0.65,
                  }}
                  title={`${item.label}: ${formatValue(item.value)}`}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] text-slate-400">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}

/** Donut built from stroke-dasharray offsets — no library needed. */
export function DonutChart({
  slices,
  size = 132,
  thickness = 14,
  centerLabel,
  centerValue,
  className,
}: DonutChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn('flex items-center gap-5', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} aria-hidden="true" focusable="false">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={thickness}
              className="stroke-slate-100 dark:stroke-slate-800"
            />
            {total > 0 &&
              slices.map((slice) => {
                const length = (slice.value / total) * circumference;
                const dash = `${length} ${circumference - length}`;
                const element = (
                  <circle
                    key={slice.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={thickness}
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                );
                offset += length;
                return element;
              })}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-black leading-none text-slate-900 dark:text-slate-50">
            {centerValue ?? total}
          </span>
          {centerLabel && (
            <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
              {slice.label}
            </span>
            <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-100">
              {slice.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
