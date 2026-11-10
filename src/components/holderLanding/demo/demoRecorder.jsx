"use client";

import { useEffect, useMemo, useRef } from "react";
import { tradeSheetRow } from "@/components/dashboardComposer/polymarketLiveBuild";
import { freshTradesEnd, polymarketGet, resolvePolymarketMarket } from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";
import { HolderDemoFeedContext } from "@/components/terminals/holder/holderDemoFeed";
import { MarketPriceNewsPanel } from "@/components/terminals/holder/holderMarketView";
import { HolderSessionProvider, useHolderSession } from "@/components/terminals/holder/holderSession";
import { TraderMarketFocusPanel } from "@/components/terminals/holder/holderTraderView";
import { fillsPage } from "@/components/terminals/holder/traderMarketFocus";
import { fetchPriceHistory } from "@/components/terminals/holder/useMarketPriceHistory";

/**
 * Development only. Loads a real market and one of its holders the way the terminal does and keeps
 * what came back, for `scripts/holder-demo/build-snapshot.mjs` to turn into the hero demo's snapshot.
 * Open a landing page with `?recordDemo=1&recordMarket=<conditionId>&recordTrader=<wallet>`, wait for the
 * panels to fill, then read `window.__holderDemo.dump()`.
 */

const HOLDER_ROWS = 150;
const SUPPLY_ROWS = 300;
const TRADE_ROWS = 600;
const ACTIVITY_ROWS = 400;

const captured = { prices: {}, news: {}, markets: {}, fills: {}, trades: [], life: null };

function span(params) {
  const search = new URLSearchParams(params);
  return Number(search.get("end") || 0) - Number(search.get("start") || 0);
}

const recordFeed = {
  priceHistory: async (tokenIds, startSec, endSec, signal) => {
    const history = await fetchPriceHistory(tokenIds, startSec, endSec, signal);
    const key = tokenIds.slice(0, 2).join(",");
    const prev = captured.prices[key];
    if (!prev || endSec - startSec > prev.endSec - prev.startSec) captured.prices[key] = { startSec, endSec, history };
    return history;
  },
  news: async (source, params, signal) => {
    const result = await fetch(`/api/news?${params}`, { signal }).then((res) => res.json());
    const prev = captured.news[source];
    if (!prev || span(params) >= span(prev.params)) captured.news[source] = { params, result };
    return result;
  },
  market: async (conditionId, signal) => {
    const meta = await resolvePolymarketMarket(conditionId, signal);
    captured.markets[conditionId] = meta;
    return meta;
  },
  fills: async (wallet, conditionId, limit, cursor, signal) => {
    const page = await fillsPage(wallet, conditionId, limit, cursor, signal);
    const key = `${wallet}|${conditionId}`;
    if (!cursor && limit >= 1000) captured.fills[key] = page.rows;
    else if (cursor) captured.fills[key] = [...(captured.fills[key] || []), ...page.rows];
    return page;
  },
};

const noopActions = { pick() {}, pickMarket() {}, pickTrader() {}, nameSubject() {}, explore() {} };

