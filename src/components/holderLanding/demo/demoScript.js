"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The hero demo's script. Each scene is one check line in the hero copy. A step can scroll the
 * canvas to a panel (`scroll`), move the cursor (`cursor`) and click what it points at (`click`).
 * Targets are a CSS selector inside the demo window, or `{ panel, text }` for the button in that
 * panel whose label starts with `text`.
 */

/** The recorded market, which "Try it now" opens live. Re-record with the script to change it. */
export const FEATURED_MARKET = {
  kind: "market",
  conditionId: "0x4567b275e6b667a6217f5cb4f06a797d3a1eaf1d0281fb5bc8c75e2046ae7e57",
  title: "Will Gavin Newsom win the 2028 US Presidential Election?",
  slug: "will-gavin-newsom-win-the-2028-us-presidential-election",
};
export const TRADER_NAME = "gopfan2";
export const OPEN_MARKET_AT = 4000;
export const OPEN_TRADER_AT = 1700;

const INPUT = '[data-demo="search-input"]';
const SUGGESTION = '[data-demo="suggestion"]';
const MERGE = '[data-demo="merge"] button';
const FLAG = '[data-demo-panel="market.holders"] [aria-label="Flags"] button';
const HOLDER = `[data-demo-panel="market.holders"] button[title="Open holder analysis for ${TRADER_NAME}"]`;

export const SCENES = [
  {
    id: "search",
    check: "Search any market",
    ms: 7200,
    steps: [
      { at: 0, scroll: "top", cursor: null },
      { at: 500, cursor: INPUT },
      { at: 1100, click: INPUT },
      { at: 2900, cursor: SUGGESTION },
      { at: 3600, click: SUGGESTION },
      { at: OPEN_MARKET_AT, cursor: null, scroll: "top" },
    ],
  },
  {
    id: "stats",
    check: "See immediate live market stats",
    ms: 6500,
    steps: [
      { at: 0, scroll: "market.stats", cursor: { panel: "market.stats" } },
      { at: 2200, cursor: { panel: "market.lastPrice", text: "1W" } },
      { at: 2900, click: { panel: "market.lastPrice", text: "1W" } },
      { at: 4000, cursor: { panel: "market.lastPrice", text: "Yes" } },
      { at: 4600, click: { panel: "market.lastPrice", text: "Yes" } },
      { at: 5600, cursor: null },
    ],
  },
  {
    id: "trades",
    check: "Every trade as it happens",
    ms: 9000,
    steps: [
      { at: 0, scroll: "market.trades", cursor: null },
      { at: 3000, cursor: MERGE },
      { at: 3700, click: MERGE },
      { at: 6200, click: MERGE },
      { at: 7200, cursor: null },
    ],
  },
  {
    id: "alerts",
    check: "Get alerts on markets that interest you",
    ms: 6000,
    alert: [500, 5300],
    steps: [{ at: 0, scroll: "market.trades", cursor: null }],
  },
  {
    id: "news",
    check: "See the news as the trades happened",
    ms: 10500,
    steps: [
      { at: 0, scroll: "market.price", cursor: null },
      { at: 2400, scroll: "market.priceNews" },
      { at: 3600, cursor: { panel: "market.priceNews", bar: true } },
      { at: 4600, click: { panel: "market.priceNews", bar: true } },
      { at: 6400, cursor: { panel: "market.priceNews", marker: true } },
      { at: 7200, click: { panel: "market.priceNews", marker: true } },
    ],
  },
  {
    id: "holders",
    check: "See who holds Yes and No, and what they paid",
    ms: 7500,
    steps: [
      { at: 0, scroll: "market.holders", cursor: null },
      { at: 2500, cursor: FLAG },
      { at: 3200, click: FLAG },
      { at: 5000, click: FLAG },
      { at: 6000, cursor: null },
    ],
  },
  {
    id: "supply",
    check: "Spot who's underwater and where supply was bought",
    ms: 8500,
    steps: [
      { at: 0, scroll: "market.supply", cursor: null },
      { at: 2600, scroll: "market.entry" },
      { at: 4000, cursor: { panel: "market.entry", text: "Value now" } },
      { at: 4600, click: { panel: "market.entry", text: "Value now" } },
      { at: 6000, cursor: { panel: "market.entry", text: "Cost" } },
      { at: 6600, click: { panel: "market.entry", text: "Cost" } },
      { at: 7600, cursor: null },
    ],
  },
  {
    id: "heatmap",
    check: "See who dominates each side",
    ms: 8000,
    steps: [
      { at: 0, scroll: "market.heatmap", cursor: null },
      { at: 1800, cursor: { panel: "market.heatmap", text: "Profit and loss" } },
      { at: 2400, click: { panel: "market.heatmap", text: "Profit and loss" } },
      { at: 4600, cursor: { panel: "market.heatmap", text: "Lychee Skill Score" } },
      { at: 5200, click: { panel: "market.heatmap", text: "Lychee Skill Score" } },
      { at: 7200, cursor: null },
    ],
  },
  {
    id: "scores",
    check: "Know which side the proven traders back",
    ms: 6000,
    steps: [{ at: 0, scroll: "market.scores", cursor: null }],
  },
  {
    id: "trader",
    check: "Open any whale's full record in one click",
    ms: 8000,
    steps: [
      { at: 0, scroll: "market.holders", cursor: null },
      { at: 700, cursor: HOLDER },
      { at: 1400, click: HOLDER },
      { at: OPEN_TRADER_AT, scroll: "top", cursor: null },
      { at: 5200, scroll: "trader.trades" },
    ],
  },
  {
    id: "sources",
    check: "See where their profit and loss came from",
    ms: 11000,
    steps: [
      { at: 0, scroll: "trader.positions", cursor: null },
      { at: 2200, scroll: "trader.finished" },
      { at: 4400, scroll: "trader.pnlQuestion" },
      { at: 6400, scroll: "trader.pnlCategory" },
      { at: 8200, scroll: "trader.categoryTable" },
      { at: 9600, scroll: "trader.holdEdge" },
    ],
  },
  {
    id: "moves",
    check: "Every move they made, next to the news",
    ms: 8000,
    steps: [{ at: 0, scroll: "trader.marketFocus", cursor: null }],
  },
];

