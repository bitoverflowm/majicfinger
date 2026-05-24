/**
 * Kalshi historical typeahead — one bounded Athena query, physical columns only.
 * Matches loose word tokens across ticker, title, and event_ticker.
 *
 * Intentionally excludes virtual columns (kalshi_taxonomy_category,
 * kalshi_event_ticker_category) — category browse is handled elsewhere.
 */
import { resolveAthenaTableName } from "@/lib/dataLake/athenaTableMap";
import { runAthenaSqlQuery } from "@/lib/dataLake/runAthenaSelect";
import { databaseForLake } from "@/lib/dataLake/validateAthenaLakeRequest";

/** @typedef {"markets" | "trades"} KalshiSearchEntity */

/** @typedef {"all" | "trade_search" | "market_search"} KalshiSearchMode */

/**
 * @typedef {object} KalshiSearchSuggestion
 * @property {KalshiSearchEntity} entity
 * @property {string} ticker
 * @property {string} title
 * @property {string} [eventTicker]
 * @property {string} [subtitle]
 * @property {string} [matchField]
 */

const SEARCH_LIMIT = 10;
const MAX_WAIT_MS = 18000;
const CACHE_TTL_MS = 45_000;
const CACHE_MAX = 80;

/** @type {Map<string, { at: number; suggestions: KalshiSearchSuggestion[] }>} */
const suggestionCache = new Map();

