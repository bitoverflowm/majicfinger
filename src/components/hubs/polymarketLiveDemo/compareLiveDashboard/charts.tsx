"use client";

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useHtmlDarkClass } from "@/hooks/use-html-dark-class";
import { cn } from "@/lib/utils";

import { KALSHI_GREEN, POLYMARKET_BLUE, type BookLevel, type CandlePoint, type PricePoint } from "./types";

function fmtPct(value: number): string {
  return `${value.toFixed(1)}¢`;
}

function fmtQty(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  if (abs >= 100) return value.toFixed(0);
  return value.toFixed(abs >= 10 ? 1 : 2);
}

function toCents(price: number): number {
  return price <= 1.5 ? price * 100 : price;
}

export function MarketCandlesChart({
  candles,
  accent = KALSHI_GREEN,
  label,
}: {
  candles: CandlePoint[];
  accent?: string;
  label?: string;
}) {
  const dark = useHtmlDarkClass();
  const [hover, setHover] = useState<number | null>(null);
  const up = dark ? "#34d399" : "#059669";
  const down = dark ? "#fb7185" : "#e11d48";
  const axis = dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const grid = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const width = 640;
  const height = 260;
  const volH = 56;
  const pad = { l: 36, r: 12, t: 16, b: 18 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b - volH - 8;
  const slice = candles.slice(-80);
  const prices = slice.flatMap((c) => [c.l, c.h]);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 1;
  const span = Math.max(0.02, max - min);
  const maxV = Math.max(1, ...slice.map((c) => c.v));
  const barW = slice.length ? Math.max(2, (plotW / slice.length) * 0.7) : 4;
  const xAt = (i: number) => pad.l + ((i + 0.5) / Math.max(1, slice.length)) * plotW;
  const yAt = (v: number) => pad.t + (1 - (v - min) / span) * plotH;
  const active = hover != null ? slice[hover] : slice.at(-1);
  const last = slice.at(-1);

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-3 top-2 z-10 flex items-baseline gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">{label || "YES"}</span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {active ? `${(active.c * 100).toFixed(1)}¢` : "—"}
        </span>
        {last && active ? (
          <span
            className={cn(
              "text-[11px] font-medium",
              active.c >= slice[0]!.o ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
            )}
          >
            {(((active.c - slice[0]!.o) / Math.max(0.01, slice[0]!.o)) * 100).toFixed(2)}%
          </span>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        onPointerLeave={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + t * plotH;
          const v = max - t * span;
          return (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke={grid} strokeWidth="1" />
              <text x={4} y={y + 3} fill={axis} fontSize="9">
                {(v * 100).toFixed(0)}
              </text>
            </g>
          );
        })}
        {slice.map((c, i) => {
          const x = xAt(i);
          const bull = c.c >= c.o;
          const color = bull ? up : down;
          return (
            <g
              key={c.t}
              onPointerEnter={() => setHover(i)}
              style={{ cursor: "crosshair" }}
            >
              <line x1={x} x2={x} y1={yAt(c.h)} y2={yAt(c.l)} stroke={color} strokeWidth="1.2" />
              <rect
                x={x - barW / 2}
                y={Math.min(yAt(c.o), yAt(c.c))}
                width={barW}
                height={Math.max(1.5, Math.abs(yAt(c.o) - yAt(c.c)))}
                fill={bull ? "transparent" : color}
                stroke={color}
                strokeWidth="1.2"
              />
              <rect
                x={x - barW / 2}
                y={pad.t + plotH + 10 + (1 - c.v / maxV) * volH}
                width={barW}
                height={Math.max(1, (c.v / maxV) * volH)}
                fill={color}
                opacity={0.55}
              />
            </g>
          );
        })}
        {hover != null ? (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={pad.t}
            y2={height - pad.b}
            stroke={accent}
            strokeDasharray="3 3"
            opacity={0.5}
          />
        ) : null}
      </svg>
    </div>
  );
}