function plain(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function marketDump(session) {
  const sides = session.holders.sides || [];
  const details = {};
  for (const side of sides) {
    for (const row of side.rows.slice(0, HOLDER_ROWS)) {
      const found = session.holderDetails.details(row.wallet);
      if (found) details[row.wallet] = found;
    }
  }
  return plain({
    subject: session.subject,
    meta: session.meta,
    stats: session.stats,
    status: { label: session.status.label, truncated: session.status.truncated, phase: session.status.phase },
    holders: { sides: sides.map((side) => ({ ...side, rows: side.rows.slice(0, HOLDER_ROWS) })) },
    details,
    supply: { sides: (session.supply.sides || []).map((side) => ({ ...side, rows: side.rows.slice(0, SUPPLY_ROWS) })) },
  });
}

function traderDump(session) {
  const part = (value, limit) => ({ columns: value.columns, rows: limit ? value.rows.slice(0, limit) : value.rows, status: value.status });
  return plain({
    subject: session.subject,
    displayName: session.displayName,
    profile: part(session.profile),
    activity: part(session.activity, ACTIVITY_ROWS),
    pnl: part(session.pnl),
    skill: { status: session.skill.status, score: session.skill.score },
    positions: { rows: session.positions.rows, truncated: session.positions.truncated, status: session.positions.status },
    finishedPart: { rows: session.finishedPart.rows, done: session.finishedPart.done, more: session.finishedPart.more, status: session.finishedPart.status },
    categories: session.categories,
  });
}

const latest = { market: null, trader: null };

/** The newest trades, read directly: the session only hands rows over once a big market's whole history is in. */
async function recentTrades(meta) {
  const ref = { entityId: meta.marketId, title: meta.title, slug: meta.slug, conditionId: meta.conditionId };
  const rows = [];
  let cursor = "";
  const end = freshTradesEnd();
  while (rows.length < TRADE_ROWS) {
    const body = await polymarketGet("getTradesByMarket", { condition: meta.conditionId, limit: "500", end, ...(cursor ? { cursor } : {}) }, undefined, { retries: 2 });
    const root = Array.isArray(body) ? body[0] : body;
    const list = Array.isArray(root?.data) ? root.data : [];
    rows.push(...list.map((raw) => tradeSheetRow(raw, ref)));
    cursor = String(root?.pagination?.next_cursor || "").trim();
    if (!cursor || !list.length) break;
  }
  return rows.slice(0, TRADE_ROWS);
}

function MarketCapture() {
  const session = useHolderSession();
  latest.market = session;
  const asked = useRef(false);
  const read = useRef(false);
  const sides = session?.holders?.sides;
  const meta = session?.meta;
  useEffect(() => {
    if (asked.current || !sides?.length) return;
    asked.current = true;
    session.holderDetails.request(sides.flatMap((side) => side.rows.slice(0, HOLDER_ROWS).map((row) => row.wallet)));
  }, [session, sides]);
  useEffect(() => {
    if (read.current || !meta?.tokenIds?.length) return;
    read.current = true;
    recentTrades(meta).then((rows) => {
      captured.trades = rows;
    });
    const endSec = Math.floor(Date.now() / 1000);
    const startSec = Math.floor((meta.openMs || Date.now() - 30 * 86_400_000) / 1000);
    fetchPriceHistory(meta.tokenIds, startSec, endSec).then((history) => {
      captured.life = { startSec, endSec, history };
    });
  }, [meta]);
  return null;
}

function TraderCapture() {
  latest.trader = useHolderSession();
  return null;
}

export default function DemoRecorder({ conditionId, trader }) {
  const market = useMemo(() => ({ kind: "market", conditionId: conditionId.toLowerCase(), title: "" }), [conditionId]);
  const wallet = useMemo(
    () => (trader ? { kind: "trader", address: trader.toLowerCase(), title: "", fromMarket: { conditionId: conditionId.toLowerCase(), title: "", slug: "" } } : null),
    [conditionId, trader],
  );

  useEffect(() => {
    window.__holderDemo = {
      dump: () => ({
        recordedAt: Date.now(),
        market: latest.market?.meta ? marketDump(latest.market) : null,
        trader: latest.trader?.profile ? traderDump(latest.trader) : null,
        feeds: plain(captured),
      }),
    };
    return () => {
      delete window.__holderDemo;
    };
  }, []);

  return (
    <div className="fixed inset-6 z-[300] overflow-auto rounded-xl border border-border bg-background p-4 shadow-2xl">
      <p className="mb-3 text-[12px] font-medium text-muted-foreground">Recording the hero demo. Read window.__holderDemo.dump() once everything has loaded.</p>
      <HolderDemoFeedContext.Provider value={recordFeed}>
        <HolderSessionProvider subject={market} actions={noopActions}>
          <MarketCapture />
          <MarketPriceNewsPanel />
        </HolderSessionProvider>
        {wallet ? (
          <HolderSessionProvider subject={wallet} actions={noopActions} alertsOn={false}>
            <TraderCapture />
            <TraderMarketFocusPanel />
          </HolderSessionProvider>
        ) : null}
      </HolderDemoFeedContext.Provider>
    </div>
  );
}
