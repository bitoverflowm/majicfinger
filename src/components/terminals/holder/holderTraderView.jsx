"use client";

import dynamic from "next/dynamic";
import { BadgeCheck, Loader2 } from "lucide-react";
import { formatUsd, Stat } from "@/components/dashboardComposer/recipes/polymarketMarketSearch";
import { Skeleton } from "@/components/ui/skeleton";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import { TerminalPanelFrame, usePanelFill } from "../terminalPanelFrame";
import { scoreTitle } from "./holderHoldersTable";
import { chosenName, clockTime, shortWallet, useHolderSession } from "./holderSession";
import { LiveDot } from "./liveDot";
import { SCORE_TIERS, SKILL_SCORE_NAME, scoreTier } from "./traderScore";
import { FinishedBetsSummary, FinishedBetsTable } from "./traderFinishedBets";
import { TraderMarketFocus } from "./traderMarketFocus";
import { CATEGORY_TABLE_DETAIL, CategoryChart, CategoryTable, HoldingEdge, PeriodChart } from "./traderPnlBreakdown";
import { TraderPnlByQuestion } from "./traderPnlByQuestion";
import { TraderPositionsTable } from "./traderPositionsTable";
import { TradeAlertsToggle } from "./traderTradeAlerts";
import { TraderTradesTable, tradeTime } from "./traderTradesTable";

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
      <div>
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
    <article className="animate-in fade-in duration-300">
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

function PanelState({ part, empty, className }) {
  return (
    <div className={cn("flex h-full min-h-40 items-center justify-center gap-2 px-4 text-center text-[12px] text-muted-foreground", className)}>
      {part.status === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {part.status === "loading" ? "Loading" : part.status === "error" ? part.error : empty}
    </div>
  );
}

export function TraderStatsPanel() {
  const { subject, profile, skill, activity } = useHolderSession();
  const updated = clockTime(activity.updatedAt);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pr-9">
        <LiveDot on={activity.status === "ready"} label={activity.status === "ready" ? "Live" : "Connecting"} />
        {updated ? <span className="text-[11px] text-muted-foreground">Checked {updated}</span> : null}
      </div>
      <TraderStatsCard subject={subject} part={profile} skill={skill} />
    </div>
  );
}

export function TraderPnlChartPanel() {
  const { pnl, pnlSheet, pnlChart } = useHolderSession();
  const fill = usePanelFill("h-[440px]");
  return (
    <section
      aria-label="PnL chart"
      data-block-type={pnlChart.type}
      data-source-sheet={pnlChart.sourceSheetId}
      className={cn("flex min-w-0 flex-col p-3 pr-8", fill)}
    >
      {pnl.rows.length ? <SheetBlockChart sheet={pnlSheet} view={pnlChart.chartView} /> : <PanelState part={pnl} empty="No PnL history for this wallet yet." />}
    </section>
  );
}

export function TraderTradesPanel() {
  const { activity, alerts, actions } = useHolderSession();
  const fill = usePanelFill("h-[560px]");
  return (
    <TerminalPanelFrame
      title="Trades"
      description="Every trade this wallet has made, newest first, checked every 10 seconds. New trades slide in at the top and raise an alert while you're on this tab. Click a column to sort by it, or pick a market to open it in the terminal."
      aside={
        <>
          {activity.rows.length ? (
            <span className="text-[12px] tabular-nums text-muted-foreground">
              {activity.rows.length.toLocaleString()} trades
              {activity.rows[0]?.timestamp ? ` · last ${tradeTime(activity.rows[0])}` : ""}
            </span>
          ) : null}
          <TradeAlertsToggle paused={alerts.paused} onChange={alerts.setPaused} />
        </>
      }
      flush
    >
      <section aria-label="Trader trades" className={cn("flex flex-col overflow-hidden border-t border-border/60", fill)}>
        {activity.rows.length ? (
          <TraderTradesTable rows={activity.rows} ready={activity.status === "ready"} empty="No trades for this wallet yet." onPickMarket={actions?.pickMarket} />
        ) : (
          <PanelState part={activity} empty="No trades for this wallet yet." />
        )}
      </section>
    </TerminalPanelFrame>
  );
}