export function DepthChart({
  bids,
  asks,
  accentBid = KALSHI_GREEN,
  accentAsk = "#e11d48",
}: {
  bids: BookLevel[];
  asks: BookLevel[];
  accentBid?: string;
  accentAsk?: string;
}) {
  const width = 640;
  const height = 220;
  const pad = { l: 12, r: 12, t: 28, b: 20 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const bidPts = [...bids].sort((a, b) => b.price - a.price).slice(0, 24);
  const askPts = [...asks].sort((a, b) => a.price - b.price).slice(0, 24);
  let bidCum = 0;
  const bidCumPts = bidPts.map((level) => {
    bidCum += level.size;
    return { price: toCents(level.price), size: bidCum };
  });
  let askCum = 0;
  const askCumPts = askPts.map((level) => {
    askCum += level.size;
    return { price: toCents(level.price), size: askCum };
  });
  const allP = [...bidCumPts, ...askCumPts].map((p) => p.price);
  const minP = allP.length ? Math.min(...allP) : 0;
  const maxP = allP.length ? Math.max(...allP) : 100;
  const maxS = Math.max(1, ...bidCumPts.map((p) => p.size), ...askCumPts.map((p) => p.size));
  const xAt = (p: number) => pad.l + ((p - minP) / Math.max(1, maxP - minP)) * plotW;
  const yAt = (s: number) => pad.t + (1 - s / maxS) * plotH;
  const path = (pts: { price: number; size: number }[], fromMid: boolean) => {
    if (!pts.length) return "";
    const ordered = [...pts].sort((a, b) => a.price - b.price);
    const start = ordered[0]!;
    let d = `M ${xAt(start.price)} ${yAt(0)}`;
    for (const pt of ordered) d += ` L ${xAt(pt.price)} ${yAt(pt.size)}`;
    const last = ordered.at(-1)!;
    d += ` L ${xAt(last.price)} ${yAt(0)} Z`;
    return d;
  };
  const mid = bidPts[0] && askPts[0] ? (toCents(bidPts[0].price) + toCents(askPts[0].price)) / 2 : null;
  const spread =
    bidPts[0] && askPts[0] ? Math.abs(toCents(askPts[0].price) - toCents(bidPts[0].price)) : null;

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-3 top-2 z-10 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="font-medium text-foreground">
          Mid {mid != null ? `${mid.toFixed(1)}¢` : "—"}
        </span>
        <span className="text-muted-foreground">
          Spread {spread != null ? `${spread.toFixed(1)}¢` : "—"}
        </span>
        <span style={{ color: accentBid }}>Bid {fmtQty(bidCum)}</span>
        <span style={{ color: accentAsk }}>Ask {fmtQty(askCum)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <path d={path(bidCumPts, true)} fill={accentBid} opacity={0.22} />
        <path d={path(askCumPts, false)} fill={accentAsk} opacity={0.22} />
        {mid != null ? (
          <line
            x1={xAt(mid)}
            x2={xAt(mid)}
            y1={pad.t}
            y2={height - pad.b}
            stroke="currentColor"
            className="text-muted-foreground"
            strokeDasharray="3 3"
            opacity={0.5}
          />
        ) : null}
      </svg>
    </div>
  );
}

export function OrderBookLadder({
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  left: { bids: BookLevel[]; asks: BookLevel[] };
  right: { bids: BookLevel[]; asks: BookLevel[] };
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div className="grid h-full grid-cols-2 gap-3 overflow-hidden px-1">
      <BookSide book={left} label={leftLabel} accent={KALSHI_GREEN} />
      <BookSide book={right} label={rightLabel} accent={POLYMARKET_BLUE} />
    </div>
  );
}

function BookSide({
  book,
  label,
  accent,
}: {
  book: { bids: BookLevel[]; asks: BookLevel[] };
  label: string;
  accent: string;
}) {
  const asks = book.asks.slice(0, 7).reverse();
  const bids = book.bids.slice(0, 7);
  const max = Math.max(1, ...asks.map((l) => l.size), ...bids.map((l) => l.size));
  return (
    <div className="flex min-h-0 flex-col text-[11px]">
      <p className="mb-1 font-medium text-foreground" style={{ color: accent }}>
        {label}
      </p>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>Size</span>
        <span>Bid</span>
        <span>Ask</span>
      </div>
      <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-hidden font-mono">
        {asks.map((level) => (
          <div key={`a-${level.price}`} className="relative grid grid-cols-[1fr_auto_auto] gap-x-2">
            <span
              className="absolute inset-y-0 right-0 rounded-sm bg-rose-500/15"
              style={{ width: `${(level.size / max) * 100}%` }}
            />
            <span className="relative text-muted-foreground">{fmtQty(level.size)}</span>
            <span />
            <span className="relative text-rose-600 dark:text-rose-400">{fmtPct(toCents(level.price))}</span>
          </div>
        ))}
        {bids.map((level) => (
          <div key={`b-${level.price}`} className="relative grid grid-cols-[1fr_auto_auto] gap-x-2">
            <span
              className="absolute inset-y-0 left-0 rounded-sm bg-emerald-500/15"
              style={{ width: `${(level.size / max) * 100}%` }}
            />
            <span className="relative text-muted-foreground">{fmtQty(level.size)}</span>
            <span className="relative text-emerald-600 dark:text-emerald-400">
              {fmtPct(toCents(level.price))}
            </span>
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AreaSummaryChart({
  kalshi,
  poly,
}: {
  kalshi: PricePoint[];
  poly: PricePoint[];
}) {
  const data = useMemo(() => {
    const byT = new Map<number, { t: number; kalshi?: number; poly?: number }>();
    const push = (point: PricePoint, key: "kalshi" | "poly") => {
      const bucket = Math.round(point.t / 60_000) * 60_000;
      const row = byT.get(bucket) || { t: bucket };
      row[key] = point.v;
      byT.set(bucket, row);
    };
    kalshi.slice(-120).forEach((p) => push(p, "kalshi"));
    poly.slice(-120).forEach((p) => push(p, "poly"));
    return [...byT.values()]
      .sort((a, b) => a.t - b.t)
      .map((row) => ({
        ...row,
        label: new Date(row.t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      }));
  }, [kalshi, poly]);

  return (
    <ChartContainer
      config={{
        kalshi: { label: "Kalshi", color: KALSHI_GREEN },
        poly: { label: "Polymarket", color: POLYMARKET_BLUE },
      }}
      className="h-full w-full !aspect-auto"
    >
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="kFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={KALSHI_GREEN} stopOpacity={0.28} />
            <stop offset="100%" stopColor={KALSHI_GREEN} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="pFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={POLYMARKET_BLUE} stopOpacity={0.28} />
            <stop offset="100%" stopColor={POLYMARKET_BLUE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} minTickGap={24} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="kalshi" stroke={KALSHI_GREEN} fill="url(#kFill)" strokeWidth={1.6} />
        <Area type="monotone" dataKey="poly" stroke={POLYMARKET_BLUE} fill="url(#pFill)" strokeWidth={1.6} />
      </AreaChart>
    </ChartContainer>
  );
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i += 1) {
    prev = i === 0 ? values[i]! : values[i]! * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(values: number[], period = 14): number[] {
  const out: number[] = [];
  let gain = 0;
  let loss = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (i === 0) {
      out.push(50);
      continue;
    }
    const diff = values[i]! - values[i - 1]!;
    const g = Math.max(0, diff);
    const l = Math.max(0, -diff);
    if (i <= period) {
      gain += g;
      loss += l;
      out.push(50);
    } else if (i === period + 1) {
      gain = (gain + g) / period;
      loss = (loss + l) / period;
      const rs = loss === 0 ? 100 : gain / loss;
      out.push(100 - 100 / (1 + rs));
    } else {
      gain = (gain * (period - 1) + g) / period;
      loss = (loss * (period - 1) + l) / period;
      const rs = loss === 0 ? 100 : gain / loss;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

export function IndicatorChart({ candles }: { candles: CandlePoint[] }) {
  const slice = candles.slice(-80);
  const closes = slice.map((c) => c.c * 100);
  if (closes.length < 20) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Need a longer series for RSI and MACD.
      </div>
    );
  }
  const rsiVals = rsi(closes);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = ema12.map((v, i) => v - (ema26[i] || 0));
  const signal = ema(macd, 9);
  const last = slice.at(-1)!;
  const lastRsi = rsiVals.at(-1) ?? 50;
  const lastMacd = macd.at(-1) ?? 0;
  const lastSignal = signal.at(-1) ?? 0;
  const width = 640;
  const height = 240;
  const pad = { l: 28, r: 8, t: 28, b: 8 };
  const pane = (height - pad.t - pad.b) / 3;
  const xAt = (i: number) => pad.l + (i / Math.max(1, slice.length - 1)) * (width - pad.l - pad.r);
  const yScale = (vals: number[], top: number) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(0.01, max - min);
    return (v: number) => top + (1 - (v - min) / span) * (pane - 8);
  };
  const path = (vals: number[], top: number) => {
    const yAt = yScale(vals, top);
    return vals.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
  };

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-3 top-1.5 z-10 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{(last.c * 100).toFixed(1)}¢</span>
        <span>RSI {lastRsi.toFixed(1)}</span>
        <span>
          MACD {lastMacd.toFixed(2)} / {lastSignal.toFixed(2)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <path d={path(closes, pad.t)} fill="none" stroke={POLYMARKET_BLUE} strokeWidth="1.5" />
        <path d={path(rsiVals, pad.t + pane)} fill="none" stroke={KALSHI_GREEN} strokeWidth="1.3" />
        <path d={path(macd, pad.t + pane * 2)} fill="none" stroke="#a78bfa" strokeWidth="1.3" />
        <path
          d={path(signal, pad.t + pane * 2)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.1"
          strokeDasharray="3 2"
        />
      </svg>
    </div>
  );
}

export function PortfolioDonut({
  slices,
}: {
  slices: { label: string; value: number; color: string }[];
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  let acc = 0;
  const cx = 70;
  const cy = 70;
  const r = 42;
  const arcs = slices.map((slice) => {
    const start = acc / total;
    acc += slice.value;
    const end = acc / total;
    const a0 = start * Math.PI * 2 - Math.PI / 2;
    const a1 = end * Math.PI * 2 - Math.PI / 2;
    const large = end - start > 0.5 ? 1 : 0;
    const d = [
      `M ${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r}`,
      `A ${r} ${r} 0 ${large} 1 ${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r}`,
      `L ${cx} ${cy}`,
      "Z",
    ].join(" ");
    return { ...slice, d };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="size-28 shrink-0">
        {arcs.map((arc) => (
          <path key={arc.label} d={arc.d} fill={arc.color} opacity={0.9} />
        ))}
        <circle cx={cx} cy={cy} r={26} className="fill-background" />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          className="fill-foreground"
          fontSize="11"
          fontWeight="600"
        >
          {fmtQty(total)}
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-[12px]">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: slice.color }} />
              <span className="truncate text-foreground">{slice.label}</span>
            </span>
            <span className="font-mono text-muted-foreground">{fmtQty(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ResizeEdge = "s" | "e" | "se";

export function BoxResizeHandles({
  onChange,
  minHeight = 180,
}: {
  onChange: (next: { width: number; height: number }) => void;
  minHeight?: number;
}) {
  const start = (edge: ResizeEdge) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const box = event.currentTarget.closest("[data-dash-widget]") as HTMLElement | null;
    if (!box) return;
    const parent = box.parentElement;
    const startW = box.offsetWidth;
    const startH = box.offsetHeight;
    const startX = event.clientX;
    const startY = event.clientY;
    const maxW = Math.max(240, parent?.clientWidth || startW);
    const move = (ev: PointerEvent) => {
      const dw = edge === "s" ? 0 : ev.clientX - startX;
      const dh = edge === "e" ? 0 : ev.clientY - startY;
      onChange({
        width: Math.round(Math.max(240, Math.min(maxW, startW + dw))),
        height: Math.round(Math.max(minHeight, Math.min(1200, startH + dh))),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <>
      <div
        className="absolute inset-y-3 right-0 z-10 w-2 cursor-ew-resize touch-none hover:bg-secondary/30"
        onPointerDown={start("e")}
        aria-hidden
      />
      <div
        className="absolute inset-x-3 bottom-0 z-10 h-2 cursor-ns-resize touch-none hover:bg-secondary/30"
        onPointerDown={start("s")}
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-0 z-20 size-3.5 cursor-nwse-resize touch-none rounded-br-xl hover:bg-secondary/40"
        onPointerDown={start("se")}
        aria-hidden
      />
    </>
  );
}
