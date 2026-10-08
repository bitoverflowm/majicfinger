"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DOWN, EASE, UP, marketVarsClassName, usePrefersReducedMotion } from "@/components/spectrumui/charts/chart-engine";

const PAD = { top: 18, right: 52, bottom: 22, left: 8 };

function formatBookPrice(value) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 3 : abs >= 0.01 ? 2 : 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function compactSize(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(n) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(n) >= 100 ? 1 : 2,
  }).format(n);
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

function stepPath(levels, xOf, yOf, midX, baseY) {
  if (!levels.length) return "";
  let d = `M${midX.toFixed(2)},${baseY.toFixed(2)}`;
  let prevY = baseY;
  for (const level of levels) {
    const x = xOf(level.price);
    const y = yOf(level.total);
    d += `L${x.toFixed(2)},${prevY.toFixed(2)}L${x.toFixed(2)},${y.toFixed(2)}`;
    prevY = y;
  }
  const lastX = xOf(levels[levels.length - 1].price);
  d += `L${lastX.toFixed(2)},${baseY.toFixed(2)}Z`;
  return d;
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

/**
 * Spectrum depth chart. Bids accumulate to the left of the mid and asks to the right.
 * Vendored from https://ui.spectrumhq.in/blocks/charts#depth and fitted to a sheet block.
 */
export function DepthChart({
  book,
  symbol = "",
  name = "Depth",
  live = false,
  status = "ready",
  emptyLabel = "This order book has no resting size yet.",
  className,
}) {
  const reduce = usePrefersReducedMotion();
  const [plotRef, box] = useBox();
  const svgRef = React.useRef(null);
  const [hoverX, setHoverX] = React.useState(null);
  const uid = React.useId().replace(/:/g, "");
  const bids = book?.bids || [];
  const asks = book?.asks || [];
  const mid = Number(book?.mid) || 0;
  const empty = status === "empty" || (!bids.length && !asks.length);

  const w = Math.max(box.width, 1);
  const h = Math.max(box.height, 1);
  const x0 = PAD.left;
  const x1 = Math.max(x0 + 1, w - PAD.right);
  const y0 = PAD.top;
  const y1 = Math.max(y0 + 1, h - PAD.bottom);
  const lowPrice = bids[bids.length - 1]?.price ?? mid;
  const highPrice = asks[asks.length - 1]?.price ?? mid;
  const halfSpan = Math.max(mid - lowPrice, highPrice - mid, Math.abs(mid) * 0.02, 0.01);
  const domainLo = mid - halfSpan;
  const domainHi = mid + halfSpan;
  const maxTotal = Math.max(bids[bids.length - 1]?.total ?? 0, asks[asks.length - 1]?.total ?? 0, 1);
  const xOf = React.useCallback(
    (price) => x0 + ((price - domainLo) / (domainHi - domainLo || 1)) * (x1 - x0),
    [domainHi, domainLo, x0, x1],
  );
  const yOf = React.useCallback((total) => y1 - (total / maxTotal) * (y1 - y0), [maxTotal, y0, y1]);
  const priceAt = React.useCallback(
    (x) => domainLo + ((x - x0) / (x1 - x0 || 1)) * (domainHi - domainLo),
    [domainHi, domainLo, x0, x1],
  );
  const midX = xOf(mid);
  const bidPath = stepPath(bids, xOf, yOf, midX, y1);
  const askPath = stepPath(asks, xOf, yOf, midX, y1);
  const priceTicks = React.useMemo(
    () => niceTicks(domainLo, domainHi, 4).filter((tick) => Math.abs(xOf(tick) - midX) > 28),
    [domainHi, domainLo, midX, xOf],
  );
  const sizeTicks = React.useMemo(() => niceTicks(0, maxTotal, 3), [maxTotal]);
  const bestBid = bids[0]?.price ?? mid;
  const bestAsk = asks[0]?.price ?? mid;
  const spread = Math.max(0, bestAsk - bestBid);
  const spreadPct = mid ? (spread / mid) * 100 : 0;
  const probe = React.useMemo(() => {
    if (hoverX == null) return null;
    const price = priceAt(hoverX);
    const isBid = price < mid;
    const side = isBid ? bids : asks;
    let level = null;
    for (const candidate of side) {
      const reached = isBid ? price <= candidate.price : price >= candidate.price;
      if (reached) level = candidate;
    }
    return { price, isBid, total: level?.total ?? 0 };
  }, [asks, bids, hoverX, mid, priceAt]);

  const onMove = (clientX) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * w;
    setHoverX(Math.max(x0, Math.min(x1, x)));
  };

  return (
    <div
      data-sheet-chart=""
      className={cn("flex h-full min-h-0 w-full flex-1 flex-col text-neutral-400 dark:text-neutral-500", marketVarsClassName, className)}
    >
      <style>{`@keyframes spectrum-mc-rise { from { transform: scaleY(0.15); opacity: 0.35; } to { transform: scaleY(1); opacity: 1; } }`}</style>
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
          <div className="mt-1 flex flex-wrap items-end gap-x-2">
            <p className="font-mono text-[22px] font-medium leading-none tabular-nums text-neutral-950 dark:text-white">
              {empty ? "—" : formatBookPrice(mid)}
            </p>
            {empty ? null : (
              <span className="mb-0.5 font-mono text-[11px] text-neutral-500">
                Spread {formatBookPrice(spread)} ({spreadPct.toFixed(3)}%)
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right font-mono text-[11px] leading-4">
          <div style={{ color: UP }}>Bid {compactSize(bids[bids.length - 1]?.total ?? 0)}</div>
          <div style={{ color: DOWN }}>Ask {compactSize(asks[asks.length - 1]?.total ?? 0)}</div>
          {live ? <div className="text-[9px] uppercase tracking-widest text-neutral-500">Live</div> : null}
        </div>
      </div>
      {empty ? (
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
              aria-label={`${name} depth. Mid ${formatBookPrice(mid)}, spread ${formatBookPrice(spread)}.`}
              onPointerMove={(event) => onMove(event.clientX)}
              onPointerLeave={() => setHoverX(null)}
            >
              <defs>
                <linearGradient id={`${uid}-bid`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={UP} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={UP} stopOpacity="0.04" />
                </linearGradient>
                <linearGradient id={`${uid}-ask`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={DOWN} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={DOWN} stopOpacity="0.04" />
                </linearGradient>
              </defs>
              {sizeTicks.map((tick) => (
                <line key={tick} x1={x0} x2={x1} y1={yOf(tick)} y2={yOf(tick)} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="2 4" />
              ))}
              <g style={reduce ? undefined : { transformBox: "fill-box", transformOrigin: "bottom center", animation: `spectrum-mc-rise 620ms ${EASE} both` }}>
                <path d={bidPath} fill={`url(#${uid}-bid)`} stroke={UP} strokeWidth="1.5" />
                <path d={askPath} fill={`url(#${uid}-ask)`} stroke={DOWN} strokeWidth="1.5" />
              </g>
              <line x1={midX} x2={midX} y1={y0} y2={y1} stroke="currentColor" strokeOpacity="0.45" strokeDasharray="3 3" />
              <g transform={`translate(${midX} ${Math.max(10, y0 - 2)})`}>
                <rect x={-42} y={-11} width={84} height={14} rx={4} className="fill-neutral-950 dark:fill-white" />
                <text x={0} y={-1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" className="fill-white font-mono dark:fill-neutral-950">
                  MID {formatBookPrice(mid)}
                </text>
              </g>
              {sizeTicks.map((tick) =>
                tick === 0 ? null : (
                  <text key={`size-${tick}`} x={x1 + 6} y={yOf(tick)} dominantBaseline="middle" fontSize="10" fill="currentColor" className="tabular-nums">
                    {compactSize(tick)}
                  </text>
                ),
              )}
              {priceTicks.map((tick) => (
                <text
                  key={`price-${tick}`}
                  x={Math.max(x0 + 18, Math.min(x1 - 18, xOf(tick)))}
                  y={y1 + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="currentColor"
                  className="tabular-nums"
                >
                  {formatBookPrice(tick)}
                </text>
              ))}
              {hoverX != null && probe ? (
                <g>
                  <line x1={hoverX} x2={hoverX} y1={y0} y2={y1} stroke="currentColor" strokeOpacity="0.4" strokeDasharray="3 3" />
                  <circle cx={hoverX} cy={yOf(probe.total)} r={3.5} fill="var(--spectrum-chart-surface, #fff)" stroke={probe.isBid ? UP : DOWN} strokeWidth="2" />
                  <g transform={`translate(${Math.max(54, Math.min(w - 54, hoverX))} ${Math.max(12, yOf(probe.total) - 16)})`}>
                    <rect x={-52} y={-9} width={104} height={14} rx={4} className="fill-neutral-950 dark:fill-white" />
                    <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize="9" className="fill-white font-mono dark:fill-neutral-950">
                      {formatBookPrice(probe.price)} · {compactSize(probe.total)}
                    </text>
                  </g>
                </g>
              ) : null}
            </svg>
          ) : null}
        </div>
      )}
    </div>
  );
}
