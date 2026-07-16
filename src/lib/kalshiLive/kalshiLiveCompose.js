import {
  KALSHI_LIVE_CANDLESTICK_API_FILTER_COLUMNS,
  KALSHI_LIVE_CANDLESTICK_COLUMNS,
} from "@/lib/kalshiLive/candlesticksColumns";
import {
  KALSHI_LIVE_TRADES_API_FILTER_COLUMNS,
  KALSHI_LIVE_TRADES_COLUMNS,
  TRADES_API_WHERE_COLUMN_LIST,
} from "@/lib/kalshiLive/tradesColumns";
import {
  KALSHI_LIVE_ORDERBOOK_API_FILTER_COLUMNS,
  KALSHI_LIVE_ORDERBOOK_COLUMNS,
  ORDERBOOK_API_WHERE_COLUMN_LIST,
} from "@/lib/kalshiLive/orderbookColumns";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { validateKalshiLiveMarketFilters } from "@/lib/kalshiLive/marketFilterRules";
import { KALSHI_LIVE_SERIES_COLUMNS } from "@/lib/kalshiLive/seriesColumns";
import {
  isKalshiLiveKnownCategory,
  KALSHI_LIVE_CATEGORY_OTHER,
  KALSHI_LIVE_KNOWN_CATEGORY_VALUES,
} from "@/lib/kalshiLive/kalshiLiveCategories";
import { validateKalshiLiveSeriesListFilters } from "@/lib/kalshiLive/seriesListFilterRules";

/** @typedef {{ id: string; column: string; op: string; value?: string | number; categoryOtherText?: string }} KalshiLiveWhereFilter */

/** @typedef {{ id: string; column: string; direction: "asc" | "desc" }} KalshiLiveSortClause */

const MARKET_TS_GT = {
  created_time: "min_created_ts",
  close_time: "min_close_ts",
  settlement_ts: "min_settled_ts",
  updated_time: "min_updated_ts",
};

const MARKET_TS_LT = {
  created_time: "max_created_ts",
  close_time: "max_close_ts",
  settlement_ts: "max_settled_ts",
  updated_time: "max_updated_ts",
};

const CANDLESTICK_API_WHERE_COLUMNS = [
  "start_ts",
  "end_ts",
  "period_interval",
  "include_latest_before_start",
];

/** @param {string} endpointId */
export function getKalshiLiveAllColumnNames(endpointId) {
  if (endpointId === "candlesticks") {
    const sheet = KALSHI_LIVE_CANDLESTICK_COLUMNS.map((c) => c.name);
    const api = CANDLESTICK_API_WHERE_COLUMNS.filter((c) => !sheet.includes(c));
    return [...api, ...sheet];
  }
  if (endpointId === "trades") {
    const sheet = KALSHI_LIVE_TRADES_COLUMNS.map((c) => c.name);
    const api = TRADES_API_WHERE_COLUMN_LIST.filter((c) => !sheet.includes(c));
    return [...api, ...sheet];
  }
  if (endpointId === "orderbook") {
    const sheet = KALSHI_LIVE_ORDERBOOK_COLUMNS.map((c) => c.name);
    const api = ORDERBOOK_API_WHERE_COLUMN_LIST.filter((c) => !sheet.includes(c));
    return [...api, ...sheet];
  }
  const cols =
    endpointId === "markets"
      ? KALSHI_LIVE_MARKETS_COLUMNS
      : endpointId === "series" || endpointId === "seriesList"
        ? KALSHI_LIVE_SERIES_COLUMNS
        : [];
  return cols.map((c) => c.name);
}

