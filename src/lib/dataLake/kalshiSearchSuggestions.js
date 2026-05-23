/**
 * Kalshi historical search suggestions (Markets + Trades via Athena).
 * Searches ticker, event_ticker, title, and virtual taxonomy/prefix columns on markets;
 * surfaces trades suggestions when trades exist for a matching ticker (joined by ticker).
 */
import { resolveAthenaTableName } from "@/lib/dataLake/athenaTableMap";
import { databaseForLake } from "@/lib/dataLake/validateAthenaLakeRequest";
import { runAthenaBoundedSelect } from "@/lib/dataLake/runAthenaSelect";

/** @typedef {"markets" | "trades"} KalshiSearchEntity */

/**
 * @typedef {object} KalshiSearchSuggestion
 * @property {KalshiSearchEntity} entity
 * @property {string} ticker
 * @property {string} title
 * @property {string} [eventTicker]
 * @property {string} [subtitle]
 * @property {string} [matchField]
 */

const MARKET_SEARCH_COLUMNS = ["ticker", "title", "event_ticker"];
const SEARCH_LIMIT = 12;
const MAX_WAIT_MS = 35000;

/** @param {string[]} columns */
function minimalComposeSelect(columns) {
  return columns.map((column) => ({
    column,
    alias: column,
    aggregate: null,
    dateBucket: null,
    dateFormat: null,
    stringBucket: null,
    numberBucket: null,
    numberScale: "none",
    decimals: null,
    treatAsDate: false,
  }));
}

/** @param {string} q */
function searchOrFilters(q) {
  return [
    { column: "ticker", kind: "string", op: "contains", value: q },
    { column: "title", kind: "string", op: "contains", value: q },
    { column: "event_ticker", kind: "string", op: "contains", value: q },
    { column: "kalshi_event_ticker_category", kind: "string", op: "contains", value: q },
    { column: "kalshi_taxonomy_category", kind: "string", op: "contains", value: q },
  ];
}

/**
 * @param {{ columns: string[]; rows: string[][] }} result
 * @returns {Record<string, string>[]}
 */
function rowsToRecords(result) {
  const cols = Array.isArray(result?.columns) ? result.columns : [];
  const rows = Array.isArray(result?.rows) ? result.rows : [];
  return rows.map((row) => {
    /** @type {Record<string, string>} */
    const rec = {};
    cols.forEach((col, i) => {
      rec[col] = row[i] != null ? String(row[i]) : "";
    });
    return rec;
  });
}

/**
 * @param {string} q
 * @param {string} database
 * @param {string} physicalMarkets
 */
async function searchMarkets(q, database, physicalMarkets) {
  const result = await runAthenaBoundedSelect({
    physicalTableName: physicalMarkets,
    database,
    queryType: "compose",
    lake: "kalshi",
    table: "markets",
    compose: {
      select: minimalComposeSelect(MARKET_SEARCH_COLUMNS),
      groupByAliases: [],
      orderBy: [{ alias: "ticker", direction: "asc" }],
    },
    filters: { and: [], or: searchOrFilters(q) },
    caseSensitive: false,
    limit: SEARCH_LIMIT,
    maxWaitMs: MAX_WAIT_MS,
  });
  return rowsToRecords(result);
}

/**
 * @param {string} q
 * @param {string} database
 * @param {string} physicalTrades
 */
async function searchTradeTickers(q, database, physicalTrades) {
  const result = await runAthenaBoundedSelect({
    physicalTableName: physicalTrades,
    database,
    queryType: "select",
    columns: ["ticker"],
    filters: {
      and: [],
      or: [{ column: "ticker", kind: "string", op: "contains", value: q }],
    },
    caseSensitive: false,
    limit: SEARCH_LIMIT,
    maxWaitMs: MAX_WAIT_MS,
  });
  const tickers = rowsToRecords(result).map((r) => String(r.ticker || "").trim()).filter(Boolean);
  return [...new Set(tickers)];
}

/**
 * @param {string[]} tickers
 * @param {string} database
 * @param {string} physicalMarkets
 */
async function fetchMarketMetaForTickers(tickers, database, physicalMarkets) {
  const unique = [...new Set(tickers.map((t) => String(t || "").trim()).filter(Boolean))];
  if (!unique.length) return [];

  const result = await runAthenaBoundedSelect({
    physicalTableName: physicalMarkets,
    database,
    queryType: "compose",
    lake: "kalshi",
    table: "markets",
    compose: {
      select: minimalComposeSelect(MARKET_SEARCH_COLUMNS),
      groupByAliases: [],
      orderBy: [{ alias: "ticker", direction: "asc" }],
    },
    filters: {
      and: [{ column: "ticker", kind: "string", op: "in", value: unique }],
      or: [],
    },
    caseSensitive: false,
    limit: unique.length,
    maxWaitMs: MAX_WAIT_MS,
  });
  return rowsToRecords(result);
}

