"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { TRADER_PNL_ENDPOINT_ID } from "@/lib/polymarketLive/traderPnlCompose";
import { HolderDemoFeedContext } from "@/components/terminals/holder/holderDemoFeed";
import { HolderSessionContext } from "@/components/terminals/holder/holderSession";
import { marketPriceSheet, marketTradeSheet, sheetChartBlock, traderSheet } from "@/components/terminals/holder/holderTerminalSheets";
import { finishedBetList } from "@/components/terminals/holder/traderFinishedBets";
import { useLiveMarketStats } from "@/components/terminals/holder/useLiveMarketMeta";

/**
 * The hero demo's terminal runs on a recording (`scripts/holder-demo/build-snapshot.mjs`) instead
 * of the network. Every time in it is moved forward by how long ago it was recorded, so the
 * newest trade reads as a moment ago.
 */

const TIME_KEY = /(^t$|^ts$|time|stamp|_at$|At$|Ms$|_ms$|date|Date)/;
const SECONDS = [1.2e9, 2.6e9];
const MILLIS = [1.2e12, 2.6e12];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function shiftOne(value, ms) {
  if (typeof value === "number") {
    if (value > SECONDS[0] && value < SECONDS[1]) return value + ms / 1000;
    if (value > MILLIS[0] && value < MILLIS[1]) return value + ms;
    return value;
  }
  if (typeof value !== "string") return value;
  if (/^\d{10}(\.\d+)?$/.test(value)) return String(Math.floor(Number(value) + ms / 1000));
  if (/^\d{13}$/.test(value)) return String(Number(value) + ms);
  if (ISO.test(value)) {
    const at = Date.parse(value);
    return Number.isFinite(at) ? new Date(at + ms).toISOString() : value;
  }
  return value;
}

function shiftTimes(value, ms, key = "") {
  if (Array.isArray(value)) return value.map((item) => shiftTimes(item, ms, key));
  if (value && typeof value === "object") {
    const out = {};
    for (const [name, item] of Object.entries(value)) out[name] = shiftTimes(item, ms, name);
    return out;
  }
  return TIME_KEY.test(key) ? shiftOne(value, ms) : value;
}

function expand(part) {
  return part.rows.map((row) => ({ ...part.common, ...row }));
}

/**
 * The saved pairs, a market and one of its largest holders each, in the order the script numbers
 * them (`pair` in demoScript.js). `scripts/holder-demo/build-snapshot.mjs` writes them.
 */
const PAIRS = [
  () => import("@/lib/holderLanding/demoPairs/newsom.json"),
  () => import("@/lib/holderLanding/demoPairs/iran.json"),
  () => import("@/lib/holderLanding/demoPairs/fed.json"),
];
const loading = [];

/** A saved pair, moved to now. Each loads once per page. */
export function loadDemoPair(index) {
  loading[index] ||= PAIRS[index]().then((mod) => {
    const raw = mod.default || mod;
    const snap = shiftTimes(raw, Date.now() - raw.recordedAt);
    snap.market.trades = expand(snap.market.trades);
    snap.feeds.fills = Object.fromEntries(Object.entries(snap.feeds.fills).map(([key, part]) => [key, expand(part)]));
    snap.trader.subject = {
      ...snap.trader.subject,
      fromMarket: { conditionId: snap.market.meta.conditionId, title: snap.market.meta.title, slug: snap.market.meta.slug },
    };
    snap.feed = replayFeed(snap);
    return snap;
  });
  return loading[index];
}

