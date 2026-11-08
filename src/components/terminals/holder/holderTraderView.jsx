"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BadgeCheck, Loader2 } from "lucide-react";
import { DashboardSheetGrid } from "@/components/dashboardComposer/dashboardSheetGrid";
import { formatUsd, Stat } from "@/components/dashboardComposer/recipes/polymarketMarketSearch";
import { Skeleton } from "@/components/ui/skeleton";
import { retryImport } from "@/lib/retryImport";
import { TRADER_ACTIVITY_ENDPOINT_ID } from "@/lib/polymarketLive/traderActivityCompose";
import { TRADER_PNL_ENDPOINT_ID } from "@/lib/polymarketLive/traderPnlCompose";
import { LiveDot } from "./holderMarketView";
import { sheetChartBlock, traderSheet } from "./holderTerminalSheets";
import { useLiveTrader } from "./useLiveTrader";

const SheetBlockChart = dynamic(
  () => retryImport(() => import("@/components/dashboardComposer/sheetBlockChart")).then((m) => m.SheetBlockChart),
  { ssr: false },
);

function num(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function signedUsd(value) {
  if (value == null) return "—";
  return `${value < 0 ? "-" : value > 0 ? "+" : ""}${formatUsd(Math.abs(value))}`;
}

function joinedDay(row) {
  const raw = row.createdAt || row.join_date;
  const n = Number(raw);
  const ms = Number.isFinite(n) && n > 0 ? (n < 1e12 ? n * 1000 : n) : Date.parse(String(raw || ""));
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—";
}

function shortWallet(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function TraderStatsCard({ subject, part }) {
  const row = part.rows[0] || {};
  const name = row.name || row.pseudonym || subject.title || shortWallet(subject.address);
  if (part.status === "loading") {
    return (
      <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
        <div className="border-b border-border/50 px-4 py-3">
          <p className="text-[15px] font-semibold text-foreground">{name}</p>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{subject.address}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-[66px] rounded-lg bg-black/[0.06] dark:bg-white/[0.08]" />
          ))}
        </div>
      </div>
    );
  }
  const realized = num(row.realized_pnl);
  const unrealized = num(row.unrealized_pnl);
  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <header className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        {row.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.profileImage} alt="" className="size-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="size-10 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-violet-500" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[15px] font-semibold leading-snug text-foreground">
            <span className="truncate">{name}</span>
            {row.verifiedBadge === true || row.verifiedBadge === "true" ? <BadgeCheck className="size-4 shrink-0 text-sky-500" aria-label="Verified" /> : null}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {subject.address}
            {row.xUsername ? <span className="font-sans"> · @{row.xUsername}</span> : null}
          </p>
        </div>
      </header>
      {part.status === "error" ? (
        <p className="px-4 py-4 text-[12px] text-muted-foreground">{part.error}</p>
      ) : (
        <dl className="grid grid-cols-2 gap-2 p-3">
          <Stat label="Portfolio" value={formatUsd(num(row.portfolio_value))} detail="Open positions" />
          <Stat label="Realized PnL" value={signedUsd(realized)} detail={unrealized == null ? "All time" : `${signedUsd(unrealized)} unrealized`} />
          <Stat label="Volume" value={formatUsd(num(row.volume_usdc ?? row.volume))} detail="USDC traded" />
          <Stat label="Trades" value={num(row.trades ?? row.trade_count)?.toLocaleString() ?? "—"} detail="All time" />
          <Stat label="Biggest win" value={formatUsd(num(row.biggest_win))} detail="One market" />
          <Stat label="Joined" value={joinedDay(row)} detail={num(row.views) != null ? `${num(row.views).toLocaleString()} profile views` : ""} />
        </dl>
      )}
    </article>
  );
}

function PanelState({ part, empty }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 px-4 text-center text-[12px] text-muted-foreground">
      {part.status === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {part.status === "loading" ? "Loading" : part.status === "error" ? part.error : empty}
    </div>
  );
}

/** One trader: live profile stats, PnL over time and their trades as they happen. */
export function HolderTraderView({ subject, onProfileName }) {
  const { profile, activity, pnl } = useLiveTrader(subject.address);
  const profileName = String(profile.rows[0]?.name || profile.rows[0]?.pseudonym || "").trim();
  useEffect(() => {
    if (profileName && !subject.title && !/^0x[a-fA-F0-9]{40}/.test(profileName)) onProfileName?.(profileName);
  }, [onProfileName, profileName, subject.title]);
  const [widths, setWidths] = useState({});
  const pnlSheet = useMemo(() => traderSheet(TRADER_PNL_ENDPOINT_ID, pnl, subject), [pnl, subject]);
  const pnlChart = useMemo(() => sheetChartBlock(pnlSheet), [pnlSheet]);
  const activitySheet = useMemo(() => traderSheet(TRADER_ACTIVITY_ENDPOINT_ID, activity, subject), [activity, subject]);
  const gridBlock = useMemo(
    () => ({
      ...activitySheet,
      columns: activitySheet.columns.map((column) => (widths[column.id] ? { ...column, width: widths[column.id] } : column)),
    }),
    [activitySheet, widths],
  );
  const updated = activity.updatedAt ? new Date(activity.updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "";

  return (
    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <LiveDot on={activity.status === "ready"} label={activity.status === "ready" ? "Live" : "Connecting"} />
            {updated ? <span className="text-[11px] text-muted-foreground">Checked {updated}</span> : null}
          </div>
          <TraderStatsCard subject={subject} part={profile} />
        </div>
        <section
          aria-label="PnL chart"
          data-block-type={pnlChart.type}
          data-source-sheet={pnlChart.sourceSheetId}
          className="flex h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-3 shadow-sm"
        >
          {pnl.rows.length ? <SheetBlockChart sheet={pnlSheet} view={pnlChart.chartView} /> : <PanelState part={pnl} empty="No PnL history for this wallet yet." />}
        </section>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-foreground">Trades</p>
        <span className="text-[12px] text-muted-foreground">
          {activity.rows.length ? `${activity.rows.length.toLocaleString()} trades · newest first · checks every 10s` : ""}
        </span>
      </div>
      <section
        aria-label="Trader trades"
        data-block-type={activitySheet.type}
        className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
      >
        {activity.rows.length ? (
          <DashboardSheetGrid
            block={gridBlock}
            readOnly
            onChange={(patch) => {
              if (!patch?.columns) return;
              setWidths(Object.fromEntries(patch.columns.filter((column) => column.id).map((column) => [column.id, column.width])));
            }}
          />
        ) : (
          <PanelState part={activity} empty="No trades for this wallet yet." />
        )}
      </section>
    </div>
  );
}