/**
 * @param {string[]} tickers
 * @param {string} database
 * @param {string} physicalTrades
 */
async function tickersWithTrades(tickers, database, physicalTrades) {
  const unique = [...new Set(tickers.map((t) => String(t || "").trim()).filter(Boolean))];
  if (!unique.length) return new Set();

  const result = await runAthenaBoundedSelect({
    physicalTableName: physicalTrades,
    database,
    queryType: "select",
    columns: ["ticker"],
    filters: {
      and: [{ column: "ticker", kind: "string", op: "in", value: unique }],
      or: [],
    },
    caseSensitive: false,
    limit: unique.length,
    maxWaitMs: MAX_WAIT_MS,
  });
  const found = rowsToRecords(result).map((r) => String(r.ticker || "").trim()).filter(Boolean);
  return new Set(found);
}

/** @param {string} q @param {string} needle @param {Record<string, string>} row */
function detectMatchField(q, needle, row) {
  const n = needle.toLowerCase();
  for (const field of [
    "title",
    "ticker",
    "event_ticker",
    "kalshi_event_ticker_category",
    "kalshi_taxonomy_category",
  ]) {
    const val = String(row[field] || "").toLowerCase();
    if (val && val.includes(n)) return field;
  }
  return "ticker";
}

/**
 * @param {string} q
 * @returns {Promise<{ suggestions: KalshiSearchSuggestion[] }>}
 */
export async function fetchKalshiSearchSuggestions(q) {
  const trimmed = String(q || "").trim();
  if (trimmed.length < 2) {
    return { suggestions: [] };
  }

  const database = databaseForLake("kalshi");
  const physicalMarkets = resolveAthenaTableName("kalshi", "markets");
  const physicalTrades = resolveAthenaTableName("kalshi", "trades");
  if (!database || !physicalMarkets || !physicalTrades) {
    throw new Error("Kalshi Athena tables are not configured");
  }

  const needle = trimmed.toLowerCase();

  const [marketRows, tradeTickerHits] = await Promise.all([
    searchMarkets(trimmed, database, physicalMarkets),
    searchTradeTickers(trimmed, database, physicalTrades),
  ]);

  /** @type {Map<string, Record<string, string>>} */
  const marketByTicker = new Map();
  for (const row of marketRows) {
    const ticker = String(row.ticker || "").trim();
    if (!ticker || marketByTicker.has(ticker)) continue;
    marketByTicker.set(ticker, row);
  }

  const orphanTradeTickers = tradeTickerHits.filter((t) => !marketByTicker.has(t));
  if (orphanTradeTickers.length) {
    const metaRows = await fetchMarketMetaForTickers(orphanTradeTickers, database, physicalMarkets);
    for (const row of metaRows) {
      const ticker = String(row.ticker || "").trim();
      if (!ticker || marketByTicker.has(ticker)) continue;
      marketByTicker.set(ticker, row);
    }
  }

  const allTickers = [...marketByTicker.keys(), ...tradeTickerHits.filter((t) => !marketByTicker.has(t))];
  const uniqueTickers = [...new Set(allTickers.map((t) => String(t || "").trim()).filter(Boolean))].slice(
    0,
    SEARCH_LIMIT,
  );

  const tradeTickerSet = await tickersWithTrades(uniqueTickers, database, physicalTrades);

  /** @type {KalshiSearchSuggestion[]} */
  const suggestions = [];
  const seen = new Set();

  for (const ticker of uniqueTickers) {
    const meta = marketByTicker.get(ticker) || { ticker, title: ticker, event_ticker: "" };
    const title = String(meta.title || ticker).trim() || ticker;
    const eventTicker = String(meta.event_ticker || "").trim();
    const matchField = detectMatchField(trimmed, needle, meta);

    const marketsKey = `markets:${ticker}`;
    if (!seen.has(marketsKey) && marketByTicker.has(ticker)) {
      seen.add(marketsKey);
      suggestions.push({
        entity: "markets",
        ticker,
        title,
        eventTicker: eventTicker || undefined,
        subtitle: eventTicker ? `${ticker} · ${eventTicker}` : ticker,
        matchField,
      });
    }

    const tradesKey = `trades:${ticker}`;
    if (!seen.has(tradesKey) && tradeTickerSet.has(ticker)) {
      seen.add(tradesKey);
      suggestions.push({
        entity: "trades",
        ticker,
        title,
        eventTicker: eventTicker || undefined,
        subtitle: eventTicker ? `All trades · ${ticker} · ${eventTicker}` : `All trades · ${ticker}`,
        matchField: marketByTicker.has(ticker) ? matchField : "ticker",
      });
    }

    if (suggestions.length >= SEARCH_LIMIT * 2) break;
  }

  return { suggestions: suggestions.slice(0, SEARCH_LIMIT * 2) };
}