/** @param {string} endpointId */
export function getKalshiLiveColumnType(endpointId, column) {
  if (endpointId === "candlesticks") {
    if (KALSHI_LIVE_CANDLESTICK_API_FILTER_COLUMNS.has(column)) {
      if (column === "period_interval") return "number";
      if (column === "include_latest_before_start") return "boolean";
      if (column.endsWith("_ts")) return "timestamp";
      return "string";
    }
    const row = KALSHI_LIVE_CANDLESTICK_COLUMNS.find((c) => c.name === column);
    if (row?.type === "nullable_number") return "number";
    return row?.type || "string";
  }
  if (endpointId === "trades") {
    if (KALSHI_LIVE_TRADES_API_FILTER_COLUMNS.has(column)) return "timestamp";
    const row = KALSHI_LIVE_TRADES_COLUMNS.find((c) => c.name === column);
    return row?.type || "string";
  }
  if (endpointId === "orderbook") {
    if (KALSHI_LIVE_ORDERBOOK_API_FILTER_COLUMNS.has(column)) return "number";
    const row = KALSHI_LIVE_ORDERBOOK_COLUMNS.find((c) => c.name === column);
    return row?.type || "string";
  }
  const cols =
    endpointId === "markets"
      ? KALSHI_LIVE_MARKETS_COLUMNS
      : KALSHI_LIVE_SERIES_COLUMNS;
  const row = cols.find((c) => c.name === column);
  return row?.type || "string";
}

/**
 * @param {string} endpointId
 * @param {KalshiLiveWhereFilter[]} whereFilters
 * @returns {string | null}
 */
export function validateKalshiLiveWhereFilters(endpointId, whereFilters) {
  const list = Array.isArray(whereFilters) ? whereFilters : [];

  if (endpointId === "series") {
    const ticker = list.find((f) => f.column === "ticker" && String(f.value ?? "").trim());
    if (!ticker) return "Add a Where filter: ticker equals your series ticker.";
    return null;
  }

  if (endpointId === "markets") {
    const apiFilters = marketApiFiltersFromWhere(list);
    const tickers = marketTickersFromWhere(list);
    return validateKalshiLiveMarketFilters(apiFilters);
  }

  if (endpointId === "seriesList") {
    const { apiFilters } = partitionSeriesListWhere(list);
    return validateKalshiLiveSeriesListFilters(apiFilters);
  }

  if (endpointId === "candlesticks" || endpointId === "trades" || endpointId === "orderbook") {
    return null;
  }

  return null;
}

/**
 * @param {KalshiLiveWhereFilter[]} whereFilters
 */
function marketTickersFromWhere(whereFilters) {
  const t = (whereFilters || []).find((f) => f.column === "ticker" && f.op === "eq");
  return t ? String(t.value ?? "").trim() : "";
}

/**
 * @param {KalshiLiveWhereFilter[]} whereFilters
 * @returns {import("@/lib/kalshiLive/marketFilterRules").KalshiLiveApiFilter[]}
 */
function marketApiFiltersFromWhere(whereFilters) {
  /** @type {import("@/lib/kalshiLive/marketFilterRules").KalshiLiveApiFilter[]} */
  const out = [];
  for (const f of whereFilters || []) {
    if (f.column === "ticker") continue;
    if (f.column === "status" && f.op === "eq") {
      const v = String(f.value ?? "").trim();
      if (v) out.push({ id: f.id, kind: "status", field: "status", value: v });
      continue;
    }
    const gtField = MARKET_TS_GT[f.column];
    const ltField = MARKET_TS_LT[f.column];
    if (f.op === "gt" && gtField && Number.isFinite(Number(f.value))) {
      out.push({ id: f.id, kind: "timestamp", field: gtField, value: Math.floor(Number(f.value)) });
    }
    if (f.op === "lt" && ltField && Number.isFinite(Number(f.value))) {
      out.push({ id: f.id, kind: "timestamp", field: ltField, value: Math.floor(Number(f.value)) });
    }
  }
  return out;
}

/**
 * @param {KalshiLiveWhereFilter[]} whereFilters
 */
