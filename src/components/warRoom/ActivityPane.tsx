"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { formatAge, formatVolume, venueLabel } from "./format";

export type ActivityRow = {
  id: string;
  kind: string;
  venue?: string | null;
  marketId?: string | null;
  title: string;
  summary?: string | null;
  occurredAt?: string | null;
  region?: string | null;
  geometry?: { type: string; coordinates: [number, number] } | null;
  sourceUrl?: string | null;
  data?: {
    notionalUsd?: number | null;
    publisher?: string | null;
    markets?: Array<Record<string, unknown>>;
  } | null;
};

function KindBadge({ kind }: { kind: string }) {
  const news = kind === "headline";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
        news ? "bg-violet-400/20 text-violet-200" : "bg-amber-400/15 text-amber-200",
      )}
    >
      {news ? "News" : "Trade"}
    </span>
  );
}

export function ActivityPane({
  rows,
  selectedId,
  onSelect,
}: {
  rows: ActivityRow[];
  selectedId?: string | null;
  onSelect: (row: ActivityRow) => void;
}) {
  const seenRef = useRef<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Record<string, true>>({});

  useEffect(() => {
    const nextFresh: Record<string, true> = {};
    const seen = seenRef.current;
    const firstPaint = seen.size === 0;
    for (const row of rows) {
      if (!seen.has(row.id)) {
        if (!firstPaint) nextFresh[row.id] = true;
        seen.add(row.id);
      }
    }
    // Drop ids that fell out of the capped feed so reappearance can flash again.
    const live = new Set(rows.map((row) => row.id));
    for (const id of [...seen]) {
      if (!live.has(id)) seen.delete(id);
    }
    if (!Object.keys(nextFresh).length) return;
    setFresh(nextFresh);
    const timer = window.setTimeout(() => setFresh({}), 1100);
    return () => window.clearTimeout(timer);
  }, [rows]);

  if (!rows.length) {
    return (
      <div className="px-2.5 py-6 text-[11px] leading-snug text-slate-500">
        Waiting for live trades and headlines…
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ul className="flex flex-col">
        {rows.map((row) => {
          const selected = row.id === selectedId;
          const notional = row.data?.notionalUsd;
          const isFresh = Boolean(fresh[row.id]);
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect(row)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex w-full items-start gap-2 border-b border-white/[0.04] px-2.5 py-1.5 text-left transition duration-300",
                  selected ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
                  isFresh && row.kind === "headline" && "animate-in fade-in slide-in-from-right-1 bg-violet-400/15",
                  isFresh && row.kind !== "headline" && "animate-in fade-in slide-in-from-right-1 bg-amber-400/15",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <KindBadge kind={row.kind} />
                    <span className="truncate text-[11px] leading-tight text-slate-200">
                      {row.summary || row.title}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-slate-500">
                    <span>{venueLabel(row.venue)}</span>
                    {row.region ? (
                      <>
                        <span>·</span>
                        <span className="truncate">{row.region}</span>
                      </>
                    ) : null}
                    {row.kind === "fill" && notional != null ? (
                      <>
                        <span>·</span>
                        <span>{formatVolume(notional)}</span>
                      </>
                    ) : null}
                    {row.occurredAt ? <span>{formatAge(row.occurredAt)}</span> : null}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
