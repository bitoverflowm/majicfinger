"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, CircleAlert, Sprout, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useUser } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { layoutHolderTiles } from "@/lib/visualizations/holderTreemap";
import { formatUsd, MarketCardSkeleton, MarketSearchColumn, MarketStatsCard, usePolymarketMarketPicker } from "./polymarketMarketSearch";
import { pullMarketHolders, screenTopTraders, TOP_TRADER_COUNT, topHolderTraders } from "./polymarketHolderAnalysisSource";
import { runPolymarketHolderAnalysis } from "./polymarketHolderAnalysisRun";

const EXAMPLES = ["House midterms", "Fed decision", "Bitcoin price", "Super Bowl"];
/** Room to skip a few protocol contracts and still fill the top 5. */
const TRADER_CANDIDATES = 12;
const NO_TRADERS = [];
const MAP_W = 240;
const MAP_H = 132;
const MAP_TILES = 24;
const NEW_DOT = "oklch(0.606 0.25 292.717)";
const SIDE_TONES = [
  { fill: "oklch(0.696 0.17 162.48)", text: "text-emerald-700 dark:text-emerald-300", chip: "bg-emerald-500/10" },
  { fill: "oklch(0.645 0.246 16.439)", text: "text-rose-700 dark:text-rose-300", chip: "bg-rose-500/10" },
];

function MiniHolderMap({ side, index }) {
  const tone = SIDE_TONES[index];
  const tiles = useMemo(() => {
    const rows = side.rows.filter((row) => row.amount > 0);
    const head = rows.slice(0, MAP_TILES).map((row) => ({ ...row, weight: row.amount }));
    const rest = rows.slice(MAP_TILES).reduce((sum, row) => sum + row.amount, 0);
    return layoutHolderTiles(head, rest > 0 ? { name: "rest", rest: true, weight: rest, proxy_wallet: "rest" } : null, MAP_W, MAP_H);
  }, [side.rows]);
  const max = side.rows[0]?.amount || 1;
  const topTen = side.rows.slice(0, 10).reduce((sum, row) => sum + (row.share_pct || 0), 0);
  return (
    <figure className="min-w-0 rounded-xl border border-border/70 bg-background p-2.5 shadow-sm">
      <figcaption className="flex items-baseline justify-between gap-2 px-0.5 pb-1.5">
        <span className={cn("text-[12px] font-semibold", tone.text)}>{side.outcome}</span>
        <span className="truncate text-[11px] tabular-nums text-muted-foreground">
          {side.rows.length ? `Top 10 hold ${Math.round(topTen)}%` : "No holders"}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="block h-auto w-full" role="img" aria-label={`${side.outcome} holder treemap`}>
        {tiles.map((tile) => {
          const share = Math.sqrt(Math.min(1, (tile.amount || 0) / max));
          const fill = tile.rest
            ? "color-mix(in srgb, var(--muted-foreground) 22%, transparent)"
            : `color-mix(in srgb, ${tone.fill} ${Math.round(38 + share * 62)}%, white)`;
          return (
            <rect
              key={tile.proxy_wallet}
              x={tile.x + (tile.both_sides ? 1 : 0)}
              y={tile.y + (tile.both_sides ? 1 : 0)}
              width={Math.max(0, tile.w - 1 - (tile.both_sides ? 2 : 0))}
              height={Math.max(0, tile.h - 1 - (tile.both_sides ? 2 : 0))}
              rx={2}
              fill={fill}
              {...(tile.both_sides ? { stroke: "oklch(0.769 0.188 70.08)", strokeWidth: 1.5 } : {})}
            >
              <title>
                {tile.rest
                  ? `${(side.rows.length - MAP_TILES).toLocaleString()} more holders`
                  : `${tile.name} · ${Math.round(tile.amount).toLocaleString()} shares${tile.new_wallet ? ` · new wallet, ${tile.age_days}d old` : ""}`}
              </title>
            </rect>
          );
        })}
        {tiles.map((tile) =>
          tile.new_wallet && tile.w > 8 && tile.h > 8 ? (
            <circle key={`new-${tile.proxy_wallet}`} cx={tile.x + tile.w - 5} cy={tile.y + 4.5} r={2.5} fill={NEW_DOT} stroke="white" strokeWidth={0.75} />
          ) : null,
        )}
      </svg>
    </figure>
  );
}

