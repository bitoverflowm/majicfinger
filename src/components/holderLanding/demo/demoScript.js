"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The hero demo's script. Each scene is one check line in the hero copy, played on one of the
 * saved markets or traders (`subject`). A step can cut the canvas to a panel (`scroll`), move the
 * cursor (`cursor`) and click what it points at (`click`). Targets are a CSS selector inside the
 * demo window, or `{ panel, text }` for the button in that panel whose label starts with `text`.
 */

/** The first saved market, which "Try it now" opens live. */
export const FEATURED_MARKET = {
  kind: "market",
  conditionId: "0x4567b275e6b667a6217f5cb4f06a797d3a1eaf1d0281fb5bc8c75e2046ae7e57",
  title: "Will Gavin Newsom win the 2028 US Presidential Election?",
  slug: "will-gavin-newsom-win-the-2028-us-presidential-election",
};
export const OPEN_MARKET_AT = 4000;
export const OPEN_TRADER_AT = 4300;
/** A scene that switches tabs clicks the tab first and opens it this long in. */
const TAB_AT = 700;

const INPUT = '[data-demo="search-input"]';
const SUGGESTION = '[data-demo="suggestion"]';
const TRADER_TAB = '[data-demo="trader-tab"]';
const MERGE = '[data-demo="merge"] button';
const FLAG = '[data-demo-panel="market.holders"] [aria-label="Flags"] button';

/** The view a subject opens in, e.g. `trader:1` for the second saved trader. */
export function subjectView({ kind, pair }) {
  return `${kind}:${pair}`;
}

export function parseView(view) {
  const [kind, pair] = view.split(":");
  return { kind, pair: Number(pair) };
}

const tab = (kind, pair) => `[data-demo-tab="${kind}:${pair}"]`;

/** The cursor clicks the subject's tab, then the canvas cuts to it at `TAB_AT`. */
function tabSwitch(kind, pair, steps) {
  return [
    { at: 0, cursor: tab(kind, pair) },
    { at: TAB_AT - 250, click: tab(kind, pair) },
    ...steps.map((step, index) => ({ ...step, at: step.at + TAB_AT, ...(index === 0 ? { cursor: null } : {}) })),
  ];
}

/**
 * Scenes that start on the search say when it switches to the trader tab (`tab`), takes focus,
 * starts typing, shows suggestions and highlights the first. `openAt` is when the scene's subject
 * comes up; before that it shows the search, or whatever the scene before it ended on.
 */
export const SCENES = [
  {
    id: "moves",
    check: "Every move they made, next to the news",
    subject: { kind: "trader", pair: 0 },
    ms: 7500,
    steps: [{ at: 0, scroll: "trader.marketFocus", cursor: null }],
  },
  {
    id: "trader",
    check: "Open any whale's full record in one click",
    subject: { kind: "trader", pair: 1 },
    openAt: OPEN_TRADER_AT,
    ms: OPEN_TRADER_AT + 6000,
    search: { mode: "trader", tab: 900, focus: 1600, type: 1800, suggest: 2600, highlight: 3300 },
    steps: [
      { at: 0, scroll: "top", cursor: null },
      { at: 400, cursor: TRADER_TAB },
      { at: 900, click: TRADER_TAB },
      { at: 1200, cursor: INPUT },
      { at: 1600, click: INPUT },
      { at: 3100, cursor: SUGGESTION },
      { at: 3800, click: SUGGESTION },
      { at: OPEN_TRADER_AT, cursor: null, scroll: "top" },
      { at: OPEN_TRADER_AT + 2800, scroll: "trader.trades" },
    ],
  },
  {
    id: "sources",
    check: "See where their profit and loss came from",
    subject: { kind: "trader", pair: 2 },
    openAt: TAB_AT,
    ms: TAB_AT + 11000,
    steps: tabSwitch("trader", 2, [
      { at: 0, scroll: "trader.positions" },
      { at: 2200, scroll: "trader.finished" },
      { at: 4400, scroll: "trader.pnlQuestion" },
      { at: 6400, scroll: "trader.pnlCategory" },
      { at: 8200, scroll: "trader.categoryTable" },
      { at: 9600, scroll: "trader.holdEdge" },
    ]),
  },
  {
    id: "search",
    check: "Search any market",
    subject: { kind: "market", pair: 0 },
    openAt: OPEN_MARKET_AT,
    ms: 7200,
    search: { mode: "market", focus: 1100, type: 1300, suggest: 2500, highlight: 3100 },
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
    subject: { kind: "market", pair: 0 },
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
    subject: { kind: "market", pair: 0 },
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
    subject: { kind: "market", pair: 0 },
    ms: 6000,
    alert: [500, 5300],
    steps: [{ at: 0, scroll: "market.trades", cursor: null }],
  },
  {
    id: "news",
    check: "See the news as the trades happened",
    subject: { kind: "market", pair: 1 },
    openAt: TAB_AT,
    ms: TAB_AT + 10500,
    steps: tabSwitch("market", 1, [
      { at: 0, scroll: "market.price" },
      { at: 2400, scroll: "market.priceNews" },
      { at: 3600, cursor: { panel: "market.priceNews", bar: true } },
      { at: 4600, click: { panel: "market.priceNews", bar: true } },
      { at: 6400, cursor: { panel: "market.priceNews", marker: true } },
      { at: 7200, click: { panel: "market.priceNews", marker: true } },
    ]),
  },
  {
    id: "holders",
    check: "See who holds Yes and No, and what they paid",
    subject: { kind: "market", pair: 1 },
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
    subject: { kind: "market", pair: 1 },
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
    subject: { kind: "market", pair: 2 },
    openAt: TAB_AT,
    ms: TAB_AT + 8000,
    steps: tabSwitch("market", 2, [
      { at: 0, scroll: "market.heatmap" },
      { at: 1800, cursor: { panel: "market.heatmap", text: "Profit and loss" } },
      { at: 2400, click: { panel: "market.heatmap", text: "Profit and loss" } },
      { at: 4600, cursor: { panel: "market.heatmap", text: "Lychee Skill Score" } },
      { at: 5200, click: { panel: "market.heatmap", text: "Lychee Skill Score" } },
      { at: 7200, cursor: null },
    ]),
  },
  {
    id: "scores",
    check: "Know which side the proven traders back",
    subject: { kind: "market", pair: 2 },
    ms: 6000,
    steps: [{ at: 0, scroll: "market.scores", cursor: null }],
  },
];

