"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { EASE, UP, DOWN, marketVarsClassName, usePrefersReducedMotion } from "@/components/spectrumui/charts/chart-engine";

/**
 * Spectrum indicator chart.
 * The price pane is the close line. Extra panes are optional indicator series
 * that share this chart's time axis and crosshair.
 *
 * Vendored from https://ui.spectrumhq.in/blocks/charts#indicators and adapted
 * so a sheet can chart price alone until indicators are added.
 */

const PAD = { top: 16, right: 58, bottom: 22, left: 8 };
const GAP = 14;

function monotonePath(points) {
  const n = points.length;
  if (!n) return "";
  if (n === 1) return `M${points[0].x},${points[0].y}`;
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x;
    slope[i] = dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i];
  }
  const tangent = new Array(n);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) tangent[i] = 0;
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tangent[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = points[i].x + dx[i] / 3;
    const c1y = points[i].y + (tangent[i] * dx[i]) / 3;
    const c2x = points[i + 1].x - dx[i] / 3;
    const c2y = points[i + 1].y - (tangent[i + 1] * dx[i]) / 3;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${points[i + 1].x.toFixed(2)},${points[i + 1].y.toFixed(2)}`;
  }
  return d;
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 0.01 ? 4 : abs < 1 ? 3 : 2;
  return value.toLocaleString("en", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatSignedPct(value) {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatWhen(time, span) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  if (span < 36 * 60 * 60 * 1000) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function niceTicks(lo, hi, target = 4) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [lo];
  const raw = (hi - lo) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const first = Math.ceil(lo / step) * step;
  const out = [];
  for (let value = first; value <= hi + step * 0.001; value += step) out.push(value);
  return out;
}

function useBox() {
  const ref = React.useRef(null);
  const [box, setBox] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const read = () => {
      const rect = node.getBoundingClientRect();
      setBox({ width: rect.width, height: rect.height });
    };
    const observer = new ResizeObserver(read);
    observer.observe(node);
    read();
    return () => observer.disconnect();
  }, []);
  return [ref, box];
}

function RangeSelector({ ranges, value, onChange, reduce }) {
  const index = Math.max(0, ranges.findIndex((range) => range.label === value));
  const width = 100 / Math.max(ranges.length, 1);
  return (
    <div role="tablist" aria-label="Time range" className="relative inline-flex items-center rounded-full bg-black/[0.045] p-0.5 dark:bg-white/[0.07]">
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-full bg-white shadow-sm ring-1 ring-black/[0.06] dark:bg-white/10 dark:ring-white/10"
        style={{
          width: `calc(${width}% - 4px)`,
          transform: `translateX(calc(${index * 100}% + ${index * 4}px))`,
          transition: reduce ? undefined : "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      {ranges.map((range) => {
        const active = range.label === value;
        return (
          <button
            key={range.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(range.label)}
            className={cn(
              "relative z-10 rounded-full px-2.5 py-1 font-mono text-[11px] leading-none tracking-wide transition-colors duration-200",
              active ? "text-neutral-950 dark:text-white" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400",
            )}
            style={{ flex: `0 0 ${width}%` }}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}

function nearestIndex(points, time) {
  if (!points.length) return 0;
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const gap = Math.abs(points[i].t - time);
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * @param {{ t: number, price: number }[]} points
 * @param {{ id: string, label: string, values?: (number|null)[], color?: string, min?: number, max?: number, format?: (value: number) => string }[]} [indicators]
 */
export function IndicatorChart({
  className,
  points = [],
  indicators = [],
  symbol = "",
  name = "Price",
  ranges = [],
  defaultRange = "All",
  live = false,
  status = "ready",
  emptyLabel = "This price history has no points to chart yet.",
}) {
  const reduce = usePrefersReducedMotion();
  const [plotRef, box] = useBox();
  const svgRef = React.useRef(null);
  const [rangeLabel, setRangeLabel] = React.useState(defaultRange);
  const [hoverIndex, setHoverIndex] = React.useState(null);
  const uid = React.useId().replace(/:/g, "");

  const range = ranges.find((item) => item.label === rangeLabel) || ranges[ranges.length - 1];
  const view = React.useMemo(() => {
    if (!points.length) return [];
    if (!range || range.ms == null) return points;
    const end = points[points.length - 1].t;
    const sliced = points.filter((point) => point.t >= end - range.ms);
    return sliced.length ? sliced : points.slice(-1);
  }, [points, range]);

  const start = points.length && view.length ? points.length - view.length : 0;
  const panes = (indicators || []).filter((indicator) => indicator && Array.isArray(indicator.values));
  const n = view.length;
  const w = Math.max(box.width, 1);
  const h = Math.max(box.height, 1);
  const x0 = PAD.left;
  const x1 = Math.max(x0 + 1, w - PAD.right);
  const plotW = x1 - x0;
  const innerTop = PAD.top;
  const innerBottom = h - PAD.bottom;
  const usable = Math.max(1, innerBottom - innerTop - GAP * panes.length);
  const priceShare = panes.length ? 0.54 : 1;
  const indicatorShare = panes.length ? (1 - priceShare) / panes.length : 0;
  const priceTop = innerTop;
  const priceBottom = priceTop + usable * priceShare;
  const first = view[0];
  const last = view[n - 1];
  const span = first && last ? Math.max(1, last.t - first.t) : 1;
  const xAt = React.useCallback(
    (time) => x0 + ((time - (first?.t || 0)) / span) * plotW,
    [first?.t, plotW, span, x0],
  );

  const domain = React.useMemo(() => {
    if (!n) return [0, 1];
    let lo = Infinity;
    let hi = -Infinity;
    for (const point of view) {
      if (point.price < lo) lo = point.price;
      if (point.price > hi) hi = point.price;
    }
    if (lo === hi) {
      const pad = Math.abs(lo) * 0.08 || 0.01;
      return [lo - pad, hi + pad];
    }
    const pad = (hi - lo) * 0.12;
    return [lo - pad, hi + pad];
  }, [n, view]);

  const priceY = React.useCallback(
    (value) => priceBottom - ((value - domain[0]) / (domain[1] - domain[0] || 1)) * (priceBottom - priceTop),
    [domain, priceBottom, priceTop],
  );
  const closeLine = React.useMemo(
    () => monotonePath(view.map((point) => ({ x: xAt(point.t), y: priceY(point.price) }))),
    [priceY, view, xAt],
  );
  const priceTicks = React.useMemo(() => niceTicks(domain[0], domain[1], 4), [domain]);
  const timeTicks = React.useMemo(() => {
    if (n < 2) return view.map((point) => point.t);
    const want = Math.max(2, Math.min(5, Math.floor(plotW / 90)));
    const out = [];
    for (let i = 0; i < want; i += 1) {
      const at = Math.round((i / (want - 1)) * (n - 1));
      out.push(view[at].t);
    }
    return out;
  }, [n, plotW, view]);

  const active = hoverIndex != null ? view[hoverIndex] : last;
  const base = first?.price || 0;
  const delta = base ? (((active?.price ?? 0) - base) / base) * 100 : 0;
  const dirColor = delta >= 0 ? UP : DOWN;

  const paneFrames = panes.map((indicator, index) => {
    const top = priceBottom + GAP * (index + 1) + usable * indicatorShare * index;
    const bottom = top + usable * indicatorShare;
    const slice = indicator.values.slice(start, start + n);
    const finite = slice.filter((value) => Number.isFinite(value));
    const min = Number.isFinite(indicator.min) ? indicator.min : Math.min(...finite);
    const max = Number.isFinite(indicator.max) ? indicator.max : Math.max(...finite);
    const lo = Number.isFinite(min) ? min : 0;
    const hi = Number.isFinite(max) && max !== lo ? max : lo + 1;
    const yAt = (value) => bottom - ((value - lo) / (hi - lo || 1)) * (bottom - top);
    const line = monotonePath(
      slice
        .map((value, pointIndex) => (Number.isFinite(value) && view[pointIndex] ? { x: xAt(view[pointIndex].t), y: yAt(value) } : null))
        .filter(Boolean),
    );
    return { indicator, top, bottom, slice, yAt, line, color: indicator.color || "var(--spectrum-series-4, #7c3aed)" };
  });

  const onMove = (clientX) => {
    const svg = svgRef.current;
    if (!svg || !n || !first) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * w;
    const time = first.t + ((x - x0) / plotW) * span;
    setHoverIndex(nearestIndex(view, time));
  };

  return (
    <div
      data-sheet-chart=""
      className={cn("flex h-full min-h-0 w-full flex-1 flex-col text-neutral-400 dark:text-neutral-500", marketVarsClassName, className)}
    >
      <style>{`@keyframes spectrum-mc-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }`}</style>
      <div className="flex shrink-0 items-start justify-between gap-3 px-3 pb-1">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {symbol ? (
              <span className="shrink-0 rounded-md bg-black/[0.045] px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-neutral-700 dark:bg-white/[0.07] dark:text-neutral-200">
                {symbol}
              </span>
            ) : null}
            <span className="truncate text-[12px] text-neutral-500">{name}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1">
            <p className="font-mono text-[22px] font-medium leading-none tabular-nums text-neutral-950 dark:text-white">
              {status === "ready" && active ? formatPrice(active.price) : "—"}
            </p>
            <span className="mb-0.5 font-mono text-[12px] tabular-nums" style={{ color: dirColor }}>
              {status === "ready" && active ? formatSignedPct(delta) : ""}
            </span>
            {active ? <span className="mb-0.5 font-mono text-[11px] text-neutral-500">{formatWhen(active.t, span)}</span> : null}
            {paneFrames.map((pane) => {
              const value = hoverIndex != null ? pane.slice[hoverIndex] : pane.slice[pane.slice.length - 1];
              const text = Number.isFinite(value) ? (pane.indicator.format ? pane.indicator.format(value) : formatPrice(value)) : "—";
              return (
                <span key={pane.indicator.id} className="mb-0.5 font-mono text-[11px] text-neutral-500">
                  {pane.indicator.label} <span className="text-neutral-950 dark:text-white">{text}</span>
                </span>
              );
            })}
          </div>
        </div>
        {ranges.length > 1 ? (
          <RangeSelector ranges={ranges} value={range?.label || defaultRange} onChange={setRangeLabel} reduce={reduce} />
        ) : null}
      </div>
      {status !== "ready" || !n ? (
        <p className="px-3 text-[12px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div ref={plotRef} className="min-h-0 flex-1">
          {box.width > 0 ? (
            <svg
              ref={svgRef}
              width={w}
              height={h}
              viewBox={`0 0 ${w} ${h}`}
              className="block h-full w-full touch-pan-y select-none"
              role="img"
              aria-label={`${name} price. ${formatPrice(last?.price ?? 0)}, ${formatSignedPct(delta)}.`}
              onPointerMove={(event) => onMove(event.clientX)}
              onPointerLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id={`${uid}-price`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={dirColor} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={dirColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              {priceTicks.map((tick) => {
                const y = priceY(tick);
                if (y < priceTop || y > priceBottom) return null;
                return (
                  <g key={tick}>
                    <line x1={x0} x2={x1} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="2 4" />
                    <text x={x1 + 8} y={y} dominantBaseline="middle" fontSize="10.5" fill="currentColor" className="tabular-nums">
                      {formatPrice(tick)}
                    </text>
                  </g>
                );
              })}
              <path d={`${closeLine} L${xAt(last.t)},${priceBottom} L${xAt(first.t)},${priceBottom} Z`} fill={`url(#${uid}-price)`} />
              <path
                d={closeLine}
                fill="none"
                stroke={dirColor}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength="1"
                style={reduce ? undefined : { strokeDasharray: 1, animation: `spectrum-mc-draw 880ms ${EASE} both` }}
              />
              {paneFrames.map((pane) => (
                <g key={pane.indicator.id}>
                  <text x={x0 + 2} y={pane.top - 2} fontSize="9.5" fontWeight="600" fill="currentColor" opacity="0.55" className="font-mono uppercase tracking-wider">
                    {pane.indicator.label}
                  </text>
                  <path d={pane.line} fill="none" stroke={pane.color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
                </g>
              ))}
              {timeTicks.map((time) => (
                <text
                  key={time}
                  x={Math.max(x0 + 18, Math.min(x1 - 18, xAt(time)))}
                  y={innerBottom + 14}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="currentColor"
                  className="tabular-nums"
                >
                  {formatWhen(time, span)}
                </text>
              ))}
              {hoverIndex != null && view[hoverIndex] ? (
                <g>
                  <line
                    x1={xAt(view[hoverIndex].t)}
                    x2={xAt(view[hoverIndex].t)}
                    y1={priceTop}
                    y2={paneFrames.length ? paneFrames[paneFrames.length - 1].bottom : priceBottom}
                    stroke="currentColor"
                    strokeOpacity="0.42"
                    strokeDasharray="3 3"
                  />
                  <circle cx={xAt(view[hoverIndex].t)} cy={priceY(view[hoverIndex].price)} r="4" fill="var(--spectrum-chart-surface, #fff)" stroke={dirColor} strokeWidth="2" />
                  {paneFrames.map((pane) => {
                    const value = pane.slice[hoverIndex];
                    if (!Number.isFinite(value)) return null;
                    return <circle key={pane.indicator.id} cx={xAt(view[hoverIndex].t)} cy={pane.yAt(value)} r="3" fill="var(--spectrum-chart-surface, #fff)" stroke={pane.color} strokeWidth="1.75" />;
                  })}
                </g>
              ) : null}
              {live && last ? (
                <circle cx={xAt(last.t)} cy={priceY(last.price)} r="3.5" fill={dirColor}>
                  {reduce ? null : <animate attributeName="opacity" values="1;0.45;1" dur="1.4s" repeatCount="indefinite" />}
                </circle>
              ) : null}
            </svg>
          ) : null}
        </div>
      )}
    </div>
  );
}
