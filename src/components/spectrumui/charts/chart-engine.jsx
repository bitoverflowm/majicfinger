"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Slim Spectrum chart-engine subset used by MarketHeatmap. */

export const marketVarsClassName =
  "[--spectrum-chart-up:#059669] [--spectrum-chart-down:#e11d48] [--spectrum-chart-surface:#fff] dark:[--spectrum-chart-up:#34d399] dark:[--spectrum-chart-down:#fb7185] dark:[--spectrum-chart-surface:#0a0a0a]";

export const UP = "var(--spectrum-chart-up)";
export const DOWN = "var(--spectrum-chart-down)";
export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export {
  SPECTRUM_HEAT_DEFAULTS,
  parseHexColor,
  mixSrgbHex,
  changeColor,
  heatLegendSampleChanges,
} from "@/components/spectrumui/charts/heatmapColors";

export function formatSignedPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduce;
}

export function useElementWidth() {
  const ref = React.useRef(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export const KEYFRAMES = `
@keyframes spectrum-mc-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes spectrum-sk-pulse {
  from { opacity: 1; }
  to   { opacity: 0.4; }
}
@keyframes spectrum-mc-enter {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

export function Keyframes() {
  return <style>{KEYFRAMES}</style>;
}

/**
 * @typedef {{ label: string; weight: number; change: number; name?: string; payload?: Record<string, unknown> }} TreemapInput
 * @typedef {TreemapInput & { x: number; y: number; w: number; h: number }} TreemapTile
 */

/**
 * @param {TreemapInput[]} items
 * @param {number} width
 * @param {number} height
 * @returns {TreemapTile[]}
 */
export function squarify(items, width, height) {
  const sorted = [...items].filter((i) => i.weight > 0).sort((a, b) => b.weight - a.weight);
  const totalWeight = sorted.reduce((sum, i) => sum + i.weight, 0);
  if (!sorted.length || totalWeight <= 0 || width <= 0 || height <= 0) return [];

  const scale = (width * height) / totalWeight;
  /** @type {TreemapTile[]} */
  const out = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  /** @type {TreemapInput[]} */
  let row = [];
  let index = 0;

  const worst = (candidate, side) => {
    if (!candidate.length || side <= 0) return Infinity;
    const areas = candidate.map((i) => i.weight * scale);
    const sum = areas.reduce((a, b) => a + b, 0);
    const max = Math.max(...areas);
    const min = Math.min(...areas);
    const side2 = side * side;
    const sum2 = sum * sum;
    return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
  };

  const layoutRow = (candidate, side, horizontal) => {
    const sum = candidate.reduce((total, i) => total + i.weight * scale, 0);
    const thickness = sum / side;
    let offset = 0;
    for (const item of candidate) {
      const length = (item.weight * scale) / thickness;
      out.push(
        horizontal
          ? { ...item, x: x + offset, y, w: length, h: thickness }
          : { ...item, x, y: y + offset, w: thickness, h: length },
      );
      offset += length;
    }
    if (horizontal) {
      y += thickness;
      h -= thickness;
    } else {
      x += thickness;
      w -= thickness;
    }
  };

  while (index < sorted.length) {
    const horizontal = w >= h;
    const side = horizontal ? w : h;
    const next = sorted[index];

    if (!row.length || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      index += 1;
    } else {
      layoutRow(row, side, horizontal);
      row = [];
    }
  }
  if (row.length) layoutRow(row, w >= h ? w : h, w >= h);

  return out;
}

/** @typedef {'ready' | 'loading' | 'empty' | 'error'} ChartStatus */
/** @typedef {'bars' | 'line' | 'grid' | 'rows' | 'arc' | 'cards'} SkeletonVariant */

function SkeletonGrid({ height, reduce }) {
  const breathe = (index) =>
    reduce
      ? undefined
      : { animation: `spectrum-sk-pulse 1.5s ease-in-out ${index * 120}ms infinite alternate` };
  const block = "rounded-md bg-black/[0.06] dark:bg-white/[0.08]";
  return (
    <div className="grid h-full grid-cols-12 grid-rows-6 gap-1.5 py-2" style={{ height }}>
      {Array.from({ length: 72 }, (_, i) => (
        <div key={i} className={cn("h-full w-full rounded-[3px]", block)} style={breathe(i % 14)} />
      ))}
    </div>
  );
}

/**
 * @param {{ variant?: string; height?: number; className?: string }} [props]
 */
export function ChartSkeleton({ variant = "grid", height = 300, className = "" }) {
  const reduce = usePrefersReducedMotion();
  return (
    <div className={cn("relative w-full overflow-hidden", className)} style={{ height }} aria-hidden>
      <Keyframes />
      {variant === "grid" ? (
        <SkeletonGrid height={height} reduce={reduce} />
      ) : (
        <div
          className="h-full w-full rounded-md bg-black/[0.06] dark:bg-white/[0.08]"
          style={
            reduce
              ? undefined
              : { animation: "spectrum-sk-pulse 1.5s ease-in-out infinite alternate" }
          }
        />
      )}
    </div>
  );
}

function StateShell({ height, title, description, action, icon, iconClassName }) {
  const reduce = usePrefersReducedMotion();
  return (
    <div
      className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-black/[0.06] bg-black/[0.015] dark:border-white/[0.08] dark:bg-white/[0.02]"
      style={{ height }}
      role="status"
    >
      <Keyframes />
      <div
        className="relative flex max-w-[38ch] flex-col items-center gap-1 px-6 text-center"
        style={reduce ? undefined : { animation: `spectrum-mc-enter 480ms ${EASE} both` }}
      >
        <span
          className={cn(
            "mb-2 flex size-10 items-center justify-center rounded-xl border border-black/[0.07] bg-white text-neutral-500 shadow-xs dark:border-white/[0.1] dark:bg-neutral-900 dark:text-neutral-400",
            iconClassName,
          )}
        >
          {icon}
        </span>
        <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
        {description ? (
          <p className="text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">{description}</p>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

const actionClass =
  "inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-900 shadow-xs transition-colors hover:bg-black/[0.03] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black/20 dark:border-white/12 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1] dark:focus-visible:ring-white/25";

export function ChartEmpty({
  height = 300,
  title = "No data yet",
  description = "Once events start arriving this chart will fill in automatically.",
  action,
}) {
  return (
    <StateShell
      height={height}
      title={title}
      description={description}
      action={action}
      icon={
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 19h16M7 16V9m5 7V5m5 11v-4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      }
    />
  );
}

export function ChartError({
  height = 300,
  title = "Could not load this chart",
  description = "The request failed. Check the connection and try again.",
  onRetry,
  retryLabel = "Retry",
}) {
  return (
    <StateShell
      height={height}
      title={title}
      description={description}
      iconClassName="text-rose-500/90 dark:text-rose-400/90"
      action={
        onRetry ? (
          <button type="button" onClick={onRetry} className={actionClass}>
            {retryLabel}
          </button>
        ) : null
      }
      icon={
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 8v5m0 3.5v.5M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.7L13.7 3.9a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      }
    />
  );
}

export function ChartState({
  status = "ready",
  height = 300,
  variant = "grid",
  empty,
  error,
  onRetry,
  children,
}) {
  if (status === "loading") {
    return (
      <div aria-busy="true" aria-live="polite">
        <ChartSkeleton variant={variant} height={height} />
        <span className="sr-only">Loading chart data</span>
      </div>
    );
  }
  if (status === "empty") return <ChartEmpty height={height} {...empty} />;
  if (status === "error") {
    return <ChartError height={height} onRetry={onRetry} {...error} />;
  }
  return <>{children}</>;
}

export function Stat({ ready, children }) {
  if (ready) return <>{children}</>;
  return (
    <span aria-hidden className="text-neutral-300 dark:text-neutral-600">
      —
    </span>
  );
}