export function TraderPositionsPanel() {
  const { positions, actions } = useHolderSession();
  const fill = usePanelFill("h-[520px]");
  const checked = clockTime(positions.updatedAt);
  return (
    <TerminalPanelFrame
      title="Active positions"
      description="Everything this wallet holds in markets still trading, biggest first. Prices and PnL refresh every 20 seconds, and again right after each new trade."
      aside={checked ? <span className="text-[11px] text-muted-foreground">Checked {checked}</span> : null}
      flush
    >
      <section aria-label="Active positions" className={cn("flex flex-col overflow-hidden border-t border-border/60", fill)}>
        {positions.status === "ready" ? (
          <TraderPositionsTable part={positions} onPickMarket={actions?.pickMarket} />
        ) : (
          <PanelState part={positions} empty="No open positions right now." />
        )}
      </section>
    </TerminalPanelFrame>
  );
}

export function TraderFinishedPanel() {
  const { finishedPart, finishedBets, actions } = useHolderSession();
  const fill = usePanelFill("h-[560px]");
  return (
    <TerminalPanelFrame
      title="Finished bets"
      description="Bets this wallet is done with: sold out of, or the market resolved. An amber dot marks resolved winnings not yet redeemed. The PnL here covers every bet loaded in the table, and older bets load as you scroll."
    >
      {finishedPart.status === "ready" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <FinishedBetsSummary bets={finishedBets} done={finishedPart.done} onPickMarket={actions?.pickMarket} />
          <section aria-label="Finished bets" className={cn("flex flex-col overflow-hidden rounded-lg border border-border/60", fill)}>
            <FinishedBetsTable bets={finishedBets} part={finishedPart} onPickMarket={actions?.pickMarket} />
          </section>
        </div>
      ) : (
        <PanelState part={finishedPart} empty="No finished bets yet." />
      )}
    </TerminalPanelFrame>
  );
}

export function TraderPnlQuestionPanel() {
  const { finishedPart, finishedBets, positions, actions } = useHolderSession();
  return (
    <TerminalPanelFrame
      title="PnL by question"
      description="Which questions made this wallet its money and which lost it. Each question nets every outcome traded in it, across the finished bets loaded and the open positions at their current prices. The biggest five get their own slice; the rest share Other. Dots show the outcomes held."
    >
      {finishedPart.status === "ready" && positions.status === "ready" ? (
        <TraderPnlByQuestion bets={finishedBets} openRows={positions.rows} onPickMarket={actions?.pickMarket} />
      ) : (
        <PanelState part={finishedPart.status === "ready" ? positions : finishedPart} empty="No bets yet." />
      )}
    </TerminalPanelFrame>
  );
}

function useFinishedReady() {
  const session = useHolderSession();
  return session.finishedPart.status === "ready" ? null : <PanelState part={session.finishedPart} empty="No finished bets yet." />;
}

export function TraderCategoryChartPanel() {
  const { categories } = useHolderSession();
  const waiting = useFinishedReady();
  return waiting ? (
    <TerminalPanelFrame title="PnL by category">{waiting}</TerminalPanelFrame>
  ) : (
    <CategoryChart groups={categories.groups} pending={categories.pending} bare />
  );
}

export function TraderPeriodPanel() {
  const { finishedBets } = useHolderSession();
  const waiting = useFinishedReady();
  return waiting ? <TerminalPanelFrame title="PnL by day of week">{waiting}</TerminalPanelFrame> : <PeriodChart bets={finishedBets} bare />;
}

export function TraderCategoryTablePanel() {
  const { categories } = useHolderSession();
  const waiting = useFinishedReady();
  return (
    <TerminalPanelFrame title="By category and sub-category" description={CATEGORY_TABLE_DETAIL} flush>
      {waiting || <CategoryTable groups={categories.groups} pending={categories.pending} bare />}
    </TerminalPanelFrame>
  );
}

export function TraderHoldingEdgePanel() {
  const { finishedBets } = useHolderSession();
  const waiting = useFinishedReady();
  return waiting ? <TerminalPanelFrame title="Edge by holding duration">{waiting}</TerminalPanelFrame> : <HoldingEdge bets={finishedBets} bare />;
}

export function TraderMarketFocusPanel() {
  const { subject, activity, positions, finishedBets, actions } = useHolderSession();
  return (
    <TerminalPanelFrame
      title="Market specific"
      description={`Pick any market this wallet has traded. Its price is charted for both outcomes, with a dot for every move this wallet made there: filled for buys, hollow for sells, bigger for more money. Hover a dot for the details, or click it to pin them. New moves pulse in as they happen and the price follows the market live.${
        subject.fromMarket ? " It opens on the market you found this trader from." : ""
      }`}
    >
      <TraderMarketFocus
        address={subject.address}
        fromMarket={subject.fromMarket}
        trades={activity.rows}
        positions={positions.rows}
        bets={finishedBets}
        lastTrade={activity.rows[0]}
        onPickMarket={actions?.pickMarket}
      />
    </TerminalPanelFrame>
  );
}