/** Every saved pair, null until it loads: the first straight away, the others one after another behind it. */
export function useDemoPairs(enabled = true) {
  const [pairs, setPairs] = useState(() => PAIRS.map(() => null));
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    (async () => {
      for (let index = 0; index < PAIRS.length && alive; index += 1) {
        const pair = await loadDemoPair(index).catch(() => null);
        if (alive && pair) setPairs((prev) => prev.map((item, at) => (at === index ? pair : item)));
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);
  return pairs;
}

function between(lines, startSec, endSec) {
  const cut = lines.map((line) => line.filter((point) => point.t >= startSec && point.t <= endSec));
  return cut.every((line) => line.length > 1) ? cut : lines;
}

/** What the panels that load their own data (price & news, market focus) get instead of the network. */
function replayFeed(snap) {
  const prices = Object.values(snap.feeds.prices);
  return {
    quiet: true,
    market: async (conditionId) => {
      const meta = snap.feeds.markets[conditionId];
      if (!meta) throw new Error("This market isn't in the demo.");
      return meta;
    },
    priceHistory: async (tokenIds, startSec, endSec) => {
      const key = tokenIds.slice(0, 2).join(",");
      const found = snap.feeds.prices[key] || prices[0] || snap.market.life;
      return between(found.history, startSec, endSec);
    },
    news: async (source) => snap.feeds.news[source]?.result || { status: "ok", articles: [], volume: [] },
    fills: async (wallet, conditionId) => ({ rows: snap.feeds.fills[`${wallet}|${conditionId}`] || [], next: "" }),
  };
}

export function DemoFeed({ snap, children }) {
  return <HolderDemoFeedContext.Provider value={snap.feed}>{children}</HolderDemoFeedContext.Provider>;
}

const noop = () => {};
/** Trades held back from the recording so they can stream in while the demo plays. */
export const HELD_TRADES = 60;

/**
 * The market tab. `released` of the held-back trades have arrived; each is stamped with the moment
 * it arrived. `flags` is the holder flag state the demo (or a visitor's clicks) set.
 */
const NO_LIVE = {};

export function DemoMarketSession({ snap, released, merged, onMerged, flags, onFlag, actions, children }) {
  const { market } = snap;
  const meta = market.meta;
  const arrivedRef = useRef(new Map());
  const held = Math.min(HELD_TRADES, market.trades.length - 1);
  const shown = Math.max(0, Math.min(released, held));

  const rows = useMemo(() => {
    const arrived = arrivedRef.current;
    const fresh = market.trades.slice(held - shown, held).map((row, index) => {
      const key = held - shown + index;
      if (!arrived.has(key)) arrived.set(key, Math.floor(Date.now() / 1000));
      return { ...row, timestamp: String(arrived.get(key)) };
    });
    return fresh.concat(market.trades.slice(held));
  }, [held, market.trades, shown]);

  useEffect(() => {
    if (shown === 0) arrivedRef.current = new Map();
  }, [shown]);

  const stats = useLiveMarketStats(meta, NO_LIVE, rows);
  const sheet = useMemo(() => marketTradeSheet(meta, rows, { truncated: false, label: "", filling: null }), [meta, rows]);
  const chart = useMemo(() => sheetChartBlock(sheet), [sheet]);
  const priceHistory = useMemo(() => {
    const records = [];
    meta.tokenIds.slice(0, 2).forEach((token, index) => {
      const outcome = meta.outcomes?.[index] || (index ? "No" : "Yes");
      for (const point of market.life.history[index] || []) {
        records.push({
          token_id: token,
          outcome,
          t: point.t,
          timestamp: new Date(point.t * 1000).toISOString(),
          p: point.p,
          condition_id: meta.conditionId,
          market_title: meta.title,
          market_slug: meta.slug,
        });
      }
    });
    return { sheet: marketPriceSheet(meta, records), loading: false, error: "", retrying: false, retry: noop };
  }, [market.life, meta]);
  const priceChart = useMemo(() => sheetChartBlock(priceHistory.sheet), [priceHistory.sheet]);
  const holderDetails = useMemo(() => ({ details: (wallet) => market.details[wallet], request: noop }), [market.details]);
  const holders = useMemo(
    () => ({ sides: market.holders.sides, loading: false, error: "", hasMore: false, loadingMore: false, loadMore: noop }),
    [market.holders.sides],
  );
  const supply = useMemo(() => ({ sides: market.supply.sides, loading: false, error: "" }), [market.supply.sides]);
  const holderFlags = useMemo(() => ({ enabled: flags, toggle: onFlag }), [flags, onFlag]);

  // The demo clock re-renders this every tick; panels should only re-render when the data moves.
  const value = useMemo(
    () => ({
      view: "market",
      subject: market.subject,
      actions,
      meta,
      error: "",
      stats,
      rows,
      tradeRows: rows,
      status: { phase: "live", progress: "", error: "", truncated: false, label: "", socket: "open", historyCount: rows.length - shown },
      sheet,
      chart,
      live: true,
      historyLoaded: true,
      priceHistory,
      priceChart,
      holders,
      holderDetails,
      holderFlags,
      supply,
      merged,
      setMerged: onMerged,
      outcomes: [meta.outcomes?.[0] || "Yes", meta.outcomes?.[1] || "No"],
    }),
    [actions, chart, holderDetails, holderFlags, holders, market.subject, merged, meta, onMerged, priceChart, priceHistory, rows, sheet, shown, stats, supply],
  );
  return <HolderSessionContext.Provider value={value}>{children}</HolderSessionContext.Provider>;
}

/**
 * For panels that don't list trades: the market session as it was when a live price or a flag
 * last changed, so a streamed trade doesn't redraw every holder table and chart.
 */
export function SteadyMarketSession({ children }) {
  const session = useContext(HolderSessionContext);
  const priceKey = (session?.stats?.prices || []).join("|");
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const value = useMemo(
    () => sessionRef.current,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priceKey, session?.holderFlags, session?.actions],
  );
  return <HolderSessionContext.Provider value={value}>{children}</HolderSessionContext.Provider>;
}

const ALERTS = { paused: false, setPaused: noop };

/** The trader tab: one of the market's largest holders, as recorded. */
export function DemoTraderSession({ snap, actions, children }) {
  const value = useMemo(() => {
    const { trader } = snap;
    const updatedAt = Date.now();
    const part = (recorded) => ({ ...recorded, error: "", updatedAt });
    const positions = { ...part(trader.positions), ticks: new Map() };
    const finishedPart = { ...part(trader.finishedPart), cursor: "", loadMore: noop };
    const pnl = part(trader.pnl);
    const pnlSheet = traderSheet(TRADER_PNL_ENDPOINT_ID, pnl, trader.subject);
    return {
      view: "trader",
      subject: trader.subject,
      profile: part(trader.profile),
      activity: part(trader.activity),
      pnl,
      skill: trader.skill,
      positions,
      finishedPart,
      finishedBets: finishedBetList(finishedPart.rows, positions.rows, true),
      categories: trader.categories,
      pnlSheet,
      pnlChart: sheetChartBlock(pnlSheet),
      displayName: trader.displayName,
      alerts: ALERTS,
    };
  }, [snap]);
  const withActions = useMemo(() => ({ ...value, actions }), [actions, value]);
  return <HolderSessionContext.Provider value={withActions}>{children}</HolderSessionContext.Provider>;
}
