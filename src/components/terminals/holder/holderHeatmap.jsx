"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { layoutHolderTiles } from "@/lib/visualizations/holderTreemap";
import { cn } from "@/lib/utils";
import { HOLDER_FLAGS } from "./holderHoldersTable";
import { SKILL_SCORE_NAME, scoreTier } from "./traderScore";

/** Past this many holders a side, the rest share one tile so names stay readable. */
export const HEATMAP_TILES = 60;
/** Holders whose tile would be smaller than about 32×32 px join the rest, instead of becoming slivers. */
const MIN_TILE_AREA = 32 * 32;

const OUTCOME_FILL = ["#10b981", "#f43f5e"];
const OUTCOME_DOT = ["bg-emerald-500", "bg-rose-500"];
const PROFIT = "#10b981";
const LOSS = "#f43f5e";
const FLAG_COLOR = { newWallet: "#0ea5e9", firstTrade: "#f59e0b", bothSides: "#d946ef" };

export const HEATMAP_MODES = [
  { id: "size", label: "Position size", title: "Darker tiles hold more shares" },
  { id: "pnl", label: "Profit and loss", title: "Green tiles are up, red tiles are down; stronger colour, bigger PnL" },
  { id: "score", label: SKILL_SCORE_NAME, title: "Green tiles are proven traders, red tiles poor ones, from their finished markets" },
];

/** Scores this far from zero get the strongest colour. */
const SCORE_SPAN = 30;

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const USD_COMPACT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function usd(value) {
  if (!Number.isFinite(value)) return "—";
  return Math.abs(value) >= 10_000 ? USD_COMPACT.format(value) : USD.format(value);
}

function signedUsd(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 0.5) return "$0";
  return `${value > 0 ? "+" : "−"}${usd(Math.abs(value))}`;
}

function cents(price) {
  return Number.isFinite(price) ? `${Math.round(price * 1000) / 10}¢` : "—";
}

