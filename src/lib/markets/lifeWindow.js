/**
 * Windows measured against each market's own trading life, so one choice
 * means the same thing for every market in a list.
 */

import { lifeOfMarket, localDayKey } from "@/lib/markets/marketLife.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const LIFE_WINDOW_PRESETS = [
  { id: "market-life", label: "Life of market", short: "Life", from: 0, to: 1 },
  { id: "life-first-half", label: "First half", short: "1st half", from: 0, to: 0.5 },
  { id: "life-second-half", label: "Second half", short: "2nd half", from: 0.5, to: 1 },
  { id: "life-first-quarter", label: "First 25%", short: "First 25%", from: 0, to: 0.25 },
  { id: "life-last-quarter", label: "Last 25%", short: "Last 25%", from: 0.75, to: 1 },
  { id: "life-first-day", label: "First day of trading", short: "First day", anchor: "start", span: DAY_MS },
  { id: "life-last-day", label: "Last day of trading", short: "Last day", anchor: "end", span: DAY_MS },
  { id: "life-last-week", label: "Last week of trading", short: "Last week", anchor: "end", span: 7 * DAY_MS },
];

const BY_ID = new Map(LIFE_WINDOW_PRESETS.map((preset) => [preset.id, preset]));

/** @param {string} [id] */
export function lifeWindowPreset(id) {
  return BY_ID.get(String(id || "")) || null;
}

/** @param {string} [id] */
export function isLifeWindowPreset(id) {
  return BY_ID.has(String(id || ""));
}

/**
 * Life of a Kalshi market row, pick, or join entry.
 * @param {Record<string, unknown> | null | undefined} market
 */
export function kalshiMarketLife(market) {
  if (!market || typeof market !== "object") return null;
  return lifeOfMarket({
    openTime: market.openTime ?? market.open_time,
    closeTime: market.closeTime ?? market.close_time,
    marketStatus: market.marketStatus ?? market.status,
  });
}

/**
 * Open to close for a closed market, open to now for a trading one.
 * A market that has not opened, or has no open time, has no span.
 * @param {ReturnType<typeof lifeOfMarket>} life
 * @param {number} [now]
 */
export function lifeSpanMs(life, now = Date.now()) {
  if (!life || !Number.isFinite(life.openMs)) return null;
  const end = life.stopped ? life.closeMs : now;
  if (!Number.isFinite(end)) return null;
  const endMs = Math.min(end, now);
  if (endMs <= life.openMs) return null;
  return { startMs: life.openMs, endMs };
}

/**
 * @param {string} id
 * @param {ReturnType<typeof lifeOfMarket>} life
 * @param {number} [now]
 * @returns {{ startMs: number, endMs: number } | null}
 */
export function lifeWindowMs(id, life, now = Date.now()) {
  const preset = lifeWindowPreset(id);
  const span = lifeSpanMs(life, now);
  if (!preset || !span) return null;
  const length = span.endMs - span.startMs;
  if (preset.span) {
    return preset.anchor === "start"
      ? { startMs: span.startMs, endMs: Math.min(span.endMs, span.startMs + preset.span) }
      : { startMs: Math.max(span.startMs, span.endMs - preset.span), endMs: span.endMs };
  }
  return {
    startMs: Math.round(span.startMs + length * preset.from),
    endMs: Math.round(span.startMs + length * preset.to),
  };
}

/**
 * The same window as calendar days, for the label and the calendar.
 * @param {string} id
 * @param {ReturnType<typeof lifeOfMarket>} life
 * @param {number} [now]
 */
export function lifeWindowDays(id, life, now = Date.now()) {
  const window = lifeWindowMs(id, life, now);
  if (!window) return null;
  return { from: localDayKey(window.startMs), to: localDayKey(window.endMs) };
}

/**
 * One window covering every market in a list, so the calendar can disable days no market traded.
 * @param {Array<ReturnType<typeof lifeOfMarket>>} lives
 * @param {number} [now]
 */
export function mergeLives(lives, now = Date.now()) {
  const list = (lives || []).filter((life) => lifeSpanMs(life, now));
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const opens = list.map((life) => life.openMs);
  const ends = list.map((life) => lifeSpanMs(life, now).endMs);
  const stopped = list.every((life) => life.stopped);
  const openMs = Math.min(...opens);
  const closeMs = Math.max(...ends);
  return {
    openMs,
    closeMs,
    stopped,
    trading: list.some((life) => life.trading),
    earliest: localDayKey(openMs),
    latest: localDayKey(closeMs),
    outcome: "",
    status: stopped ? list[0].status : "",
  };
}

/**
 * Narrow one market's request window to that market.
 * A life preset is cut from the market's own life. Picked dates are clamped to it,
 * and a range the market never traded in comes back `empty` so it is not requested.
 * @param {{ minTs?: number, maxTs?: number } & Record<string, unknown>} base
 * @param {{ from?: string, to?: string, preset?: string } | null | undefined} range
 * @param {ReturnType<typeof lifeOfMarket>} life
 * @param {number} [now]
 */
export function lifePullWindow(base, range, life, now = Date.now()) {
  const span = lifeSpanMs(life, now);
  if (!span) return base;
  const preset = String(range?.preset || "");
  if (isLifeWindowPreset(preset)) {
    const window = lifeWindowMs(preset, life, now);
    return { ...base, minTs: Math.floor(window.startMs / 1000), maxTs: Math.ceil(window.endMs / 1000) };
  }
  const open = Math.floor(span.startMs / 1000);
  const close = Math.ceil(span.endMs / 1000);
  const minTs = Number.isFinite(Number(base?.minTs)) ? Math.max(Number(base.minTs), open) : open;
  const maxTs = Number.isFinite(Number(base?.maxTs)) ? Math.min(Number(base.maxTs), close) : close;
  return minTs <= maxTs ? { ...base, minTs, maxTs } : { ...base, minTs, maxTs, empty: true };
}