/** Where reduced motion parks the demo: the market open, nothing moving. */
export const STILL_SCENE = 1;

export function viewAt(scene, t) {
  const id = SCENES[scene]?.id;
  if (id === "search") return t < OPEN_MARKET_AT ? "home" : "market";
  if (id === "trader") return t < OPEN_TRADER_AT ? "market" : "trader";
  if (id === "sources" || id === "moves") return "trader";
  return "market";
}

/** The latest value a scene's steps gave `key` by time `t`, or `fallback`. */
export function stepValue(scene, t, key, fallback = null) {
  let value = fallback;
  for (const step of SCENES[scene]?.steps || []) {
    if (step.at <= t && key in step) value = step[key];
  }
  return value;
}

/** Milliseconds between streamed trades in each scene; the trades scene runs fast. */
const RELEASE_MS = { stats: 1100, trades: 650, alerts: 1500 };
const RELEASE_IDLE_MS = 2600;

function released(scene, ms) {
  if (viewAt(scene, ms) === "home") return 0;
  const start = SCENES[scene].id === "search" ? OPEN_MARKET_AT : 0;
  return Math.max(0, Math.floor((ms - start) / (RELEASE_MS[SCENES[scene].id] || RELEASE_IDLE_MS)));
}

/** How many held-back trades have streamed in by this point of the loop. */
export function releasedAt(scene, t) {
  let count = 0;
  for (let index = 0; index < scene; index += 1) count += released(index, SCENES[index].ms);
  return count + released(scene, t);
}

const TICK_MS = 100;

/**
 * The demo's clock: which scene is playing and how far in. It only runs while `running`.
 * `run` changes whenever the clock jumps or loops, so one-off steps know to fire again.
 */
export function useDemoClock(running) {
  const [state, setState] = useState({ scene: 0, t: 0, run: 0 });
  const last = useRef(0);
  useEffect(() => {
    if (!running) return undefined;
    last.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(500, now - last.current);
      last.current = now;
      setState((prev) => {
        const t = prev.t + dt;
        if (t < SCENES[prev.scene].ms) return { ...prev, t };
        const next = prev.scene + 1;
        return next < SCENES.length ? { ...prev, scene: next, t: 0 } : { scene: 0, t: 0, run: prev.run + 1 };
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [running]);
  const jump = useCallback((scene, t = 0) => setState((prev) => ({ scene, t, run: prev.run + 1 })), []);
  return { ...state, jump };
}
