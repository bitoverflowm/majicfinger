"use client";

import { useEffect, useState } from "react";
import { AgentSteps } from "@/components/dashboardComposer/integrationRunProgress";

const LISTED_MARKETS = 6;

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = n;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

function seconds(from, to) {
  return `${(Math.max(0, to - from) / 1000).toFixed(1)}s`;
}

/**
 * What the join is doing while the first market's trades load: match markets,
 * have Athena scan the trades table, download, then price the fills.
 * @param {{
 *   preview: { status: string, error?: string, rows?: unknown[], progress?: Record<string, number> },
 *   markets: Array<{ ticker: string, label?: string, tokens?: string[], outcomes?: string[] }>,
 *   matchNoun: string,
 *   table: string,
 *   priced?: boolean,
 * }} props
 */
export function JoinTradeSteps({ preview, markets, matchNoun, table, priced = false }) {
  const progress = preview?.progress || {};
  const loading = preview?.status === "loading";
  const failed = preview?.status === "error";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!loading) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [loading]);

  const startedAt = progress.startedAt || now;
  const first = markets[0] || null;
  const label = first?.label || first?.ticker || "the first market";
  const tokens = first?.tokens || [];
  const outcomes = first?.outcomes || [];
  const scanned = formatBytes(progress.scannedBytes);
  const queryDone = Boolean(progress.queryDoneAt);
  const downloading = Boolean(progress.downloadAt);
  const processed = Number(progress.processed) || 0;
  const end = progress.failedAt || now;

  const steps = [
    {
      id: "match",
      name: priced ? "match_outcome_tokens" : "match_tickers",
      status: "success",
      startedAt,
      completedAt: startedAt,
      args: { markets: markets.length },
      result: priced && tokens.length
        ? `Matched ${markets.length.toLocaleString()} ${markets.length === 1 ? "market" : "markets"} by ${matchNoun}. ${label} trades on ${tokens.length} outcome ${tokens.length === 1 ? "token" : "tokens"}${outcomes.length ? ` (${outcomes.join(", ")})` : ""}.`
        : `Matched ${markets.length.toLocaleString()} ${markets.length === 1 ? "market" : "markets"} by ${matchNoun}. Previewing ${label}.`,
    },
    {
      id: "query",
      name: "compose_trades",
      status: queryDone ? "success" : failed ? "error" : "running",
      startedAt,
      ...(queryDone ? { completedAt: progress.queryDoneAt } : failed ? { completedAt: end } : {}),
      args: { table, market: label, limit: 50 },
      result: failed && !queryDone
        ? preview.error || "Athena could not compose these trades."
        : queryDone
          ? `Athena finished scanning ${table} in ${seconds(startedAt, progress.queryDoneAt)}${scanned ? ` · ${scanned} scanned` : ""}.`
          : `Athena is scanning ${table} for ${priced ? "fills on these outcome tokens" : "this ticker's trades"}${scanned ? ` · ${scanned} scanned so far` : ""}.`,
    },
    {
      id: "download",
      name: "download_rows",
      status: !queryDone ? "pending" : preview?.status === "ready" ? "success" : failed ? "error" : "running",
      ...(downloading ? { startedAt: progress.downloadAt } : {}),
      ...(failed && queryDone ? { completedAt: end } : {}),
      result: !queryDone
        ? ""
        : failed
          ? preview.error || "The rows could not be downloaded."
          : processed
            ? `Downloaded ${processed.toLocaleString()} ${processed === 1 ? "trade" : "trades"} for ${label}.`
            : `Downloading ${label}'s trades.`,
    },
  ];
  if (priced) {
    steps.push({
      id: "price",
      name: "price_fills",
      status: "pending",
      result: "Price, outcome, side, and size come from each fill's maker and taker amounts once the rows land.",
    });
  }
  if (markets.length > 1) {
    const listed = markets.slice(0, LISTED_MARKETS).map((market, index) => ({
      id: market.ticker,
      name: market.label || market.ticker,
      status: index === 0 ? (failed ? "error" : "running") : "pending",
      result: index === 0 ? "Previewing now" : "Pulls on Save and run",
    }));
    const more = markets.length - listed.length;
    steps.push({
      id: "markets",
      name: `${markets.length.toLocaleString()} trade sheets`,
      status: "pending",
      result: more > 0 ? `The preview loads the first market. ${more.toLocaleString()} more ${more === 1 ? "market pulls" : "markets pull"} on Save and run.` : "The preview loads the first market. The rest pull on Save and run.",
      children: listed,
    });
  }

  return (
    <div className="w-[min(520px,100%)] rounded-xl border border-border/70 bg-background shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{failed ? "Trades preview failed" : "Loading trades"}</p>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{label}</p>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-neutral-400">{seconds(startedAt, end)}</span>
      </header>
      <div className="max-h-[min(60vh,560px)] overflow-auto px-4 py-3">
        <AgentSteps steps={steps} now={now} />
      </div>
    </div>
  );
}
