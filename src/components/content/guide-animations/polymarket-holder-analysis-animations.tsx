"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CircleArrowDown,
  Database,
  Hand,
  LayoutGrid,
  LineChart,
  Loader2,
  MousePointer2,
  Plus,
  Search,
  Share,
  Sprout,
  Table2,
  Type,
  Users,
} from "lucide-react";
import { useMemo, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";

import { FeatureWindow } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";
import { layoutHolderTiles } from "@/lib/visualizations/holderTreemap";
import { GuideAnimationFigure, GuideCursor, MonoTag, ScaledStage, useGuidePhases, useTypedText } from "./guide-animation-kit";
import { ResultCard, StatusPill, VenuePickerMock } from "./kalshi-trade-history-recipe-steps";
import {
  HA_MARKET,
  HA_NO,
  HA_NO_ROWS,
  HA_PLUMBIS_ACTIVITY,
  HA_PLUMBIS_DAYS,
  HA_PLUMBIS_PNL,
  HA_PLUMBIS_POSITIONS,
  HA_QUERY,
  HA_RESULTS,
  HA_TRADER_TABS,
  HA_YES,
  HA_YES_ROWS,
  type HolderRow,
  type HolderSide,
} from "./polymarket-holder-analysis-data";

const STAGE_W = 880;
const STAGE_H = 540;

const YES_FILL = "oklch(0.696 0.17 162.48)";
const NO_FILL = "oklch(0.645 0.246 16.439)";
const BOTH_LINE = "oklch(0.769 0.188 70.08)";
const NEW_DOT = "oklch(0.606 0.25 292.717)";
const UP = "#16a34a";
const DOWN = "#e5484d";

const MARKET_TAB = "Holders · Will the Democratic Par…";
const TABS = [MARKET_TAB, ...HA_TRADER_TABS.map((t) => `${t.name} · Yes`)];
const PLUMBIS_TAB = 4;

function compact(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(abs >= 1e7 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `${sign}${abs.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

const usd = (n: number) => `${n < 0 ? "-" : ""}$${compact(Math.abs(n))}`;

/* ------------------------------------------------------------------ */
/* Shared frame                                                        */
/* ------------------------------------------------------------------ */

function Stage({ children, stageRef, overlay }: { children: ReactNode; stageRef: RefObject<HTMLDivElement | null>; overlay?: ReactNode }) {
  return (
    <ScaledStage width={STAGE_W} height={STAGE_H} innerRef={stageRef}>
      <FeatureWindow title="Lychee Terminal" className="size-full">
        {children}
      </FeatureWindow>
      {overlay}
    </ScaledStage>
  );
}

function CanvasChrome({ children, tabs = 1, active = 0, newFrom = tabs }: { children: ReactNode; tabs?: number; active?: number; newFrom?: number }) {
  return (
    <div
      className="relative min-w-0 flex-1 overflow-hidden bg-background"
      style={{ backgroundImage: "radial-gradient(circle, rgba(100,116,139,0.16) 1px, transparent 1.2px)", backgroundSize: "18px 18px" }}
    >
      <div className="absolute left-3 top-2.5 z-10 flex items-center gap-1">
        {TABS.slice(0, tabs).map((name, i) => (
          <span
            key={name}
            className={cn(
              "whitespace-nowrap rounded-md border px-2 py-0.5 text-[10.5px] transition-colors duration-300",
              i === active ? "border-foreground/25 bg-background font-medium text-foreground shadow-sm" : "border-border bg-background text-muted-foreground",
              i >= newFrom && "[animation:fx-rise_.3s_both]",
            )}
            style={i >= newFrom ? { animationDelay: `${(i - newFrom) * 70}ms` } : undefined}
          >
            {name}
          </span>
        ))}
        <span className="grid size-5 place-items-center rounded-md border border-border bg-background text-muted-foreground">
          <Plus className="size-3" aria-hidden />
        </span>
      </div>
      {children}
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-background px-1.5 py-1 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)]">
        <span className="grid size-6 place-items-center rounded-md bg-[#0d99ff] text-white">
          <MousePointer2 className="size-3.5" aria-hidden />
        </span>
        {[Hand, Table2, Database, BarChart3, Type, Share].map((Icon, i) => (
          <span key={i} className="grid size-6 place-items-center rounded-md text-muted-foreground">
            <Icon className="size-3.5" aria-hidden />
          </span>
        ))}
      </div>
    </div>
  );
}

function Block({
  icon: Icon,
  title,
  subtitle,
  children,
  style,
  className,
  arrive = false,
  delay = 0,
}: {
  icon: typeof Table2;
  title: string;
  subtitle?: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  arrive?: boolean;
  delay?: number;
}) {
  return (
    <div
      className={cn("absolute flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm", arrive && "[animation:fx-rise_.45s_both]", className)}
      style={{ ...style, ...(arrive ? { animationDelay: `${delay}ms` } : {}) }}
    >
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border/70 px-2.5 py-1.5">
        <Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        <span className="shrink-0 text-[11px] font-semibold text-foreground">{title}</span>
        {subtitle ? <span className="truncate text-[10px] text-muted-foreground">{subtitle}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Checkbox({ on, tone }: { on: boolean; tone?: string }) {
  return (
    <span
      className={cn("inline-grid size-[11px] place-items-center rounded-[3px] border align-middle", on ? "border-transparent text-white" : "border-neutral-300 dark:border-neutral-600")}
      style={on ? { background: tone || "#1f2937" } : undefined}
    >
      {on ? <Check className="size-2" strokeWidth={4} aria-hidden /> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Holder treemap                                                      */
/* ------------------------------------------------------------------ */

type LaidTile = { label: string; shares: number; both: boolean; age: number | null; rest?: boolean; x: number; y: number; w: number; h: number };

function holderTiles(side: HolderSide, w: number, h: number, limit: number, restShares?: number): LaidTile[] {
  const named = side.tiles.slice(0, limit).map(([label, shares, both, age]) => ({ label, shares, both: both === 1, age, weight: shares }));
  const rest = restShares ?? side.rest + side.tiles.slice(limit).reduce((sum, tile) => sum + tile[1], 0);
  const restTile = { label: `${(side.count - limit).toLocaleString()} more holders`, shares: rest, both: false, age: null, rest: true, weight: rest };
  return layoutHolderTiles(named, restTile, w, h) as unknown as LaidTile[];
}

function tileFill(tile: LaidTile, max: number, fill: string) {
  if (tile.rest) return "color-mix(in srgb, var(--muted-foreground) 22%, transparent)";
  const share = Math.max(0, Math.min(1, tile.shares / max));
  return `color-mix(in srgb, ${fill} ${Math.round(38 + Math.sqrt(share) * 62)}%, white)`;
}

const isFresh = (tile: LaidTile) => tile.age != null && tile.age < 30;

const sideTotal = (side: HolderSide) => side.rest + side.tiles.reduce((sum, tile) => sum + tile[1], 0);

function HolderTreemapBody({
  side,
  width,
  height,
  flags,
  hover,
  stagger = false,
  fontSize = 10,
  dotR = 3.5,
}: {
  side: HolderSide;
  width: number;
  height: number;
  /** Which markers to draw: amber outlines, violet dots. */
  flags: { both: boolean; fresh: boolean };
  hover?: string | null;
  stagger?: boolean;
  fontSize?: number;
  dotR?: number;
}) {
  const fill = side.outcome === "Yes" ? YES_FILL : NO_FILL;
  const tiles = useMemo(() => holderTiles(side, width, height, side.tiles.length), [side, width, height]);
  const max = side.tiles[0][1];
  const total = sideTotal(side);
  const hovered = hover ? tiles.find((tile) => tile.label === hover) : null;
  const rows = side.outcome === "Yes" ? HA_YES_ROWS : HA_NO_ROWS;
  const row = hovered ? rows.find((r) => r.name === hovered.label) : null;
  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} className="block overflow-visible" aria-hidden>
        {tiles.map((tile, i) => {
          const both = flags.both && tile.both;
          const inset = both ? 1 : 0;
          const show = tile.w > 46 && tile.h > 26;
          return (
            <g key={tile.label} className={stagger ? "[animation:fx-rise_.4s_both]" : undefined} style={stagger ? { animationDelay: `${Math.min(i, 30) * 22}ms` } : undefined}>
              <rect
                data-cursor={`tile-${side.outcome}-${tile.label}`}
                x={tile.x + inset}
                y={tile.y + inset}
                width={Math.max(0, tile.w - 1 - inset * 2)}
                height={Math.max(0, tile.h - 1 - inset * 2)}
                rx={3}
                fill={tileFill(tile, max, fill)}
                stroke={both ? BOTH_LINE : hovered === tile ? "#1f2937" : undefined}
                strokeWidth={both ? 2 : hovered === tile ? 1.25 : undefined}
              />
              {show ? (
                <text x={tile.x + 5} y={tile.y + fontSize + 4} fontSize={fontSize} fill={tile.rest ? "currentColor" : "#1f2937"} className={tile.rest ? "fill-muted-foreground" : undefined}>
                  {tile.label.length * fontSize * 0.62 > tile.w - 10 ? `${tile.label.slice(0, Math.max(1, Math.floor((tile.w - 10) / (fontSize * 0.62)) - 1))}…` : tile.label}
                </text>
              ) : null}
              {show && tile.h > fontSize * 3.2 ? (
                <text x={tile.x + 5} y={tile.y + fontSize * 2 + 7} fontSize={fontSize} fill={tile.rest ? "currentColor" : "#1f2937"} className={tile.rest ? "fill-muted-foreground" : undefined}>
                  {((tile.shares / total) * 100).toFixed(1)}%
                </text>
              ) : null}
            </g>
          );
        })}
        {flags.fresh
          ? tiles.map((tile) =>
              isFresh(tile) && tile.w > 10 && tile.h > 10 ? (
                <circle
                  key={`new-${tile.label}`}
                  cx={tile.x + tile.w - dotR - 3.5}
                  cy={tile.y + dotR + 2.5}
                  r={dotR}
                  fill={NEW_DOT}
                  stroke="white"
                  strokeWidth={1}
                  className="origin-center [animation:fx-rise_.35s_both] [transform-box:fill-box]"
                />
              ) : null,
            )
          : null}
      </svg>
      {hovered ? (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border/70 bg-background px-2 py-1 text-[10.5px] shadow-md [animation:fx-rise_.25s_both]"
          style={{ left: Math.min(hovered.x + hovered.w / 2 + 10, width - 170), top: Math.max(0, Math.min(hovered.y + hovered.h / 2 - 20, height - 96)) }}
        >
          <p className="max-w-[160px] truncate font-medium text-foreground">{hovered.label}</p>
          <p className="font-mono tabular-nums text-muted-foreground">{compact(hovered.shares)} shares</p>
          {row ? (
            <>
              <p className="font-mono tabular-nums text-muted-foreground">Avg price {Math.round(Number(row.avg) * 100)}¢</p>
              <p className="font-mono tabular-nums text-muted-foreground">PnL {row.pnl.startsWith("-") ? `-$${row.pnl.slice(1)}` : `$${row.pnl}`}</p>
            </>
          ) : null}
          {hovered.both ? <p className="text-amber-600 dark:text-amber-400">Holds both sides</p> : null}
          {isFresh(hovered) ? (
            <p className="text-violet-600 dark:text-violet-400">
              New wallet · {hovered.age} {hovered.age === 1 ? "day" : "days"} old
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type Emphasis = "top" | "both" | "fresh" | null;

function TreemapLegend({ side, emphasis, flags }: { side: HolderSide; emphasis: Emphasis; flags: { both: boolean; fresh: boolean } }) {
  const ring = "rounded-full bg-[#2f6fed]/10 px-1.5 text-foreground ring-1 ring-[#2f6fed]/50 transition-all duration-300";
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-2.5 pb-1 pt-1.5 text-[10px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-sm" style={{ background: side.outcome === "Yes" ? YES_FILL : NO_FILL }} aria-hidden />
        {side.outcome} shares · {side.count} holders
      </span>
      <span className={cn("tabular-nums", emphasis === "top" && ring)}>Top 10 hold {side.topTen}</span>
      {flags.both ? (
        <span className={cn("inline-flex items-center gap-1.5", emphasis === "both" && ring)}>
          <span className="size-2 rounded-sm border-2" style={{ borderColor: BOTH_LINE }} aria-hidden />
          {side.bothCount} hold both sides
        </span>
      ) : null}
      {flags.fresh ? (
        <span className={cn("inline-flex items-center gap-1.5", emphasis === "fresh" && ring)}>
          <span className="size-2 rounded-full" style={{ background: NEW_DOT }} aria-hidden />
          {side.newCount} new wallets (under 30 days)
        </span>
      ) : null}
    </div>
  );
}

function HolderTreemapBlock({
  side,
  style,
  arrive,
  delay,
  flags = { both: true, fresh: true },
  emphasis = null,
  hover = null,
  bodyHeight,
  fontSize,
  dotR,
  stagger,
}: {
  side: HolderSide;
  style: { left: number; top: number; width: number; height: number };
  arrive?: boolean;
  delay?: number;
  flags?: { both: boolean; fresh: boolean };
  emphasis?: Emphasis;
  hover?: string | null;
  bodyHeight: number;
  fontSize?: number;
  dotR?: number;
  stagger?: boolean;
}) {
  return (
    <Block icon={LayoutGrid} title={`${side.outcome} holders chart`} style={style} arrive={arrive} delay={delay}>
      <TreemapLegend side={side} emphasis={emphasis} flags={flags} />
      <div className="px-2.5">
        <HolderTreemapBody side={side} width={style.width - 22} height={bodyHeight} flags={flags} hover={hover} stagger={stagger} fontSize={fontSize} dotR={dotR} />
      </div>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* Holder sheet                                                        */
/* ------------------------------------------------------------------ */

type HolderColumn = { label: string; width: number; cell: (row: HolderRow) => ReactNode; flag?: "both" | "fresh" | "age" | "created" };

const HOLDER_SHEET_COLUMNS: HolderColumn[] = [
  { label: "Trader", width: 118, cell: (r) => r.name },
  { label: "Shares", width: 52, cell: (r) => r.shares },
  { label: "% of listed shares", width: 72, cell: (r) => r.pct },
  { label: "Value (USDC)", width: 66, cell: (r) => r.value },
  { label: "Avg price", width: 54, cell: (r) => r.avg },
  { label: "Total PnL", width: 58, cell: (r) => <span className={r.pnl.startsWith("-") ? "text-[#e5484d]" : undefined}>{r.pnl}</span> },
  { label: "Holds both sides", width: 88, cell: (r) => <Checkbox on={r.both} tone={BOTH_LINE} />, flag: "both" },
  { label: "New wallet", width: 60, cell: (r) => <Checkbox on={r.fresh} tone={NEW_DOT} />, flag: "fresh" },
  { label: "Age (days)", width: 58, cell: (r) => r.age, flag: "age" },
  { label: "Wallet created", width: 76, cell: (r) => r.created || "", flag: "created" },
  { label: "Wallet", width: 104, cell: (r) => <span className="font-mono">{r.wallet}</span> },
];
const HOLDER_GRID_W = HOLDER_SHEET_COLUMNS.reduce((sum, c) => sum + c.width, 0);
const RANK_W = 30;

function HolderSheetBlock({
  side,
  style,
  arrive = false,
  delay = 0,
  scrolled = false,
  markFresh = false,
  rowCount = 10,
}: {
  side: "Yes" | "No";
  style: { left: number; top: number; width: number; height: number };
  arrive?: boolean;
  delay?: number;
  scrolled?: boolean;
  markFresh?: boolean;
  rowCount?: number;
}) {
  const rows = (side === "Yes" ? HA_YES_ROWS : HA_NO_ROWS).slice(0, rowCount);
  const template = HOLDER_SHEET_COLUMNS.map((c) => `${c.width}px`).join(" ");
  const shift = Math.max(0, HOLDER_GRID_W - (style.width - RANK_W - 2));
  return (
    <Block icon={Table2} title={`${side} holders`} subtitle={HA_MARKET.title} style={style} arrive={arrive} delay={delay}>
      <div className="flex min-h-0 flex-1 overflow-hidden text-[10px]">
        <div className="shrink-0 border-r border-border/50 bg-background text-center tabular-nums text-muted-foreground" style={{ width: RANK_W }}>
          <div className="truncate border-b border-border/70 bg-muted/60 px-1 py-1 font-medium">Rank</div>
          {rows.map((r, i) => (
            <div
              key={r.name}
              className={cn("border-b border-border/40 py-[3px]", arrive && "[animation:fx-slide-in_.35s_both]", markFresh && r.fresh && "bg-violet-500/10")}
              style={arrive ? { animationDelay: `${delay + 150 + i * 45}ms` } : undefined}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            style={{ width: HOLDER_GRID_W, transform: scrolled ? `translateX(-${shift}px)` : undefined }}
            className="transition-transform duration-[1400ms] ease-[cubic-bezier(.32,.72,0,1)]"
          >
            <div className="grid border-b border-border/70 bg-muted/60 font-medium text-muted-foreground" style={{ gridTemplateColumns: template }}>
              {HOLDER_SHEET_COLUMNS.map((c) => (
                <span
                  key={c.label}
                  className={cn("truncate border-r border-border/50 px-1.5 py-1 transition-colors duration-500", markFresh && c.flag && c.flag !== "both" && "bg-violet-500/15 text-violet-700 dark:text-violet-300")}
                >
                  {c.label}
                </span>
              ))}
            </div>
            {rows.map((r, i) => (
              <div
                key={r.name}
                className={cn(
                  "grid border-b border-border/40 tabular-nums text-foreground transition-colors duration-500",
                  arrive && "[animation:fx-slide-in_.35s_both]",
                  markFresh && r.fresh && "bg-violet-500/10",
                )}
                style={{ gridTemplateColumns: template, ...(arrive ? { animationDelay: `${delay + 150 + i * 45}ms` } : {}) }}
              >
                {HOLDER_SHEET_COLUMNS.map((c) => (
                  <span key={c.label} className={cn("truncate px-1.5 py-[3px]", c.flag === "both" || c.flag === "fresh" ? "text-center" : "", markFresh && r.fresh && c.flag === "age" && "font-semibold text-violet-700 dark:text-violet-300")}>
                    {c.cell(r)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* Recipe dialog                                                       */
/* ------------------------------------------------------------------ */

const RECIPES = [
  { title: "Download Kalshi Trade History", tag: "CSV", detail: "Search a market to view its trades and download a CSV.", Icon: CircleArrowDown, mine: false },
  { title: "Download Polymarket Trade History", tag: "CSV", detail: "Search a market to view its trades and download a CSV.", Icon: CircleArrowDown, mine: false },
  {
    title: "Polymarket Holder Analysis",
    tag: "Top 5",
    detail: "See who holds each side of a market, then open a tab for each of the top 5 traders.",
    Icon: Users,
    mine: true,
  },
];

function RecipesSidebar({ active }: { active: boolean }) {
  return (
    <aside className="flex w-[25%] shrink-0 flex-col border-r border-border bg-black/[0.015] dark:bg-white/[0.02]">
      <div className="px-5 pb-3 pt-6">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recipes <span className="tabular-nums">{RECIPES.length}</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">A list of quick actions requested by our quants. Click one to get started right away.</p>
      </div>
      {RECIPES.map(({ title, tag, detail, Icon, mine }) => {
        const on = mine && active;
        return (
          <div
            key={title}
            data-cursor={mine ? "recipe-row" : undefined}
            className={cn("flex items-start gap-2.5 px-5 py-3 transition-colors duration-300", on && "bg-black/[0.06] dark:bg-white/[0.07]")}
          >
            <Icon className={cn("mt-px size-4 shrink-0 text-muted-foreground", on && "text-foreground")} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className={cn("min-w-0 flex-1 truncate text-[13px] font-medium text-foreground", on ? "opacity-100" : "opacity-80")}>{title}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{tag}</span>
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{detail}</span>
            </span>
          </div>
        );
      })}
    </aside>
  );
}

/** The dialog previews one page of holders per side; its Top 10 figures come from that page. */
const DIALOG_SIDES = [
  { side: HA_YES, topTen: 0.5, label: "Top 10 hold 50%", tone: "text-emerald-700 dark:text-emerald-300" },
  { side: HA_NO, topTen: 0.83, label: "Top 10 hold 83%", tone: "text-rose-700 dark:text-rose-300" },
];

const DIALOG_TOP5: [name: string, rank: string, value: string][] = [
  ["ndb1", "Yes #1", "$1.6M"],
  ["033033033", "Yes #2", "$1.4M"],
  ["elmcap2", "Yes #3", "$1.3M"],
  ["plumbis", "Yes #4", "$447.4K"],
  ["lfg321", "Yes #5", "$433K"],
];

function MiniHolderMap({ side, topTen, label, tone }: (typeof DIALOG_SIDES)[number]) {
  const W = 240;
  const H = 120;
  const fill = side.outcome === "Yes" ? YES_FILL : NO_FILL;
  const tiles = useMemo(() => {
    const topSum = side.tiles.slice(0, 10).reduce((sum, t) => sum + t[1], 0);
    const shown = side.tiles.slice(0, 24).reduce((sum, t) => sum + t[1], 0);
    return holderTiles(side, W, H, 24, Math.max(0, topSum / topTen - shown));
  }, [side, topTen]);
  const max = side.tiles[0][1];
  return (
    <figure className="min-w-0 rounded-xl border border-border/70 bg-background p-2 shadow-sm">
      <figcaption className="flex items-baseline justify-between gap-1 px-0.5 pb-1">
        <span className={cn("text-[11px] font-semibold", tone)}>{side.outcome}</span>
        <span className="truncate text-[9.5px] tabular-nums text-muted-foreground">{label}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
        {tiles.map((tile) => (
          <rect
            key={tile.label}
            x={tile.x + (tile.both ? 1 : 0)}
            y={tile.y + (tile.both ? 1 : 0)}
            width={Math.max(0, tile.w - 1 - (tile.both ? 2 : 0))}
            height={Math.max(0, tile.h - 1 - (tile.both ? 2 : 0))}
            rx={2}
            fill={tileFill(tile, max, fill)}
            {...(tile.both ? { stroke: BOTH_LINE, strokeWidth: 1.5 } : {})}
          />
        ))}
        {tiles.map((tile) =>
          isFresh(tile) && tile.w > 8 && tile.h > 8 ? <circle key={`n-${tile.label}`} cx={tile.x + tile.w - 5} cy={tile.y + 4.5} r={2.5} fill={NEW_DOT} stroke="white" strokeWidth={0.75} /> : null,
        )}
      </svg>
    </figure>
  );
}

type HoldersState = "empty" | "loading" | "ready";

function HoldersPane({ state }: { state: HoldersState }) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#e6edf3] px-5 pb-5 pt-8 dark:bg-[#1c232b] [&>*]:shrink-0">
      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
        <Users className="size-4 text-muted-foreground" aria-hidden />
        Holders
      </p>
      {state === "empty" ? (
        <p className="mt-2.5 text-[12px] leading-relaxed text-foreground">
          Pick a market to see who holds each side, how concentrated it is, and the 5 biggest traders Lychee will open tabs for.
        </p>
      ) : state === "loading" ? (
        <div className="mt-3 space-y-2.5">
          <span className="fx-skeleton block h-[78px] rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            <span className="fx-skeleton block h-[92px] rounded-xl" />
            <span className="fx-skeleton block h-[92px] rounded-xl" />
          </div>
          <span className="fx-skeleton block h-[200px] rounded-xl" />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <section className="rounded-xl border border-border/70 bg-background px-3 py-2.5 shadow-sm [animation:fx-rise_.35s_both]">
            <div className="flex items-start gap-2">
              <p className="line-clamp-2 min-w-0 flex-1 text-[11.5px] font-semibold leading-snug text-foreground">{HA_MARKET.title}</p>
              <StatusPill label="Open" />
            </div>
            <div className="mt-1.5 flex gap-4 text-[10px] text-muted-foreground">
              <span>
                Yes <span className="text-[12px] font-semibold tabular-nums text-foreground">{HA_MARKET.yes}</span> {HA_MARKET.no}
              </span>
              <span>
                Volume <span className="text-[12px] font-semibold tabular-nums text-foreground">{HA_MARKET.volume}</span>
              </span>
            </div>
          </section>
          <div className="grid grid-cols-2 gap-2 [animation:fx-rise_.35s_.1s_both]">
            {DIALOG_SIDES.map((d) => (
              <MiniHolderMap key={d.side.outcome} {...d} />
            ))}
          </div>
          <section className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm [animation:fx-rise_.35s_.2s_both]">
            <header className="border-b border-border/50 px-3 py-2">
              <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">Top 5 holders · one tab each</p>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">4 of the listed wallets hold both sides.</p>
              <p className="text-[10.5px] text-muted-foreground">18 wallets were set up in the last 30 days.</p>
            </header>
            <ol className="divide-y divide-border/50">
              {DIALOG_TOP5.map(([name, rank, value], i) => (
                <li key={name} className="flex items-center gap-2.5 px-3 py-[5px]">
                  <span className="w-3 shrink-0 text-right text-[10.5px] tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-foreground">{name}</span>
                  <span className="rounded bg-emerald-500/10 px-1.5 py-px text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">{rank}</span>
                  <span className="w-12 shrink-0 text-right text-[11.5px] font-semibold tabular-nums text-foreground">{value}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}

function RecipePane({
  query,
  typing,
  list,
  highlighted = -1,
  selected = -1,
  holders,
  ready,
  pressed = false,
}: {
  query: string;
  typing: boolean;
  list: "chips" | "skeleton" | "results";
  highlighted?: number;
  selected?: number;
  holders: HoldersState;
  ready: boolean;
  pressed?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 [animation:fx-rise_.35s_both]">
      <div className="flex w-[52.5%] min-w-0 flex-col bg-background">
        <div className="flex items-start gap-2 px-5 pb-2.5 pt-5">
          <ArrowLeft className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-[17px] font-semibold tracking-tight text-foreground">Polymarket Holder Analysis</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">Search in plain English, or paste a Polymarket link, market slug or condition id.</p>
          </div>
        </div>
        <div className="px-5 pb-2.5">
          <div
            data-cursor="search"
            className={cn("relative flex h-10 items-center rounded-xl border bg-background pl-9 pr-9 text-[13px]", typing ? "border-neutral-400 ring-2 ring-black/5" : "border-border")}
          >
            <Search className="absolute left-3 size-4 text-muted-foreground" aria-hidden />
            {query ? <span className="truncate text-foreground">{query}</span> : <span className="text-muted-foreground">Will Bitcoin reach $150k this year?</span>}
            {typing ? <span className="ml-px h-4 w-px animate-pulse bg-foreground" aria-hidden /> : null}
            {list === "skeleton" ? <Loader2 className="absolute right-3 size-4 animate-spin text-muted-foreground" aria-hidden /> : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-5">
          {list === "chips" ? (
            <div className="pt-1.5">
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Try</p>
              <div className="flex flex-wrap gap-1.5">
                {["House midterms", "Fed decision", "Bitcoin price", "Super Bowl"].map((chip) => (
                  <span key={chip} className="rounded-full border border-border px-2.5 py-0.5 text-[11.5px] text-muted-foreground">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ) : list === "skeleton" ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="fx-skeleton block h-[66px] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {HA_RESULTS.map((result, i) => (
                <ResultCard key={i} result={result} index={i} state={i === selected ? "active" : i === highlighted ? "highlighted" : "idle"} />
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 px-5 py-3">
          <span className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-[12.5px] font-medium text-foreground">Previous</span>
          <span
            data-cursor="save"
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium text-white transition-all duration-300",
              ready ? "bg-[#2f6fed]" : "bg-[#2f6fed]/45",
              pressed && "scale-[0.97] bg-[#2a63d4]",
            )}
          >
            Save and Go
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>
      <HoldersPane state={holders} />
    </div>
  );
}

const FIND_PHASES = [1300, 800, 600, 2600, 900, 1100, 1400, 3000, 1500] as const;
const FIND_CURSOR = ["recipe-row", "recipe-row", "recipe-row", "search", "search", "result-0", "result-0", "result-0", "save"];

function FindScene({ phase, loop, typed, pressSave = false }: { phase: number; loop: number; typed: string; pressSave?: boolean }) {
  return (
    <div className="relative flex min-w-0 flex-1">
      <RecipesSidebar active={phase >= 1} />
      {phase >= 2 ? (
        <RecipePane
          key={`recipe-${loop}`}
          query={phase === 3 ? typed : phase >= 4 ? HA_QUERY : ""}
          typing={phase === 3}
          list={phase <= 3 ? "chips" : phase === 4 ? "skeleton" : "results"}
          highlighted={phase === 5 ? 0 : -1}
          selected={phase >= 6 ? 0 : -1}
          holders={phase <= 5 ? "empty" : phase === 6 ? "loading" : "ready"}
          ready={phase >= 7}
          pressed={pressSave}
        />
      ) : (
        <VenuePickerMock />
      )}
    </div>
  );
}

export function HolderFindMarketAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(FIND_PHASES, rootRef, 7);
  const typed = useTypedText(HA_QUERY, phase === 3, 60);
  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="lake"
      label="Animation: opening Polymarket Holder Analysis from the Recipes sidebar, searching Democratic Party control the House 2026, picking the market, and the Holders panel loading Yes and No treemaps and the top 5 traders Lychee will open tabs for."
      caption="Pick the market and the Holders panel previews both sides and the five traders that will get their own tabs."
    >
      <Stage
        stageRef={stageRef}
        overlay={<GuideCursor stageRef={stageRef} target={FIND_CURSOR[phase]} pressed={phase === 2 || phase === 6} revision={`${loop}-${phase}`} />}
      >
        <FindScene phase={phase} loop={loop} typed={typed} />
      </Stage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* Save and Go: the run card, the holder sheets, then the trader tabs   */
/* ------------------------------------------------------------------ */

const RUN_STEPS = [
  { name: "find_market", args: `{"market":"${HA_MARKET.slug}"}`, result: `${HA_MARKET.title} · ${HA_MARKET.subtitle}` },
  { name: "pull_holders", args: `{"outcomes":"Yes+No","profit":true}`, result: "300 Yes and 300 No holders · 6 hold both sides · 54 new wallets" },
  { name: "place_holders", args: `{"charts":"treemap"}`, result: "Yes holders and No holders with a treemap under each" },
  { name: "open_trader_tabs", args: `{"traders":5}`, result: HA_TRADER_TABS.map((t) => t.name).join(", ") },
  { name: "pull_traders", args: `{"joins":"positions+activity+pnl"}`, result: "5 of 5 trader tabs filled" },
];

const RUN_PHASES = [1000, 1500, 1000, 1150, 1150, 1150, 1150, 1150, 1400, 500, 4200] as const;
const RUN_DONE = [1, 2, 4, 4, 4, 4, 4, 4, 5, 5, 5];

function runTab(phase: number) {
  return phase >= 3 && phase <= 7 ? phase - 2 : 0;
}

function StepDot({ state }: { state: "done" | "running" | "queued" }) {
  return state === "done" ? (
    <span className="grid size-3.5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
      <Check className="size-2.5" strokeWidth={3} aria-hidden />
    </span>
  ) : state === "running" ? (
    <span className="grid size-3.5 place-items-center">
      <span className="size-1.5 animate-pulse rounded-full bg-[#2f6fed]" />
    </span>
  ) : (
    <span className="block size-3.5 rounded-full border border-border" />
  );
}

function RunCard({ phase }: { phase: number }) {
  const done = RUN_DONE[phase];
  const finished = done >= RUN_STEPS.length;
  const childDone = phase >= 8 ? 5 : Math.max(0, phase - 3);
  return (
    <div
      className="absolute bottom-3 right-3 z-30 w-[292px] overflow-hidden rounded-xl border border-border bg-background shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] transition-opacity duration-500 [animation:fx-rise_.35s_both]"
      style={{ opacity: phase >= 10 ? 0 : 1 }}
    >
      <div className="flex items-start justify-between border-b border-border/70 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-foreground">{finished ? "Holder analysis ready" : "Analyzing holders"}</p>
          <p className="truncate text-[10px] text-muted-foreground">Polymarket holder analysis · {HA_MARKET.slug}</p>
        </div>
        {finished ? <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground">39s</span> : <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />}
      </div>
      <ol className="space-y-1.5 px-3 py-2">
        {RUN_STEPS.map((step, i) => {
          const state = i < done ? "done" : i === done ? "running" : "queued";
          return (
            <li key={step.name} className="flex gap-2">
              <span className="mt-0.5 shrink-0">
                <StepDot state={state} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[10.5px] text-foreground">{step.name}</span>
                  {state === "running" ? <MonoTag tone="blue">Running</MonoTag> : state === "queued" ? <MonoTag>Queued</MonoTag> : null}
                </span>
                {state !== "done" ? <span className="block truncate font-mono text-[9px] text-muted-foreground">{step.args}</span> : null}
                {state === "done" ? (
                  <span className="mt-0.5 block truncate rounded-md bg-muted px-2 py-0.5 text-[10px] leading-snug text-foreground [animation:fx-rise_.3s_both]">{step.result}</span>
                ) : state === "running" && step.name === "pull_holders" ? (
                  <span className="fx-shimmer-text mt-0.5 block text-[10px]">Checking when each wallet was set up</span>
                ) : null}
                {step.name === "pull_traders" && phase >= 2 && !finished ? (
                  <span className="mt-1 block space-y-0.5">
                    {HA_TRADER_TABS.map((t, c) => {
                      const s = c < childDone ? "done" : c === childDone ? "running" : "queued";
                      return (
                        <span key={t.name} className="flex items-center gap-1.5 text-[10px]">
                          <StepDot state={s} />
                          <span className="font-mono text-foreground">{t.name}</span>
                          {s === "running" ? <span className="fx-shimmer-text truncate">Placing positions, activity, and PnL</span> : null}
                        </span>
                      );
                    })}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {finished ? (
        <div className="border-t border-border/70 px-3 py-2 [animation:fx-rise_.3s_both]">
          <p className="text-[11px] font-semibold text-foreground">Your dashboard is ready</p>
          <p className="text-[10px] leading-snug text-muted-foreground">The holders are on the market tab and each top trader has a tab. Take a quick tour of what&apos;s where.</p>
          <span
            data-cursor="show-me-around"
            className={cn("mt-1.5 flex h-7 items-center justify-center rounded-md bg-foreground text-[11px] font-medium text-background transition-transform", phase === 9 && "scale-[0.97]")}
          >
            Show me around
          </span>
        </div>
      ) : null}
    </div>
  );
}

const MARKET_SHEET_Y = 40;
const MARKET_SHEET_H = 196;
const MARKET_CHART_Y = 246;
const MARKET_CHART_H = 202;
const COL_W = 420;
const COL_X = [12, 448];

function MarketTabBlocks({ arrive, flags = { both: true, fresh: true }, emphasis = null }: { arrive: boolean; flags?: { both: boolean; fresh: boolean }; emphasis?: Emphasis }) {
  return (
    <>
      {[HA_YES, HA_NO].map((side, i) => (
        <HolderSheetBlock
          key={`s-${side.outcome}`}
          side={side.outcome}
          arrive={arrive}
          delay={i * 120}
          rowCount={10}
          style={{ left: COL_X[i], top: MARKET_SHEET_Y, width: COL_W, height: MARKET_SHEET_H }}
        />
      ))}
      {[HA_YES, HA_NO].map((side, i) => (
        <HolderTreemapBlock
          key={`t-${side.outcome}`}
          side={side}
          arrive={arrive}
          delay={260 + i * 120}
          flags={flags}
          emphasis={emphasis}
          bodyHeight={MARKET_CHART_H - 66}
          fontSize={9}
          dotR={3}
          style={{ left: COL_X[i], top: MARKET_CHART_Y, width: COL_W, height: MARKET_CHART_H }}
        />
      ))}
    </>
  );
}

function sparkPath(values: readonly number[], w: number, h: number, pad = 0) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  return values
    .map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * w).toFixed(1)} ${(pad + ((hi - v) / span) * (h - pad * 2)).toFixed(1)}`)
    .join(" ");
}

function positionTiles(positions: { label: string; value: number; upnl: number }[], w: number, h: number) {
  const named = positions.filter((p) => p.value > 0).map((p) => ({ ...p, weight: p.value }));
  return layoutHolderTiles(named, null, w, h) as unknown as ((typeof named)[number] & { x: number; y: number; w: number; h: number })[];
}

function pnlTone(upnl: number, cap: number) {
  const t = Math.round(18 + Math.sqrt(Math.min(1, Math.abs(upnl) / cap)) * 62);
  return `color-mix(in srgb, ${upnl >= 0 ? UP : DOWN} ${t}%, var(--muted))`;
}

/** The filled tab for one trader, scaled down for the run animation. */
function TraderTabMini({ index }: { index: number }) {
  const t = HA_TRADER_TABS[index];
  const tiles = positionTiles(
    t.positions.map(([label, , value, upnl]) => ({ label, value, upnl })),
    396,
    150,
  );
  const cap = Math.max(...t.positions.map((p) => Math.abs(p[3])), 1);
  return (
    <div key={t.name}>
      <Block icon={Table2} title={`${t.name}'s positions`} arrive style={{ left: 12, top: 40, width: 856, height: 196 }}>
        <div className="text-[10px]">
          <div className="grid border-b border-border/70 bg-muted/60 font-medium text-muted-foreground" style={{ gridTemplateColumns: "1fr 64px 96px 108px 104px" }}>
            {["Market", "Outcome", "Value", "Unrealized PnL", "Holds both sides"].map((c) => (
              <span key={c} className="truncate border-r border-border/50 px-1.5 py-1">
                {c}
              </span>
            ))}
          </div>
          {t.positions.map(([market, outcome, value, upnl], i) => (
            <div
              key={`${market}-${outcome}`}
              className="grid border-b border-border/40 tabular-nums text-foreground [animation:fx-slide-in_.35s_both]"
              style={{ gridTemplateColumns: "1fr 64px 96px 108px 104px", animationDelay: `${120 + i * 40}ms` }}
            >
              <span className="truncate px-1.5 py-[3px]">{market}</span>
              <span className={cn("px-1.5 py-[3px]", outcome === "Yes" ? "text-[#0f9f6e]" : "text-[#e5484d]")}>{outcome}</span>
              <span className="px-1.5 py-[3px]">{compact(value)}</span>
              <span className={cn("px-1.5 py-[3px]", upnl < 0 && "text-[#e5484d]")}>{compact(upnl)}</span>
              <span className="px-1.5 py-[3px] text-center">
                <Checkbox on={false} />
              </span>
            </div>
          ))}
        </div>
      </Block>
      <Block icon={LayoutGrid} title={`${t.name}'s positions chart`} arrive delay={220} style={{ left: 12, top: 246, width: 420, height: 202 }}>
        <svg width={396} height={150} className="mx-auto mt-2 block" aria-hidden>
          {tiles.map((tile) => (
            <g key={`${tile.label}-${tile.value}`}>
              <rect x={tile.x} y={tile.y} width={Math.max(0, tile.w - 1)} height={Math.max(0, tile.h - 1)} rx={3} fill={pnlTone(tile.upnl, cap)} />
              {tile.w > 70 && tile.h > 24 ? (
                <text x={tile.x + 5} y={tile.y + 13} fontSize={9} fill="#1f2937">
                  {tile.label.length * 5 > tile.w - 10 ? `${tile.label.slice(0, Math.floor((tile.w - 10) / 5) - 1)}…` : tile.label}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </Block>
      <Block icon={LineChart} title={`${t.name}'s PnL`} arrive delay={380} style={{ left: 448, top: 246, width: 420, height: 202 }}>
        <div className="px-2.5 pt-1.5">
          <p className="text-[9.5px] text-muted-foreground">PnL</p>
          <p className="text-[15px] font-semibold tabular-nums text-foreground">{usd(t.pnl[t.pnl.length - 1] * 1000)}</p>
        </div>
        <svg viewBox="0 0 396 110" preserveAspectRatio="none" className="mx-2.5 mt-1 block h-[110px] w-[396px] overflow-visible" aria-hidden>
          <path d={sparkPath(t.pnl, 396, 110, 4)} fill="none" stroke={UP} strokeWidth="1.8" vectorEffect="non-scaling-stroke" className="[animation:fx-draw_1s_.45s_cubic-bezier(.165,.84,.44,1)_both]" />
        </svg>
      </Block>
    </div>
  );
}

function TourTip({ step, title, body, style, arrow = "down" }: { step: number; title: string; body: string; style: CSSProperties; arrow?: "down" | "up" }) {
  return (
    <div className="absolute z-40 w-[300px] rounded-xl border border-border bg-background p-3 shadow-[0_18px_50px_-14px_rgba(15,23,42,0.5)] [animation:fx-rise_.35s_both]" style={style}>
      <span
        className={cn("absolute left-8 size-2.5 rotate-45 border-border bg-background", arrow === "down" ? "-bottom-[6px] border-b border-r" : "-top-[6px] border-l border-t")}
        aria-hidden
      />
      <p className="text-[12px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[9.5px] text-muted-foreground">{step} of 8</span>
        <span className="flex gap-1.5">
          <span className="rounded-md border border-border px-2 py-0.5 text-[10.5px] text-foreground">Back</span>
          <span className="rounded-md bg-foreground px-2 py-0.5 text-[10.5px] text-background">Next</span>
        </span>
      </div>
    </div>
  );
}

function RunScene({ phase, loop }: { phase: number; loop: number }) {
  const tab = runTab(phase);
  const tabs = phase >= 2 ? TABS.length : 1;
  return (
    <CanvasChrome tabs={tabs} active={tab} newFrom={1}>
      {tab === 0 && phase >= 1 ? (
        <div key={`market-${loop}-${phase >= 8}`}>
          <MarketTabBlocks arrive={phase === 1 || phase === 8} />
        </div>
      ) : null}
      {tab > 0 ? <TraderTabMini key={`trader-${loop}-${tab}`} index={tab - 1} /> : null}
      {phase >= 10 ? (
        <>
          <div
            className="pointer-events-none absolute z-30 rounded-xl ring-2 ring-[#2f6fed] [animation:fx-rise_.35s_both]"
            style={{ left: COL_X[0] - 4, top: MARKET_CHART_Y - 4, width: COL_X[1] + COL_W - COL_X[0] + 8, height: MARKET_CHART_H + 8, boxShadow: "0 0 0 2000px rgba(15,23,42,0.28)" }}
          />
          <TourTip
            step={4}
            title="Wallets on both sides"
            body="6 wallets hold both Yes and No. They're outlined in amber here and checked in the Holds both sides column."
            style={{ left: 280, top: MARKET_CHART_Y - 136 }}
          />
        </>
      ) : null}
      <RunCard key={`card-${loop}`} phase={phase} />
    </CanvasChrome>
  );
}

const RUN_CURSOR = (phase: number) => (phase === 8 || phase === 9 ? "show-me-around" : null);

export function HolderRunAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(RUN_PHASES, rootRef, 10);
  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="dashboards"
      label="Animation: after Save and Go, the docked run card pulls 300 Yes and 300 No holders, places both holder sheets with a treemap under each, opens a tab for ndb1, 033033033, elmcap2, plumbis and lfg321, follows each tab as its positions, positions chart and PnL fill in, then returns to the market tab and starts the tour."
      caption="Save and Go fills the market tab, then takes you through each trader's tab as it loads, and ends with a short tour."
    >
      <Stage
        stageRef={stageRef}
        overlay={<GuideCursor stageRef={stageRef} target={RUN_CURSOR(phase)} pressed={phase === 9} hidden={phase < 8 || phase >= 10} revision={`${loop}-${phase}`} />}
      >
        <RunScene phase={phase} loop={loop} />
      </Stage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* The holder tables                                                   */
/* ------------------------------------------------------------------ */

const TABLE_PHASES = [600, 1800, 1400, 1800, 3400] as const;

export function HolderTablesAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(TABLE_PHASES, rootRef, 4);
  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="insights"
      label="Animation: the Yes holders and No holders sheets fill in side by side, then scroll sideways to Holds both sides, New wallet, Age (days) and Wallet created. On the No side, happy7ucker1 (0 days old) and hellothereworld (2 days old) light up as new wallets."
      caption="Both holder tables share the same columns. Scroll right for the both-sides and new-wallet flags."
    >
      <Stage stageRef={stageRef}>
        <CanvasChrome>
          {phase >= 1 ? (
            <div key={`tables-${loop}`}>
              {(["Yes", "No"] as const).map((side, i) => (
                <HolderSheetBlock
                  key={side}
                  side={side}
                  arrive
                  delay={i * 140}
                  scrolled={phase >= 3}
                  markFresh={phase >= 4}
                  style={{ left: COL_X[i], top: 44, width: COL_W, height: 314 }}
                />
              ))}
              {phase >= 4 ? (
                <div style={{ left: COL_X[1], top: 368 }} className="absolute w-[420px] rounded-xl border border-violet-500/30 bg-background/95 p-3 text-[11px] leading-relaxed text-foreground shadow-sm [animation:fx-rise_.35s_both]">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Sprout className="size-3.5 text-violet-600" aria-hidden />2 of the top 10 No holders are new wallets
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    happy7ucker1 was set up today and holds 873.1K No shares. hellothereworld is 2 days old with 383.6K.
                  </p>
                </div>
              ) : null}
              {phase >= 4 ? (
                <div style={{ left: COL_X[0], top: 368 }} className="absolute w-[420px] rounded-xl border border-border/70 bg-background/95 p-3 text-[11px] leading-relaxed text-foreground shadow-sm [animation:fx-rise_.35s_.15s_both]">
                  <p className="font-semibold">None of the top 10 Yes holders are new</p>
                  <p className="mt-1 text-muted-foreground">The youngest, plumbis, was set up on 7/9/2026, 117 days before this pull.</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </CanvasChrome>
      </Stage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* The holder treemaps, three ways                                     */
/* ------------------------------------------------------------------ */

type TreemapFocus = "concentration" | "both" | "new";

const TREEMAP_PHASES = [500, 1700, 1100, 2600, 2800] as const;

const TREEMAP_COPY: Record<TreemapFocus, { label: string; caption: string; hover: [string | null, string | null]; emphasis: Emphasis }> = {
  concentration: {
    label:
      "Animation: the Yes and No holder treemaps fill in tile by tile. The Yes side is spread across many wallets, with the top 10 holding 43%. On No, two wallets, 0xa5ef…2966 and BreakTheBank, cover almost half the shares and the top 10 hold 82%.",
    caption: "Each tile is one wallet sized by shares. A few huge tiles means a handful of wallets control that side.",
    hover: ["ndb1", "0xa5ef…2966"],
    emphasis: "top",
  },
  both: {
    label:
      "Animation: amber outlines appear on the holder treemaps around wallets that hold both Yes and No, such as YoshiYamamoto on the No side, and the legend reads 6 hold both sides.",
    caption: "An amber outline marks a wallet that also holds the other outcome.",
    hover: [null, "YoshiYamamoto"],
    emphasis: "both",
  },
  new: {
    label:
      "Animation: violet dots appear on holder tiles for wallets set up in the last 30 days. Hovering happy7ucker1 on the No side shows New wallet · 0 days old, and DavidxDavid on Yes is 12 days old.",
    caption: "A violet dot marks a wallet set up in the last 30 days. Hover it for its exact age.",
    hover: ["DavidxDavid", "happy7ucker1"],
    emphasis: "fresh",
  },
};

export function HolderTreemapAnimation({ focus = "concentration" }: { focus?: TreemapFocus }) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(TREEMAP_PHASES, rootRef, 4);
  const copy = TREEMAP_COPY[focus];
  const flags =
    focus === "concentration" ? { both: true, fresh: true } : focus === "both" ? { both: phase >= 3, fresh: false } : { both: false, fresh: phase >= 3 };
  const hover = phase === 3 ? copy.hover[0] ?? copy.hover[1] : phase >= 4 ? copy.hover[1] : null;
  const hoverSide = phase === 3 && copy.hover[0] ? "Yes" : "No";
  const target = hover ? `tile-${hoverSide}-${hover}` : null;
  return (
    <GuideAnimationFigure rootRef={rootRef} backdrop={focus === "new" ? "village" : focus === "both" ? "automate" : "insights"} label={copy.label} caption={copy.caption}>
      <Stage stageRef={stageRef} overlay={<GuideCursor stageRef={stageRef} target={target} hidden={!target} revision={`${loop}-${phase}`} />}>
        <CanvasChrome>
          {phase >= 1 ? (
            <div key={`maps-${loop}`}>
              {[HA_YES, HA_NO].map((side, i) => (
                <HolderTreemapBlock
                  key={side.outcome}
                  side={side}
                  arrive
                  stagger
                  delay={i * 140}
                  flags={flags}
                  emphasis={phase >= 3 ? copy.emphasis : null}
                  hover={hover && side.outcome === hoverSide ? hover : null}
                  bodyHeight={328}
                  style={{ left: COL_X[i], top: 44, width: COL_W, height: 408 }}
                />
              ))}
            </div>
          ) : null}
        </CanvasChrome>
      </Stage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* A trader tab: positions, activity, PnL                              */
/* ------------------------------------------------------------------ */

type TraderView = "positions" | "activity" | "pnl";

const POSITION_COLS = [
  { label: "Market", width: "1fr" },
  { label: "Outcome", width: "58px" },
  { label: "Size", width: "68px" },
  { label: "Avg price", width: "62px" },
  { label: "Current price", width: "80px" },
  { label: "Value", width: "72px" },
  { label: "Unrealized PnL", width: "92px" },
  { label: "Holds both sides", width: "96px" },
];

function PlumbisPositions({ hover }: { hover: string | null }) {
  const template = POSITION_COLS.map((c) => c.width).join(" ");
  const W = 830;
  const H = 212;
  const tiles = positionTiles(
    HA_PLUMBIS_POSITIONS.map(([label, outcome, , , , value, upnl]) => ({ label: `${label} · ${outcome}`, value, upnl })),
    W,
    H,
  );
  const cap = Math.max(...HA_PLUMBIS_POSITIONS.map((p) => Math.abs(p[6])));
  const hovered = hover ? tiles.find((t) => t.label.startsWith(hover)) : null;
  const pos = hovered ? HA_PLUMBIS_POSITIONS.find(([label]) => hovered.label.startsWith(label)) : null;
  return (
    <>
      <Block icon={Table2} title="plumbis's positions" subtitle="14 open positions" arrive style={{ left: 12, top: 40, width: 856, height: 150 }}>
        <div className="text-[10px]">
          <div className="grid border-b border-border/70 bg-muted/60 font-medium text-muted-foreground" style={{ gridTemplateColumns: template }}>
            {POSITION_COLS.map((c) => (
              <span key={c.label} className="truncate border-r border-border/50 px-1.5 py-1">
                {c.label}
              </span>
            ))}
          </div>
          {HA_PLUMBIS_POSITIONS.slice(0, 8).map(([market, outcome, size, avg, cur, value, upnl], i) => (
            <div
              key={market}
              className="grid border-b border-border/40 tabular-nums text-foreground [animation:fx-slide-in_.35s_both]"
              style={{ gridTemplateColumns: template, animationDelay: `${120 + i * 45}ms` }}
            >
              <span className="truncate px-1.5 py-[3px]">{market}</span>
              <span className={cn("px-1.5 py-[3px]", outcome === "Yes" ? "text-[#0f9f6e]" : "text-[#e5484d]")}>{outcome}</span>
              <span className="px-1.5 py-[3px]">{size.toLocaleString("en-US")}</span>
              <span className="px-1.5 py-[3px]">{avg}</span>
              <span className="px-1.5 py-[3px]">{cur}</span>
              <span className="px-1.5 py-[3px]">{compact(value)}</span>
              <span className={cn("px-1.5 py-[3px]", upnl < 0 && "text-[#e5484d]")}>{compact(upnl)}</span>
              <span className="px-1.5 py-[3px] text-center">
                <Checkbox on={false} />
              </span>
            </div>
          ))}
        </div>
      </Block>
      <Block icon={LayoutGrid} title="plumbis's positions chart" subtitle="Sized by value, colored by unrealized PnL" arrive delay={500} style={{ left: 12, top: 200, width: 856, height: 254 }}>
        <div className="relative mx-auto mt-2" style={{ width: W, height: H }}>
          <svg width={W} height={H} className="block" aria-hidden>
            {tiles.map((tile, i) => (
              <g key={tile.label} className="[animation:fx-rise_.4s_both]" style={{ animationDelay: `${600 + i * 40}ms` }}>
                <rect
                  data-cursor={`pos-${HA_PLUMBIS_POSITIONS.findIndex(([market, outcome]) => tile.label === `${market} · ${outcome}`)}`}
                  x={tile.x}
                  y={tile.y}
                  width={Math.max(0, tile.w - 1)}
                  height={Math.max(0, tile.h - 1)}
                  rx={3}
                  fill={pnlTone(tile.upnl, cap)}
                  stroke={hovered === tile ? "#1f2937" : undefined}
                  strokeWidth={hovered === tile ? 1.25 : undefined}
                />
                {tile.w > 60 && tile.h > 26 ? (
                  <>
                    <text x={tile.x + 6} y={tile.y + 15} fontSize={10} fill="#1f2937">
                      {tile.label.length * 5.6 > tile.w - 12 ? `${tile.label.slice(0, Math.max(1, Math.floor((tile.w - 12) / 5.6) - 1))}…` : tile.label}
                    </text>
                    {tile.h > 40 ? (
                      <text x={tile.x + 6} y={tile.y + 29} fontSize={10} fill="#1f2937">
                        {usd(tile.value)}
                      </text>
                    ) : null}
                  </>
                ) : null}
              </g>
            ))}
          </svg>
          {hovered && pos ? (
            <div
              className="pointer-events-none absolute z-10 w-[230px] rounded-md border border-border/70 bg-background px-2 py-1 text-[10.5px] shadow-md [animation:fx-rise_.25s_both]"
              style={{ left: Math.min(hovered.x + hovered.w / 2 + 10, W - 240), top: Math.max(0, Math.min(hovered.y + hovered.h / 2 - 30, H - 80)) }}
            >
              <p className="line-clamp-2 font-medium text-foreground">
                {pos[0]} · {pos[1]}
              </p>
              <p className="font-mono tabular-nums text-muted-foreground">Value {usd(pos[5])}</p>
              <p className="font-mono tabular-nums text-muted-foreground">
                Avg {+(pos[3] * 100).toFixed(2)}¢ → now {+(pos[4] * 100).toFixed(2)}¢
              </p>
              <p className={cn("font-mono tabular-nums", pos[6] < 0 ? "text-[#e5484d]" : "text-[#0f9f6e]")}>Unrealized {usd(pos[6])}</p>
            </div>
          ) : null}
        </div>
      </Block>
    </>
  );
}

/** Sep 1 – Nov 7, 2026 as weeks of Sun–Sat, with plumbis's actions on the days the pull covers. */
const CAL_START = Date.UTC(2026, 7, 30);
const CAL_WEEKS = 10;
const CAL_DAYS: Record<string, number> = Object.fromEntries(
  HA_PLUMBIS_DAYS.map((d) => {
    const [mon, day] = d.day.split(" ");
    return [`${mon === "Oct" ? 9 : 10}-${Number(day)}`, d.actions];
  }),
);

function ActivityCalendar({ hover, fill }: { hover: boolean; fill: boolean }) {
  const cell = 18;
  const gap = 4;
  const max = 168;
  const cells: { w: number; d: number; key: string; count: number; future: boolean }[] = [];
  for (let w = 0; w < CAL_WEEKS; w += 1) {
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(CAL_START + (w * 7 + d) * 86400000);
      const key = `${date.getUTCMonth()}-${date.getUTCDate()}`;
      const count = CAL_DAYS[key] ?? 0;
      const future = date.getTime() > Date.UTC(2026, 10, 4);
      cells.push({ w, d, key, count, future });
    }
  }
  const months = [
    { label: "Sep", w: 0 },
    { label: "Oct", w: 4 },
    { label: "Nov", w: 9 },
  ];
  return (
    <div className="px-3 pt-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-semibold tabular-nums text-foreground">500 actions</p>
        <p className="text-[10px] text-muted-foreground">9 day current streak · 9 day longest</p>
      </div>
      <div className="relative mt-2" style={{ height: 7 * (cell + gap) + 14 }}>
        {months.map((m) => (
          <span key={m.label} className="absolute top-0 text-[9px] text-muted-foreground" style={{ left: 24 + m.w * (cell + gap) }}>
            {m.label}
          </span>
        ))}
        {["Mon", "Wed", "Fri"].map((d, i) => (
          <span key={d} className="absolute left-0 text-[8.5px] text-muted-foreground" style={{ top: 14 + (1 + i * 2) * (cell + gap) + 5 }}>
            {d}
          </span>
        ))}
        {cells.map((c) => {
          const on = fill && c.count > 0;
          const t = c.count ? 30 + Math.round(Math.sqrt(c.count / max) * 70) : 0;
          const isHover = hover && c.key === "9-29";
          return (
            <span
              key={`${c.w}-${c.d}`}
              data-cursor={c.key === "9-29" ? "cal-oct29" : undefined}
              className={cn("absolute rounded-[4px] transition-colors duration-500", c.future && "opacity-0", isHover && "ring-2 ring-foreground/70")}
              style={{
                left: 24 + c.w * (cell + gap),
                top: 14 + c.d * (cell + gap),
                width: cell,
                height: cell,
                background: on ? `color-mix(in srgb, ${UP} ${t}%, var(--muted))` : "var(--muted)",
                transitionDelay: on ? `${(c.w * 7 + c.d - 58) * 70}ms` : undefined,
              }}
            />
          );
        })}
        {hover ? (
          <div className="absolute z-10 rounded-md border border-border/70 bg-background px-2 py-1 text-[10.5px] shadow-md [animation:fx-rise_.25s_both]" style={{ left: 24 + 9 * (cell + gap) - 150, top: 14 + 4 * (cell + gap) - 30 }}>
            <p className="font-medium text-foreground">Thu, Oct 29, 2026</p>
            <p className="font-mono tabular-nums text-muted-foreground">74 actions</p>
          </div>
        ) : null}
      </div>
      <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
        Less
        {[0, 35, 60, 85, 100].map((t) => (
          <span key={t} className="size-2.5 rounded-[3px]" style={{ background: t ? `color-mix(in srgb, ${UP} ${t}%, var(--muted))` : "var(--muted)" }} />
        ))}
        More
      </div>
    </div>
  );
}

const STACK = [
  { key: "buy", label: "Buy", color: UP },
  { key: "sell", label: "Sell", color: DOWN },
  { key: "redeem", label: "Redeem", color: "#2f6fed" },
  { key: "other", label: "Yield, rewards, rebates", color: "#a855f7" },
] as const;

function ActivityDollars({ hover }: { hover: boolean }) {
  const W = 380;
  const H = 150;
  const max = 500000;
  const bw = 28;
  const step = W / HA_PLUMBIS_DAYS.length;
  return (
    <div className="px-3 pt-2">
      <p className="text-[10px] text-muted-foreground">USDC per day, stacked by activity type and by buy or sell.</p>
      <div className="mt-1 flex flex-wrap gap-x-2.5 text-[9px] text-muted-foreground">
        {STACK.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative mt-2" style={{ width: W, height: H + 14 }}>
        <svg width={W} height={H} className="block overflow-visible" aria-hidden>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={0} x2={W} y1={H - f * H} y2={H - f * H} className="stroke-border" strokeWidth={1} />
              <text x={W} y={H - f * H - 3} fontSize={8.5} textAnchor="end" className="fill-muted-foreground">
                {f ? `$${(f * max) / 1000}K` : ""}
              </text>
            </g>
          ))}
          {HA_PLUMBIS_DAYS.map((d, i) => {
            let y = H;
            return (
              <g key={d.day} className="origin-bottom [animation:fx-grow_.6s_both] [transform-box:fill-box]" style={{ animationDelay: `${i * 60}ms` }}>
                {STACK.map((s) => {
                  const h = Math.max(d[s.key] > 0 ? 1.5 : 0, (d[s.key] / max) * H);
                  y -= h;
                  return <rect key={s.key} data-cursor={i === 2 && s.key === "buy" ? "bar-oct29" : undefined} x={i * step + (step - bw) / 2} y={y} width={bw} height={h} fill={s.color} opacity={hover && i !== 2 ? 0.45 : 1} />;
                })}
              </g>
            );
          })}
        </svg>
        <div className="flex">
          {HA_PLUMBIS_DAYS.map((d) => (
            <span key={d.day} className="text-center text-[8.5px] text-muted-foreground" style={{ width: step }}>
              {d.day}
            </span>
          ))}
        </div>
        {hover ? (
          <div className="absolute z-10 rounded-md border border-border/70 bg-background px-2 py-1 text-[10.5px] shadow-md [animation:fx-rise_.25s_both]" style={{ left: 2.5 * step + 16, top: 0 }}>
            <p className="font-medium text-foreground">Oct 29, 2026</p>
            <p className="font-mono tabular-nums text-[#0f9f6e]">Buy $252.6K</p>
            <p className="font-mono tabular-nums text-[#e5484d]">Sell $236.0K</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlumbisActivity({ phase }: { phase: number }) {
  const template = "78px 58px 40px 52px 46px 62px 58px 1fr";
  return (
    <>
      <Block icon={Table2} title="plumbis's activity" subtitle="Latest 500 actions" arrive style={{ left: 12, top: 40, width: 856, height: 150 }}>
        <div className="text-[10px]">
          <div className="grid border-b border-border/70 bg-muted/60 font-medium text-muted-foreground" style={{ gridTemplateColumns: template }}>
            {["Time", "Type", "Side", "Outcome", "Price", "Size", "USDC", "Market"].map((c) => (
              <span key={c} className="truncate border-r border-border/50 px-1.5 py-1">
                {c}
              </span>
            ))}
          </div>
          {HA_PLUMBIS_ACTIVITY.map((r, i) => (
            <div key={i} className="grid border-b border-border/40 tabular-nums text-foreground [animation:fx-slide-in_.35s_both]" style={{ gridTemplateColumns: template, animationDelay: `${120 + i * 45}ms` }}>
              {r.map((cell, j) => (
                <span key={j} className={cn("truncate px-1.5 py-[3px]", j === 2 && (cell === "BUY" ? "text-[#0f9f6e]" : "text-[#e5484d]"), j === 1 && cell === "REDEEM" && "text-[#2f6fed]")}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </Block>
      <Block icon={CalendarDays} title="plumbis's activity · daily" arrive delay={300} style={{ left: 12, top: 200, width: 420, height: 256 }}>
        <ActivityCalendar fill={phase >= 2} hover={phase === 3} />
      </Block>
      <Block icon={BarChart3} title="plumbis's activity · dollars" arrive delay={450} style={{ left: 448, top: 200, width: 420, height: 256 }}>
        <ActivityDollars hover={phase >= 4} />
      </Block>
    </>
  );
}

const PNL = HA_TRADER_TABS[3].pnl;
const PNL_LO = 0;
const PNL_HI = 100;

/** The series is evenly sampled from Jul 10 to Nov 4, 2026. */
function pnlDate(i: number) {
  const days = Math.round((i / (PNL.length - 1)) * 117);
  return new Date(Date.UTC(2026, 6, 10) + days * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function PlumbisPnl({ phase, loop }: { phase: number; loop: number }) {
  const W = 800;
  const H = 248;
  const x = (i: number) => (i / (PNL.length - 1)) * W;
  const y = (v: number) => H - ((v - PNL_LO) / (PNL_HI - PNL_LO)) * H;
  const line = PNL.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const point = phase === 3 ? 50 : phase >= 4 ? PNL.length - 1 : -1;
  return (
    <Block icon={LineChart} title="plumbis's PnL" subtitle={`Since ${HA_PLUMBIS_PNL.since}`} arrive style={{ left: 12, top: 40, width: 856, height: 414 }}>
      <div className="flex items-start justify-between px-4 pt-3">
        <div>
          <p className="text-[10px] text-muted-foreground">PnL</p>
          <p className="text-[22px] font-semibold tabular-nums tracking-tight text-foreground">{HA_PLUMBIS_PNL.position}</p>
          <p className="mt-0.5 flex gap-3 text-[10px] text-muted-foreground">
            <span>
              Realized <span className="font-medium tabular-nums text-foreground">{HA_PLUMBIS_PNL.realized}</span>
            </span>
            <span>
              Unrealized <span className="font-medium tabular-nums text-foreground">{HA_PLUMBIS_PNL.unrealized}</span>
            </span>
          </p>
        </div>
        <span className="flex rounded-md border border-border p-px text-[10px] text-muted-foreground">
          {["1W", "1M", "3M", "6M", "1Y", "ALL"].map((r) => (
            <span key={r} className={cn("px-1.5 py-px", r === "ALL" && "rounded bg-muted text-foreground")}>
              {r}
            </span>
          ))}
        </span>
      </div>
      <div className="relative mx-4 mt-3" style={{ width: W, height: H + 16 }}>
        <svg key={`pnl-${loop}`} width={W} height={H} className="block overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="ha-pnl-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={UP} stopOpacity="0.22" />
              <stop offset="1" stopColor={UP} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={0} x2={W} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} strokeDasharray={v ? "3 4" : undefined} />
              <text x={W - 2} y={y(v) - 3} fontSize={9} textAnchor="end" className="fill-muted-foreground">
                ${v}K
              </text>
            </g>
          ))}
          <g className="[animation:fx-draw_1.8s_cubic-bezier(.165,.84,.44,1)_both]">
            <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#ha-pnl-fill)" />
            <path d={line} fill="none" stroke={UP} strokeWidth={2} strokeLinejoin="round" />
          </g>
          {point >= 0 ? (
            <g className="[animation:fx-rise_.25s_both]">
              <line x1={x(point)} x2={x(point)} y1={0} y2={H} stroke="currentColor" className="text-foreground/30" strokeDasharray="3 3" />
              <circle data-cursor="pnl-point" cx={x(point)} cy={y(PNL[point])} r={4} fill={UP} stroke="white" strokeWidth={1.5} />
            </g>
          ) : null}
        </svg>
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          {[0, 15, 30, 45, 60].map((i) => (
            <span key={i}>{pnlDate(i)}</span>
          ))}
        </div>
        {point >= 0 ? (
          <div
            key={point}
            className="absolute z-10 rounded-md border border-border/70 bg-background px-2 py-1 text-[10.5px] shadow-md [animation:fx-rise_.25s_both]"
            style={{ left: Math.min(x(point) + 10, W - 190), top: Math.max(0, y(PNL[point]) - (point === 50 ? -14 : 70)) }}
          >
            <p className="font-medium text-foreground">{pnlDate(point)}, 2026</p>
            <p className="font-mono tabular-nums text-muted-foreground">PnL ${PNL[point]}K</p>
            {point === PNL.length - 1 ? (
              <>
                <p className="font-mono tabular-nums text-muted-foreground">Realized {HA_PLUMBIS_PNL.realized}</p>
                <p className="font-mono tabular-nums text-muted-foreground">Unrealized {HA_PLUMBIS_PNL.unrealized}</p>
              </>
            ) : (
              <p className="text-[#e5484d]">Down $11.1K from the point before</p>
            )}
          </div>
        ) : null}
      </div>
    </Block>
  );
}

const TRADER_PHASES: Record<TraderView, readonly number[]> = {
  positions: [500, 1500, 1500, 2600, 2600],
  activity: [500, 1500, 1500, 2400, 2800],
  pnl: [500, 2200, 1100, 2600, 3000],
};

const TRADER_CURSOR: Record<TraderView, (phase: number) => string | null> = {
  positions: (p) => (p === 3 ? "pos-0" : p >= 4 ? "pos-4" : null),
  activity: (p) => (p === 3 ? "cal-oct29" : p >= 4 ? "bar-oct29" : null),
  pnl: (p) => (p >= 3 ? "pnl-point" : null),
};

const TRADER_COPY: Record<TraderView, { label: string; caption: string }> = {
  positions: {
    label:
      "Animation: plumbis's tab opens with 14 open positions. The positions chart sizes each by value and colors it by unrealized PnL. Hovering the House market shows $447.4K bought at 93.56¢ and now at 99.95¢, up $28.6K; hovering Magdalena Andersson for Sweden shows a $1.8K loss.",
    caption: "Each trader's tab starts with every open position. The House market is most of plumbis's book.",
  },
  activity: {
    label:
      "Animation: plumbis's activity sheet fills with recent trades and redemptions, the daily calendar lights up 9 straight active days with 500 actions, and the dollars chart shows Oct 29 with $252.6K bought and $236.0K sold.",
    caption: "Activity covers trades and redemptions, with a calendar of when they trade and a chart of how much.",
  },
  pnl: {
    label:
      "Animation: plumbis's PnL line draws from Jul 10 to Nov 4, 2026, ending at $98.1K, $70.1K realized and $28.0K unrealized. Hovering shows a dip to $50.5K in mid-October and the final jump to $98.1K.",
    caption: "PnL through time, with the realized and unrealized split. Switch trader tabs to compare all five.",
  },
};

export function TraderTabAnimation({ view = "positions" }: { view?: TraderView }) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(TRADER_PHASES[view], rootRef, view === "pnl" ? 4 : 3);
  const target = TRADER_CURSOR[view](phase);
  const copy = TRADER_COPY[view];
  return (
    <GuideAnimationFigure rootRef={rootRef} backdrop={view === "pnl" ? "insights" : view === "activity" ? "village" : "dashboards"} label={copy.label} caption={copy.caption}>
      <Stage stageRef={stageRef} overlay={<GuideCursor stageRef={stageRef} target={target} hidden={!target} revision={`${loop}-${phase}`} />}>
        <CanvasChrome tabs={TABS.length} active={PLUMBIS_TAB}>
          {phase >= 1 ? (
            <div key={`${view}-${loop}`}>
              {view === "positions" ? (
                <PlumbisPositions hover={phase === 3 ? HA_PLUMBIS_POSITIONS[0][0] : phase >= 4 ? HA_PLUMBIS_POSITIONS[4][0] : null} />
              ) : view === "activity" ? (
                <PlumbisActivity phase={phase} />
              ) : (
                <PlumbisPnl phase={phase} loop={loop} />
              )}
            </div>
          ) : null}
        </CanvasChrome>
      </Stage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* The whole recipe                                                    */
/* ------------------------------------------------------------------ */

const WALK_FIND = [1200, 700, 500, 2400, 800, 1000, 1200, 2600, 1000, 450] as const;
const WALK_PHASES = [...WALK_FIND, ...RUN_PHASES] as const;
const WALK_SPLIT = WALK_FIND.length;

export function HolderWalkthroughAnimation({ className }: { className?: string }) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(WALK_PHASES, rootRef, WALK_PHASES.length - 1);
  const typed = useTypedText(HA_QUERY, phase === 3, 60);
  const inFind = phase < WALK_SPLIT;
  const run = phase - WALK_SPLIT;
  const findPhase = Math.min(phase, 8);
  const target = inFind ? (phase === 9 ? "save" : FIND_CURSOR[findPhase]) : RUN_CURSOR(run);
  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="lake"
      label="Animation: the full Polymarket Holder Analysis recipe. Search the House 2026 market, preview its holders and top 5 traders, click Save and Go, watch the holder sheets, treemaps and five trader tabs fill in, then start the tour."
      caption="The whole recipe on a real market: search, preview the holders, Save and Go, then a tab per top trader."
      className={className}
    >
      <Stage
        stageRef={stageRef}
        overlay={
          <GuideCursor
            stageRef={stageRef}
            target={target}
            pressed={inFind ? phase === 2 || phase === 6 || phase === 9 : run === 9}
            hidden={!inFind && (run < 8 || run >= 10)}
            revision={`${loop}-${phase}`}
          />
        }
      >
        {inFind ? <FindScene phase={findPhase} loop={loop} typed={typed} pressSave={phase === 9} /> : <RunScene phase={run} loop={loop} />}
      </Stage>
    </GuideAnimationFigure>
  );
}
