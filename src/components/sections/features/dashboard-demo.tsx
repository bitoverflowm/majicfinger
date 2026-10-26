"use client";

import { AreaChart, BarChart3, Calendar, Hash, LineChart, Plus, Type } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Chip, FeatureWindow, GREEN, RED, useInView, usePhases, useReducedMotion } from "./feature-kit";

type ChartType = "line" | "area" | "bar";
type Range = "1D" | "1W" | "1M";

const FIELDS = [
  { id: "time", icon: Calendar, label: "time" },
  { id: "yes", icon: Hash, label: "yes_price" },
  { id: "no", icon: Hash, label: "no_price" },
  { id: "volume", icon: Hash, label: "volume" },
  { id: "venue", icon: Type, label: "venue" },
] as const;

/** Fields each tile reads, highlighted in the sidebar while that tile builds. */
const TILE_FIELDS: readonly (readonly string[])[] = [
  ["time", "yes", "no"],
  ["volume"],
  ["time"],
  ["venue", "volume"],
];

function series(range: Range) {
  const n = 24;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    if (range === "1D") return 41 + Math.sin(i * 1.7) * 1.6 + Math.sin(i * 0.6) * 1.2;
    if (range === "1W") return 34 + t * 10 + Math.sin(i * 1.1) * 2.2;
    return 22 + t * 22 + Math.sin(i * 0.7) * 4.5 + Math.cos(i * 1.9) * 1.5;
  }).map((v) => Math.round(v * 10) / 10);
}

const STATS: Record<Range, { volume: string; delta: string; trades: string }> = {
  "1D": { volume: "$612K", delta: "+3.1%", trades: "1,984" },
  "1W": { volume: "$4.2M", delta: "+12.4%", trades: "24,180" },
  "1M": { volume: "$17.8M", delta: "+41.0%", trades: "96,522" },
};

const EXTRA_TILES = ["Biggest trades", "Order book depth", "Price by hour"] as const;

// empty, build 4 tiles, hold, area, 1M, bar, hold, fade
const DURATIONS = [700, 950, 750, 750, 950, 1900, 1700, 1700, 1700, 2400, 500] as const;

