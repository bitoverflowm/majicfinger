"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { marketVarsClassName, useMorph, usePrefersReducedMotion } from "@/components/spectrumui/charts/chart-engine";

const PAD = { top: 12, right: 64, bottom: 22, left: 8 };
const VOLUME_SHARE = 0.22;
const VOLUME_GAP = 14;

const KEYFRAMES = `
@keyframes spectrum-mc-rise {
  from { transform: scaleY(0); opacity: 0; }
  to { transform: scaleY(1); opacity: 1; }
}
@keyframes spectrum-mc-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes spectrum-mc-ping {
  0% { r: 3.5; opacity: 0.55; }
  70% { r: 12; opacity: 0; }
  100% { r: 12; opacity: 0; }
}
@keyframes spectrum-mc-draw {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}
`;

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

function formatSignedPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(value) < 1 ? 2 : 2,
  }).format(value);
}

function formatProbability(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const pct = n * 100;
  const digits = Math.abs(pct) < 1 ? 2 : 1;
  return `${pct.toFixed(digits)}%`;
}

function formatPoints(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(2)} pp`;
}

export function formatCountFp(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  if (Math.abs(value - Math.round(value)) < 0.001) return String(Math.round(value));
  return value.toFixed(2);
}

function niceTicks(lo, hi, target = 4) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [lo];
  const raw = (hi - lo) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
  const first = Math.ceil(lo / step) * step;
  const out = [];
  for (let v = first; v <= hi + step * 0.001; v += step) out.push(Math.round((v / step) * 1e8) / 1e8 * step);
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
    const ro = new ResizeObserver(read);
    ro.observe(node);
    read();
    return () => ro.disconnect();
  }, []);
  return [ref, box];
}

function RangeSelector({ ranges, value, onChange, reduce }) {
  const index = Math.max(0, ranges.findIndex((range) => range.label === value));
  const width = 100 / ranges.length;
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="relative inline-flex items-center rounded-full bg-black/[0.045] p-0.5 dark:bg-white/[0.07]"
    >
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
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/25",
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

function formatTick(time, span) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  if (span < 36 * 60 * 60 * 1000) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWhen(time) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Spectrum market chart. `variant="area"` is the line with a fill split around the
 * first price. `variant="candles"` draws OHLC bars. Volume stays in the pane either way.
 * `live` marks a feed that is already updating `data`. It does not invent prices.
 */
export function MarketChart({
  className,
  data = [],
  symbol = "",
  name = "Yes",
  variant = "candles",
  volumeLabel = "Vol",
  formatVolume = formatCountFp,
  units = "currency",
  ranges = [],
  defaultRange = "All",
  rangeValue,
  onRangeChange,
  live = false,
  status = "ready",
  emptyLabel = "This sheet has no price to chart yet.",
  toolbar = null,
}) {
  const uid = React.useId().replace(/:/g, "");
  const reduce = usePrefersReducedMotion();
  const [plotRef, box] = useBox();
  const [ownRangeLabel, setOwnRangeLabel] = React.useState(defaultRange);
  const rangeLabel = rangeValue ?? ownRangeLabel;
  const setRangeLabel = onRangeChange || setOwnRangeLabel;
  const [hoverIndex, setHoverIndex] = React.useState(null);
  const [flash, setFlash] = React.useState(null);
  const lastCloseRef = React.useRef(null);
  const svgRef = React.useRef(null);

  const series = data;
  const range = ranges.find((item) => item.label === rangeLabel) || ranges[ranges.length - 1];
  const view = React.useMemo(() => {
    if (!series.length) return series;
    if (!range || range.ms == null) return series;
    const end = series[series.length - 1].t;
    const sliced = series.filter((candle) => candle.t >= end - range.ms);
    return sliced.length ? sliced : series.slice(-1);
  }, [range, series]);

  const last = view[view.length - 1];
  React.useEffect(() => {
    if (!live || !last) {
      lastCloseRef.current = last?.close ?? null;
      return undefined;
    }
    const previous = lastCloseRef.current;
    lastCloseRef.current = last.close;
    if (previous == null || previous === last.close) return undefined;
    setFlash(last.close >= previous ? "up" : "down");
    const id = window.setTimeout(() => setFlash(null), 620);
    return () => window.clearTimeout(id);
  }, [last, live]);

  const n = view.length;
  const w = Math.max(box.width, 1);
  const h = Math.max(box.height, 1);
  const plotX0 = PAD.left;
  const plotX1 = Math.max(plotX0 + 1, w - PAD.right);
  const plotW = plotX1 - plotX0;
  const innerTop = PAD.top;
  const innerBottom = h - PAD.bottom;
  const showVolume = n > 0 && Boolean(volumeLabel);
  const volH = showVolume ? Math.max(28, Math.round((innerBottom - innerTop) * VOLUME_SHARE)) : 0;
  const priceY0 = innerTop;
  const priceY1 = innerBottom - (showVolume ? volH + VOLUME_GAP : 0);
  const volY1 = innerBottom;
  const priceH = Math.max(1, priceY1 - priceY0);
  const step = plotW / Math.max(n, 1);
  const bodyW = Math.max(2, Math.min(step * 0.62, 14));
  const cx = (i) => plotX0 + step * (i + 0.5);

  const domain = React.useMemo(() => {
    if (!n) return [0, 1];
    let lo = Infinity;
    let hi = -Infinity;
    for (const candle of view) {
      const low = variant === "area" ? candle.close : candle.low;
      const high = variant === "area" ? candle.close : candle.high;
      if (low < lo) lo = low;
      if (high > hi) hi = high;
    }
    const pad = (hi - lo) * 0.16 || Math.abs(hi) * 0.04 || 0.02;
    return [lo - pad, hi + pad];
  }, [n, variant, view]);
  const [domLo, domHi] = domain;
  const priceY = (v) => priceY1 - ((v - domLo) / (domHi - domLo || 1)) * priceH;
  const first = view[0];
  const active = hoverIndex != null ? view[hoverIndex] : null;
  const shown = active || last;
  const baseline = first?.close ?? 0;
  const maxVolume = view.reduce((max, candle) => Math.max(max, candle.volume), 1);
  const shapes =
    variant === "area"
      ? view.map((candle, i) => ({ x: cx(i), y: priceY(candle.close) }))
      : view.map((candle, i) => ({
          x: cx(i),
          high: priceY(candle.high),
          low: priceY(candle.low),
          top: Math.min(priceY(candle.open), priceY(candle.close)),
          bodyH: Math.max(1.25, Math.abs(priceY(candle.close) - priceY(candle.open))),
          w: bodyW,
          up: candle.close >= candle.open,
        }));
  const bars = showVolume
    ? view.map((candle, i) => ({ x: cx(i), h: Math.max(1, (candle.volume / maxVolume) * (volH - 12)), w: bodyW, up: candle.close >= candle.open }))
    : [];
  const [drawnShapes, [drawnBase], drawnBars] = useMorph(
    [shapes, [{ y: priceY(baseline) }], bars],
    `${range?.label || ""}|${symbol}|${variant}`,
    { enabled: !reduce },
  );
  const areaPoints = variant === "area" ? drawnShapes : [];
  const linePath = variant === "area" ? monotonePath(areaPoints) : "";
  const baselineY = drawnBase?.y ?? priceY(baseline);
  const areaPath =
    variant === "area" && linePath && areaPoints.length
      ? `${linePath}L${areaPoints[areaPoints.length - 1].x},${baselineY}L${areaPoints[0].x},${baselineY}Z`
      : "";
  const showPrice = units === "probability" ? formatProbability : formatPrice;
  const delta =
    units === "probability"
      ? ((shown?.close ?? 0) - baseline) * 100
      : baseline
        ? (((shown?.close ?? 0) - baseline) / baseline) * 100
        : 0;
  const showDelta = units === "probability" ? formatPoints(delta) : formatSignedPct(delta);
  const up = delta >= 0;
  const dirColor = up ? "var(--spectrum-chart-up)" : "var(--spectrum-chart-down)";
  const lastUp = last ? last.close >= last.open : true;
  const lastColor = lastUp ? "var(--spectrum-chart-up)" : "var(--spectrum-chart-down)";
  const span = n ? view[n - 1].t - view[0].t : 0;
  const priceTicks = niceTicks(domLo, domHi, 4);
  const ready = box.width > 40 && box.height > 80;

  const timeTicks = React.useMemo(() => {
    if (!n) return [];
    const xOf = (i) => plotX0 + (plotW / Math.max(n, 1)) * (i + 0.5);
    const minGap = 58;
    const want = Math.max(2, Math.min(4, Math.floor(plotW / 88)));
    const gap = Math.max(1, Math.floor((n - 1) / (want - 1 || 1)));
    const out = [];
    for (let i = 0; i < n; i += gap) {
      if (!out.length || xOf(i) - xOf(out[out.length - 1]) >= minGap) out.push(i);
    }
    if (out[out.length - 1] !== n - 1) {
      while (out.length && xOf(n - 1) - xOf(out[out.length - 1]) < minGap) out.pop();
      out.push(n - 1);
    }
    return out;
  }, [n, plotW, plotX0]);

  const pointerToIndex = (clientX) => {
    const svg = svgRef.current;
    if (!svg || !n) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * w;
    const i = Math.floor((x - plotX0) / step);
    setHoverIndex(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div
      data-sheet-chart=""
      className={cn("flex h-full min-h-0 w-full flex-1 flex-col text-neutral-400 dark:text-neutral-500", marketVarsClassName, className)}
    >
      <style>{KEYFRAMES}</style>
      <div className="flex shrink-0 items-start justify-between gap-3 px-3 pb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {symbol ? (
              <span className="max-w-[11rem] truncate rounded-md bg-black/[0.045] px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-neutral-700 dark:bg-white/[0.07] dark:text-neutral-200">
                {symbol}
              </span>
            ) : null}
            <span className="truncate text-[12px] text-neutral-500">{name}</span>
            {live ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <span
                  className="size-1.5 rounded-full bg-emerald-500"
                  style={reduce ? undefined : { animation: "spectrum-mc-fade 1.1s ease-in-out infinite alternate" }}
                />
                Live
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-end gap-2">
            <p className="font-mono text-[22px] font-medium leading-none tabular-nums text-neutral-950 dark:text-white">
              {shown ? showPrice(shown.close) : "—"}
            </p>
            <span
              className="mb-0.5 rounded-md px-1.5 py-0.5 font-mono text-[12px] tabular-nums"
              style={{
                color: dirColor,
                background: flash ? `color-mix(in srgb, ${dirColor} 16%, transparent)` : "transparent",
              }}
            >
              {showDelta}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-neutral-500">
            {volumeLabel}{" "}
            <span className="font-medium text-neutral-950 dark:text-white">
              {shown ? formatVolume(shown.volume) : "—"}
              {shown?.count ? ` · ${shown.count} ${shown.count === 1 ? "trade" : "trades"}` : ""}
            </span>
          </p>
          <p
            className="mt-0.5 flex h-4 items-center gap-x-2 overflow-hidden font-mono text-[10px] tabular-nums text-neutral-500"
            style={{ opacity: active ? 1 : 0 }}
            aria-hidden={!active}
          >
            {active ? (
              variant === "area" ? (
                <>
                  <span style={{ color: dirColor }}>{showPrice(active.close)}</span>
                  <span className="text-neutral-400">{formatWhen(active.t)}</span>
                </>
              ) : (
                <>
                  <span>O {showPrice(active.open)}</span>
                  <span>H {showPrice(active.high)}</span>
                  <span>L {showPrice(active.low)}</span>
                  <span style={{ color: dirColor }}>C {showPrice(active.close)}</span>
                  <span className="text-neutral-400">{formatWhen(active.t)}</span>
                </>
              )
            ) : null}
          </p>
        </div>
        {toolbar || ranges.length > 1 ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {toolbar}
            {ranges.length > 1 ? (
              <RangeSelector ranges={ranges} value={range?.label || defaultRange} onChange={setRangeLabel} reduce={reduce} />
            ) : null}
          </div>
        ) : null}
      </div>

      <div ref={plotRef} className="min-h-0 w-full flex-1">
        {status === "empty" || !series.length ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-[12px] text-neutral-500">
            {emptyLabel}
          </div>
        ) : !ready ? null : (
          <svg
            ref={svgRef}
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            className="block h-full w-full touch-pan-y select-none"
            role="img"
            aria-label={`${symbol || "Market"} ${name} and ${volumeLabel}. ${showPrice(last?.close ?? 0)}, ${showDelta}.`}
            onPointerMove={(event) => pointerToIndex(event.clientX)}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {priceTicks.map((tick) => {
              const y = priceY(tick);
              if (y < priceY0 - 1 || y > priceY1 + 1) return null;
              return (
                <g key={tick}>
                  <line x1={plotX0} x2={plotX1} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.13} strokeDasharray="2 4" />
                  <text x={plotX1 + 8} y={y} dominantBaseline="middle" fontSize={10} fill="currentColor" className="tabular-nums">
                    {showPrice(tick)}
                  </text>
                </g>
              );
            })}

            {variant === "area" ? (
              <g>
                <defs>
                  <linearGradient id={`${uid}-up`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--spectrum-chart-up)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--spectrum-chart-up)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`${uid}-down`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--spectrum-chart-down)" stopOpacity={0} />
                    <stop offset="100%" stopColor="var(--spectrum-chart-down)" stopOpacity={0.28} />
                  </linearGradient>
                  <clipPath id={`${uid}-above`}>
                    <rect x={plotX0} y={priceY0 - 40} width={plotW} height={Math.max(0, baselineY - priceY0 + 40)} />
                  </clipPath>
                  <clipPath id={`${uid}-below`}>
                    <rect x={plotX0} y={baselineY} width={plotW} height={Math.max(0, priceY1 - baselineY + 40)} />
                  </clipPath>
                </defs>
                <path d={areaPath} fill={`url(#${uid}-up)`} clipPath={`url(#${uid}-above)`} />
                <path d={areaPath} fill={`url(#${uid}-down)`} clipPath={`url(#${uid}-below)`} />
                <line
                  x1={plotX0}
                  x2={plotX1}
                  y1={baselineY}
                  y2={baselineY}
                  stroke="currentColor"
                  strokeOpacity={0.35}
                  strokeDasharray="3 3"
                />
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--spectrum-chart-up)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  clipPath={`url(#${uid}-above)`}
                  pathLength={1}
                  style={
                    reduce
                      ? undefined
                      : { strokeDasharray: 1, animation: "spectrum-mc-draw 900ms cubic-bezier(0.22, 1, 0.36, 1) both" }
                  }
                />
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--spectrum-chart-down)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  clipPath={`url(#${uid}-below)`}
                  pathLength={1}
                  style={
                    reduce
                      ? undefined
                      : { strokeDasharray: 1, animation: "spectrum-mc-draw 900ms cubic-bezier(0.22, 1, 0.36, 1) both" }
                  }
                />
              </g>
            ) : (
              drawnShapes.map((shape, i) => {
                const color = shape.up ? "var(--spectrum-chart-up)" : "var(--spectrum-chart-down)";
                const dim = hoverIndex != null && hoverIndex !== i;
                return (
                  <g key={i} style={{ opacity: dim ? 0.35 : 1 }}>
                    <line x1={shape.x} x2={shape.x} y1={shape.high} y2={shape.low} stroke={color} strokeWidth={1} />
                    <rect x={shape.x - shape.w / 2} y={shape.top} width={shape.w} height={shape.bodyH} rx={1} fill={color} />
                  </g>
                );
              })
            )}

            {showVolume
              ? drawnBars.map((bar, i) => {
                  const dim = hoverIndex != null && hoverIndex !== i;
                  return (
                    <rect
                      key={`v-${i}`}
                      x={bar.x - bar.w / 2}
                      y={volY1 - bar.h}
                      width={bar.w}
                      height={bar.h}
                      rx={1}
                      fill={bar.up ? "var(--spectrum-chart-up)" : "var(--spectrum-chart-down)"}
                      opacity={dim ? 0.18 : 0.45}
                    />
                  );
                })
              : null}
            {showVolume ? (
              <text x={plotX0} y={priceY1 + 12} fontSize={10} fill="currentColor">
                {volumeLabel}
              </text>
            ) : null}

            {last ? (
              <g>
                {variant === "candles" ? (
                  <line
                    x1={plotX0}
                    x2={plotX1}
                    y1={priceY(last.close)}
                    y2={priceY(last.close)}
                    stroke={lastColor}
                    strokeOpacity={0.55}
                    strokeDasharray="4 4"
                  />
                ) : null}
                {live && !reduce ? (
                  <circle cx={cx(n - 1)} cy={priceY(last.close)} r={3.5} fill={lastColor}>
                    <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                ) : (
                  <circle cx={cx(n - 1)} cy={priceY(last.close)} r={3} fill={lastColor} />
                )}
              </g>
            ) : null}

            {hoverIndex != null && view[hoverIndex] ? (
              <g>
                <line
                  x1={cx(hoverIndex)}
                  x2={cx(hoverIndex)}
                  y1={priceY0}
                  y2={innerBottom}
                  stroke="currentColor"
                  strokeOpacity={0.35}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={cx(hoverIndex)}
                  cy={priceY(view[hoverIndex].close)}
                  r={4}
                  fill="var(--spectrum-chart-surface)"
                  stroke={
                    (variant === "area" ? view[hoverIndex].close >= baseline : view[hoverIndex].close >= view[hoverIndex].open)
                      ? "var(--spectrum-chart-up)"
                      : "var(--spectrum-chart-down)"
                  }
                  strokeWidth={2}
                />
              </g>
            ) : null}

            {timeTicks.map((i) => {
              const candle = view[i];
              if (!candle) return null;
              const x = Math.max(plotX0 + 18, Math.min(plotX1 - 18, cx(i)));
              return (
                <text key={`t-${i}`} x={x} y={h - 6} textAnchor="middle" fontSize={10} fill="currentColor" className="tabular-nums">
                  {formatTick(candle.t, span)}
                </text>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