function pct(part, whole) {
  if (!(whole > 0)) return "";
  const value = (part / whole) * 100;
  if (value > 0 && value < 0.1) return "<0.1%";
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)}%`;
}

function shortWallet(wallet) {
  return wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "";
}

function mix(color, strength) {
  const weight = Math.round(Math.max(0, Math.min(1, strength)) * 100);
  return `color-mix(in srgb, ${color} ${weight}%, var(--background))`;
}

function scoreText(detail) {
  if (detail === undefined || detail.score === undefined) return "Scoring…";
  if (!detail.score) return "No history";
  const { score } = detail.score;
  return `${score > 0 ? "+" : ""}${score.toFixed(1)}`;
}

function pnlOf(holder) {
  return Number.isFinite(holder.total) ? holder.total : Number.isFinite(holder.unrealized) ? holder.realized + holder.unrealized : null;
}

/** The flags a tile shows: only those switched on, in the order of the toggles. */
function tileFlags(row, detail, enabled) {
  const on = {
    newWallet: row.newWallet,
    firstTrade: detail?.firstTradeHere === true,
    bothSides: row.bothSides,
  };
  return HOLDER_FLAGS.filter((flag) => enabled[flag.id] && on[flag.id]).map((flag) => flag.id);
}

function sideModel(side) {
  const rows = side?.rows || [];
  const named = rows.slice(0, HEATMAP_TILES).map((row) => ({ ...row, weight: row.amount }));
  const loadedShares = rows.reduce((sum, row) => sum + row.amount, 0);
  const tailShares = rows.slice(HEATMAP_TILES).reduce((sum, row) => sum + row.amount, 0);
  // The census refreshes less often than the live list, so it can trail the loaded holders' total.
  const unloaded = side?.shares > loadedShares ? side.shares - loadedShares : 0;
  const supply = loadedShares + unloaded;
  const restShares = tailShares + unloaded;
  const restCount = Math.max(0, (side?.count ?? rows.length) - named.length, rows.length - named.length);
  const topTen = rows.slice(0, 10).reduce((sum, row) => sum + row.amount, 0);
  return {
    named,
    rest: restShares > 0 && restCount > 0 ? { rest: true, name: "rest", weight: restShares, amount: restShares, count: restCount } : null,
    supply,
    topTen,
  };
}

function useBox() {
  const ref = useRef(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const measure = () => {
      const width = Math.floor(node.clientWidth);
      const height = Math.floor(node.clientHeight);
      setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, box];
}

function HoverCard({ tile, flags, detail, supply, outcome, box, at }) {
  const left = Math.min(at.x + 12, Math.max(0, box.width - 236));
  const top = at.y + 180 > box.height ? Math.max(0, at.y - 176) : at.y + 12;
  if (tile.rest) {
    return (
      <div className="pointer-events-none absolute z-10 w-56 rounded-md border border-border/70 bg-background px-2.5 py-2 text-[12px] shadow-md" style={{ left, top }}>
        <p className="font-medium text-foreground">{tile.count.toLocaleString()} more {outcome} holders</p>
        <p className="tabular-nums text-muted-foreground">
          {COMPACT.format(tile.amount)} shares · {pct(tile.amount, supply)} of supply
        </p>
      </div>
    );
  }
  const pnl = pnlOf(tile);
  return (
    <div className="pointer-events-none absolute z-10 w-56 rounded-md border border-border/70 bg-background px-2.5 py-2 text-[12px] shadow-md" style={{ left, top }}>
      <p className="truncate font-medium text-foreground">
        #{tile.rank} {tile.name}
      </p>
      <p className="font-mono text-[11px] text-muted-foreground">{shortWallet(tile.wallet)}</p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
        <dt className="text-muted-foreground">Shares</dt>
        <dd className="text-right text-foreground">
          {COMPACT.format(tile.amount)} · {pct(tile.amount, supply)}
        </dd>
        <dt className="text-muted-foreground">Position</dt>
        <dd className="text-right text-foreground">{usd(tile.value)}</dd>
        <dt className="text-muted-foreground">Entry</dt>
        <dd className="text-right text-foreground">{cents(tile.avgPrice)}</dd>
        <dt className="text-muted-foreground">PnL</dt>
        <dd className={cn("text-right", pnl > 0.5 ? "text-emerald-500" : pnl < -0.5 ? "text-rose-500" : "text-foreground")}>{signedUsd(pnl)}</dd>
        <dt className="text-muted-foreground">Realized</dt>
        <dd className="text-right text-foreground">{signedUsd(tile.realized)}</dd>
        <dt className="text-muted-foreground">Unrealized</dt>
        <dd className="text-right text-foreground">{signedUsd(tile.unrealized)}</dd>
        <dt className="text-muted-foreground">{SKILL_SCORE_NAME}</dt>
        <dd className={cn("text-right", scoreTier(detail?.score?.score)?.tone || "text-foreground")}>{scoreText(detail)}</dd>
      </dl>
      {flags.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {flags.map((id) => {
            const flag = HOLDER_FLAGS.find((item) => item.id === id);
            return (
              <span key={id} className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", flag.chip)}>
                {id === "bothSides" ? "Both sides" : flag.label}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function HeatmapPanel({ side, index, mode, scale, details, enabled, onPickTrader, loading }) {
  const [frameRef, box] = useBox();
  const [hover, setHover] = useState(null);
  const model = useMemo(() => sideModel(side), [side]);
  const tiles = useMemo(() => {
    const area = box.width * box.height;
    if (!area) return [];
    const total = model.named.reduce((sum, tile) => sum + tile.weight, 0) + (model.rest?.weight || 0);
    const shown = [];
    let foldedShares = 0;
    let foldedCount = 0;
    for (const tile of model.named) {
      if (total > 0 && (tile.weight / total) * area >= MIN_TILE_AREA) shown.push(tile);
      else {
        foldedShares += tile.weight;
        foldedCount += 1;
      }
    }
    const restShares = (model.rest?.weight || 0) + foldedShares;
    const restCount = (model.rest?.count || 0) + foldedCount;
    const rest = restShares > 0 && restCount > 0 ? { rest: true, name: "rest", weight: restShares, amount: restShares, count: restCount } : null;
    return layoutHolderTiles(shown, rest, box.width, box.height);
  }, [box.height, box.width, model.named, model.rest]);
  const outcome = side?.outcome || (index ? "No" : "Yes");

  const fillFor = (tile) => {
    if (tile.rest) return "color-mix(in srgb, var(--muted-foreground) 18%, var(--background))";
    if (mode === "score") {
      const score = details(tile.wallet)?.score?.score;
      if (!Number.isFinite(score)) return "color-mix(in srgb, var(--muted-foreground) 26%, var(--background))";
      return mix(score > 0 ? PROFIT : LOSS, 0.2 + Math.sqrt(Math.min(1, Math.abs(score) / SCORE_SPAN)) * 0.8);
    }
    if (mode === "pnl") {
      const pnl = pnlOf(tile);
      if (!Number.isFinite(pnl) || Math.abs(pnl) < 0.5) return "color-mix(in srgb, var(--muted-foreground) 26%, var(--background))";
      return mix(pnl > 0 ? PROFIT : LOSS, 0.25 + Math.sqrt(Math.min(1, Math.abs(pnl) / scale.pnl)) * 0.75);
    }
    return mix(OUTCOME_FILL[index], 0.22 + Math.sqrt(Math.min(1, tile.amount / scale.shares)) * 0.78);
  };

  return (
    <section aria-label={`${outcome} holder heatmap`} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border/70 px-4 py-2.5">
        <span className={cn("size-2 self-center rounded-full", OUTCOME_DOT[index])} aria-hidden />
        <h4 className="text-[14px] font-semibold text-foreground">{outcome}</h4>
        {side?.count != null ? <span className="text-[12px] text-muted-foreground">{side.count.toLocaleString()} holders</span> : null}
        {model.supply > 0 ? (
          <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">Top 10 hold {pct(model.topTen, model.supply)}</span>
        ) : null}
      </div>
      <div ref={frameRef} className="relative h-[460px] min-w-0" onMouseLeave={() => setHover(null)}>
        {tiles.length ? (
          tiles.map((tile) => {
            const flags = tile.rest ? [] : tileFlags(tile, details(tile.wallet), enabled);
            const ring = flags[0] ? FLAG_COLOR[flags[0]] : null;
            const pnl = tile.rest ? null : pnlOf(tile);
            const roomy = tile.w > 56 && tile.h > 34;
            const tall = tile.h > 50;
            return (
              <button
                key={tile.rest ? "rest" : tile.wallet}
                type="button"
                disabled={tile.rest || !onPickTrader}
                onClick={() => onPickTrader?.({ address: tile.wallet, title: tile.name })}
                onMouseMove={(event) => {
                  const rect = frameRef.current?.getBoundingClientRect();
                  setHover({ tile, flags, at: { x: rect ? event.clientX - rect.left : tile.x, y: rect ? event.clientY - rect.top : tile.y } });
                }}
                aria-label={tile.rest ? `${tile.count} more holders` : `${tile.name}, ${COMPACT.format(tile.amount)} shares`}
                className={cn(
                  "absolute overflow-hidden rounded-[3px] text-left transition-[background-color] duration-500",
                  !tile.rest && onPickTrader && "cursor-pointer hover:brightness-110",
                )}
                style={{
                  left: tile.x + 1,
                  top: tile.y + 1,
                  width: Math.max(0, tile.w - 2),
                  height: Math.max(0, tile.h - 2),
                  backgroundColor: fillFor(tile),
                  boxShadow: ring ? `inset 0 0 0 2px ${ring}` : undefined,
                }}
              >
                {flags.length && tile.w > 18 && tile.h > 14 ? (
                  <span className="absolute right-1 top-1 flex gap-0.5" aria-hidden>
                    {flags.map((id) => (
                      <span key={id} className="size-1.5 rounded-full ring-1 ring-background" style={{ backgroundColor: FLAG_COLOR[id] }} />
                    ))}
                  </span>
                ) : null}
                {roomy ? (
                  <span className="absolute inset-x-0 top-0 block px-1.5 pr-5 pt-1 text-[11px] leading-tight text-foreground">
                    <span className="block truncate font-medium">{tile.rest ? `${tile.count.toLocaleString()} more` : tile.name}</span>
                    {tall ? (
                      <span className="block truncate tabular-nums opacity-80">
                        {tile.rest ? pct(tile.amount, model.supply) : mode === "pnl" ? signedUsd(pnl) : mode === "score" ? scoreText(details(tile.wallet)) : pct(tile.amount, model.supply)}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-[12px] text-muted-foreground">
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Reading the holders
              </>
            ) : (
              `No ${outcome} holders yet`
            )}
          </div>
        )}
        {hover ? (
          <HoverCard
            tile={hover.tile}
            flags={hover.flags}
            detail={hover.tile.rest ? undefined : details(hover.tile.wallet)}
            supply={model.supply}
            outcome={outcome}
            box={box}
            at={hover.at}
          />
        ) : null}
      </div>
    </section>
  );
}

function Legend({ mode, scale, outcomes }) {
  if (mode === "score") {
    return (
      <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
        <span>−{SCORE_SPAN}</span>
        <span className="h-2 w-40 rounded-full" style={{ background: `linear-gradient(to right, ${LOSS}, var(--muted), ${PROFIT})` }} aria-hidden />
        <span>+{SCORE_SPAN}</span>
        <span>{SKILL_SCORE_NAME}</span>
      </div>
    );
  }
  if (mode === "pnl") {
    return (
      <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
        <span>{signedUsd(-scale.pnl)}</span>
        <span className="h-2 w-40 rounded-full" style={{ background: `linear-gradient(to right, ${LOSS}, var(--muted), ${PROFIT})` }} aria-hidden />
        <span>{signedUsd(scale.pnl)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      {[0, 1].map((index) => (
        <span key={index} className="flex items-center gap-1.5">
          {outcomes[index]}
          <span className="h-2 w-16 rounded-full" style={{ background: `linear-gradient(to right, ${mix(OUTCOME_FILL[index], 0.22)}, ${OUTCOME_FILL[index]})` }} aria-hidden />
        </span>
      ))}
      <span>Smaller to larger position</span>
    </div>
  );
}

/**
 * Each outcome's holders as a heatmap, side by side: tile area is the share of supply held, and the
 * colour shows either position size or profit and loss. Flags outline the tiles they mark.
 */
export function HolderHeatmap({ sides, outcomes, loading, details, onVisible, enabled, onPickTrader }) {
  const [mode, setMode] = useState("size");
  const scale = useMemo(() => {
    let shares = 0;
    let pnl = 0;
    for (const side of sides || []) {
      for (const row of side.rows.slice(0, HEATMAP_TILES)) {
        shares = Math.max(shares, row.amount);
        const value = pnlOf(row);
        if (Number.isFinite(value)) pnl = Math.max(pnl, Math.abs(value));
      }
    }
    return { shares: shares || 1, pnl: pnl || 1 };
  }, [sides]);

  const walletKey = (sides || []).flatMap((side) => side.rows.slice(0, HEATMAP_TILES).map((row) => row.wallet)).join(",");
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;
  useEffect(() => {
    if (walletKey) onVisibleRef.current?.(walletKey.split(","));
  }, [walletKey]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Colour by" className="flex rounded-md bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
          {HEATMAP_MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={mode === option.id}
              title={option.title}
              onClick={() => setMode(option.id)}
              className={cn(
                "rounded px-2.5 py-1 text-[12px] transition-colors",
                mode === option.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Legend mode={mode} scale={scale} outcomes={outcomes} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <HeatmapPanel
            key={index}
            side={sides?.[index] || { outcome: outcomes[index], rows: [], count: null, shares: null }}
            index={index}
            mode={mode}
            scale={scale}
            details={details}
            enabled={enabled}
            onPickTrader={onPickTrader}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
