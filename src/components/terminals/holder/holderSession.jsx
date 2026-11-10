"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fillingFor } from "@/components/dashboardComposer/recipes/tradeSheetStream";
import { TRADER_PNL_ENDPOINT_ID } from "@/lib/polymarketLive/traderPnlCompose";
import { marketTradeSheet, sheetChartBlock, traderSheet } from "./holderTerminalSheets";
import { useHolderFlags } from "./holderHoldersTable";
import { arrivalKey } from "./holderTradesTable";
import { finishedBetList, useFinishedBets } from "./traderFinishedBets";
import { useCategoryGroups } from "./traderPnlBreakdown";
import { useTraderPositions } from "./traderPositionsTable";
import { loadTraderScore } from "./traderScore";
import { useTraderTradeAlerts } from "./traderTradeAlerts";
import { useHolderDetails } from "./useHolderDetails";
import { useHolderSupply } from "./useHolderSupply";
import { useLiveTrader } from "./useLiveTrader";
import { useMarketHolders } from "./useMarketHolders";
import { useFusedMarketTrades } from "./useFusedMarketTrades";
import { useLiveMarketMeta, useLiveMarketStats } from "./useLiveMarketMeta";
import { useMarketPriceHistory } from "./useMarketPriceHistory";

/**
 * What one Holder Terminal tab is looking at, loaded once and shared by every panel on it.
 * `actions` come from the host: `pick(subjects)`, `pickTrader({ address, title })`,
 * `pickMarket(subject)`, `nameSubject(title)` and, when there's a subject, `explore()`.
 */
export const HolderSessionContext = createContext(null);

export function useHolderSession() {
  return useContext(HolderSessionContext);
}

export function clockTime(ms) {
  return ms ? new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "";
}

/** Polymarket names accounts that never picked a username after their wallet, sometimes with a timestamp. */
export function chosenName(value) {
  const name = String(value || "").trim();
  return name && !/^0x[a-fA-F0-9]{40}(-\d+)?$/.test(name) ? name : "";
}

export function shortWallet(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Scrolls the canvas (or the terminal page) to a panel, if the user kept it. */
export function revealHolderPanel(panel) {
  const el = document.querySelector(`[data-terminal-panel="${panel}"]`);
  const block = el?.closest("[data-block-id]") || el;
  block?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function MarketSession({ subject, actions, children }) {
  const { meta, error, quotes } = useLiveMarketMeta(subject.conditionId);
  const { rows, streamRows, status } = useFusedMarketTrades(meta);
  const filling = status.phase === "history";
  const tradeRows = filling ? streamRows : rows;
  const stats = useLiveMarketStats(meta, quotes, rows);
  const priceHistory = useMarketPriceHistory(meta, stats?.prices);
  const priceChart = useMemo(() => (priceHistory.sheet ? sheetChartBlock(priceHistory.sheet) : null), [priceHistory.sheet]);
  const holders = useMarketHolders(meta, rows, stats?.prices);
  const holderDetails = useHolderDetails(meta?.conditionId || "", meta?.tokenIds);
  const holderFlags = useHolderFlags();
  const supply = useHolderSupply(meta, rows, stats?.prices, holders.sides);
  const [merged, setMerged] = useState(false);
  const sheet = useMemo(
    () =>
      meta
        ? marketTradeSheet(meta, tradeRows, {
            truncated: status.truncated,
            label: status.label,
            filling: filling ? fillingFor(meta, tradeRows.length) : null,
          })
        : null,
    [filling, meta, status.label, status.truncated, tradeRows],
  );
  const chart = useMemo(() => (sheet ? sheetChartBlock(sheet) : null), [sheet]);
  const live = status.socket === "open";
  const value = {
    view: "market",
    subject,
    actions,
    meta,
    error,
    stats,
    rows,
    tradeRows,
    status,
    sheet,
    chart,
    live,
    historyLoaded: status.phase === "live" && rows.length >= status.historyCount,
    priceHistory,
    priceChart,
    holders,
    holderDetails,
    holderFlags,
    supply,
    merged,
    setMerged,
    outcomes: [meta?.outcomes?.[0] || "Yes", meta?.outcomes?.[1] || "No"],
  };
  return <HolderSessionContext.Provider value={value}>{children}</HolderSessionContext.Provider>;
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

function TraderSession({ subject, actions, alertsOn = true, children }) {
  const { profile, activity, pnl } = useLiveTrader(subject.address);
  const skill = useSkillScore(subject.address);
  const lastTradeKey = activity.rows[0] ? arrivalKey(activity.rows[0]) : "";
  const positions = useTraderPositions(subject.address, lastTradeKey);
  const finishedPart = useFinishedBets(subject.address, lastTradeKey);
  const finishedBets = useMemo(
    () => finishedBetList(finishedPart.rows, positions.rows, finishedPart.done),
    [finishedPart.rows, finishedPart.done, positions.rows],
  );
  const categories = useCategoryGroups(finishedPart.status === "ready" ? finishedBets : null);
  const profileName = chosenName(profile.rows[0]?.name) || String(profile.rows[0]?.pseudonym || "").trim();
  const nameSubject = actions?.nameSubject;
  useEffect(() => {
    if (profileName && !subject.title) nameSubject?.(profileName);
  }, [nameSubject, profileName, subject.title]);
  const pnlSheet = useMemo(() => traderSheet(TRADER_PNL_ENDPOINT_ID, pnl, subject), [pnl, subject]);
  const pnlChart = useMemo(() => sheetChartBlock(pnlSheet), [pnlSheet]);
  const displayName = chosenName(subject.title) || profileName || shortWallet(subject.address);
  // On screen exactly while this tab is: alerts only interrupt someone looking at the trader.
  const onScreenRef = useRef(null);
  const alerts = useTraderTradeAlerts({
    rows: activity.rows,
    ready: activity.status === "ready",
    name: displayName,
    address: subject.address,
    viewRef: onScreenRef,
    onView: () => revealHolderPanel("trader.trades"),
  });
  const value = {
    view: "trader",
    subject,
    actions,
    profile,
    activity,
    pnl,
    skill,
    positions,
    finishedPart,
    finishedBets,
    categories,
    pnlSheet,
    pnlChart,
    displayName,
    alerts,
  };
  return (
    <HolderSessionContext.Provider value={value}>
      <span ref={onScreenRef} className="sr-only" hidden={!alertsOn} aria-hidden />
      {children}
    </HolderSessionContext.Provider>
  );
}

/** `alertsOn` (traders only) holds back new-trade alerts while false, e.g. off the step that shows trades. */
export function HolderSessionProvider({ subject, actions, alertsOn, children }) {
  const browse = useMemo(() => ({ view: "browse", subject: null, actions }), [actions]);
  if (subject?.kind === "market") {
    return (
      <MarketSession key={subject.conditionId} subject={subject} actions={actions}>
        {children}
      </MarketSession>
    );
  }
  if (subject?.kind === "trader") {
    return (
      <TraderSession key={subject.address} subject={subject} actions={actions} alertsOn={alertsOn}>
        {children}
      </TraderSession>
    );
  }
  return <HolderSessionContext.Provider value={browse}>{children}</HolderSessionContext.Provider>;
}
