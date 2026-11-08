"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BadgeCheck, Loader2 } from "lucide-react";
import { formatUsd, Stat } from "@/components/dashboardComposer/recipes/polymarketMarketSearch";
import { Skeleton } from "@/components/ui/skeleton";
import { retryImport } from "@/lib/retryImport";
import { TRADER_PNL_ENDPOINT_ID } from "@/lib/polymarketLive/traderPnlCompose";
import { cn } from "@/lib/utils";
import { scoreTitle } from "./holderHoldersTable";
import { LiveDot } from "./holderMarketView";
import { sheetChartBlock, traderSheet } from "./holderTerminalSheets";
import { SCORE_TIERS, SKILL_SCORE_NAME, loadTraderScore, scoreTier } from "./traderScore";
import { arrivalKey } from "./holderTradesTable";
import { FinishedBetsSummary, FinishedBetsTable, finishedBetList, useFinishedBets } from "./traderFinishedBets";
import { TraderMarketFocus } from "./traderMarketFocus";
import { TraderPnlByQuestion } from "./traderPnlByQuestion";
import { TraderPositionsTable, useTraderPositions } from "./traderPositionsTable";
import { TradeAlertsToggle, useTraderTradeAlerts } from "./traderTradeAlerts";
import { TraderTradesTable, tradeTime } from "./traderTradesTable";
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

/** The wallet's Lychee Skill Score across every market it has finished. */
function useSkillScore(address) {
  const wallet = String(address || "").toLowerCase();
  const [state, setState] = useState({ wallet: "", status: "loading", score: null });
  useEffect(() => {
    if (!wallet) return undefined;
    let alive = true;
    loadTraderScore(wallet, "").then(
      (score) => alive && setState({ wallet, status: "ready", score }),
      () => alive && setState({ wallet, status: "error", score: null }),
    );
    return () => {
      alive = false;
    };
  }, [wallet]);
  return state.wallet === wallet ? state : { wallet, status: "loading", score: null };
}

/** The gauge spans ±GAUGE_SPAN; scores past it pin to the ends. */
const GAUGE_SPAN = 30;
const GAUGE_TIERS = [...SCORE_TIERS].reverse();

function SkillScorePanel({ skill }) {
  const score = skill.score;
  const tier = score ? scoreTier(score.score) : null;
  const at = score ? ((Math.max(-GAUGE_SPAN, Math.min(GAUGE_SPAN, score.score)) + GAUGE_SPAN) / (2 * GAUGE_SPAN)) * 100 : null;
  return (
    <section aria-label={SKILL_SCORE_NAME} className="border-t border-border/50 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-muted-foreground" title="How surprising this trader's results are if every price they paid was fair. −100 to 100; ±20 is a two-sigma outlier.">
          {SKILL_SCORE_NAME}
        </p>
        {skill.status === "loading" ? (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Scoring
          </span>
        ) : null}
      </div>
      {skill.status === "loading" ? (
        <Skeleton className="mt-2 h-[58px] rounded-lg bg-black/[0.06] dark:bg-white/[0.08]" />
      ) : skill.status === "error" ? (
        <p className="mt-1 text-[12px] text-muted-foreground">Couldn&apos;t load this wallet&apos;s finished markets to score.</p>
      ) : !score ? (
        <p className="mt-1 text-[12px] text-muted-foreground">New: no finished markets yet, so there&apos;s nothing to score.</p>
      ) : (
        <>
          <div className="mt-0.5 flex items-center gap-2.5" title={scoreTitle(score)}>
            <span className={cn("shrink-0 font-mono text-[26px] font-semibold tabular-nums tracking-tight", tier.tone)}>
              {score.score > 0 ? "+" : ""}
              {score.score.toFixed(1)}
            </span>
            <span className="min-w-0 text-[12px] leading-snug text-muted-foreground">{tier.label}</span>
          </div>
          <div className="relative mt-2">
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              {GAUGE_TIERS.map((band) => (
                <span key={band.min} className="flex-1 opacity-70" style={{ backgroundColor: band.fill }} />
              ))}
            </div>
            <span
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow"
              style={{ left: `${at}%`, backgroundColor: tier.fill }}
              aria-hidden
            />
          </div>
          <div className="mt-1 flex justify-between text-[10.5px] text-muted-foreground" aria-hidden>
            <span>Poor</span>
            <span>Typical</span>
            <span>Proven</span>
          </div>
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">
            {score.positions.toLocaleString()} {score.recentOnly ? "most recent " : ""}finished positions · {Math.round(score.effectiveBets).toLocaleString()} effective bets ·{" "}
            {Math.round(score.winRate * 100)}% won · {score.edge >= 0 ? "+" : "−"}
            {Math.abs(score.edge * 100).toFixed(1)}¢ per share
          </p>
        </>
      )}
    </section>
  );
}

