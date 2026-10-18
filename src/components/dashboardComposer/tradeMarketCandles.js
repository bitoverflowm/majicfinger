/** Turn a Kalshi trades sheet into market candles. Volume is Count fp. */

import { parseVisualNumber as parseChartNumber } from "@/lib/visualizations/visualTable";

const TARGET_CANDLES = 48;

function findColumn(columns, test) {
  return (columns || []).findIndex((column) =>
    test(String(column?.title || "").trim().toLowerCase(), String(column?.id || "").trim().toLowerCase()),
  );
}

function isCentsColumn(title, id) {
  if (id === "yes_price" || id === "no_price" || id === "last_price") return true;
  if (id.includes("dollar") || title.includes("dollar")) return false;
  return title === "yes price" || title === "no price" || title === "last price";
}

function volumeLabelFor(title, id) {
  if (id === "count_fp" || title === "count fp" || title.includes("count fp")) return "Count fp";
  if (id === "volume_fp" || title === "volume fp") return "Volume fp";
  if (title === "size" || title === "volume" || id === "count" || id === "volume") return "Volume";
  return "";
}

/** Epoch seconds, milliseconds, microseconds, or nanoseconds. Kalshi lake times are nanoseconds. */
function parseTime(value) {
  if (value == null || value === "") return NaN;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) {
    if (n > 1e17) return n / 1e6;
    if (n > 1e14) return n / 1e3;
    return n > 1e12 ? n : n * 1000;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function outcomeChoice(rows, outcomeIndex) {
  if (outcomeIndex < 0) return { label: "", filter: false };
  const seen = [];
  for (const row of rows || []) {
    const value = String(row?.[outcomeIndex] ?? "").trim();
    if (value && !seen.includes(value)) seen.push(value);
  }
  if (!seen.length) return { label: "", filter: false };
  if (seen.length === 1) return { label: seen[0], filter: false };
  return { label: seen.find((value) => value.toLowerCase() === "yes") || seen[0], filter: true };
}

function outcomeRank(outcome) {
  const key = outcome.toLowerCase();
  if (key === "yes") return 0;
  if (key === "no") return 1;
  return 2;
}

/**
 * Kalshi Historical fills carry both `yes_price` and `no_price`, so each fill prices both outcomes.
 * Live Kalshi trades use the `_dollars` columns and stay one Yes series.
 * @returns {{ yes: number, no: number } | null}
 */
function pairedPrices(columns) {
  const yes = findColumn(columns, (_title, id) => id === "yes_price");
  const no = findColumn(columns, (_title, id) => id === "no_price");
  return yes >= 0 && no >= 0 ? { yes, no } : null;
}

/**
 * Outcomes a per-outcome trade sheet holds, Yes first and No second.
 * Sheets priced in Yes terms alone, such as live Kalshi trades, have one series and return none.
 * @param {Array<{ title?: string, id?: string }>} columns
 * @param {unknown[][]} rows
 * @returns {string[]}
 */
export function tradeOutcomes(columns, rows) {
  if (pairedPrices(columns)) return ["Yes", "No"];
  const yesPriced = findColumn(columns, (title, id) => id === "yes_price_dollars" || id === "yes_price" || id === "price_dollars" || title.includes("yes price"));
  if (yesPriced >= 0) return [];
  const outcomeIndex = findColumn(columns, (title, id) => id === "outcome" || title === "outcome");
  if (outcomeIndex < 0) return [];
  const seen = [];
  for (const row of rows || []) {
    const value = String(row?.[outcomeIndex] ?? "").trim();
    if (value && !seen.includes(value)) seen.push(value);
  }
  return seen.sort((a, b) => outcomeRank(a) - outcomeRank(b));
}

function tradeSamples(columns, rows, options = {}) {
  const timeIndex = findColumn(
    columns,
    (title, id) =>
      title.includes("created") ||
      id.includes("created") ||
      id === "observed_at" ||
      title === "observed at" ||
      id === "timestamp" ||
      title === "timestamp",
  );
  const yesPriceIndex = findColumn(
    columns,
    (title, id) =>
      id === "yes_price_dollars" ||
      id === "yes_price" ||
      id === "price_dollars" ||
      title === "yes price" ||
      title === "yes price dollars" ||
      title.includes("yes price"),
  );
  const wanted = String(options.outcome || "").trim();
  const paired = pairedPrices(columns);
  const pairedOutcome = paired && !options.everyOutcome ? (wanted.toLowerCase() === "no" ? "No" : "Yes") : "";
  const priceIndex =
    pairedOutcome === "No"
      ? paired.no
      : yesPriceIndex >= 0
        ? yesPriceIndex
        : findColumn(columns, (title, id) => id === "price" || title === "price");
  const outcomeIndex = findColumn(columns, (title, id) => id === "outcome" || title === "outcome");
  const chosen = pairedOutcome
    ? { label: pairedOutcome, filter: false }
    : yesPriceIndex >= 0 || options.everyOutcome
      ? { label: "", filter: false }
      : wanted && outcomeIndex >= 0
        ? { label: wanted, filter: true }
        : outcomeChoice(rows, outcomeIndex);
  const outcome = chosen.label;
  const sizeIndex = findColumn(
    columns,
    (title, id) =>
      id === "count_fp" ||
      title === "count fp" ||
      title.includes("count fp") ||
      id === "volume_fp" ||
      title === "volume fp" ||
      title === "size" ||
      title === "volume" ||
      id === "count" ||
      id === "volume",
  );
  const priceColumn = priceIndex >= 0 ? columns[priceIndex] : null;
  const sizeColumn = sizeIndex >= 0 ? columns[sizeIndex] : null;
  const cents = priceColumn
    ? priceColumn.scale === "cents" || isCentsColumn(String(priceColumn.title || "").toLowerCase(), String(priceColumn.id || "").toLowerCase())
    : false;
  const volumeLabel = sizeColumn
    ? volumeLabelFor(String(sizeColumn.title || "").trim().toLowerCase(), String(sizeColumn.id || "").trim().toLowerCase())
    : "";

  const samples = [];
  for (const row of rows || []) {
    if (chosen.filter) {
      const rowOutcome = String(row?.[outcomeIndex] ?? "").trim();
      if (rowOutcome && rowOutcome !== outcome) continue;
    }
    const time = parseTime(row?.[timeIndex]);
    const rawPrice = row?.[priceIndex];
    const price = parseChartNumber(rawPrice);
    if (!Number.isFinite(time) || price == null) continue;
    const markedCents = /¢/.test(String(rawPrice ?? ""));
    const size = sizeIndex >= 0 ? parseChartNumber(row?.[sizeIndex]) || 0 : 0;
    samples.push({
      time,
      price: cents || markedCents ? price / 100 : price,
      size,
    });
  }
  samples.sort((a, b) => a.time - b.time);
  const units = yesPriceIndex >= 0 ? "currency" : priceIndex >= 0 ? "probability" : "currency";
  return { samples, volumeLabel, units, outcome };
}

/**
 * Times of every priced trade, oldest first, across all outcomes unless one is named.
 * @param {Array<{ title?: string, id?: string, scale?: string }>} columns
 * @param {unknown[][]} rows
 * @param {string} [outcome]
 * @returns {number[]}
 */
export function tradeTimes(columns, rows, outcome = "") {
  const wanted = String(outcome || "").trim();
  const { samples } = tradeSamples(columns, rows, wanted ? { outcome: wanted } : { everyOutcome: true });
  return samples.map((sample) => sample.time);
}

/**
 * @param {Array<{ title?: string, id?: string, scale?: string }>} columns
 * @param {unknown[][]} rows
 * @param {{ outcome?: string, since?: number }} [options] one outcome to keep. Default keeps Yes when outcomes are mixed.
 * `since` keeps trades at or after that time and spreads the candles over that window alone.
 */
export function tradesToCandles(columns, rows, options = {}) {
  const parsed = tradeSamples(columns, rows, options);
  const { volumeLabel, units, outcome } = parsed;
  const since = Number.isFinite(options.since) ? options.since : null;
  const samples = since == null ? parsed.samples : parsed.samples.filter((sample) => sample.time >= since);
  if (!samples.length) return { candles: [], volumeLabel, units, outcome };

  const origin = since ?? 0;
  const span = Math.max(0, samples[samples.length - 1].time - (since ?? samples[0].time));
  const bucket = Math.max(1000, Math.ceil((span || 1000) / TARGET_CANDLES));
  const groups = new Map();
  for (const sample of samples) {
    const key = origin + Math.floor((sample.time - origin) / bucket) * bucket;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        t: key,
        open: sample.price,
        high: sample.price,
        low: sample.price,
        close: sample.price,
        volume: sample.size,
        count: 1,
      });
      continue;
    }
    group.high = Math.max(group.high, sample.price);
    group.low = Math.min(group.low, sample.price);
    group.close = sample.price;
    group.volume += sample.size;
    group.count += 1;
  }
  return { candles: [...groups.values()], volumeLabel, units, outcome };
}