function TraderRow({ trader, index, outcomes }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-4 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground">{index + 1}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-foreground">{trader.label}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1">
          {trader.sides.map((side) => {
            const tone = SIDE_TONES[Math.max(0, outcomes.indexOf(side.outcome))];
            return (
              <span key={side.outcome} className={cn("rounded px-1.5 py-px text-[10px] font-semibold", tone.chip, tone.text)}>
                {side.outcome} #{side.rank}
              </span>
            );
          })}
          {trader.both ? (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-px text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              <ArrowLeftRight className="size-3" aria-hidden />
              Both sides
            </span>
          ) : null}
          {trader.isNew ? (
            <span className="inline-flex items-center gap-1 rounded bg-violet-500/15 px-1.5 py-px text-[10px] font-semibold text-violet-700 dark:text-violet-300">
              <Sprout className="size-3" aria-hidden />
              New wallet{trader.ageDays != null ? ` · ${trader.ageDays}d` : ""}
            </span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">{formatUsd(trader.value)}</span>
    </li>
  );
}

function HolderPreview({ holders, holdersStatus, holdersError, traders, outcomes }) {
  if (holdersStatus === "error") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-background p-4 text-[13px] text-foreground shadow-sm">
        <CircleAlert className="mt-px size-4 shrink-0 text-destructive" aria-hidden />
        {holdersError || "Couldn't load this market's holders."}
      </div>
    );
  }
  if (holdersStatus !== "ready" || !holders) {
    return (
      <div className="space-y-3" aria-label="Loading holders">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-[150px] rounded-xl bg-black/[0.06] dark:bg-white/[0.08]" />
          <Skeleton className="h-[150px] rounded-xl bg-black/[0.06] dark:bg-white/[0.08]" />
        </div>
        <Skeleton className="h-[220px] rounded-xl bg-black/[0.06] dark:bg-white/[0.08]" />
      </div>
    );
  }
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-2 gap-2">
        {holders.sides.map((side, index) => (
          <MiniHolderMap key={side.outcome} side={side} index={index} />
        ))}
      </div>
      <section className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
        <header className="border-b border-border/50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Top {traders.length} holders · one tab each
          </p>
          {holders.bothCount ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {holders.bothCount.toLocaleString()} of the listed wallets hold both sides.
            </p>
          ) : null}
          {holders.newCount ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {holders.newCount.toLocaleString()} {holders.newCount === 1 ? "wallet was" : "wallets were"} set up in the last 30 days.
            </p>
          ) : null}
          {holders.skipped?.length ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {holders.skipped.length === 1
                ? `Skipped ${holders.skipped[0].label}, a Polymarket contract that holds shares but doesn't trade.`
                : `Skipped ${holders.skipped.length} Polymarket contracts (${holders.skipped.map((trader) => trader.label).join(", ")}) that hold shares but don't trade.`}
            </p>
          ) : null}
        </header>
        {traders.length ? (
          <ol className="divide-y divide-border/50">
            {traders.map((trader, index) => (
              <TraderRow key={trader.wallet} trader={trader} index={index} outcomes={outcomes} />
            ))}
          </ol>
        ) : (
          <p className="px-3 py-3 text-[13px] text-muted-foreground">Polymarket lists no holders for this market yet.</p>
        )}
      </section>
      <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
        Save and Go puts the Yes and No holders on this tab with a treemap under each, then opens a tab per trader with
        their positions, activity, and PnL.
      </p>
    </div>
  );
}

function HolderPane({ selected, meta, metaStatus, metaError, holders, holdersStatus, holdersError, traders }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#e6edf3] px-6 pb-6 pt-12 dark:bg-[#1c232b]">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <Users className="size-4 text-muted-foreground" aria-hidden />
        Holders
      </div>
      {!selected ? (
        <p className="mt-3 text-[13px] leading-relaxed text-foreground">
          Pick a market to see who holds each side, how concentrated it is, and the {TOP_TRADER_COUNT} biggest traders
          Lychee will open tabs for.
        </p>
      ) : metaStatus === "error" ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/70 bg-background p-4 text-[13px] text-foreground shadow-sm">
          <CircleAlert className="mt-px size-4 shrink-0 text-destructive" aria-hidden />
          {metaError || "Couldn't load this market."}
        </div>
      ) : metaStatus !== "ready" || !meta ? (
        <MarketCardSkeleton selected={selected} />
      ) : (
        <div key={meta.conditionId} className="mt-4 space-y-3">
          <MarketStatsCard meta={meta} compact />
          <HolderPreview
            holders={holders}
            holdersStatus={holdersStatus}
            holdersError={holdersError}
            traders={traders}
            outcomes={holders?.sides.map((side) => side.outcome) || []}
          />
        </div>
      )}
    </div>
  );
}

export function PolymarketHolderAnalysisRecipe({ onBack, Title = "h2", Description = "p" }) {
  const connect = useIntegrationConnect();
  const canvas = useWorkspaceCanvas();
  const ctx = useMyStateV2();
  const user = useUser();
  const picker = usePolymarketMarketPicker();
  const { selected, meta, metaStatus, metaError } = picker;
  const [holders, setHolders] = useState(null);
  const [holdersStatus, setHoldersStatus] = useState("idle");
  const [holdersError, setHoldersError] = useState("");

  useEffect(() => {
    setHolders(null);
    setHoldersError("");
    if (metaStatus !== "ready" || !meta) {
      setHoldersStatus("idle");
      return undefined;
    }
    const controller = new AbortController();
    setHoldersStatus("loading");
    pullMarketHolders(meta, { pages: 1, signal: controller.signal })
      .then(async (pulled) => {
        const screened = await screenTopTraders(topHolderTraders(pulled.sides, TRADER_CANDIDATES), { signal: controller.signal });
        if (controller.signal.aborted) return;
        setHolders({ ...pulled, pages: 1, traders: screened.traders, skipped: screened.skipped });
        setHoldersStatus("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setHoldersError(err?.message || "Couldn't load this market's holders.");
        setHoldersStatus("error");
      });
    return () => controller.abort();
  }, [meta, metaStatus]);

  const traders = holders?.traders || NO_TRADERS;
  const ready = metaStatus === "ready" && meta && holdersStatus === "ready" && traders.length > 0 && canvas;
  const go = () => {
    if (!ready) return;
    void runPolymarketHolderAnalysis({
      meta,
      holders,
      traders,
      contracts: holders.skipped || [],
      canvas,
      ctx,
      close: () => connect?.close?.(),
      accountId: user?.userId || "",
    });
  };

  return (
    <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <MarketSearchColumn
        picker={picker}
        heading="Polymarket Holder Analysis"
        examples={EXAMPLES}
        onBack={onBack}
        Title={Title}
        Description={Description}
        ready={!!ready}
        onGo={go}
      />
      <HolderPane
        selected={selected}
        meta={meta}
        metaStatus={metaStatus}
        metaError={metaError}
        holders={holders}
        holdersStatus={holdersStatus}
        holdersError={holdersError}
        traders={traders}
      />
    </div>
  );
}