/** Polymarket names accounts that never picked a username after their wallet, sometimes with a timestamp. */
function chosenName(value) {
  const name = String(value || "").trim();
  return name && !/^0x[a-fA-F0-9]{40}(-\d+)?$/.test(name) ? name : "";
}

function TraderHandles({ row, address }) {
  const username = chosenName(row.name);
  const x = String(row.xUsername || "").trim().replace(/^@/, "");
  const link = "font-medium text-foreground hover:underline";
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
      <a href={`https://polymarket.com/profile/${address}`} target="_blank" rel="noopener noreferrer" className={link} title="Open the Polymarket profile">
        {username ? `@${username}` : "Polymarket profile"}
      </a>
      {!username ? <span title="This account never picked a username, so Polymarket shows a generated name">· no username set</span> : null}
      {x ? (
        <>
          <span aria-hidden>·</span>
          <a href={`https://x.com/${x}`} target="_blank" rel="noopener noreferrer" className={link} title="Open their X profile">
            @{x} on X
          </a>
        </>
      ) : null}
    </p>
  );
}

function TraderStatsCard({ subject, part, skill }) {
  const row = part.rows[0] || {};
  const name = chosenName(row.name) || row.pseudonym || chosenName(subject.title) || shortWallet(subject.address);
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
        <SkillScorePanel skill={skill} />
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
          <TraderHandles row={row} address={subject.address} />
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground" title={subject.address}>
            {subject.address}
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
      <SkillScorePanel skill={skill} />
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

/**
 * One trader: live profile stats, PnL over time and their trades as they happen, with an alert
 * when they place a new one. `onPickMarket(subject)` opens a market from the trades table.
 */
export function HolderTraderView({ subject, onProfileName, onPickMarket }) {
  const { profile, activity, pnl } = useLiveTrader(subject.address);
  const skill = useSkillScore(subject.address);
  const lastTradeKey = activity.rows[0] ? arrivalKey(activity.rows[0]) : "";
  const positions = useTraderPositions(subject.address, lastTradeKey);
  const finishedPart = useFinishedBets(subject.address, lastTradeKey);
  const finishedBets = useMemo(
    () => finishedBetList(finishedPart.rows, positions.rows, finishedPart.done),
    [finishedPart.rows, finishedPart.done, positions.rows],
  );
  const positionsUpdated = positions.updatedAt
    ? new Date(positions.updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })
    : "";
  const profileName = chosenName(profile.rows[0]?.name) || String(profile.rows[0]?.pseudonym || "").trim();
  useEffect(() => {
    if (profileName && !subject.title) onProfileName?.(profileName);
  }, [onProfileName, profileName, subject.title]);
  const pnlSheet = useMemo(() => traderSheet(TRADER_PNL_ENDPOINT_ID, pnl, subject), [pnl, subject]);
  const pnlChart = useMemo(() => sheetChartBlock(pnlSheet), [pnlSheet]);
  const updated = activity.updatedAt ? new Date(activity.updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "";
  const tradesRef = useRef(null);
  const displayName = chosenName(subject.title) || profileName || shortWallet(subject.address);
  const alerts = useTraderTradeAlerts({
    rows: activity.rows,
    ready: activity.status === "ready",
    name: displayName,
    address: subject.address,
    viewRef: tradesRef,
    onView: () => tradesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
  });

  return (
    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <LiveDot on={activity.status === "ready"} label={activity.status === "ready" ? "Live" : "Connecting"} />
            {updated ? <span className="text-[11px] text-muted-foreground">Checked {updated}</span> : null}
          </div>
          <TraderStatsCard subject={subject} part={profile} skill={skill} />
        </div>
        {/* Out of flow on wide screens so the chart takes the stats column's height instead of setting it. */}
        <div className="relative h-[420px] min-w-0 lg:h-auto lg:min-h-[420px]">
          <section
            aria-label="PnL chart"
            data-block-type={pnlChart.type}
            data-source-sheet={pnlChart.sourceSheetId}
            className="absolute inset-0 flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-3 shadow-sm"
          >
            {pnl.rows.length ? <SheetBlockChart sheet={pnlSheet} view={pnlChart.chartView} /> : <PanelState part={pnl} empty="No PnL history for this wallet yet." />}
          </section>
        </div>
      </div>

      <div ref={tradesRef} className="flex scroll-mt-4 items-end justify-between gap-3 pt-4">
        <div className="max-w-3xl">
          <h3 className="text-[15px] font-semibold text-foreground">Trades</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Every trade this wallet has made, newest first, checked every 10 seconds. New trades slide in at the top and raise an
            alert while you&apos;re on this tab. Click a column to sort by it, or pick a market to open it in the terminal.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {activity.rows.length ? (
            <span className="text-[12px] tabular-nums text-muted-foreground">
              {activity.rows.length.toLocaleString()} trades
              {activity.rows[0]?.timestamp ? ` · last ${tradeTime(activity.rows[0])}` : ""}
            </span>
          ) : null}
          <TradeAlertsToggle paused={alerts.paused} onChange={alerts.setPaused} />
        </div>
      </div>
      <section aria-label="Trader trades" className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
        {activity.rows.length ? (
          <TraderTradesTable rows={activity.rows} ready={activity.status === "ready"} empty="No trades for this wallet yet." onPickMarket={onPickMarket} />
        ) : (
          <PanelState part={activity} empty="No trades for this wallet yet." />
        )}
      </section>

      <div className="flex items-end justify-between gap-3 pt-4">
        <div className="max-w-3xl">
          <h3 className="text-[15px] font-semibold text-foreground">Active positions</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Everything this wallet holds in markets still trading, biggest first. Prices and PnL refresh every 20 seconds, and
            again right after each new trade.
          </p>
        </div>
        {positionsUpdated ? <span className="shrink-0 text-[11px] text-muted-foreground">Checked {positionsUpdated}</span> : null}
      </div>
      <section aria-label="Active positions" className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
        {positions.status === "ready" ? (
          <TraderPositionsTable part={positions} onPickMarket={onPickMarket} />
        ) : (
          <PanelState part={positions} empty="No open positions right now." />
        )}
      </section>

      <div className="max-w-3xl pt-4">
        <h3 className="text-[15px] font-semibold text-foreground">Finished bets</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Bets this wallet is done with: sold out of, or the market resolved. An amber dot marks resolved winnings not yet
          redeemed. The PnL above covers every bet loaded below, and older bets load as you scroll.
        </p>
      </div>
      {finishedPart.status === "ready" ? (
        <>
          <FinishedBetsSummary bets={finishedBets} done={finishedPart.done} onPickMarket={onPickMarket} />
          <section aria-label="Finished bets" className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
            <FinishedBetsTable bets={finishedBets} part={finishedPart} onPickMarket={onPickMarket} />
          </section>
        </>
      ) : (
        <section aria-label="Finished bets" className="flex h-40 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
          <PanelState part={finishedPart} empty="No finished bets yet." />
        </section>
      )}

      <div className="max-w-3xl pt-4">
        <h3 className="text-[15px] font-semibold text-foreground">PnL by question</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Which questions made this wallet its money and which lost it. Each question nets every outcome traded in it, across
          the finished bets loaded above and the open positions at their current prices. The biggest five get their own slice;
          the rest share Other. Dots show the outcomes held.
        </p>
      </div>
      {finishedPart.status === "ready" && positions.status === "ready" ? (
        <TraderPnlByQuestion bets={finishedBets} openRows={positions.rows} onPickMarket={onPickMarket} />
      ) : (
        <section aria-label="PnL by question" className="flex h-40 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
          <PanelState part={finishedPart.status === "ready" ? positions : finishedPart} empty="No bets yet." />
        </section>
      )}

      <div className="max-w-3xl pt-4">
        <h3 className="text-[15px] font-semibold text-foreground">Market specific</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Pick any market this wallet has traded. Its price is charted for both outcomes, with a dot for every move this wallet
          made there: filled for buys, hollow for sells, bigger for more money. Hover a dot for the details, or click it to pin
          them. New moves pulse in as they happen and the price follows the market live.
          {subject.fromMarket ? " It opens on the market you found this trader from." : ""}
        </p>
      </div>
      <TraderMarketFocus
        address={subject.address}
        fromMarket={subject.fromMarket}
        trades={activity.rows}
        positions={positions.rows}
        bets={finishedBets}
        lastTrade={activity.rows[0]}
        onPickMarket={onPickMarket}
      />
    </div>
  );
}
