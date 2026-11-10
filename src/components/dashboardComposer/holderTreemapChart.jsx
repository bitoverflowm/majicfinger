"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import { layoutHolderTiles } from "@/lib/visualizations/holderTreemap";
import { formatShares, formatSignedUsd, formatUsd, parseVisualNumber } from "@/lib/visualizations/visualTable";

/** Past this many holders the rest share one tile, so the treemap stays readable. */
const NAMED_TILES = 40;
const TONES = {
  first: { fill: "oklch(0.696 0.17 162.48)", legend: "bg-emerald-500" },
  second: { fill: "oklch(0.645 0.246 16.439)", legend: "bg-rose-500" },
};
const BOTH_STROKE = "oklch(0.769 0.188 70.08)";
const NEW_DOT = "oklch(0.606 0.25 292.717)";

function shortLabel(label, width) {
  const text = String(label || "");
  const max = Math.max(4, Math.floor((width - 12) / 6.2));
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

function flagged(value) {
  return value === true || String(value || "").trim().toLowerCase() === "yes" || value === "true";
}

/** Yes, and the first outcome of a two-sided market, are green. No, and the second, are red. */
function toneFor(record, sheet) {
  const outcome = String(record?.outcome || sheet?.pull?.outcome || "").trim().toLowerCase();
  if (outcome === "no") return "second";
  if (outcome === "yes") return "first";
  return Number(sheet?.pull?.side) === 1 ? "second" : "first";
}

function holderModel(sheet, dataset) {
  const fields = dataset?.fields || {};
  const holders = sheetRecords(sheet)
    .map((record, row) => {
      const shares = parseVisualNumber(record?.[fields.value || "amount"]);
      if (shares == null || shares <= 0) return null;
      return {
        row,
        label: String(record?.[fields.label || "name"] || record?.proxy_wallet || "Holder").trim(),
        shares,
        value: parseVisualNumber(record?.current_value),
        avgPrice: parseVisualNumber(record?.avg_price),
        pnl: parseVisualNumber(record?.total_pnl),
        both: flagged(record?.both_sides),
        fresh: flagged(record?.new_wallet),
        ageDays: parseVisualNumber(record?.age_days),
        tone: toneFor(record, sheet),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.shares - a.shares);
  const total = holders.reduce((sum, holder) => sum + holder.shares, 0);
  const topTen = holders.slice(0, 10).reduce((sum, holder) => sum + holder.shares, 0);
  const named = holders.slice(0, NAMED_TILES);
  const rest = holders.slice(NAMED_TILES);
  const tiles = named.map((holder) => ({ ...holder, weight: holder.shares, name: holder.label }));
  const restShares = rest.reduce((sum, holder) => sum + holder.shares, 0);
  return {
    tiles,
    rest: rest.length
      ? {
          row: rest[0].row,
          label: `${rest.length.toLocaleString()} more holders`,
          name: "rest",
          shares: restShares,
          weight: restShares,
          value: null,
          avgPrice: null,
          pnl: null,
          both: false,
          fresh: false,
          ageDays: null,
          tone: rest[0].tone,
          rest: true,
        }
      : null,
    count: holders.length,
    total,
    topShare: total > 0 ? topTen / total : 0,
    max: named[0]?.shares || 1,
    bothCount: holders.filter((holder) => holder.both).length,
    newCount: holders.filter((holder) => holder.fresh).length,
  };
}

function tileFill(tile, max) {
  if (tile.rest) return "color-mix(in srgb, var(--muted-foreground) 22%, transparent)";
  const share = max > 0 ? Math.max(0, Math.min(1, tile.shares / max)) : 0;
  const weight = Math.round(38 + Math.sqrt(share) * 62);
  return `color-mix(in srgb, ${TONES[tile.tone].fill} ${weight}%, white)`;
}

/**
 * Holders of one market sized by shares. Darker tiles hold more. An amber outline marks a wallet
 * that also holds the other outcome, and a violet dot a wallet set up in the last 30 days.
 */
export function HolderTreemap({ sheet, dataset, onOpenRow }) {
  const frameRef = useRef(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState(null);
  const model = useMemo(() => holderModel(sheet, dataset), [dataset, sheet]);
  const outcome = String(sheet?.pull?.outcome || "").trim();

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return undefined;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const tiles = useMemo(
    () => layoutHolderTiles(model.tiles, model.rest, Math.max(0, box.width), Math.max(0, box.height)),
    [box.height, box.width, model.rest, model.tiles],
  );

  if (!model.tiles.length) {
    return <p className="px-3 text-[12px] text-muted-foreground">This sheet has no holders to chart yet.</p>;
  }

  const tone = TONES[model.tiles[0]?.tone || "first"];
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col px-2 pb-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pb-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className={`size-2 rounded-sm ${tone.legend}`} aria-hidden />
          {outcome ? `${outcome} shares` : "Shares"} · {model.count.toLocaleString()} holders
        </span>
        <span className="tabular-nums">Top 10 hold {Math.round(model.topShare * 100)}%</span>
        {model.bothCount ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm border-2" style={{ borderColor: BOTH_STROKE }} aria-hidden />
            {model.bothCount.toLocaleString()} hold both sides
          </span>
        ) : null}
        {model.newCount ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: NEW_DOT }} aria-hidden />
            {model.newCount.toLocaleString()} new {model.newCount === 1 ? "wallet" : "wallets"} (under 30 days)
          </span>
        ) : null}
      </div>
      <div ref={frameRef} className="relative min-h-0 min-w-0 flex-1" onMouseLeave={() => setHover(null)}>
        {tiles.length ? (
          <svg width={box.width} height={box.height} className="block" role="img" aria-label={`${outcome || "Holder"} share treemap`}>
            {tiles.map((tile) => {
              const show = tile.w > 48 && tile.h > 28;
              const inset = tile.both ? 1 : 0;
              return (
                <g
                  key={`${tile.row}-${tile.label}`}
                  onClick={() => (tile.rest ? undefined : onOpenRow?.(tile.row))}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    setHover({ tile, x: rect ? event.clientX - rect.left : tile.x, y: rect ? event.clientY - rect.top : tile.y });
                  }}
                  className={tile.rest ? undefined : "cursor-pointer"}
                >
                  <rect
                    x={tile.x + inset}
                    y={tile.y + inset}
                    width={Math.max(0, tile.w - 1 - inset * 2)}
                    height={Math.max(0, tile.h - 1 - inset * 2)}
                    rx={3}
                    fill={tileFill(tile, model.max)}
                    {...(tile.both ? { stroke: BOTH_STROKE, strokeWidth: 2 } : {})}
                  />
                  {tile.fresh && tile.w > 12 && tile.h > 12 ? (
                    <circle cx={tile.x + tile.w - 7 - inset} cy={tile.y + 6 + inset} r={3.5} fill={NEW_DOT} stroke="white" strokeWidth={1} />
                  ) : null}
                  {show ? (
                    <text x={tile.x + 6} y={tile.y + 16} fontSize={11} fill={tile.rest ? "currentColor" : "#1f2937"} className={tile.rest ? "fill-muted-foreground" : undefined}>
                      {shortLabel(tile.label, tile.w)}
                    </text>
                  ) : null}
                  {show && tile.h > 36 ? (
                    <text x={tile.x + 6} y={tile.y + 32} fontSize={11} fill={tile.rest ? "currentColor" : "#1f2937"} className={tile.rest ? "fill-muted-foreground" : undefined}>
                      {model.total > 0 ? `${((tile.shares / model.total) * 100).toFixed(1)}%` : formatShares(tile.shares)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : null}
        {hover ? (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-border/70 bg-background px-2 py-1 text-[12px] shadow-sm"
            style={{ left: Math.min(hover.x + 8, Math.max(0, box.width - 200)), top: Math.max(0, hover.y - 72) }}
          >
            <p className="max-w-[220px] truncate font-medium">{hover.tile.label}</p>
            <p className="font-mono tabular-nums text-muted-foreground">{formatShares(hover.tile.shares)} shares</p>
            {hover.tile.value != null ? <p className="font-mono tabular-nums text-muted-foreground">Value {formatUsd(hover.tile.value)}</p> : null}
            {hover.tile.avgPrice != null ? (
              <p className="font-mono tabular-nums text-muted-foreground">Avg price {Math.round(hover.tile.avgPrice * 100)}¢</p>
            ) : null}
            {hover.tile.pnl != null ? <p className="font-mono tabular-nums text-muted-foreground">PnL {formatSignedUsd(hover.tile.pnl)}</p> : null}
            {hover.tile.both ? <p className="text-amber-600 dark:text-amber-400">Holds both sides</p> : null}
            {hover.tile.fresh ? (
              <p className="text-violet-600 dark:text-violet-400">
                New wallet{hover.tile.ageDays != null ? ` · ${hover.tile.ageDays} ${hover.tile.ageDays === 1 ? "day" : "days"} old` : ""}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