function escapeSqlString(s) {
  return String(s).replace(/'/g, "''");
}

function escapeLike(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** @param {string} q */
function tokenizeQuery(q) {
  const raw = String(q || "")
    .trim()
    .toLowerCase();
  const words = raw.split(/\s+/).map((w) => w.trim()).filter((w) => w.length >= 2);
  if (words.length) return words;
  if (raw.length >= 2) return [raw];
  return [];
}

/**
 * Each token must match at least one searchable column (AND of ORs).
 * @param {string} alias
 * @param {string[]} tokens
 */
function buildLooseMatchSql(alias, tokens) {
  const cols = ["ticker", "title", "event_ticker"];
  return tokens
    .map((token) => {
      const pattern = `%${escapeLike(token)}%`;
      const lit = asLowerLikeLiteral(pattern);
      const parts = cols.map(
        (col) => `LOWER(CAST(${alias}."${col}" AS VARCHAR)) LIKE ${lit} ESCAPE '\\'`,
      );
      return `(${parts.join(" OR ")})`;
    })
    .join(" AND ");
}

/** @param {string} pattern already escaped for LIKE */
function asLowerLikeLiteral(pattern) {
  return `LOWER('${escapeSqlString(pattern)}')`;
}

/**
 * @param {string} marketsTable
 * @param {string} tradesTable
 * @param {string[]} tokens
 */
function buildKalshiMarketsSearchSql(marketsTable, tradesTable, tokens) {
  const m = "m";
  const marketMatch = buildLooseMatchSql(m, tokens);

  return `
SELECT
  ${m}."ticker" AS ticker,
  ${m}."title" AS title,
  ${m}."event_ticker" AS event_ticker,
  CASE WHEN EXISTS (
    SELECT 1 FROM "${tradesTable}" t WHERE t."ticker" = ${m}."ticker" LIMIT 1
  ) THEN '1' ELSE '0' END AS has_trades
FROM "${marketsTable}" ${m}
WHERE ${marketMatch}
LIMIT ${SEARCH_LIMIT}
`.trim();
}

/**
 * Fallback when title search misses — match trade tickers directly.
 * @param {string} marketsTable
 * @param {string} tradesTable
 * @param {string[]} tokens
 */
function buildKalshiTickerFallbackSql(marketsTable, tradesTable, tokens) {
  const t = "t";
  const m = "m";
  const pattern = `%${escapeLike(tokens.join("-"))}%`;
  const tickerPattern = `%${escapeLike(tokens.join(""))}%`;
  const litA = asLowerLikeLiteral(pattern);
  const litB = asLowerLikeLiteral(tickerPattern);

  return `
SELECT
  ${t}."ticker" AS ticker,
  COALESCE(${m}."title", ${t}."ticker") AS title,
  ${m}."event_ticker" AS event_ticker,
  '1' AS has_trades
FROM "${tradesTable}" ${t}
LEFT JOIN "${marketsTable}" ${m} ON ${m}."ticker" = ${t}."ticker"
WHERE LOWER(CAST(${t}."ticker" AS VARCHAR)) LIKE ${litA} ESCAPE '\\'
   OR LOWER(CAST(${t}."ticker" AS VARCHAR)) LIKE ${litB} ESCAPE '\\'
GROUP BY ${t}."ticker", COALESCE(${m}."title", ${t}."ticker"), ${m}."event_ticker"
LIMIT ${SEARCH_LIMIT}
`.trim();
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

/** @param {string[]} tokens @param {Record<string, string>} row */
function detectMatchField(tokens, row) {
  for (const field of ["title", "ticker", "event_ticker"]) {
    const val = String(row[field] || "").toLowerCase();
    if (!val) continue;
    if (tokens.some((t) => val.includes(t))) return field;
  }
  return "title";
}

/** @param {unknown} mode */
function normalizeSearchMode(mode) {
  if (mode === "trade_search" || mode === "market_search") return mode;
  return "all";
}

/** @param {Record<string, string>[]} rows @param {string[]} tokens @param {KalshiSearchMode} mode */
function rowsToSuggestions(rows, tokens, mode = "all") {
  /** @type {KalshiSearchSuggestion[]} */
  const suggestions = [];
  const seen = new Set();

  for (const row of rows) {
    const ticker = String(row.ticker || "").trim();
    if (!ticker) continue;

    const title = String(row.title || ticker).trim() || ticker;
    const eventTicker = String(row.event_ticker || "").trim();
    const hasTrades = row.has_trades === "1" || row.has_trades === "true";
    const matchField = detectMatchField(tokens, row);

    if (mode === "market_search") {
      const marketsKey = `markets:${ticker}`;
      if (seen.has(marketsKey)) continue;
      seen.add(marketsKey);
      suggestions.push({
        entity: "markets",
        ticker,
        title,
        eventTicker: eventTicker || undefined,
        subtitle: eventTicker ? `${ticker} · ${eventTicker}` : ticker,
        matchField,
      });
    } else if (mode === "trade_search") {
      if (!hasTrades) continue;
      const tradesKey = `market:${ticker}`;
      if (seen.has(tradesKey)) continue;
      seen.add(tradesKey);
      suggestions.push({
        entity: "markets",
        ticker,
        title,
        eventTicker: eventTicker || undefined,
        subtitle: ticker,
        matchField,
      });
    } else {
      const marketsKey = `markets:${ticker}`;
      if (!seen.has(marketsKey)) {
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

      if (hasTrades) {
        const tradesKey = `trades:${ticker}`;
        if (!seen.has(tradesKey)) {
          seen.add(tradesKey);
          suggestions.push({
            entity: "trades",
            ticker,
            title,
            eventTicker: eventTicker || undefined,
            subtitle: eventTicker ? `All trades · ${ticker} · ${eventTicker}` : `All trades · ${ticker}`,
            matchField,
          });
        }
      }
    }

    if (suggestions.length >= SEARCH_LIMIT) break;
  }

  return suggestions.slice(0, SEARCH_LIMIT);
}

/**
 * @param {string} q
 * @param {{ mode?: KalshiSearchMode | "trade_search" | "market_search" }} [options]
 * @returns {Promise<{ suggestions: KalshiSearchSuggestion[] }>}
 */
export async function fetchKalshiSearchSuggestions(q, options = {}) {
  const trimmed = String(q || "").trim();
  const tokens = tokenizeQuery(trimmed);
  const mode = normalizeSearchMode(options.mode);
  if (tokens.length === 0) {
    return { suggestions: [] };
  }

  const cacheKey = `${mode}:${tokens.join(" ")}`;
  const cached = suggestionCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { suggestions: cached.suggestions };
  }

  const database = databaseForLake("kalshi");
  const physicalMarkets = resolveAthenaTableName("kalshi", "markets");
  const physicalTrades = resolveAthenaTableName("kalshi", "trades");
  if (!database || !physicalMarkets || !physicalTrades) {
    throw new Error("Kalshi Athena tables are not configured");
  }

  const needle = tokens;

  let rows = rowsToRecords(
    await runAthenaSqlQuery({
      sql: buildKalshiMarketsSearchSql(physicalMarkets, physicalTrades, tokens),
      database,
      maxWaitMs: MAX_WAIT_MS,
      rowLimit: SEARCH_LIMIT,
    }),
  );

  let suggestions = rowsToSuggestions(rows, needle, mode);

  if (suggestions.length === 0) {
    rows = rowsToRecords(
      await runAthenaSqlQuery({
        sql: buildKalshiTickerFallbackSql(physicalMarkets, physicalTrades, tokens),
        database,
        maxWaitMs: MAX_WAIT_MS,
        rowLimit: SEARCH_LIMIT,
      }),
    );
    suggestions = rowsToSuggestions(rows, needle, mode);
  }

  suggestionCache.set(cacheKey, { at: Date.now(), suggestions });
  if (suggestionCache.size > CACHE_MAX) {
    const oldest = suggestionCache.keys().next().value;
    if (oldest) suggestionCache.delete(oldest);
  }

  return { suggestions };
}
