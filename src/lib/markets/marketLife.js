/**
 * A market's trading window.
 * Open markets run from their open date through today.
 * Closed markets run from their open date through their close date.
 */

import { dateRangePreset } from "@/components/dashboardComposer/dateRangePresets.js";

const CLOSED_STATUS = new Set(["closed", "determined", "settled", "finalized", "amended", "disputed"]);

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function instantMs(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 0) return null;
    return value > 1e12 ? value : value * 1000;
  }
  const parsed = Date.parse(String(value).trim().replace(" ", "T").replace(/\+00$/, "Z"));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * @param {number} ms
 * @returns {string}
 */
export function localDayKey(ms) {
  if (!Number.isFinite(ms)) return "";
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * @param {string} iso
 * @param {number} days
 * @returns {string}
 */
function shiftDay(iso, days) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDayKey(date.getTime());
}

/**
 * @param {string | undefined} outcome
 * @returns {string}
 */
export function formatMarketOutcome(outcome) {
  const text = String(outcome || "").trim();
  if (!text || text.startsWith("[") || text.startsWith("{")) return "";
  const lower = text.toLowerCase();
  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  return text;
}

/**
 * @param {{
 *   openAt?: unknown;
 *   closeAt?: unknown;
 *   closed?: boolean;
 *   status?: string;
 *   outcome?: string;
 *   result?: string;
 *   startedAt?: unknown;
 *   endedAt?: unknown;
 *   closesAt?: unknown;
 *   openTime?: unknown;
 *   closeTime?: unknown;
 *   marketStatus?: string;
 * } | null | undefined} source
 * @param {number} [now]
 */
export function lifeOfMarket(source, now = Date.now()) {
  if (!source || typeof source !== "object") return null;
  const openMs = instantMs(source.startedAt ?? source.openAt ?? source.openTime);
  const closeMs = instantMs(source.closesAt ?? source.endedAt ?? source.closeAt ?? source.closeTime);
  const status = String(source.marketStatus || source.status || "").trim().toLowerCase();
  const pastClose = Number.isFinite(closeMs) && closeMs <= now;
  const stopped = source.closed === true || CLOSED_STATUS.has(status) || pastClose;
  const trading =
    !stopped &&
    !(Number.isFinite(openMs) && openMs > now) &&
    (source.closed === false || status === "open" || status === "active" || Number.isFinite(closeMs) || Number.isFinite(openMs));
  if (!Number.isFinite(openMs) && !Number.isFinite(closeMs) && !stopped && !trading) return null;
  const earliest = Number.isFinite(openMs) ? localDayKey(openMs) : "";
  const latest = stopped
    ? (Number.isFinite(closeMs) ? localDayKey(closeMs) : earliest)
    : localDayKey(now);
  return {
    openMs: Number.isFinite(openMs) ? openMs : null,
    closeMs: Number.isFinite(closeMs) ? closeMs : null,
    stopped,
    trading,
    earliest,
    latest,
    outcome: formatMarketOutcome(source.outcome || source.result),
    status,
  };
}

/**
 * @param {string} from
 * @param {string} to
 * @param {{ earliest?: string; latest?: string } | null | undefined} life
 */
export function clampLifeRange(from, to, life) {
  let nextFrom = String(from || "");
  let nextTo = String(to || "");
  if (life?.earliest && nextFrom && nextFrom < life.earliest) nextFrom = life.earliest;
  if (life?.latest && nextTo && nextTo > life.latest) nextTo = life.latest;
  if (life?.earliest && nextFrom && nextTo && nextFrom > nextTo) nextFrom = life.earliest;
  if (nextFrom && nextTo && nextFrom > nextTo) nextTo = nextFrom;
  return { from: nextFrom, to: nextTo };
}

/**
 * Closed markets default to their whole trading life.
 * Open markets default to the last day, starting no earlier than the open date.
 * @param {ReturnType<typeof lifeOfMarket>} life
 * @param {{ maxDays?: number }} [options]
 * @returns {{ from: string; to: string; preset: string } | null}
 */
export function defaultLifeRange(life, options = {}) {
  if (!life?.latest && !life?.earliest) return null;
  if (life.stopped) {
    const to = life.latest || life.earliest;
    let from = life.earliest || to;
    if (options.maxDays && to) {
      const cap = shiftDay(to, -(options.maxDays - 1));
      if (cap && from < cap) from = cap;
    }
    if (!from || !to) return null;
    return { from, to, preset: options.maxDays ? "past-window" : "market-life" };
  }
  const today = dateRangePreset("past-24h", new Date());
  if (!today) return null;
  return { ...clampLifeRange(today.from, today.to, life), preset: "past-24h" };
}

/**
 * @param {string} id
 * @param {ReturnType<typeof lifeOfMarket>} life
 * @param {Date} [now]
 */
export function presetWithinLife(id, life, now = new Date()) {
  const end = life?.stopped && life.closeMs ? new Date(life.closeMs) : now;
  const range = dateRangePreset(id, end);
  if (!range) return null;
  return { ...clampLifeRange(range.from, range.to, life), preset: id };
}

/**
 * @param {ReturnType<typeof lifeOfMarket>} life
 * @param {number} [now]
 * @returns {string}
 */
export function lifeCountdown(life, now = Date.now()) {
  if (!life?.trading || !Number.isFinite(life.closeMs) || life.closeMs <= now) return "";
  const minutes = Math.floor((life.closeMs - now) / 60000);
  if (minutes < 1) return "Closes in under a minute";
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `Closes in ${days}d ${hours}h`;
  if (hours > 0) return `Closes in ${hours}h ${mins}m`;
  return `Closes in ${mins}m`;
}

/**
 * @param {string} [outcome]
 * @returns {string}
 */
export function closedLifeMessage(outcome) {
  const result = formatMarketOutcome(outcome);
  const head = result ? `Market closed. ${result}.` : "Market closed.";
  return `${head} No more live trades, prices, or order books.`;
}

/**
 * Fields stored on a dashboard sheet so play mode knows whether the market can stream.
 * @param {Record<string, unknown> | null | undefined} source
 */
export function lifePull(source) {
  const life = lifeOfMarket(source);
  if (!life) return {};
  return {
    openAt: life.openMs,
    closeAt: life.closeMs,
    closed: life.stopped,
    outcome: life.outcome,
    status: life.status,
  };
}

/**
 * @param {object | null | undefined} block
 * @param {string[]} ids
 */
function firstCell(block, ids) {
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const index = columns.findIndex((column) => ids.includes(String(column?.id || "")));
  if (index < 0) return "";
  for (const [key, value] of Object.entries(block?.cells || {})) {
    if (Number(String(key).split(",")[0]) !== index) continue;
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

/**
 * @param {object | null | undefined} block
 */
export function sheetLife(block) {
  const pull = block?.pull && typeof block.pull === "object" ? block.pull : null;
  const fromPull = lifeOfMarket(pull);
  if (fromPull && (fromPull.openMs || fromPull.closeMs || fromPull.stopped)) return fromPull;
  return lifeOfMarket({
    openAt: firstCell(block, ["open_time", "open_ts", "start_date", "startDate"]),
    closeAt: firstCell(block, ["close_time", "close_ts", "end_date", "endDate", "closedTime"]),
    status: firstCell(block, ["status"]),
    outcome: firstCell(block, ["result", "outcome"]),
  });
}
