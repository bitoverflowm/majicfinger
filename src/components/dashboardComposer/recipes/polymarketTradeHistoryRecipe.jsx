"use client";

import { useMemo } from "react";
import { Check, CircleAlert, TrendingUp } from "lucide-react";
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useUser } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { MarketCardSkeleton, MarketSearchColumn, MarketStatsCard, usePolymarketMarketPicker } from "./polymarketMarketSearch";
import { describePlan, formatDay, planTradeSources, POLYMARKET_LAKE_END_MS, SOURCE_LABELS } from "./polymarketTradeHistorySource";
import { runPolymarketTradeHistory } from "./polymarketTradeHistoryRun";

const EXAMPLES = ["Bitcoin price", "Fed decision", "NYC mayor", "Presidential election 2024"];

function SourceCard({ plan }) {
  const route = describePlan(plan);
  return (
    <section className="rounded-xl border border-border/70 bg-background p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 [animation-delay:80ms] fill-mode-both">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Trade history source</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {plan.sources.map((source, index) => (
          <span
            key={source}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              index === 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
            )}
          >
            {index === 0 ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
            {SOURCE_LABELS[source]}
            {index > 0 ? (plan.kind === "live+historical" ? " for older trades" : " as fallback") : null}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{route.detail}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        Pulls the market&apos;s full trade history, with the outcome, side, price and size on every row.
      </p>
    </section>
  );
}

function SourceLegend() {
  const cutoff = formatDay(POLYMARKET_LAKE_END_MS);
  const rows = [
    [SOURCE_LABELS.polymarket, `Markets that opened on or after ${cutoff}`],
    [SOURCE_LABELS.polymarketHistorical, "Markets that closed between Polymarket's launch and Dec 2025"],
    [`${SOURCE_LABELS.polymarket} + Historical`, `Markets that span ${cutoff}: Live for newer trades, Historical for older ones`],
  ];
  return (
    <section className="mt-5 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Where trades come from</p>
      <ul className="mt-2 space-y-2.5">
        {rows.map(([label, detail]) => (
          <li key={label} className="text-[12px] leading-relaxed">
            <span className="font-medium text-foreground">{label}</span>
            <span className="block text-muted-foreground">{detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MarketPane({ selected, meta, metaStatus, metaError, plan }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#e6edf3] px-6 pb-6 pt-12 dark:bg-[#1c232b]">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
        Market details
      </div>
      {!selected ? (
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-foreground">
            Pick a market to see its stats and where Lychee will pull its trades from.
          </p>
          <SourceLegend />
        </>
      ) : metaStatus === "error" ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/70 bg-background p-4 text-[13px] text-foreground shadow-sm">
          <CircleAlert className="mt-px size-4 shrink-0 text-destructive" aria-hidden />
          {metaError || "Couldn't load this market."}
        </div>
      ) : metaStatus !== "ready" || !meta ? (
        <MarketCardSkeleton selected={selected} />
      ) : (
        <div key={meta.conditionId} className="mt-4 space-y-3">
          <MarketStatsCard meta={meta} />
          {plan ? <SourceCard plan={plan} /> : null}
        </div>
      )}
    </div>
  );
}

export function PolymarketTradeHistoryRecipe({ onBack, Title = "h2", Description = "p" }) {
  const connect = useIntegrationConnect();
  const canvas = useWorkspaceCanvas();
  const user = useUser();
  const picker = usePolymarketMarketPicker();
  const { selected, meta, metaStatus, metaError } = picker;
  const plan = useMemo(() => (meta ? planTradeSources(meta) : null), [meta]);

  const ready = metaStatus === "ready" && meta && plan && canvas;
  const go = () => {
    if (!ready) return;
    void runPolymarketTradeHistory({
      meta,
      plan,
      canvas,
      close: () => connect?.close?.(),
      accountId: user?.userId || "",
    });
  };

  return (
    <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <MarketSearchColumn
        picker={picker}
        heading="Download Polymarket Trade History"
        examples={EXAMPLES}
        onBack={onBack}
        Title={Title}
        Description={Description}
        ready={!!ready}
        onGo={go}
      />
      <MarketPane selected={selected} meta={meta} metaStatus={metaStatus} metaError={metaError} plan={plan} />
    </div>
  );
}