function partitionSeriesListWhere(whereFilters) {
  /** @type {import("@/lib/kalshiLive/seriesListFilterRules").KalshiLiveSeriesListFilter[]} */
  const apiFilters = [];
  /** @type {KalshiLiveWhereFilter[]} */
  const clientFilters = [];

  for (const f of whereFilters || []) {
    if (f.column === "category") {
      const preset = String(f.value ?? "").trim();
      if (preset && preset !== KALSHI_LIVE_CATEGORY_OTHER && isKalshiLiveKnownCategory(preset)) {
        apiFilters.push({ id: f.id, kind: "category", field: "category", value: preset });
      } else {
        clientFilters.push(f);
      }
      continue;
    }
    if (f.column === "tags" && f.op === "eq") {
      const v = String(f.value ?? "").trim();
      if (v) {
        apiFilters.push({ id: f.id, kind: "tags", field: "tags", value: v });
        continue;
      }
    }
    if (f.column === "last_updated_ts" && f.op === "gt" && Number.isFinite(Number(f.value))) {
      apiFilters.push({
        id: f.id,
        kind: "min_updated_ts",
        field: "min_updated_ts",
        value: Math.floor(Number(f.value)),
      });
      continue;
    }
    clientFilters.push(f);
  }

  return { apiFilters, clientFilters };
}

/**
 * @param {string} endpointId
 * @param {KalshiLiveWhereFilter[]} whereFilters
 */
export function partitionKalshiLiveCompose(endpointId, whereFilters) {
  const list = Array.isArray(whereFilters) ? whereFilters : [];

  if (endpointId === "series") {
    return {
      marketApiFilters: [],
      marketTickers: "",
      seriesTicker: String(list.find((f) => f.column === "ticker")?.value ?? "").trim().toUpperCase(),
      seriesListApiFilters: [],
      clientWhere: [],
    };
  }

  if (endpointId === "markets") {
    return {
      marketApiFilters: marketApiFiltersFromWhere(list),
      marketTickers: marketTickersFromWhere(list),
      seriesTicker: "",
      seriesListApiFilters: [],
      clientWhere: list.filter((f) => {
        if (f.column === "ticker") return false;
        if (f.column === "status" && f.op === "eq" && String(f.value ?? "").trim()) return false;
        if (f.op === "gt" && MARKET_TS_GT[f.column] && Number.isFinite(Number(f.value))) {
          return false;
        }
        if (f.op === "lt" && MARKET_TS_LT[f.column] && Number.isFinite(Number(f.value))) {
          return false;
        }
        return true;
      }),
    };
  }

  if (endpointId === "seriesList") {
    const { apiFilters, clientFilters } = partitionSeriesListWhere(list);
    return {
      marketApiFilters: [],
      marketTickers: "",
      seriesTicker: "",
      seriesListApiFilters: apiFilters,
      clientWhere: clientFilters,
    };
  }

  return {
    marketApiFilters: [],
    marketTickers: "",
    seriesTicker: "",
    seriesListApiFilters: [],
    clientWhere: [],
  };
}

function cellRawValue(row, column) {
  if (!row || typeof row !== "object") return "";
  const v = row[column];
  if (v == null) return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return v;
}

function cellCompareString(row, column) {
  return String(cellRawValue(row, column) ?? "").toLowerCase();
}