/** Where reduced motion parks the demo: the first market open, nothing moving. */
export const STILL_SCENE = SCENES.findIndex((item) => item.id === "stats");

const previous = (scene) => (scene + SCENES.length - 1) % SCENES.length;

/** `home` for the search, otherwise the subject's view, e.g. `market:0`. */
export function viewAt(scene, t) {
  const item = SCENES[scene];
  if (t >= (item.openAt || 0)) return subjectView(item.subject);
  return item.search ? "home" : viewAt(previous(scene), Infinity);
}

/** The latest value a scene's steps gave `key` by time `t`, or `fallback`. */
export function stepValue(scene, t, key, fallback = null) {
  let value = fallback;
  for (const step of SCENES[scene]?.steps || []) {
    if (step.at <= t && key in step) value = step[key];
  }
  return value;
}

/** The panel the canvas should be on. Until a tab switch lands, the previous scene's panel. */
export function scrollAt(scene, t) {
  const item = SCENES[scene];
  if (t < (item.openAt || 0) && !item.search) return scrollAt(previous(scene), Infinity);
  return stepValue(scene, t, "scroll", "top");
}

/** The first panel `view` shows the next time it comes up, counting from `scene`. */
export function openingPanel(view, scene) {
  for (let step = 0; step < SCENES.length; step += 1) {
    const index = (scene + step) % SCENES.length;
    const item = SCENES[index];
    if (subjectView(item.subject) === view) return stepValue(index, item.openAt || 0, "scroll", "top");
  }
  return "top";
}

/** The scene that opens `view`, and when in it. */
export function sceneFor(view) {
  const index = SCENES.findIndex((item) => subjectView(item.subject) === view);
  return index < 0 ? null : { scene: index, t: SCENES[index].openAt || 0 };
}

const OPENED_BY_SEARCH = SCENES.filter((item) => item.search).map((item) => subjectView(item.subject));
const OPEN_FROM_START = [...new Set(SCENES.map((item) => subjectView(item.subject)))].filter((view) => !OPENED_BY_SEARCH.includes(view));

/** The terminal's tabs: the subjects open from the start, then any a search has opened this loop. */
export function tabsAt(scene, t) {
  const opened = SCENES.flatMap((item, index) => (item.search && (index < scene || (index === scene && t >= item.openAt)) ? [subjectView(item.subject)] : []));
  return [...OPEN_FROM_START, ...opened];
}

/** Milliseconds between streamed trades in each scene; the trades scene runs fast. */
const RELEASE_MS = { stats: 1100, trades: 650, alerts: 1500 };
const RELEASE_IDLE_MS = 2600;

function released(scene, ms, view) {
  const item = SCENES[scene];
  if (subjectView(item.subject) !== view) return 0;
  const start = item.openAt || 0;
  return Math.max(0, Math.floor((ms - start) / (RELEASE_MS[item.id] || RELEASE_IDLE_MS)));
}

/** How many of a market's held-back trades have streamed in by this point of the loop. */
export function releasedAt(view, scene, t) {
  let count = 0;
  for (let index = 0; index < scene; index += 1) count += released(index, SCENES[index].ms, view);
  return count + released(scene, t, view);
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