export function DashboardDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [manual, setManual] = useState<null | { type: ChartType; range: Range; extra: number }>(null);
  const { phase, loop } = usePhases(DURATIONS, inView && !manual && !reduced);

  const auto = {
    tiles: reduced ? 4 : Math.min(4, phase),
    type: (phase >= 8 ? "bar" : phase >= 6 ? "area" : "line") as ChartType,
    range: (phase >= 7 ? "1M" : "1W") as Range,
  };
  const tiles = manual ? 4 : auto.tiles;
  const type = manual?.type ?? auto.type;
  const range = manual?.range ?? auto.range;
  const extra = manual?.extra ?? 0;
  const building = !manual && phase >= 1 && phase <= 4 ? phase - 1 : -1;
  const fading = !manual && phase === DURATIONS.length - 1;

  const take = (patch: Partial<{ type: ChartType; range: Range; extra: number }>) =>
    setManual((m) => ({ type, range, extra, ...m, ...patch }));

  const values = useMemo(() => series(range), [range]);
  const stats = STATS[range];
  const activeFields = building >= 0 ? TILE_FIELDS[building] : [];

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Lychee Terminal" className="size-full">
        <aside className="hidden w-[27%] min-w-[9.5rem] shrink-0 flex-col border-r border-border sm:flex">
          <div className="px-3.5 pb-2 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Sheet</p>
            <p className="mt-1 truncate text-xs font-medium text-primary">nba_finals_trades</p>
            <p className="font-mono text-[10.5px] text-muted-foreground">24,180 rows</p>
          </div>
          <p className="px-3.5 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Fields
          </p>
          <ul className="flex flex-col gap-1 px-2">
            {FIELDS.map(({ id, icon: Icon, label }) => {
              const on = activeFields.includes(id);
              return (
                <li
                  key={id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2 py-1 font-mono text-[10.5px] transition-all duration-300",
                    on
                      ? "border-[#2f6fed] bg-[#2f6fed]/10 text-[#2f6fed] shadow-[0_0_0_3px_rgba(47,111,237,0.12)]"
                      : "border-transparent text-muted-foreground",
                  )}
                >
                  <Icon className="size-3 shrink-0" />
                  {label}
                </li>
              );
            })}
          </ul>
          <div className="mt-auto p-3">
            <div className="rounded-lg border border-dashed border-border p-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
              No formulas. Pick fields, Lychee picks the chart.
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-muted">
          <div className="flex items-center gap-1 border-b border-border bg-background px-2.5 py-1.5">
            <Chip active={type === "line"} onClick={() => take({ type: "line" })}>
              <LineChart className="size-3" /> Line
            </Chip>
            <Chip active={type === "area"} onClick={() => take({ type: "area" })}>
              <AreaChart className="size-3" /> Area
            </Chip>
            <Chip active={type === "bar"} onClick={() => take({ type: "bar" })}>
              <BarChart3 className="size-3" /> Bar
            </Chip>
            <span className="mx-1 h-4 w-px bg-border" />
            {(["1D", "1W", "1M"] as const).map((r) => (
              <Chip key={r} active={range === r} onClick={() => take({ range: r })}>
                {r}
              </Chip>
            ))}
            <button
              type="button"
              onClick={() => take({ extra: Math.min(EXTRA_TILES.length, extra + 1) })}
              disabled={extra >= EXTRA_TILES.length}
              className="ml-auto inline-flex h-6 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium text-primary transition-colors hover:bg-muted disabled:opacity-40"
            >
              <Plus className="size-3" /> Tile
            </button>
          </div>

          <div
            key={manual ? "manual" : loop}
            className={cn(
              "grid min-h-0 flex-1 auto-rows-fr grid-cols-3 gap-2 overflow-hidden p-2.5 transition-opacity duration-500",
              fading && "opacity-0",
            )}
          >
            <Tile show={tiles > 0} className="col-span-3 row-span-2" title="Yes vs no price" meta={range}>
              <MainChart values={values} type={type} />
            </Tile>
            <Tile show={tiles > 1} title="Volume" meta={range}>
              <Kpi value={stats.volume} delta={stats.delta} />
            </Tile>
            <Tile show={tiles > 2} title="Trades" meta={range}>
              <Kpi value={stats.trades} />
            </Tile>
            <Tile show={tiles > 3} title="Volume by venue">
              <VenueBars range={range} />
            </Tile>
            {EXTRA_TILES.slice(0, extra).map((name) => (
              <Tile key={name} show title={name}>
                <div className="flex h-full items-end gap-1 pt-2">
                  {[40, 70, 55, 90, 62, 78].map((h, i) => (
                    <span
                      key={i}
                      className="flex-1 origin-bottom rounded-sm bg-[#2f6fed] opacity-70 [animation:fx-grow_.6s_ease-out_both]"
                      style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
                    />
                  ))}
                </div>
              </Tile>
            ))}
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}