function cellNumber(row, column) {
  const raw = cellRawValue(row, column);
  const n = parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function cellTimeMs(row, column) {
  const raw = cellRawValue(row, column);
  const n = Number(raw);
  if (Number.isFinite(n) && n > 1e11) return n;
  const d = new Date(String(raw));
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * @param {Record<string, unknown>} row
 * @param {KalshiLiveWhereFilter} f
 */
function matchesWhereFilter(row, f) {
  const col = f.column;
  const op = String(f.op || "eq");
  const val = f.value;

  if (col === "category") {
    const cat = cellCompareString(row, "category");
    const preset = String(val ?? "").trim();
    const otherText = String(f.categoryOtherText ?? "").trim().toLowerCase();

    if (preset === KALSHI_LIVE_CATEGORY_OTHER) {
      if (otherText) return cat.includes(otherText);
      return !KALSHI_LIVE_KNOWN_CATEGORY_VALUES.some((k) => k.toLowerCase() === cat);
    }
    if (op === "eq") return cat === String(val ?? "").trim().toLowerCase();
    if (op === "neq") return cat !== String(val ?? "").trim().toLowerCase();
    if (op === "contains") return cat.includes(String(val ?? "").trim().toLowerCase());
    return true;
  }

  const type = col.includes("_ts") || col.includes("_time") ? "timestamp" : "string";
  const strVal = String(val ?? "").trim().toLowerCase();

  if (op === "contains") {
    return cellCompareString(row, col).includes(strVal);
  }
  if (op === "eq") {
    if (type === "timestamp") {
      return cellTimeMs(row, col) === Number(val);
    }
    const rawBool = cellRawValue(row, col);
    if (typeof rawBool === "boolean" || val === "true" || val === "false") {
      const want = val === true || val === "true";
      return Boolean(rawBool) === want;
    }
    if (typeof val === "number" || (strVal !== "" && !Number.isNaN(Number(val)))) {
      return cellNumber(row, col) === Number(val);
    }
    return cellCompareString(row, col) === strVal;
  }
  if (op === "neq") {
    return cellCompareString(row, col) !== strVal;
  }
  if (op === "gt") {
    if (type === "timestamp") return cellTimeMs(row, col) > Number(val);
    return cellNumber(row, col) > Number(val);
  }
  if (op === "lt") {
    if (type === "timestamp") return cellTimeMs(row, col) < Number(val);
    return cellNumber(row, col) < Number(val);
  }

  return true;
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {KalshiLiveWhereFilter[]} clientWhere
 */
export function applyKalshiLiveClientWhere(rows, clientWhere) {
  const filters = Array.isArray(clientWhere) ? clientWhere : [];
  if (!filters.length) return rows;
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    filters.every((f) => matchesWhereFilter(row, f)),
  );
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {KalshiLiveSortClause[]} sortClauses
 */
export function applyKalshiLiveClientSort(rows, sortClauses, endpointId = "seriesList") {
  const clauses = Array.isArray(sortClauses) ? sortClauses.filter((s) => s.column) : [];
  if (!clauses.length) return rows;
  const list = [...(Array.isArray(rows) ? rows : [])];
  list.sort((a, b) => {
    for (const s of clauses) {
      const col = s.column;
      const dir = s.direction === "desc" ? -1 : 1;
      const type = getKalshiLiveColumnType(endpointId, col);
      let cmp = 0;
      if (type === "number" || col === "volume_fp" || col.endsWith("_fp")) {
        cmp = cellNumber(a, col) - cellNumber(b, col);
      } else if (type === "timestamp" || col.endsWith("_ts") || col.endsWith("_time")) {
        cmp = cellTimeMs(a, col) - cellTimeMs(b, col);
      } else {
        cmp = cellCompareString(a, col).localeCompare(cellCompareString(b, col));
      }
      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  });
  return list;
}

/**
 * @param {string} endpointId
 * @param {KalshiLiveWhereFilter[]} whereFilters
 * @param {KalshiLiveSortClause[]} sortClauses
 * @param {{ limit?: number }} [opts]
 */
export function summarizeKalshiLiveComposeRequest(endpointId, whereFilters, sortClauses, opts = {}) {
  const parts = [`Kalshi Live · ${endpointId}`];
  const { marketApiFilters, marketTickers, seriesTicker, seriesListApiFilters, clientWhere } =
    partitionKalshiLiveCompose(endpointId, whereFilters);

  if (endpointId === "markets") {
    parts[0] = "GET /markets";
    if (marketTickers) parts.push(`tickers=${marketTickers}`);
    for (const f of marketApiFilters) {
      if (f.kind === "status") parts.push(`status=${f.value}`);
      if (f.kind === "timestamp") parts.push(`${f.field}=${f.value}`);
    }
  } else if (endpointId === "series") {
    parts[0] = `GET /series/${seriesTicker || "?"}`;
  } else if (endpointId === "seriesList") {
    parts[0] = "GET /series";
    for (const f of seriesListApiFilters) {
      if (f.kind === "category") parts.push(`category=${f.value}`);
      if (f.kind === "tags") parts.push(`tags=${f.value}`);
      if (f.kind === "min_updated_ts") parts.push(`min_updated_ts=${f.value}`);
    }
    parts.push("include_volume=true");
  }

  if (clientWhere.length) parts.push(`clientWhere=${clientWhere.length}`);
  for (const s of sortClauses || []) {
    if (s.column) parts.push(`sort ${s.column} ${s.direction}`);
  }
  if (opts.limit != null) parts.push(`limit=${opts.limit}`);
  return parts.join(" · ");
}