/**
 * One Kalshi candlestick row is already a candle. Volume is Volume fp.
 * @param {Array<{ title?: string, id?: string }>} columns
 * @param {unknown[][]} rows
 */
export function ohlcRowsToCandles(columns, rows) {
  const timeIndex = findColumn(
    columns,
    (title, id) => id === "end_period_ts" || title === "end period ts" || title.includes("end period"),
  );
  const openIndex = findColumn(columns, (title, id) => id === "price_open_dollars" || title === "price open dollars");
  const highIndex = findColumn(columns, (title, id) => id === "price_high_dollars" || title === "price high dollars");
  const lowIndex = findColumn(columns, (title, id) => id === "price_low_dollars" || title === "price low dollars");
  const closeIndex = findColumn(columns, (title, id) => id === "price_close_dollars" || title === "price close dollars");
  const sizeIndex = findColumn(
    columns,
    (title, id) => id === "volume_fp" || title === "volume fp" || title.includes("volume fp"),
  );
  if (closeIndex < 0 || timeIndex < 0) return { candles: [], volumeLabel: "Volume fp" };

  const byTime = new Map();
  for (const row of rows || []) {
    const time = parseTime(row?.[timeIndex]);
    const close = parseChartNumber(row?.[closeIndex]);
    if (!Number.isFinite(time) || close == null) continue;
    const open = parseChartNumber(row?.[openIndex]) ?? close;
    const high = parseChartNumber(row?.[highIndex]) ?? Math.max(open, close);
    const low = parseChartNumber(row?.[lowIndex]) ?? Math.min(open, close);
    byTime.set(time, {
      t: time,
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
      volume: sizeIndex >= 0 ? parseChartNumber(row?.[sizeIndex]) || 0 : 0,
    });
  }
  return { candles: [...byTime.values()].sort((a, b) => a.t - b.t), volumeLabel: "Volume fp" };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_OPTIONS = [
  { label: "1m", ms: 60 * 1000 },
  { label: "5m", ms: 5 * 60 * 1000 },
  { label: "15m", ms: 15 * 60 * 1000 },
  { label: "1H", ms: 60 * 60 * 1000 },
  { label: "6H", ms: 6 * 60 * 60 * 1000 },
  { label: "1D", ms: DAY_MS },
  { label: "1W", ms: 7 * DAY_MS },
  { label: "1M", ms: 30 * DAY_MS },
  { label: "3M", ms: 91 * DAY_MS },
  { label: "1Y", ms: 365 * DAY_MS },
];
const MIN_RANGE_POINTS = 3;

/**
 * The four widest windows that still hold a few points and are clearly shorter than the
 * whole series, then All.
 * @param {Array<{ t: number } | number>} points oldest first: candles, chart points, or bare times
 */
export function rangesForCandles(points) {
  const all = { label: "All", ms: null };
  if (!points?.length) return [all];
  const at = (index) => {
    const point = points[index];
    return typeof point === "number" ? point : point.t;
  };
  const end = at(points.length - 1);
  const span = end - at(0);
  const countSince = (cut) => {
    let lo = 0;
    let hi = points.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (at(mid) < cut) lo = mid + 1;
      else hi = mid;
    }
    return points.length - lo;
  };
  const useful = RANGE_OPTIONS.filter((range) => range.ms < span * 0.85 && countSince(end - range.ms) >= MIN_RANGE_POINTS);
  return [...useful.slice(-4), all];
}
