"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

import { formatAge, formatCents, formatMove, formatVolume, venueLabel } from "./format";

export type MarketRow = {
  id: string;
  title: string;
  venue: string;
  region: string;
  price: number | null;
  move: number | null;
  volume24h?: number | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  slug?: string | null;
  venueMarketId?: string | null;
  tokenIds?: string[];
  outcomes?: Array<{ id?: string; label?: string; tokenId?: string }>;
  quoteAt?: string | null;
};

function VenueBadge({ venue }: { venue: string }) {
  const v = String(venue || "").toLowerCase();
  const kalshi = v === "kalshi";
  const poly = v === "polymarket";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
        kalshi && "bg-[#28CC95]/20 text-[#28CC95]",
        poly && "bg-[#2E5CFF]/20 text-[#8da4ff]",
        !kalshi && !poly && "bg-white/10 text-slate-300",
      )}
    >
      {venueLabel(venue)}
    </span>
  );
}

type Flash = "enter" | "up" | "down" | "rank-up" | "rank-down" | null;

export function MarketsPane({
  rows,
  selectedId,
  onSelect,
  emptyReason,
}: {
  rows: MarketRow[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  emptyReason?: string | null;
}) {
  const prevRef = useRef<Map<string, { price: number | null; rank: number }>>(new Map());
  const [flash, setFlash] = useState<Record<string, Flash>>({});

  useEffect(() => {
    const prev = prevRef.current;
    const nextFlash: Record<string, Flash> = {};
    rows.forEach((row, rank) => {
      const prior = prev.get(row.id);
      if (!prior) {
        nextFlash[row.id] = "enter";
        return;
      }
      if (prior.rank > rank) nextFlash[row.id] = "rank-up";
      else if (prior.rank < rank) nextFlash[row.id] = "rank-down";
      if (prior.price != null && row.price != null && prior.price !== row.price) {
        nextFlash[row.id] = row.price > prior.price ? "up" : "down";
      }
    });
    prevRef.current = new Map(rows.map((row, rank) => [row.id, { price: row.price, rank }]));
    if (!Object.keys(nextFlash).length) return;
    setFlash(nextFlash);
    const timer = window.setTimeout(() => setFlash({}), 1200);
    return () => window.clearTimeout(timer);
  }, [rows]);

  if (!rows.length) {
    return (
      <div className="px-2.5 py-6 text-[11px] leading-snug text-slate-500">
        {emptyReason === "no_markets_in_desk"
          ? "Nothing in this desk right now."
          : "Waiting for live markets…"}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ul className="flex flex-col">
        {rows.map((row) => {
          const selected = row.id === selectedId;
          const move = formatMove(row.move);
          const tone = flash[row.id];
          const rising = (row.move ?? 0) > 0;
          const falling = (row.move ?? 0) < 0;
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect(row.id)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex w-full items-start gap-2 border-b border-white/[0.04] px-2.5 py-1.5 text-left transition duration-300",
                  selected ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
                  tone === "enter" && "animate-in fade-in slide-in-from-right-2 bg-sky-400/10",
                  tone === "up" && "bg-emerald-400/10",
                  tone === "down" && "bg-rose-400/10",
                  tone === "rank-up" && "bg-emerald-400/15",
                  tone === "rank-down" && "bg-amber-400/10",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <VenueBadge venue={row.venue} />
                    <span className="truncate text-[11px] leading-tight text-slate-200">{row.title}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-slate-500">
                    <span>{formatVolume(row.volume24h)}</span>
                    <span>·</span>
                    <span className="truncate">{row.region}</span>
                    {row.quoteAt ? <span>{formatAge(row.quoteAt)}</span> : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-0.5 font-mono text-[11px] tabular-nums text-white">
                    {rising ? <ArrowUp className="size-3 text-emerald-300" /> : null}
                    {falling ? <ArrowDown className="size-3 text-rose-300" /> : null}
                    {formatCents(row.price)}
                  </div>
                  {move ? (
                    <div
                      className={cn(
                        "font-mono text-[10px] tabular-nums",
                        rising ? "text-emerald-300" : falling ? "text-rose-300" : "text-slate-400",
                      )}
                    >
                      {move}
                    </div>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
