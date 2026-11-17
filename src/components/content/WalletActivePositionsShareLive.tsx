"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { isResolved, num, positionKey, useTraderPositions } from "@/components/terminals/holder/traderPositionsTable";
import { usd } from "@/components/terminals/holder/traderTradesTable";
import { cn } from "@/lib/utils";

type Props = {
  wallet: string;
  label: string;
  /** Optional title substring to highlight (case-insensitive). */
  highlight?: string;
  snapshotNote?: string;
};

function openRows(rows: Record<string, unknown>[]) {
  return rows.filter((row) => (num(row.current_size) ?? 0) > 0 && !isResolved(row));
}

/** Live Active positions with portfolio-share bars for a Holder Terminal wallet. */
export function WalletActivePositionsShareLive({ wallet, label, highlight, snapshotNote }: Props) {
  const positions = useTraderPositions(wallet, "");
  const rows = useMemo(() => {
    const open = openRows(positions.rows as Record<string, unknown>[]);
    return [...open].sort((a, b) => (num(b.current_value) ?? 0) - (num(a.current_value) ?? 0));
  }, [positions.rows]);
  const total = useMemo(() => rows.reduce((sum, row) => sum + (num(row.current_value) ?? 0), 0), [rows]);
  const top = rows.slice(0, 8);
  const highlightKey = highlight?.toLowerCase() || "";

  return (
    <figure data-article-bleed className="not-prose mx-auto my-8 w-full max-w-[48rem] font-sans sm:my-10">
      <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
        {positions.status === "ready" ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-foreground">{label}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{wallet}</p>
              </div>
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-muted-foreground">Open</dt>
                  <dd className="font-mono font-semibold tabular-nums text-foreground">{rows.length.toLocaleString()}</dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-muted-foreground">Value</dt>
                  <dd className="font-mono font-semibold tabular-nums text-foreground">{usd(total)}</dd>
                </div>
              </dl>
            </div>
            {top.length ? (
              <ul className="mt-4 space-y-2.5">
                {top.map((row) => {
                  const value = num(row.current_value) ?? 0;
                  const share = total > 0 ? (value / total) * 100 : 0;
                  const title = String(row.title || "—");
                  const outcome = String(row.outcome || "");
                  const hit = highlightKey && title.toLowerCase().includes(highlightKey);
                  return (
                    <li
                      key={positionKey(row)}
                      className={cn("rounded-lg border border-border bg-background px-3 py-2.5", hit && "ring-1 ring-foreground/20")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {outcome || "—"}
                            {hit ? " · highlighted in the guide" : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-[13px] font-semibold tabular-nums text-foreground">{usd(value)}</p>
                          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">{share.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-[#2f6fed]" style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-10 text-center text-[13px] text-muted-foreground">No open positions right now.</p>
            )}
            {rows.length > top.length ? (
              <p className="mt-3 text-[12px] text-muted-foreground">
                Showing top {top.length} of {rows.length} open positions by value.
              </p>
            ) : null}
          </>
        ) : positions.status === "error" ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">{positions.error}</p>
        ) : (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading {label}’s active positions
          </div>
        )}
      </div>
      <figcaption className="mx-auto mt-3 max-w-[42rem] text-center text-xs leading-relaxed text-muted-foreground">
        Live Holder Terminal Active positions for {label}. Share = row Value ÷ total open Value.
        {snapshotNote ? ` ${snapshotNote}` : " Numbers can move after a trade, price change, or settlement."}
      </figcaption>
    </figure>
  );
}

export function BtcGamblerPositionsLive() {
  return (
    <WalletActivePositionsShareLive
      wallet="0x31c518f864d1394361fec967b3daa9093a86ede4"
      label="BTCGambler247"
      highlight="Boston"
      snapshotNote="The November 17 guide figures can differ from this live book."
    />
  );
}

export function BestpredictPositionsLive() {
  return (
    <WalletActivePositionsShareLive
      wallet="0xf1da56e58fb35f99987c87db50a3a1ae0d86ce2a"
      label="Bestpredict0101"
      highlight="Bitcoin"
      snapshotNote="The November 17 guide figures can differ from this live book."
    />
  );
}
