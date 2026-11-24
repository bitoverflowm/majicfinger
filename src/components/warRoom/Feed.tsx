"use client";

import { cn } from "@/lib/utils";

import { formatAge, formatCents, formatMove, venueLabel } from "./format";

export type FeedRow = {
  id: string;
  title: string;
  venue: string;
  desk: string;
  region: string;
  status: string;
  price: number | null;
  move: number | null;
  quoteAt: string | null;
  signalSummary: string | null;
  href: string;
};

export function Feed({
  rows,
  selectedId,
  onSelect,
  emptyReason,
}: {
  rows: FeedRow[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  emptyReason?: string | null;
}) {
  if (!rows.length) {
    return (
      <div className="px-3 py-8 text-sm text-slate-400">
        {emptyReason === "invalid_market"
          ? "That market link is not in this desk. Pick another story from the feed."
          : emptyReason === "no_markets_in_desk"
            ? "Nothing in this desk right now. Try All."
            : "No live snapshot yet. The globe poster stays up; try again in a moment."}
      </div>
    );
  }

  const global = rows.filter((row) => row.desk === "global");
  const geo = rows.filter((row) => row.desk !== "global");

  const list = (items: FeedRow[], heading?: string) => (
    <div>
      {heading ? (
        <h3 className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">{heading}</h3>
      ) : null}
      <ul className="flex flex-col">
        {items.map((row) => {
          const selected = row.id === selectedId;
          const move = formatMove(row.move);
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect(row.id)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-white/5 px-3 py-3 text-left transition",
                  selected ? "bg-white/10" : "hover:bg-white/5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm leading-snug text-slate-100">{row.title}</span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-white">{formatCents(row.price)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                  <span>{venueLabel(row.venue)}</span>
                  <span>·</span>
                  <span>{row.region}</span>
                  {move ? (
                    <span className={row.move && row.move > 0 ? "text-emerald-300" : "text-rose-300"}>{move}</span>
                  ) : null}
                  {row.quoteAt ? <span>{formatAge(row.quoteAt)}</span> : null}
                </div>
                {row.signalSummary ? (
                  <p className="line-clamp-2 text-xs text-slate-500">{row.signalSummary}</p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {geo.length ? list(geo) : null}
      {global.length ? list(global, "Global") : null}
    </div>
  );
}