function Tile({
  show,
  title,
  meta,
  className,
  children,
}: {
  show: boolean;
  title: string;
  meta?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-lg border border-border bg-background p-2.5 transition-all duration-500 ease-landing-smooth",
        show ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="truncate text-[11px] font-medium text-primary">{title}</p>
        {meta ? <span className="font-mono text-[10px] text-muted-foreground">{meta}</span> : null}
      </div>
      <div className="relative min-h-0 flex-1">
        {show ? (
          <>
            <div className="fx-skel pointer-events-none absolute inset-0 mt-1.5 [animation:fx-fade-out_.35s_.45s_both]">
              <div className="fx-skeleton size-full rounded-md" />
            </div>
            <div className="h-full [animation:fx-rise_.5s_.4s_both]">{children}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Kpi({ value, delta }: { value: string; delta?: string }) {
  return (
    <div className="flex h-full flex-col justify-end">
      <p className="font-mono text-lg font-medium tabular-nums tracking-tight text-primary">{value}</p>
      {delta ? <p className="text-[10.5px] font-medium text-[#0f9f6e]">{delta} vs prior</p> : null}
    </div>
  );
}

function VenueBars({ range }: { range: Range }) {
  const kalshi = range === "1D" ? 58 : range === "1W" ? 64 : 61;
  return (
    <div className="flex h-full flex-col justify-end gap-1.5">
      {[
        { name: "Kalshi", pct: kalshi, color: "#28CC95" },
        { name: "Polymarket", pct: 100 - kalshi, color: "#2E5CFF" },
      ].map((v) => (
        <div key={v.name} className="flex items-center gap-1.5 text-[10px]">
          <span className="w-14 shrink-0 truncate text-muted-foreground">{v.name}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full transition-[width] duration-700 ease-landing-smooth"
              style={{ width: `${v.pct}%`, backgroundColor: v.color }}
            />
          </span>
          <span className="w-7 shrink-0 text-right font-mono tabular-nums text-primary">{v.pct}%</span>
        </div>
      ))}
    </div>
  );
}

const W = 300;
const H = 100;

function MainChart({ values, type }: { values: number[]; type: ChartType }) {
  const [hover, setHover] = useState<number | null>(null);
  const no = values.map((v) => 100 - v);
  const all = [...values, ...no];
  const min = Math.min(...all) - 2;
  const max = Math.max(...all) + 2;
  const yOf = (v: number) => 4 + (1 - (v - min) / (max - min)) * (H - 8);
  const xOf = (i: number) => (i / (values.length - 1)) * W;
  const path = (arr: number[]) =>
    arr.map((v, i) => `${i ? "L" : "M"}${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(" ");
  const yes = path(values);
  const noLine = path(no);
  const barW = W / values.length;

  return (
    <div
      className="relative h-full pt-1.5"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const i = Math.round(((e.clientX - rect.left) / rect.width) * (values.length - 1));
        setHover(Math.max(0, Math.min(values.length - 1, i)));
      }}
    >
      <div className="absolute right-0 top-1 z-10 flex gap-2 text-[10px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: GREEN }} /> Yes
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: RED }} /> No
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="size-full overflow-visible">
        <defs>
          <linearGradient id="fx-yes-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.28" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fx-no-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={RED} stopOpacity="0.2" />
            <stop offset="100%" stopColor={RED} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="currentColor" className="text-border" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
        ))}

        <g className={cn("transition-opacity duration-500", type === "bar" ? "opacity-0" : "opacity-100")}>
          <g className={cn("transition-opacity duration-500", type === "area" ? "opacity-100" : "opacity-0")}>
            <path d={`${yes} L${W} ${H} L0 ${H} Z`} fill="url(#fx-yes-fill)" className="fx-morph" />
            <path d={`${noLine} L${W} ${H} L0 ${H} Z`} fill="url(#fx-no-fill)" className="fx-morph" />
          </g>
          <g className="[animation:fx-draw_1.1s_.45s_ease-out_both]">
            <path d={noLine} fill="none" stroke={RED} strokeWidth="1.75" vectorEffect="non-scaling-stroke" className="fx-morph" />
            <path d={yes} fill="none" stroke={GREEN} strokeWidth="2" vectorEffect="non-scaling-stroke" className="fx-morph" />
          </g>
        </g>

        <g className={cn("transition-opacity duration-500", type === "bar" ? "opacity-100" : "opacity-0")}>
          {values.map((v, i) => {
            const yesH = (v / 100) * H;
            return (
              <g key={i}>
                <rect x={i * barW + barW * 0.18} width={barW * 0.64} y={0} height={H - yesH} fill={RED} opacity="0.35" className="fx-bar" />
                <rect x={i * barW + barW * 0.18} width={barW * 0.64} y={H - yesH} height={yesH} fill={GREEN} opacity="0.85" className="fx-bar" />
              </g>
            );
          })}
        </g>

        {hover !== null ? (
          <line x1={xOf(hover)} x2={xOf(hover)} y1="0" y2={H} stroke="currentColor" className="text-neutral-400" vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      {hover !== null ? (
        <>
          {type !== "bar" ? (
            <>
              <Dot left={(xOf(hover) / W) * 100} top={yOf(values[hover])} color={GREEN} />
              <Dot left={(xOf(hover) / W) * 100} top={yOf(no[hover])} color={RED} />
            </>
          ) : null}
          <div
            className="pointer-events-none absolute top-0 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 font-mono text-[10px] text-primary-foreground shadow-lg"
            style={{ left: `${Math.min(88, Math.max(12, (xOf(hover) / W) * 100))}%` }}
          >
            Yes {values[hover].toFixed(1)}¢ · No {no[hover].toFixed(1)}¢
          </div>
        </>
      ) : null}
    </div>
  );
}

function Dot({ left, top, color }: { left: number; top: number; color: string }) {
  return (
    <span
      className="pointer-events-none absolute z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-neutral-900"
      style={{ left: `${left}%`, top: `calc(0.375rem + (100% - 0.375rem) * ${top / H})`, backgroundColor: color }}
    />
  );
}
