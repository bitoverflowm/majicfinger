/**
 * Polymarket HTTP bases (defaults = production).
 * CLOB V2 preview host (until ~2026-04-28 cutover): https://clob-v2.polymarket.com — set POLYMARKET_CLOB_API_URL to test.
 * After cutover, production stays https://clob.polymarket.com (per Polymarket migration guide).
 * This integration only uses public GETs (Gamma, Data API, CLOB read); no order signing / legacy clob-client.
 */
function polymarketApiBase(envVar, fallback) {
  const v = process.env[envVar];
  if (typeof v !== "string" || !v.trim()) return fallback;
  return v.trim().replace(/\/$/, "");
}

const GAMMA_BASE = polymarketApiBase("POLYMARKET_GAMMA_API_URL", "https://gamma-api.polymarket.com");
const DATA_API_BASE = polymarketApiBase("POLYMARKET_DATA_API_URL", "https://data-api.polymarket.com");
const CLOB_BASE = polymarketApiBase("POLYMARKET_CLOB_API_URL", "https://clob.polymarket.com");

const EVENTS_PARAMS = [
  "limit", "offset", "order", "ascending",
  "id", "tag_id", "exclude_tag_id", "slug", "tag_slug", "related_tags",
  "series_id", "series_slug",
  "active", "archived", "featured", "cyom", "include_chat", "include_template",
  "recurrence", "closed", "liquidity_min", "liquidity_max", "volume_min", "volume_max",
  "start_date_min", "start_date_max", "end_date_min", "end_date_max",
];

const MARKETS_PARAMS = [
  "limit", "offset", "order", "ascending",
  "id", "slug", "clob_token_ids", "condition_ids", "market_maker_address",
  "liquidity_num_min", "liquidity_num_max", "volume_num_min", "volume_num_max",
  "start_date_min", "start_date_max", "end_date_min", "end_date_max",
  "tag_id", "related_tags", "cyom", "uma_resolution_status", "game_id", "sports_market_types",
  "rewards_min_size", "question_ids", "include_tag", "closed",
  "decimalized", "tag_match", "rfq_enabled", "locale",
];

const MARKETS_KEYSET_PARAMS = [
  "limit", "order", "ascending", "after_cursor",
  "id", "slug", "closed", "decimalized",
  "clob_token_ids", "condition_ids", "question_ids",
  "liquidity_num_min", "liquidity_num_max", "volume_num_min", "volume_num_max",
  "start_date_min", "start_date_max", "end_date_min", "end_date_max",
  "tag_id", "related_tags", "tag_match", "cyom", "rfq_enabled",
  "uma_resolution_status", "game_id", "sports_market_types", "include_tag", "locale",
];

const SERIES_PARAMS = [
  "limit",
  "offset",
  "order",
  "ascending",
  "slug",
  "categories_ids",
  "categories_labels",
  "closed",
  "include_chat",
  "recurrence",
  "exclude_events",
];

/** Parse outcomes/outcomePrices from API (may be JSON string or array) */
function parseOutcomesAndPrices(market) {
  let outcomes = market.outcomes;
  let outcomePrices = market.outcomePrices;
  if (typeof outcomes === "string") {
    try {
      outcomes = JSON.parse(outcomes);
    } catch {
      outcomes = [];
    }
  }
  if (typeof outcomePrices === "string") {
    try {
      outcomePrices = JSON.parse(outcomePrices);
    } catch {
      outcomePrices = [];
    }
  }
  if (!Array.isArray(outcomes)) outcomes = [];
  if (!Array.isArray(outcomePrices)) outcomePrices = [];
  return { outcomes, outcomePrices };
}

/** Determine winner for closed market: outcome with highest price (Polymarket: winner ≈ 1) */
function getWinner(outcomes, outcomePrices) {
  if (!outcomes?.length || !outcomePrices?.length) return "";
  let maxIdx = 0;
  let maxPrice = -1;
  for (let i = 0; i < Math.min(outcomes.length, outcomePrices.length); i++) {
    const p = parseFloat(outcomePrices[i]);
    if (!Number.isNaN(p) && p > maxPrice) {
      maxPrice = p;
      maxIdx = i;
    }
  }
  return maxPrice >= 0 ? String(outcomes[maxIdx]) : "";
}

/** True if key is a token/condition ID field (preserve as string, no truncation) */
function isTokenIdKey(key) {
  const k = String(key).toLowerCase();
  return k === "conditionid" || k === "condition_id" || k === "clobtokenids" || k === "clob_token_ids" || k.endsWith("_conditionid") || k.endsWith("_condition_id") || k.endsWith("_clobtokenids") || k.endsWith("_clob_token_ids");
}

/** Flatten object for sheet, optionally excluding keys. Used for outcome-optimized rows. */
function flattenForOutcomeRow(obj, excludeKeys = new Set()) {
  if (obj === null || obj === undefined) return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (excludeKeys.has(k)) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) out[k] = "";
      else if (typeof v[0] === "object" && v[0] !== null && !(v[0] instanceof Date)) {
        out[k] = JSON.stringify(v);
      } else {
        out[k] = v.map((x) => (isTokenIdKey(k) && typeof x === "number" ? String(x) : x)).join(", ");
      }
    } else if (v !== null && typeof v === "object" && !(v instanceof Date) && typeof v !== "function") {
      Object.assign(out, flattenForSheet(v, k));
    } else {
      let val = v === null || v === undefined ? "" : v;
      if (isTokenIdKey(k) && typeof val === "number") val = String(val);
      out[k] = val;
    }
  }
  return out;
}

/** Convert Events or Markets response to outcome-optimized format: one row per outcome, with all source fields */
function toOutcomeOptimizedFormat(data, source, fieldsFilter) {
  const rows = [];
  const arr = Array.isArray(data) ? data : data != null ? [data] : [];

  if (source === "events") {
    for (const event of arr) {
      const eventCategory = event.category ?? "";
      const markets = event.markets ?? [];
      const eventFlat = flattenForOutcomeRow(event, new Set(["markets"]));

      for (const market of markets) {
        const { outcomes, outcomePrices } = parseOutcomesAndPrices(market);
        const marketId = String(market.id ?? market.conditionId ?? "").trim();
        const category = market.category ?? eventCategory;
        const closed = market.closed === true || market.closed === "true";
        const winner = closed ? getWinner(outcomes, outcomePrices) : "";

        const marketFlat = flattenForOutcomeRow(market, new Set(["outcomes", "outcomePrices", "events"]));

        const n = Math.min(outcomes.length, outcomePrices.length);
        for (let i = 0; i < n; i++) {
          const price = outcomePrices[i] != null ? String(outcomePrices[i]) : "";
          const row = {
            ...eventFlat,
            ...marketFlat,
            marketId: marketId || String(marketFlat.id ?? marketFlat.conditionId ?? "").trim(),
            eventId: event.id ?? "",
            outcome: String(outcomes[i]),
            price,
            closed,
            winner: closed ? winner : "",
          };
          rows.push(row);
        }
      }
    }
  } else if (source === "markets") {
    for (const market of arr) {
      const { outcomes, outcomePrices } = parseOutcomesAndPrices(market);
      const marketId = String(market.id ?? market.conditionId ?? "").trim();
      const eventId = market.events?.[0]?.id ?? "";
      const closed = market.closed === true || market.closed === "true";
      const winner = closed ? getWinner(outcomes, outcomePrices) : "";

      const marketFlat = flattenForOutcomeRow(market, new Set(["outcomes", "outcomePrices", "events"]));

      const n = Math.min(outcomes.length, outcomePrices.length);
      for (let i = 0; i < n; i++) {
        const price = outcomePrices[i] != null ? String(outcomePrices[i]) : "";
        const row = {
          ...marketFlat,
          marketId: marketId || String(marketFlat.id ?? marketFlat.conditionId ?? "").trim(),
          eventId,
          outcome: String(outcomes[i]),
          price,
          closed,
          winner: closed ? winner : "",
        };
        rows.push(row);
      }
    }
  }

  if (fieldsFilter && fieldsFilter.length > 0) {
    const set = new Set(fieldsFilter.map((f) => f.trim()).filter(Boolean));
    if (set.size > 0) {
      return sortByDate(rows.map((row) => {
        const out = {};
        for (const k of Object.keys(row)) {
          if (set.has(k)) out[k] = row[k];
        }
        return out;
      }));
    }
  }
  return sortByDate(rows);
}

/** Flatten nested objects for ag-grid; stringify arrays of objects */
function flattenForSheet(obj, prefix = "") {
  if (obj === null || obj === undefined) return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}_${k}` : k;
    if (Array.isArray(v)) {
      if (v.length === 0) out[key] = "";
      else if (typeof v[0] === "object" && v[0] !== null && !(v[0] instanceof Date)) {
        out[key] = JSON.stringify(v);
      } else {
        out[key] = v.map((x) => (isTokenIdKey(key) && typeof x === "number" ? String(x) : x)).join(", ");
      }
    } else if (v !== null && typeof v === "object" && !(v instanceof Date) && typeof v !== "function") {
      Object.assign(out, flattenForSheet(v, key));
    } else {
      let val = v === null || v === undefined ? "" : v;
      if (isTokenIdKey(key) && typeof val === "number") val = String(val);
      out[key] = val;
    }
  }
  return out;
}

/** Sort rows by first available date column (chronological for charting) */
function sortByDate(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const sample = rows[0];
  const dateKey = Object.keys(sample).find((k) => {
    const v = sample[k];
    if (typeof v !== "string") return false;
    return /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d+$/.test(v);
  });
  if (!dateKey) return rows;
  return [...rows].sort((a, b) => {
    const va = a[dateKey];
    const vb = b[dateKey];
    if (va == null || va === "") return 1;
    if (vb == null || vb === "") return -1;
    const ta = /^\d+$/.test(va) ? parseInt(va, 10) : new Date(va).getTime();
    const tb = /^\d+$/.test(vb) ? parseInt(vb, 10) : new Date(vb).getTime();
    return ta - tb;
  });
}

function normalizeResponse(data, fieldsFilter) {
  const arr = Array.isArray(data) ? data : data != null ? [data] : [];
  let flattened = arr.map((item) => flattenForSheet(item));
  if (fieldsFilter && fieldsFilter.length > 0) {
    const set = new Set(fieldsFilter.map((f) => f.trim()).filter(Boolean));
    if (set.size > 0) {
      flattened = flattened.map((row) => {
        const out = {};
        for (const k of Object.keys(row)) {
          if (set.has(k)) out[k] = row[k];
        }
        return out;
      });
    }
  }
  return sortByDate(flattened);
}

/**
 * Expand Data API MetaHolder[] into one sheet row per holder.
 * @param {unknown} data
 * @param {string[] | null} fieldsFilter
 */
function expandHoldersResponse(data, fieldsFilter) {
  const arr = Array.isArray(data) ? data : data != null ? [data] : [];
  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const meta = /** @type {Record<string, unknown>} */ (item);
    const token = meta.token != null ? String(meta.token) : "";
    const holders = Array.isArray(meta.holders) ? meta.holders : null;
    if (!holders) {
      rows.push(flattenForSheet(meta));
      continue;
    }
    if (!holders.length) {
      rows.push({ token });
      continue;
    }
    for (const h of holders) {
      if (!h || typeof h !== "object") continue;
      rows.push({ token, ...flattenForSheet(h) });
    }
  }
  if (fieldsFilter && fieldsFilter.length > 0) {
    const set = new Set(fieldsFilter.map((f) => f.trim()).filter(Boolean));
    if (set.size > 0) {
      return rows.map((row) => {
        const out = {};
        for (const k of Object.keys(row)) {
          if (set.has(k)) out[k] = row[k];
        }
        return out;
      });
    }
  }
  return rows;
}

function buildSearchParams(allowed, query) {
  const p = new URLSearchParams();
  allowed.forEach((param) => {
    const v = query[param];
    if (v !== undefined && v !== "") p.set(param, String(v));
  });
  return p;
}

/** ERC1155 token/condition ID fields - must stay as strings, never parsed as numbers */
const TOKEN_ID_KEYS = [
  "conditionId",
  "condition_id",
  "id",
  "clobTokenIds",
  "clob_token_ids",
  "token_id",
  "asset_id",
];

/** Preprocess JSON text so large numbers in token ID fields are quoted (preserve full precision) */
function preserveTokenIdsInJson(text) {
  let result = text;
  for (const key of TOKEN_ID_KEYS) {
    // "conditionId": 1126086428953813... or "conditionId": 1.126e+77 -> "conditionId": "1126..."
    result = result.replace(
      new RegExp(`"${key}"\\s*:\\s*((?:\\d{15,})|(?:[\\d.]+e[+-]?\\d+))`, "gi"),
      (_, num) => `"${key}": "${num}"`
    );
  }
  // clobTokenIds array: [123456..., 789...] -> ["123456...", "789..."] (numbers inside array)
  result = result.replace(
    /"(clobTokenIds|clob_token_ids)"\s*:\s*\[([^\]]*)\]/g,
    (match, key, inner) => {
      const quoted = inner.split(",").map((s) => {
        const n = s.trim();
        if (/^\d+$/.test(n)) return `"${n}"`;
        if (/^[\d.e+-]+$/i.test(n)) return `"${n}"`;
        return s;
      }).join(", ");
      return `"${key}": [${quoted}]`;
    }
  );
  return result;
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  const text = await res.text();
  const preserved = preserveTokenIdsInJson(text);
  return JSON.parse(preserved);
}

/**
 * CLOB batch token endpoints. GET /prices?token_ids&sides and
 * GET /midpoints?token_ids and GET /last-trades-prices?token_ids still
 * answer `Invalid payload`, so more than one price, midpoint, or last trade
 * goes through POST. One price uses GET /price. One midpoint uses
 * GET /midpoint. One spread uses GET /spread. One last trade uses
 * GET /last-trade-price.
 */
const CLOB_BATCH_TOKEN_PATHS = {
  getOrderBooks: "books",
  getSpreads: "spreads",
  getMarketPrices: "prices",
  getMidpointPrices: "midpoints",
  getLastTradePrices: "last-trades-prices",
};

const CLOB_BATCH_TOKEN_LIMIT = 500;

/**
 * @param {string} path
 * @param {Record<string, string>[]} payload
 */
async function postClobTokenBatch(path, payload) {
  return fetchJson(`${CLOB_BASE}/${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/**
 * One token and one side: GET /price, shaped like the /prices map.
 * Several pairs: POST /prices. The query-parameter GET stays unused.
 * @param {{ token_id: string, side?: string }[]} pairs
 */
async function fetchMarketPrices(pairs) {
  const rows = (Array.isArray(pairs) ? pairs : [])
    .map((row) => ({
      token_id: String(row?.token_id || "").trim(),
      side: String(row?.side || "").trim().toUpperCase(),
    }))
    .filter((row) => row.token_id);
  if (rows.length === 1) {
    const row = rows[0];
    if (row.side !== "BUY" && row.side !== "SELL") {
      throw new Error("side must be BUY or SELL");
    }
    const body = await fetchJson(
      `${CLOB_BASE}/price?token_id=${encodeURIComponent(row.token_id)}&side=${encodeURIComponent(row.side)}`,
    );
    return { [row.token_id]: { [row.side]: body?.price } };
  }
  return postClobTokenBatch(
    "prices",
    rows.map((row) => ({ token_id: row.token_id, side: row.side })),
  );
}

/**
 * One token: GET /midpoint, shaped like the /midpoints map.
 * Several tokens: POST /midpoints. Side is not part of the midpoint.
 * @param {string[]} tokenIds
 */
async function fetchMidpointPrices(tokenIds) {
  const ids = [...new Set((Array.isArray(tokenIds) ? tokenIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (ids.length === 1) {
    const body = await fetchJson(`${CLOB_BASE}/midpoint?token_id=${encodeURIComponent(ids[0])}`);
    const price = body?.mid ?? body?.mid_price ?? body?.price ?? "";
    return { [ids[0]]: price };
  }
  return postClobTokenBatch(
    "midpoints",
    ids.map((token_id) => ({ token_id })),
  );
}

/**
 * One token: GET /spread, shaped like the /spreads map.
 * Several tokens: POST /spreads. Side is not part of the spread.
 * @param {string[]} tokenIds
 */
async function fetchSpreads(tokenIds) {
  const ids = [...new Set((Array.isArray(tokenIds) ? tokenIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (ids.length === 1) {
    const body = await fetchJson(`${CLOB_BASE}/spread?token_id=${encodeURIComponent(ids[0])}`);
    return { [ids[0]]: body?.spread ?? "" };
  }
  return postClobTokenBatch(
    "spreads",
    ids.map((token_id) => ({ token_id })),
  );
}

/**
 * One token: GET /last-trade-price, shaped like the /last-trades-prices array.
 * Several tokens: POST /last-trades-prices. The query-parameter GET still
 * returns Invalid payload. At most 500 tokens per call.
 * @param {string[]} tokenIds
 */
async function fetchLastTradePrices(tokenIds) {
  const ids = [...new Set((Array.isArray(tokenIds) ? tokenIds : []).map((id) => String(id || "").trim()).filter(Boolean))].slice(0, 500);
  if (ids.length === 1) {
    const body = await fetchJson(`${CLOB_BASE}/last-trade-price?token_id=${encodeURIComponent(ids[0])}`);
    return [{ token_id: ids[0], price: body?.price ?? "", side: body?.side ?? "" }];
  }
  const rows = [];
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const body = await postClobTokenBatch(
      "last-trades-prices",
      chunk.map((token_id) => ({ token_id })),
    );
    if (Array.isArray(body)) rows.push(...body);
  }
  return rows;
}

/** Polymarket prices-history: startTs/endTs are Unix epoch seconds (UTC instant); API types them as number (double). */
function toUnixSeconds(value) {
  if (value === undefined || value === null || value === "") return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d+(\.\d+)?$/.test(raw)) {
    return String(Math.floor(Number(raw)));
  }
  const parsed = new Date(raw).getTime();
  if (!Number.isFinite(parsed)) return "";
  return String(Math.floor(parsed / 1000));
}

function intervalToSeconds(interval) {
  switch (String(interval || "")) {
    case "1m":
      return 60;
    case "1h":
      return 60 * 60;
    case "6h":
      return 6 * 60 * 60;
    case "1d":
      return 24 * 60 * 60;
    case "1w":
      return 7 * 24 * 60 * 60;
    default:
      return null;
  }
}

/** Polymarket prices-history: long ranges + `interval=max` + fine fidelity are flaky; chunk by wall time (see py-clob-client#216). */
const PRICES_HISTORY_MAX_CHUNK_SEC = 15 * 24 * 3600;
const PRICES_HISTORY_MAX_POINTS = 1000;

function pricesHistoryBucketSeconds(interval, fidelity) {
  const intervalSeconds = intervalToSeconds(interval);
  const fidelityMinutes = Number(fidelity);
  if (Number.isFinite(fidelityMinutes) && fidelityMinutes > 0) {
    return fidelityMinutes * 60;
  }
  return intervalSeconds;
}

/** Max seconds per upstream request so estimated samples stay under PRICES_HISTORY_MAX_POINTS when bucket is known. */
function pricesHistoryChunkSpanSec(bucketSeconds) {
  if (Number.isFinite(bucketSeconds) && bucketSeconds > 0) {
    const fromPoints = Math.floor((PRICES_HISTORY_MAX_POINTS - 1) * bucketSeconds);
    return Math.min(PRICES_HISTORY_MAX_CHUNK_SEC, Math.max(60, fromPoints));
  }
  return PRICES_HISTORY_MAX_CHUNK_SEC;
}

/** `interval=max|all` with explicit start/end is unreliable; prefer startTs/endTs + fidelity only (community workaround). */
function omitPricesHistoryIntervalParam(interval) {
  const i = String(interval || "").toLowerCase();
  return i === "max" || i === "all";
}

function dedupeHistoryByT(history) {
  const byT = new Map();
  for (const point of history) {
    const t = point?.t;
    const tn = Number(t);
    if (!Number.isFinite(tn)) continue;
    byT.set(tn, point);
  }
  return Array.from(byT.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, p]) => p);
}

async function fetchPolymarketPricesHistoryRaw(marketId, { startTsStr, endTsStr, interval, fidelity }) {
  const omitInterval = omitPricesHistoryIntervalParam(interval);
  const priceParams = new URLSearchParams();
  priceParams.set("market", marketId);
  if (startTsStr !== "") priceParams.set("startTs", startTsStr);
  if (endTsStr !== "") priceParams.set("endTs", endTsStr);
  if (!omitInterval && interval !== undefined && interval !== "") {
    priceParams.set("interval", String(interval));
  }
  if (fidelity !== undefined && fidelity !== "") priceParams.set("fidelity", String(fidelity));
  const historyResponse = await fetchJson(`${CLOB_BASE}/prices-history?${priceParams.toString()}`);
  return Array.isArray(historyResponse?.history) ? historyResponse.history : [];
}

async function fetchPolymarketPricesHistoryForRange(marketId, startSec, endSec, { interval, fidelity }) {
  return fetchPolymarketPricesHistoryRaw(marketId, {
    startTsStr: String(startSec),
    endTsStr: String(endSec),
    interval,
    fidelity,
  });
}

async function fetchPolymarketPricesHistoryChunked(marketId, startSec, endSec, { interval, fidelity, bucketSeconds }) {
  const span = endSec - startSec;
  const chunkSpan = pricesHistoryChunkSpanSec(bucketSeconds);
  if (span <= chunkSpan) {
    return fetchPolymarketPricesHistoryForRange(marketId, startSec, endSec, { interval, fidelity });
  }
  const merged = [];
  for (let s = startSec; s < endSec; ) {
    const e = Math.min(s + chunkSpan, endSec);
    if (e <= s) break;
    const part = await fetchPolymarketPricesHistoryForRange(marketId, s, e, { interval, fidelity });
    merged.push(...part);
    s = e;
  }
  return dedupeHistoryByT(merged);
}

/** --- Polymarket metadata lookup (lycheedata.com/polymarket-metadata) --- */

function parsePolymarketLookupInput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty" };

  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase();
    if (host === "polymarket.com" || host.endsWith(".polymarket.com")) {
      const segments = u.pathname.split("/").filter(Boolean);
      if (segments.length > 0) {
        const last = decodeURIComponent(segments[segments.length - 1] || "");
        if (/^0x[a-fA-F0-9]{64}$/.test(last)) {
          return { kind: "condition_id", id: last, from: "url" };
        }
        if (/^\d+$/.test(last)) {
          if (last.length >= 20) return { kind: "clob_token_id", tokenId: last, from: "url" };
          return { kind: "numeric_id", id: last, from: "url" };
        }
        if (last && !last.includes(".")) {
          return { kind: "url_slug", slug: last, segments };
        }
      }
    }
  } catch {
    /* not a URL */
  }

  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return { kind: "condition_id", id: trimmed };
  }
  if (/^\d+$/.test(trimmed)) {
    if (trimmed.length >= 20) {
      return { kind: "clob_token_id", tokenId: trimmed };
    }
    return { kind: "numeric_id", id: trimmed };
  }
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]{0,160}$/.test(trimmed) && !/\s/.test(trimmed)) {
    return { kind: "slug", slug: trimmed };
  }
  return { kind: "text", q: trimmed };
}

async function tryNamedGammaFetch(target, name, url) {
  try {
    target[name] = await fetchJson(url);
    delete target[`${name}_error`];
  } catch (err) {
    target[`${name}_error`] = err.message || String(err);
  }
}

async function tryNamedClobFetch(target, name, url) {
  try {
    target[name] = await fetchJson(url);
    delete target[`${name}_error`];
  } catch (err) {
    target[`${name}_error`] = err.message || String(err);
  }
}

function tagLabelsFromEntity(entity) {
  const tags = entity?.tags;
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (t && typeof t === "object" ? String(t.label || t.slug || "").trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
}

function isSearchRowClosed(value) {
  return value === true || value === "true";
}

/**
 * Gamma `keep_closed_markets=0` still ranks closed events first, and each event
 * can nest dozens of markets. Flattening those before the cap is applied would
 * drop every live hit (e.g. "new york") after the client filters closed rows.
 */
function flattenPublicSearchToSuggestions(searchPayload, max = 28, opts = {}) {
  const excludeClosed = opts.excludeClosed === true;
  const out = [];
  const seen = new Set();
  const add = (row) => {
    if (excludeClosed && isSearchRowClosed(row.closed)) return;
    const k = `${row.entity}:${row.id || ""}:${row.slug || ""}:${row.proxyWallet || ""}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(row);
  };

  const events = searchPayload?.events;
  if (Array.isArray(events)) {
    for (const ev of events) {
      if (!ev) continue;
      const eid = ev.id != null ? String(ev.id) : "";
      const eslug = ev.slug ? String(ev.slug) : "";
      const eticker = ev.ticker ? String(ev.ticker) : "";
      if (eid || eslug) {
        add({
          entity: "event",
          id: eid,
          slug: eslug || undefined,
          ticker: eticker || undefined,
          title: ev.title || ev.ticker || "Event",
          subtitle: ev.subtitle || (ev.description ? String(ev.description).slice(0, 180) : undefined),
          volume: ev.volume ?? null,
          volume24hr: ev.volume24hr ?? null,
          active: ev.active ?? null,
          closed: ev.closed ?? null,
          live: ev.live ?? null,
          archived: ev.archived ?? null,
          featured: ev.featured ?? null,
          new: ev.new ?? null,
          tagLabels: tagLabelsFromEntity(ev),
          raw: ev,
        });
      }
      const markets = ev.markets;
      if (Array.isArray(markets)) {
        for (const m of markets) {
          if (!m) continue;
          const mid = m.id != null ? String(m.id) : "";
          const mslug = m.slug ? String(m.slug) : "";
          if (!mid && !mslug) continue;
          add({
            entity: "market",
            id: mid,
            slug: mslug || undefined,
            ticker: mslug || mid || undefined,
            title: m.question || m.groupItemTitle || "Market",
            subtitle: ev.title ? `Event: ${ev.title}` : undefined,
            conditionId: m.conditionId ?? m.condition_id,
            parentEventId: eid || undefined,
            parentEventSlug: eslug || undefined,
            volume: m.volumeNum ?? m.volume ?? null,
            volume24hr: m.volume24hr ?? null,
            active: m.active ?? null,
            closed: m.closed ?? null,
            live: isSearchRowClosed(m.closed) ? false : m.acceptingOrders === true || m.live === true ? true : null,
            archived: m.archived ?? null,
            featured: m.featured ?? null,
            new: m.new ?? null,
            acceptingOrders: m.acceptingOrders ?? null,
            tagLabels: tagLabelsFromEntity(m),
            raw: m,
          });
        }
      }
    }
  }

  const profiles = searchPayload?.profiles;
  if (Array.isArray(profiles)) {
    for (const p of profiles) {
      if (!p) continue;
      const pid = p.id != null ? String(p.id) : "";
      const wallet = p.proxyWallet ? String(p.proxyWallet) : "";
      const name = String(p.name || p.pseudonym || "").trim();
      if (!pid && !wallet && !name) continue;
      add({
        entity: "profile",
        id: pid,
        slug: undefined,
        ticker: wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : undefined,
        title: name || wallet || "Profile",
        subtitle: p.bio ? String(p.bio).slice(0, 180) : wallet || undefined,
        proxyWallet: wallet || undefined,
        pseudonym: p.pseudonym ? String(p.pseudonym) : undefined,
        volume: null,
        volume24hr: null,
        active: null,
        closed: null,
        live: null,
        tagLabels: [],
        raw: p,
      });
    }
  }

  const tags = searchPayload?.tags;
  if (Array.isArray(tags)) {
    for (const t of tags) {
      if (!t) continue;
      const tid = t.id != null ? String(t.id) : "";
      const label = String(t.label || t.slug || "").trim();
      if (!tid && !label) continue;
      add({
        entity: "tag",
        id: tid,
        slug: t.slug ? String(t.slug) : undefined,
        ticker: t.slug ? String(t.slug) : undefined,
        title: label || "Tag",
        subtitle:
          t.event_count != null ? `${t.event_count} events` : undefined,
        volume: null,
        volume24hr: null,
        active: null,
        closed: null,
        live: null,
        eventCount: t.event_count ?? null,
        tagLabels: [],
        raw: t,
      });
    }
  }

  return out.slice(0, max);
}

async function runMetadataSuggestions(rawQ, limitPerType, opts = {}) {
  const trimmed = String(rawQ || "").trim();
  if (!trimmed) {
    return { query: "", suggestions: [], publicSearch: null };
  }
  const cap = Math.min(50, Math.max(5, limitPerType ?? 20));
  const searchTags = opts.searchTags === true || opts.searchTags === "true" || opts.searchTags === "1";
  const searchProfiles =
    opts.searchProfiles === true ||
    opts.searchProfiles === "true" ||
    opts.searchProfiles === "1";
  const keepClosed =
    opts.keepClosedMarkets === true ||
    opts.keepClosedMarkets === "true" ||
    opts.keepClosedMarkets === "1" ||
    opts.keepClosedMarkets === 1;
  const max = Math.min(200, Math.max(40, cap * 3));
  const loadSearch = (extra) => {
    const ps = new URLSearchParams();
    ps.set("q", trimmed);
    ps.set("limit_per_type", String(cap));
    ps.set("search_tags", searchTags ? "true" : "false");
    ps.set("search_profiles", searchProfiles ? "true" : "false");
    for (const [key, value] of Object.entries(extra)) ps.set(key, value);
    return fetchJson(`${GAMMA_BASE}/public-search?${ps.toString()}`);
  };
  const openSearch = await loadSearch({ keep_closed_markets: "0", events_status: "active" });
  const openSuggestions = flattenPublicSearchToSuggestions(openSearch, max, { excludeClosed: true });
  const closedExtra = [];
  if (keepClosed) {
    const closedSearch = await loadSearch({ keep_closed_markets: "1" });
    const seen = new Set(openSuggestions.map((row) => `${row.entity}:${row.id || ""}:${row.slug || ""}`));
    for (const row of flattenPublicSearchToSuggestions(closedSearch, max)) {
      if (!isSearchRowClosed(row.closed)) continue;
      const key = `${row.entity}:${row.id || ""}:${row.slug || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      closedExtra.push(row);
    }
  }
  return {
    query: trimmed,
    suggestions: [...openSuggestions.slice(0, max), ...closedExtra.slice(0, 24)],
    publicSearch: openSearch,
  };
}

async function runMetadataResolve({ entity, id, slug, tokenId, conditionId }) {
  const out = {
    selection: {
      entity,
      id: id || null,
      slug: slug || null,
      tokenId: tokenId || null,
      conditionId: conditionId || null,
    },
    gammaApi: GAMMA_BASE,
    clobApi: CLOB_BASE,
  };

  if (entity === "event") {
    if (id) {
      await tryNamedGammaFetch(out, "event", `${GAMMA_BASE}/events/${encodeURIComponent(id)}`);
    } else if (slug) {
      await tryNamedGammaFetch(out, "event", `${GAMMA_BASE}/events/slug/${encodeURIComponent(slug)}`);
    }
    return out;
  }

  if (entity === "market") {
    if (tokenId) {
      await tryNamedClobFetch(out, "marketByToken", `${CLOB_BASE}/markets-by-token/${encodeURIComponent(tokenId)}`);
      const cid = out.marketByToken?.condition_id;
      if (cid) {
        const sp = new URLSearchParams();
        sp.set("condition_ids", cid);
        sp.set("limit", "10");
        await tryNamedGammaFetch(out, "marketsByConditionId", `${GAMMA_BASE}/markets?${sp.toString()}`);
        const arr = out.marketsByConditionId;
        const first = Array.isArray(arr) ? arr.find(Boolean) : null;
        if (first?.id != null && String(first.id) !== "") {
          await tryNamedGammaFetch(out, "market", `${GAMMA_BASE}/markets/${encodeURIComponent(String(first.id))}`);
        } else if (first) {
          out.market = first;
        }
      }
    }

    if (!out.market && conditionId) {
      const sp = new URLSearchParams();
      sp.set("condition_ids", conditionId);
      sp.set("limit", "10");
      await tryNamedGammaFetch(out, "marketsByConditionId", `${GAMMA_BASE}/markets?${sp.toString()}`);
      const arr = out.marketsByConditionId;
      const first = Array.isArray(arr) ? arr.find(Boolean) : null;
      if (first?.id != null && String(first.id) !== "") {
        await tryNamedGammaFetch(out, "market", `${GAMMA_BASE}/markets/${encodeURIComponent(String(first.id))}`);
      } else if (first) {
        out.market = first;
      }
    }

    if (!out.market && id) {
      await tryNamedGammaFetch(out, "market", `${GAMMA_BASE}/markets/${encodeURIComponent(id)}`);
    }
    if (!out.market && slug) {
      await tryNamedGammaFetch(out, "market", `${GAMMA_BASE}/markets/slug/${encodeURIComponent(slug)}`);
    }

    const m = out.market;
    if (m) {
      const pe = m.events?.[0];
      if (pe?.id != null && String(pe.id) !== "") {
        await tryNamedGammaFetch(out, "parentEvent", `${GAMMA_BASE}/events/${encodeURIComponent(String(pe.id))}`);
      } else if (pe?.slug) {
        await tryNamedGammaFetch(out, "parentEvent", `${GAMMA_BASE}/events/slug/${encodeURIComponent(pe.slug)}`);
      }
    }
  }

  return out;
}

function filterEventsMarketsBySubstring(rawQ, eventsArr) {
  const qLower = rawQ.toLowerCase();
  const hay = (v) => (v == null ? "" : String(v).toLowerCase());
  const matchObj = (o, keys) => keys.some((k) => hay(o?.[k]).includes(qLower));
  return (Array.isArray(eventsArr) ? eventsArr : []).filter((e) => {
    if (matchObj(e, ["title", "slug", "description", "ticker"])) return true;
    const markets = e?.markets;
    if (!Array.isArray(markets)) return false;
    return markets.some((m) => matchObj(m, ["question", "slug", "description", "groupItemTitle"]));
  });
}

function filterMarketsBySubstring(rawQ, marketsArr) {
  const qLower = rawQ.toLowerCase();
  const hay = (v) => (v == null ? "" : String(v).toLowerCase());
  const matchObj = (o, keys) => keys.some((k) => hay(o?.[k]).includes(qLower));
  return (Array.isArray(marketsArr) ? marketsArr : []).filter((m) =>
    matchObj(m, ["question", "slug", "description", "groupItemTitle", "id"]),
  );
}

async function runPolymarketMetadataLookup(rawQ, opts) {
  const eventListLimit = opts?.eventListLimit ?? 100;
  const marketListLimit = opts?.marketListLimit ?? 100;
  const parsed = parsePolymarketLookupInput(rawQ);
  const out = { query: rawQ, parsed, gammaApi: GAMMA_BASE };

  const ps = new URLSearchParams();
  ps.set("q", rawQ);
  ps.set("limit_per_type", "35");
  ps.set("search_tags", "false");
  ps.set("search_profiles", "false");
  ps.set("keep_closed_markets", "0");
  await tryNamedGammaFetch(out, "publicSearch", `${GAMMA_BASE}/public-search?${ps.toString()}`);

  if (parsed.kind === "numeric_id") {
    const id = encodeURIComponent(parsed.id);
    await tryNamedGammaFetch(out, "marketById", `${GAMMA_BASE}/markets/${id}`);
    await tryNamedGammaFetch(out, "eventById", `${GAMMA_BASE}/events/${id}`);
  }

  if (parsed.kind === "condition_id") {
    const sp = new URLSearchParams();
    sp.set("condition_ids", parsed.id);
    sp.set("limit", "10");
    await tryNamedGammaFetch(out, "marketsByConditionId", `${GAMMA_BASE}/markets?${sp.toString()}`);
  }

  if (parsed.kind === "clob_token_id") {
    await tryNamedClobFetch(out, "marketByToken", `${CLOB_BASE}/markets-by-token/${encodeURIComponent(parsed.tokenId)}`);
    const cid = out.marketByToken?.condition_id;
    if (cid) {
      const sp = new URLSearchParams();
      sp.set("condition_ids", cid);
      sp.set("limit", "10");
      await tryNamedGammaFetch(out, "gammaMarketsByConditionFromToken", `${GAMMA_BASE}/markets?${sp.toString()}`);
    }
  }

  if (parsed.kind === "slug" || parsed.kind === "url_slug") {
    const slug = encodeURIComponent(parsed.slug);
    await tryNamedGammaFetch(out, "marketBySlug", `${GAMMA_BASE}/markets/slug/${slug}`);
    await tryNamedGammaFetch(out, "eventBySlug", `${GAMMA_BASE}/events/slug/${slug}`);
  }

  if (parsed.kind === "text" || parsed.kind === "slug" || parsed.kind === "url_slug") {
    try {
      const evSp = new URLSearchParams();
      evSp.set("limit", String(eventListLimit));
      evSp.set("closed", "false");
      evSp.set("order", "volume");
      evSp.set("ascending", "false");
      const events = await fetchJson(`${GAMMA_BASE}/events?${evSp.toString()}`);
      out.listEventsVolumeOrderSubstringMatch = filterEventsMarketsBySubstring(rawQ, events);
    } catch (err) {
      out.listEventsVolumeOrderSubstringMatch_error = err.message || String(err);
    }

    try {
      const mkSp = new URLSearchParams();
      mkSp.set("limit", String(marketListLimit));
      mkSp.set("closed", "false");
      mkSp.set("order", "volume24hr");
      mkSp.set("ascending", "false");
      const markets = await fetchJson(`${GAMMA_BASE}/markets?${mkSp.toString()}`);
      out.listMarketsVolume24hrOrderSubstringMatch = filterMarketsBySubstring(rawQ, markets);
    } catch (err) {
      out.listMarketsVolume24hrOrderSubstringMatch_error = err.message || String(err);
    }
  }

  const volMk = new URLSearchParams();
  volMk.set("limit", "15");
  volMk.set("closed", "false");
  volMk.set("order", "volume24hr");
  volMk.set("ascending", "false");
  await tryNamedGammaFetch(out, "marketsTopByVolume24hr", `${GAMMA_BASE}/markets?${volMk.toString()}`);

  const volEv = new URLSearchParams();
  volEv.set("limit", "15");
  volEv.set("closed", "false");
  volEv.set("order", "volume");
  volEv.set("ascending", "false");
  await tryNamedGammaFetch(out, "eventsListByVolume", `${GAMMA_BASE}/events?${volEv.toString()}`);

  return out;
}

export default async function handler(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ message: "Missing query parameter" });

  if (req.method === "POST") {
    if (query === "getBatchPricesHistory") {
      try {
        const rawBody = req.body && typeof req.body === "object" ? req.body : {};
        const marketsRaw = Array.isArray(rawBody.markets)
          ? rawBody.markets
          : Array.isArray(rawBody.token_ids)
            ? rawBody.token_ids
            : Array.isArray(rawBody.tokenIds)
              ? rawBody.tokenIds
              : null;
        if (!marketsRaw || !marketsRaw.length) {
          return res.status(400).json({
            message: "POST body must include a non-empty markets array of token/asset ids",
          });
        }
        const markets = marketsRaw
          .map((item) => {
            if (item && typeof item === "object") {
              return String(
                /** @type {Record<string, unknown>} */ (item).token_id ||
                  /** @type {Record<string, unknown>} */ (item).tokenId ||
                  /** @type {Record<string, unknown>} */ (item).market ||
                  "",
              ).trim();
            }
            return String(item ?? "").trim();
          })
          .filter(Boolean);
        if (!markets.length) {
          return res.status(400).json({
            message: "POST body must include at least one market token/asset id",
          });
        }
        if (markets.length > 20) {
          return res.status(400).json({
            message: "A maximum of 20 market token IDs may be requested per batch-prices-history call",
          });
        }
        /** @type {Record<string, unknown>} */
        const payload = { markets };
        const startTs = Number(rawBody.start_ts ?? rawBody.startTs);
        const endTs = Number(rawBody.end_ts ?? rawBody.endTs);
        if (Number.isFinite(startTs) && startTs > 0) payload.start_ts = startTs;
        if (Number.isFinite(endTs) && endTs > 0) payload.end_ts = endTs;
        const interval = String(rawBody.interval || "").trim();
        if (interval) payload.interval = interval;
        const fidelity = Number(rawBody.fidelity);
        if (Number.isFinite(fidelity) && fidelity > 0) payload.fidelity = Math.floor(fidelity);
        const rangeStart = Number(payload.start_ts);
        const rangeEnd = Number(payload.end_ts);
        const hasRange = Number.isFinite(rangeStart) && rangeStart > 0 && Number.isFinite(rangeEnd) && rangeEnd > rangeStart;
        if (hasRange) delete payload.interval;
        if (hasRange && rangeEnd - rangeStart > PRICES_HISTORY_MAX_CHUNK_SEC) {
          const history = {};
          for (const marketId of markets) {
            const merged = [];
            for (let cursor = rangeStart; cursor < rangeEnd; ) {
              const chunkEnd = Math.min(cursor + PRICES_HISTORY_MAX_CHUNK_SEC, rangeEnd);
              if (chunkEnd <= cursor) break;
              const part = await fetchPolymarketPricesHistoryRaw(marketId, {
                startTsStr: String(cursor),
                endTsStr: String(chunkEnd),
                interval: "",
                fidelity: payload.fidelity || "",
              });
              merged.push(...part);
              cursor = chunkEnd;
            }
            history[marketId] = dedupeHistoryByT(merged);
          }
          return res.status(200).json({ history });
        }

        const data = await fetchJson(`${CLOB_BASE}/batch-prices-history`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        return res.status(200).json(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Request failed";
        return res.status(502).json({ message: msg });
      }
    }

    const clobPath = CLOB_BATCH_TOKEN_PATHS[query];
    if (!clobPath) {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ message: "Method not allowed" });
    }
    try {
      const rawBody = req.body;
      const list = Array.isArray(rawBody)
        ? rawBody
        : Array.isArray(rawBody?.params)
          ? rawBody.params
          : Array.isArray(rawBody?.token_ids)
            ? rawBody.token_ids.map((token_id) =>
                typeof token_id === "object" && token_id != null ? token_id : { token_id },
              )
            : null;
      if (!list || !list.length) {
        return res.status(400).json({
          message: "POST body must be a non-empty array of { token_id } objects",
        });
      }
      const payload = list
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const tokenId = String(
            /** @type {Record<string, unknown>} */ (item).token_id ||
              /** @type {Record<string, unknown>} */ (item).tokenId ||
              "",
          ).trim();
          if (!tokenId) return null;
          /** @type {Record<string, string>} */
          const row = { token_id: tokenId };
          const side = String(
            /** @type {Record<string, unknown>} */ (item).side || "",
          ).trim();
          if (side) row.side = side;
          return row;
        })
        .filter(Boolean);
      if (!payload.length) {
        return res.status(400).json({
          message: "POST body must include at least one token_id",
        });
      }
      if (payload.length > CLOB_BATCH_TOKEN_LIMIT) {
        return res.status(400).json({
          message: `A maximum of ${CLOB_BATCH_TOKEN_LIMIT} token IDs may be requested per call`,
        });
      }
      const tokenIds = payload.map((row) => row.token_id);
      const data = query === "getMarketPrices"
        ? await fetchMarketPrices(payload)
        : query === "getMidpointPrices"
          ? await fetchMidpointPrices(tokenIds)
          : query === "getSpreads"
            ? await fetchSpreads(tokenIds)
            : query === "getLastTradePrices"
              ? await fetchLastTradePrices(tokenIds)
              : await postClobTokenBatch(clobPath, payload);
      return res.status(200).json(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      return res.status(502).json({ message: msg });
    }
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    let data;
    switch (query) {
      case "listEvents": {
        const sp = buildSearchParams(EVENTS_PARAMS, req.query);
        for (const key of ["id", "slug"]) {
          const raw = req.query[key];
          if (typeof raw === "string" && raw.includes(",")) {
            sp.delete(key);
            for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
              sp.append(key, part);
            }
          }
        }
        data = await fetchJson(`${GAMMA_BASE}/events?${sp}`);
        break;
      }
      case "listTags": {
        const sp = new URLSearchParams();
        if (req.query.limit != null && req.query.limit !== "") sp.set("limit", String(req.query.limit));
        if (req.query.offset != null && req.query.offset !== "") sp.set("offset", String(req.query.offset));
        if (req.query.order) sp.set("order", String(req.query.order));
        if (req.query.ascending === "true" || req.query.ascending === "false") {
          sp.set("ascending", String(req.query.ascending));
        }
        if (req.query.include_template === "true" || req.query.include_template === "false") {
          sp.set("include_template", String(req.query.include_template));
        }
        if (req.query.is_carousel === "true" || req.query.is_carousel === "false") {
          sp.set("is_carousel", String(req.query.is_carousel));
        }
        data = await fetchJson(`${GAMMA_BASE}/tags?${sp}`);
        break;
      }
      case "getTagBySlug": {
        const slug = String(req.query.slug || "").trim();
        if (!slug) return res.status(400).json({ message: "Missing required parameter: slug" });
        const sp = new URLSearchParams();
        if (req.query.include_template === "true" || req.query.include_template === "false") {
          sp.set("include_template", String(req.query.include_template));
        }
        const qs = sp.toString();
        try {
          data = await fetchJson(
            `${GAMMA_BASE}/tags/slug/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/not found/i.test(msg)) {
            return res.status(404).json({ message: "Tag not found", slug });
          }
          throw err;
        }
        break;
      }
      case "searchTags": {
        const rawQ = String(req.query.q || "").trim();
        if (!rawQ) {
          return res.status(200).json({ query: "", slug: "", matches: [], related: [] });
        }
        const slug = rawQ
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        const softFetch = async (url) => {
          try {
            return await fetchJson(url);
          } catch {
            return null;
          }
        };

        const [exact, relatedRaw] = await Promise.all([
          slug ? softFetch(`${GAMMA_BASE}/tags/slug/${encodeURIComponent(slug)}`) : null,
          slug
            ? softFetch(`${GAMMA_BASE}/tags/slug/${encodeURIComponent(slug)}/related-tags/tags`)
            : null,
        ]);

        const normalize = (t) => {
          if (!t || typeof t !== "object") return null;
          const id = String(t.id ?? "").trim();
          const s = String(t.slug ?? "").trim();
          const label = String(t.label || t.slug || "").trim() || undefined;
          if (!id && !s) return null;
          return { id: id || s, slug: s || id, label };
        };

        const match = exact ? normalize(exact) : null;
        const matchKey = match ? match.slug || match.id : "";
        const relatedList = (Array.isArray(relatedRaw) ? relatedRaw : [])
          .map(normalize)
          .filter(Boolean)
          .filter((t) => (t.slug || t.id) !== matchKey);

        data = {
          query: rawQ,
          slug,
          matches: match ? [match] : [],
          related: relatedList,
        };
        break;
      }
      case "relatedTagsBySlug": {
        const slug = String(req.query.slug || "").trim();
        if (!slug) return res.status(400).json({ message: "Missing required parameter: slug" });
        const sp = new URLSearchParams();
        if (req.query.omit_empty === "true" || req.query.omit_empty === "false") {
          sp.set("omit_empty", String(req.query.omit_empty));
        }
        if (req.query.status) sp.set("status", String(req.query.status));
        const qs = sp.toString();
        data = await fetchJson(
          `${GAMMA_BASE}/tags/slug/${encodeURIComponent(slug)}/related-tags/tags${qs ? `?${qs}` : ""}`,
        );
        break;
      }
      case "getEvent": {
        const id = req.query.id;
        if (!id) return res.status(400).json({ message: "Missing required parameter: id" });
        const eventParams = new URLSearchParams();
        const incChat = req.query.include_chat;
        const incTpl = req.query.include_template;
        if (incChat === "true" || incChat === "false") eventParams.set("include_chat", incChat);
        if (incTpl === "true" || incTpl === "false") eventParams.set("include_template", incTpl);
        const eventQs = eventParams.toString();
        data = await fetchJson(`${GAMMA_BASE}/events/${encodeURIComponent(id)}${eventQs ? `?${eventQs}` : ""}`);
        break;
      }
      case "getEventBySlug": {
        const slug = req.query.slug;
        if (!slug) return res.status(400).json({ message: "Missing required parameter: slug" });
        data = await fetchJson(`${GAMMA_BASE}/events/slug/${encodeURIComponent(slug)}`);
        break;
      }
      case "getEventTags": {
        const id = req.query.id;
        if (!id) return res.status(400).json({ message: "Missing required parameter: id" });
        data = await fetchJson(`${GAMMA_BASE}/events/${encodeURIComponent(id)}/tags`);
        break;
      }
      case "listSeries": {
        const sp = buildSearchParams(SERIES_PARAMS, req.query);
        for (const key of ["slug", "categories_ids", "categories_labels"]) {
          const raw = req.query[key];
          if (typeof raw === "string" && raw.includes(",")) {
            sp.delete(key);
            for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
              sp.append(key, part);
            }
          }
        }
        data = await fetchJson(`${GAMMA_BASE}/series?${sp}`);
        break;
      }
      case "getSeries": {
        const id = req.query.id;
        if (!id) return res.status(400).json({ message: "Missing required parameter: id" });
        const sp = new URLSearchParams();
        if (req.query.include_chat === "true" || req.query.include_chat === "false") {
          sp.set("include_chat", String(req.query.include_chat));
        }
        const qs = sp.toString();
        data = await fetchJson(`${GAMMA_BASE}/series/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`);
        break;
      }
      case "listMarkets": {
        const sp = buildSearchParams(MARKETS_PARAMS, req.query);
        for (const key of ["id", "slug", "clob_token_ids", "condition_ids", "market_maker_address", "sports_market_types", "question_ids"]) {
          const raw = req.query[key];
          if (typeof raw === "string" && raw.includes(",")) {
            sp.delete(key);
            for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
              sp.append(key, part);
            }
          }
        }
        data = await fetchJson(`${GAMMA_BASE}/markets?${sp}`);
        break;
      }
      case "listMarketsKeyset": {
        const sp = buildSearchParams(MARKETS_KEYSET_PARAMS, req.query);
        for (const key of ["id", "slug", "clob_token_ids", "condition_ids", "question_ids", "sports_market_types", "tag_id"]) {
          const raw = req.query[key];
          if (typeof raw === "string" && raw.includes(",")) {
            sp.delete(key);
            for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
              sp.append(key, part);
            }
          }
        }
        data = await fetchJson(`${GAMMA_BASE}/markets/keyset?${sp}`);
        break;
      }
      case "getSamplingMarkets": {
        const nextCursor = String(req.query.next_cursor || "").trim();
        const sp = new URLSearchParams();
        if (nextCursor) sp.set("next_cursor", nextCursor);
        data = await fetchJson(
          `${CLOB_BASE}/sampling-markets${sp.toString() ? `?${sp.toString()}` : ""}`,
        );
        break;
      }
      case "getOrderBook": {
        const tokenId = req.query.token_id ?? req.query.tokenId;
        if (!tokenId) {
          return res.status(400).json({
            message: "Missing required parameter: token_id (CLOB outcome token id)",
          });
        }
        data = await fetchJson(
          `${CLOB_BASE}/book?token_id=${encodeURIComponent(String(tokenId))}`,
        );
        break;
      }
      case "getMarketPrices": {
        const tokenIds = String(req.query.token_ids || req.query.token_id || req.query.tokenId || "").trim();
        const sides = String(req.query.sides || req.query.side || "").trim();
        if (!tokenIds) {
          return res.status(400).json({
            message: "Missing required parameter: token_ids",
          });
        }
        if (!sides) {
          return res.status(400).json({
            message: "Missing required parameter: sides",
          });
        }
        const tokenList = tokenIds.split(",").map((v) => v.trim()).filter(Boolean);
        const sideList = sides.split(",").map((v) => v.trim().toUpperCase()).filter(Boolean);
        if (tokenList.length !== sideList.length) {
          return res.status(400).json({
            message: "token_ids and sides must contain the same number of values",
          });
        }
        if (sideList.some((side) => side !== "BUY" && side !== "SELL")) {
          return res.status(400).json({
            message: "sides may contain only BUY or SELL",
          });
        }
        if (tokenList.length > CLOB_BATCH_TOKEN_LIMIT) {
          return res.status(400).json({
            message: `A maximum of ${CLOB_BATCH_TOKEN_LIMIT} token IDs may be requested per call`,
          });
        }
        data = await fetchMarketPrices(
          tokenList.map((token_id, i) => ({ token_id, side: sideList[i] })),
        );
        break;
      }
      case "getMidpointPrices": {
        const tokenIds = String(req.query.token_ids || req.query.token_id || req.query.tokenId || "").trim();
        if (!tokenIds) {
          return res.status(400).json({
            message: "Missing required parameter: token_ids",
          });
        }
        const tokenList = tokenIds.split(",").map((v) => v.trim()).filter(Boolean);
        if (tokenList.length > CLOB_BATCH_TOKEN_LIMIT) {
          return res.status(400).json({
            message: `A maximum of ${CLOB_BATCH_TOKEN_LIMIT} token IDs may be requested per call`,
          });
        }
        data = await fetchMidpointPrices(tokenList);
        break;
      }
      case "getTickSize": {
        const tokenId = String(req.query.token_id || req.query.tokenId || "").trim();
        if (!tokenId) return res.status(400).json({ message: "Missing required parameter: token_id" });
        try {
          data = await fetchJson(`${CLOB_BASE}/tick-size?token_id=${encodeURIComponent(tokenId)}`);
        } catch (err) {
          const text = err instanceof Error ? err.message : "Tick size request failed";
          let parsed = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
          const detail = parsed && typeof parsed.error === "string" ? parsed.error : text;
          return res.status(400).json({ message: detail });
        }
        break;
      }
      case "getSpreads": {
        const tokenIds = String(req.query.token_ids || req.query.token_id || req.query.tokenId || "").trim();
        if (!tokenIds) {
          return res.status(400).json({
            message: "Missing required parameter: token_ids",
          });
        }
        const tokenList = tokenIds.split(",").map((v) => v.trim()).filter(Boolean);
        if (tokenList.length > CLOB_BATCH_TOKEN_LIMIT) {
          return res.status(400).json({
            message: `A maximum of ${CLOB_BATCH_TOKEN_LIMIT} token IDs may be requested per call`,
          });
        }
        data = await fetchSpreads(tokenList);
        break;
      }
      case "getLastTradePrices": {
        const tokenIds = String(req.query.token_ids || req.query.token_id || req.query.tokenId || "").trim();
        if (!tokenIds) {
          return res.status(400).json({
            message: "Missing required parameter: token_ids",
          });
        }
        const tokenList = tokenIds.split(",").map((v) => v.trim()).filter(Boolean);
        if (tokenList.length > CLOB_BATCH_TOKEN_LIMIT) {
          return res.status(400).json({
            message: `A maximum of ${CLOB_BATCH_TOKEN_LIMIT} token IDs may be requested per call`,
          });
        }
        data = await fetchLastTradePrices(tokenList);
        break;
      }
      case "getMarket": {
        const id = req.query.id;
        if (!id) return res.status(400).json({ message: "Missing required parameter: id" });
        data = await fetchJson(`${GAMMA_BASE}/markets/${encodeURIComponent(id)}`);
        break;
      }
      case "getMarketBySlug": {
        const slug = req.query.slug;
        if (!slug) return res.status(400).json({ message: "Missing required parameter: slug" });
        data = await fetchJson(`${GAMMA_BASE}/markets/slug/${encodeURIComponent(slug)}`);
        break;
      }
      case "getMarketByToken": {
        const tokenId = req.query.token_id ?? req.query.tokenId;
        if (!tokenId) return res.status(400).json({ message: "Missing required parameter: token_id (CLOB outcome token id)" });
        data = await fetchJson(`${CLOB_BASE}/markets-by-token/${encodeURIComponent(String(tokenId))}`);
        break;
      }
      case "getMarketTags": {
        const id = req.query.id;
        if (!id) return res.status(400).json({ message: "Missing required parameter: id" });
        data = await fetchJson(`${GAMMA_BASE}/markets/${encodeURIComponent(id)}/tags`);
        break;
      }
      case "getTopHolders": {
        const market = req.query.market; // comma-separated condition IDs
        if (!market) return res.status(400).json({ message: "Missing required parameter: market (condition IDs from list markets)" });
        const limit = req.query.limit || "20";
        const minBalance = req.query.minBalance || "1";
        data = await fetchJson(`${DATA_API_BASE}/holders?market=${encodeURIComponent(market)}&limit=${limit}&minBalance=${minBalance}`);
        break;
      }
      case "getPublicProfile": {
        const address = String(req.query.address || "").trim();
        if (!address) {
          return res.status(400).json({ message: "Missing required parameter: address" });
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return res.status(400).json({ message: "Invalid wallet address" });
        }
        data = await fetchJson(
          `${GAMMA_BASE}/public-profile?address=${encodeURIComponent(address)}`,
        );
        break;
      }
      case "getCurrentPositions": {
        const user = String(req.query.user || "").trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
          return res.status(400).json({ message: "A valid user wallet address is required" });
        }
        const market = String(req.query.market || "").trim();
        const eventId = String(req.query.eventId || "").trim();
        if (market && eventId) {
          return res.status(400).json({ message: "market and eventId are mutually exclusive" });
        }
        if (
          market &&
          market
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .some((value) => !/^0x[a-fA-F0-9]{64}$/.test(value))
        ) {
          return res.status(400).json({ message: "Invalid market condition ID" });
        }
        if (
          eventId &&
          eventId
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .some((value) => !/^[1-9]\d*$/.test(value))
        ) {
          return res.status(400).json({ message: "Invalid event ID" });
        }
        const params = new URLSearchParams({ user });
        const allowed = [
          "market",
          "eventId",
          "sizeThreshold",
          "redeemable",
          "mergeable",
          "includeArchived",
          "limit",
          "offset",
          "sortBy",
          "sortDirection",
          "title",
        ];
        for (const key of allowed) {
          const value = req.query[key];
          if (value != null && String(value).trim() !== "") {
            params.set(key, String(value).trim());
          }
        }
        data = await fetchJson(`${DATA_API_BASE}/positions?${params.toString()}`);
        break;
      }
      case "getClosedPositions": {
        const user = String(req.query.user || "").trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
          return res.status(400).json({ message: "A valid user wallet address is required" });
        }
        const market = String(req.query.market || "").trim();
        const eventId = String(req.query.eventId || "").trim();
        if (market && eventId) {
          return res.status(400).json({ message: "market and eventId are mutually exclusive" });
        }
        if (
          market &&
          market
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .some((value) => !/^0x[a-fA-F0-9]{64}$/.test(value))
        ) {
          return res.status(400).json({ message: "Invalid market condition ID" });
        }
        if (
          eventId &&
          eventId
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .some((value) => !/^[1-9]\d*$/.test(value))
        ) {
          return res.status(400).json({ message: "Invalid event ID" });
        }
        const params = new URLSearchParams({ user });
        for (const key of [
          "market",
          "eventId",
          "title",
          "limit",
          "offset",
          "sortBy",
          "sortDirection",
        ]) {
          const value = req.query[key];
          if (value != null && String(value).trim() !== "") {
            params.set(key, String(value).trim());
          }
        }
        data = await fetchJson(`${DATA_API_BASE}/closed-positions?${params.toString()}`);
        break;
      }
      case "getUserActivity": {
        const user = String(req.query.user || "").trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
          return res.status(400).json({ message: "A valid user wallet address is required" });
        }
        const market = String(req.query.market || "").trim();
        const eventId = String(req.query.eventId || "").trim();
        if (market && eventId) {
          return res.status(400).json({ message: "market and eventId are mutually exclusive" });
        }
        if (
          market &&
          market
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .some((value) => !/^0x[a-fA-F0-9]{64}$/.test(value))
        ) {
          return res.status(400).json({ message: "Invalid market condition ID" });
        }
        if (
          eventId &&
          eventId
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .some((value) => !/^[1-9]\d*$/.test(value))
        ) {
          return res.status(400).json({ message: "Invalid event ID" });
        }
        const activityTypes = new Set([
          "TRADE",
          "SPLIT",
          "MERGE",
          "REDEEM",
          "REWARD",
          "CONVERSION",
          "DEPOSIT",
          "WITHDRAWAL",
          "YIELD",
          "MAKER_REBATE",
          "TAKER_REBATE",
          "REFERRAL_REWARD",
        ]);
        const requestedTypes = String(req.query.type || "")
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean);
        if (requestedTypes.some((value) => !activityTypes.has(value))) {
          return res.status(400).json({ message: "Invalid activity type" });
        }
        const params = new URLSearchParams({ user });
        for (const key of [
          "market",
          "eventId",
          "type",
          "excludeDepositsWithdrawals",
          "start",
          "end",
          "limit",
          "offset",
          "sortBy",
          "sortDirection",
          "side",
        ]) {
          const value = req.query[key];
          if (value != null && String(value).trim() !== "") {
            params.set(key, String(value).trim());
          }
        }
        data = await fetchJson(`${DATA_API_BASE}/activity?${params.toString()}`);
        break;
      }
      case "getHolderPositionValue": {
        const user = String(req.query.user || "").trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
          return res.status(400).json({ message: "A valid user wallet address is required" });
        }
        const market = String(req.query.market || "").trim();
        if (
          market &&
          market
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .some((value) => !/^0x[a-fA-F0-9]{64}$/.test(value))
        ) {
          return res.status(400).json({ message: "Invalid market condition ID" });
        }
        const params = new URLSearchParams({ user });
        if (market) params.set("market", market);
        data = await fetchJson(`${DATA_API_BASE}/value?${params.toString()}`);
        break;
      }
      case "getHolderTrades": {
        const user = String(req.query.user || "").trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
          return res.status(400).json({ message: "A valid user wallet address is required" });
        }
        const market = String(req.query.market || "").trim();
        const eventId = String(req.query.eventId || "").trim();
        if (market && eventId) {
          return res.status(400).json({ message: "market and eventId are mutually exclusive" });
        }
        if (
          market &&
          market
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .some((value) => !/^0x[a-fA-F0-9]{64}$/.test(value))
        ) {
          return res.status(400).json({ message: "Invalid market condition ID" });
        }
        if (
          eventId &&
          eventId
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .some((value) => !/^[1-9]\d*$/.test(value))
        ) {
          return res.status(400).json({ message: "Invalid event ID" });
        }
        const filterType = String(req.query.filterType || "").trim().toUpperCase();
        const filterAmount = String(req.query.filterAmount || "").trim();
        if ((filterType && !filterAmount) || (!filterType && filterAmount)) {
          return res.status(400).json({
            message: "filterType and filterAmount must be provided together",
          });
        }
        if (filterType && filterType !== "CASH" && filterType !== "TOKENS") {
          return res.status(400).json({ message: "Invalid filterType" });
        }
        const params = new URLSearchParams({ user });
        for (const key of [
          "market",
          "eventId",
          "takerOnly",
          "filterType",
          "filterAmount",
          "side",
          "start",
          "end",
          "limit",
          "offset",
        ]) {
          const value = req.query[key];
          if (value != null && String(value).trim() !== "") {
            params.set(key, String(value).trim());
          }
        }
        data = await fetchJson(`${DATA_API_BASE}/trades?${params.toString()}`);
        break;
      }

      case "getHolderTradedMarkets": {
        const user = String(req.query.user || "").trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
          return res.status(400).json({ message: "A valid user wallet address is required" });
        }
        data = await fetchJson(`${DATA_API_BASE}/traded?user=${encodeURIComponent(user)}`);
        break;
      }
      case "getTraderLeaderboard": {
        const category = String(req.query.category || "OVERALL").trim().toUpperCase();
        const timePeriod = String(req.query.timePeriod || "DAY").trim().toUpperCase();
        const orderBy = String(req.query.orderBy || "PNL").trim().toUpperCase();
        const limit = Number.parseInt(String(req.query.limit || "25"), 10);
        const offset = Number.parseInt(String(req.query.offset || "0"), 10);
        const user = String(req.query.user || "").trim();
        const userName = String(req.query.userName || "").trim();
        const categories = new Set([
          "OVERALL", "POLITICS", "SPORTS", "ESPORTS", "CRYPTO", "CULTURE",
          "MENTIONS", "WEATHER", "ECONOMICS", "TECH", "FINANCE",
        ]);
        if (!categories.has(category)) {
          return res.status(400).json({ message: "Invalid leaderboard category" });
        }
        if (!["DAY", "WEEK", "MONTH", "ALL"].includes(timePeriod)) {
          return res.status(400).json({ message: "Invalid leaderboard time period" });
        }
        if (!["PNL", "VOL"].includes(orderBy)) {
          return res.status(400).json({ message: "Invalid leaderboard order" });
        }
        if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
          return res.status(400).json({ message: "limit must be between 1 and 50" });
        }
        if (!Number.isInteger(offset) || offset < 0 || offset > 1000) {
          return res.status(400).json({ message: "offset must be between 0 and 1000" });
        }
        if (user && !/^0x[a-fA-F0-9]{40}$/.test(user)) {
          return res.status(400).json({ message: "Invalid user wallet address" });
        }
        const params = new URLSearchParams({
          category,
          timePeriod,
          orderBy,
          limit: String(limit),
          offset: String(offset),
        });
        if (user) params.set("user", user);
        if (userName) params.set("userName", userName);
        data = await fetchJson(`${DATA_API_BASE}/v1/leaderboard?${params.toString()}`);
        break;
      }
      case "getOpenInterest": {
        const raw = String(
          req.query.condition || req.query.condition_id || req.query.conditionId || req.query.market || "",
        ).trim();
        const ids = [...new Set(raw.split(",").map((part) => part.trim()).filter(Boolean))];
        const chunks = ids.length ? [] : [[]];
        for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));
        const readOpenInterest = async (url) => {
          try {
            return await fetchJson(url);
          } catch (err) {
            const text = String(err?.message || "");
            let parsed = null;
            try {
              parsed = JSON.parse(text);
            } catch {
              parsed = null;
            }
            const detail = parsed && typeof parsed === "object" ? parsed.error || parsed.message : "";
            if (detail) {
              const parameter = parsed.parameter ? ` (${parsed.parameter})` : "";
              throw new Error(`${detail}${parameter}`);
            }
            throw err;
          }
        };
        const rows = [];
        for (const chunk of chunks) {
          const url = chunk.length
            ? `${DATA_API_BASE}/v2/oi?condition=${encodeURIComponent(chunk.join(","))}`
            : `${DATA_API_BASE}/v2/oi`;
          const body = await readOpenInterest(url);
          const list = Array.isArray(body?.data) ? body.data : [];
          for (const row of list) {
            if (!row || typeof row !== "object") continue;
            const conditionId = String(row.condition_id || row.conditionId || "").trim();
            rows.push({ condition_id: conditionId, market: conditionId, value: row.value });
          }
        }
        data = rows;
        break;
      }
      case "getLiveVolume": {
        const id = req.query.id;
        if (!id) return res.status(400).json({ message: "Missing required parameter: id (event id from list events)" });
        data = await fetchJson(`${DATA_API_BASE}/live-volume?id=${encodeURIComponent(id)}`);
        break;
      }
      case "getPricesHistory": {
        const market = req.query.market;
        if (!market) return res.status(400).json({ message: "Missing required parameter: market (CLOB asset id)" });
        const marketIds = String(market)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!marketIds.length) return res.status(400).json({ message: "Missing required parameter: market (CLOB asset id)" });

        const interval = req.query.interval;
        const startTs = toUnixSeconds(req.query.startTs);
        const endTs = toUnixSeconds(req.query.endTs);
        const fidelity = req.query.fidelity;
        if (startTs !== "" && endTs !== "" && Number(endTs) <= Number(startTs)) {
          return res.status(400).json({ message: "Invalid time range: end date/time must be after start date/time." });
        }
        const bucketSeconds = pricesHistoryBucketSeconds(interval, fidelity);
        const startNum = startTs !== "" ? Number(startTs) : NaN;
        const endNum = endTs !== "" ? Number(endTs) : NaN;
        if (
          startTs !== "" &&
          endTs !== "" &&
          Number.isFinite(startNum) &&
          Number.isFinite(endNum) &&
          Number.isFinite(bucketSeconds) &&
          bucketSeconds > 0
        ) {
          const chunkSpan = pricesHistoryChunkSpanSec(bucketSeconds);
          const span = endNum - startNum;
          const estimatedPoints = Math.ceil(span / bucketSeconds);
          if (span <= chunkSpan && estimatedPoints > PRICES_HISTORY_MAX_POINTS) {
            return res.status(400).json({
              message:
                "Selected time window is too large for the chosen interval/fidelity. Reduce the range or use a coarser interval.",
            });
          }
        }

        const rows = [];
        for (const marketId of marketIds) {
          let history;
          if (
            startTs !== "" &&
            endTs !== "" &&
            Number.isFinite(startNum) &&
            Number.isFinite(endNum)
          ) {
            history = await fetchPolymarketPricesHistoryChunked(marketId, startNum, endNum, {
              interval,
              fidelity,
              bucketSeconds,
            });
          } else {
            history = await fetchPolymarketPricesHistoryRaw(marketId, {
              startTsStr: startTs,
              endTsStr: endTs,
              interval,
              fidelity,
            });
          }
          for (const point of history) {
            rows.push({
              market: marketId,
              t: point?.t ?? "",
              p: point?.p ?? "",
            });
          }
        }
        data = rows;
        break;
      }
      case "getTokenPriceHistory": {
        const tokenId = String(req.query.token_id || req.query.tokenId || "").trim();
        if (!tokenId) return res.status(400).json({ message: "Missing required parameter: token_id" });
        const asOf = toUnixSeconds(req.query.as_of || req.query.asOf);
        const start = toUnixSeconds(req.query.start);
        const end = toUnixSeconds(req.query.end);
        const interval = String(req.query.interval || "").trim();
        const bucketRaw = String(req.query.bucket_seconds || req.query.bucketSeconds || "").trim();
        const wanted = Math.min(10000, Math.max(1, Number(req.query.limit) || 10000));
        const base = new URLSearchParams();
        base.set("token_id", tokenId);
        if (asOf) {
          base.set("as_of", asOf);
        } else if (start) {
          if (end && Number(end) <= Number(start)) {
            return res.status(400).json({ message: "Invalid time range: end must be after start." });
          }
          const windowEnd = end ? Number(end) : Math.floor(Date.now() / 1000);
          if (windowEnd - Number(start) > 15 * 24 * 3600) {
            return res.status(400).json({
              message: "A start and end window can cover at most 15 days. Use the 1 month or max interval for a longer history.",
            });
          }
          base.set("start", start);
          if (end) base.set("end", end);
        } else if (interval) {
          base.set("interval", interval);
        } else {
          return res.status(400).json({
            message: "Choose a date range, an interval, or an as-of moment.",
          });
        }
        if (!asOf && bucketRaw) base.set("bucket_seconds", bucketRaw);
        const points = [];
        let cursor = "";
        for (let page = 0; page < 20 && points.length < wanted; page += 1) {
          const params = new URLSearchParams(base);
          params.set("limit", String(Math.min(10000, wanted - points.length)));
          if (cursor) params.set("cursor", cursor);
          let body;
          try {
            body = await fetchJson(`${DATA_API_BASE}/v2/prices-history?${params.toString()}`);
          } catch (err) {
            const text = err instanceof Error ? err.message : "Token price history request failed";
            let parsed = null;
            try {
              parsed = JSON.parse(text);
            } catch {
              parsed = null;
            }
            const detail = parsed && typeof parsed.error === "string" ? parsed.error : text;
            return res.status(400).json({ message: detail });
          }
          const list = Array.isArray(body?.data) ? body.data : [];
          points.push(...list);
          const next = body?.pagination?.next_cursor;
          if (!next || body?.pagination?.has_more !== true || !list.length) break;
          cursor = String(next);
        }
        data = points.slice(0, wanted);
        break;
      }
      case "getTradesByMarket": {
        const condition = String(req.query.condition || req.query.condition_id || req.query.conditionId || req.query.market || "").trim();
        if (!condition) return res.status(400).json({ message: "Missing required parameter: condition (condition id from the market)" });
        const tradesParams = new URLSearchParams();
        tradesParams.set("condition", condition);
        const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 50));
        tradesParams.set("limit", String(limit));
        const cursor = String(req.query.cursor || "").trim();
        if (cursor) tradesParams.set("cursor", cursor);
        const side = String(req.query.side || "").trim().toUpperCase();
        if (side === "BUY" || side === "SELL") tradesParams.set("side", side);
        const takerOnly = String(req.query.taker_only ?? req.query.takerOnly ?? "").trim();
        if (takerOnly === "true" || takerOnly === "false") tradesParams.set("taker_only", takerOnly);
        const filterType = String(req.query.filter_type || req.query.filterType || "").trim().toUpperCase();
        if (filterType === "CASH" || filterType === "TOKENS") tradesParams.set("filter_type", filterType);
        const filterAmount = String(req.query.filter_amount ?? req.query.filterAmount ?? "").trim();
        if (filterAmount !== "" && Number.isFinite(Number(filterAmount)) && Number(filterAmount) >= 0) {
          tradesParams.set("filter_amount", filterAmount);
        }
        let body;
        try {
          body = await fetchJson(`${DATA_API_BASE}/v2/trades?${tradesParams.toString()}`);
        } catch (err) {
          const text = err instanceof Error ? err.message : "Trade history request failed";
          let parsed = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
          const detail = parsed && typeof parsed.error === "string" ? parsed.error : text;
          return res.status(400).json({ message: detail });
        }
        data = body && typeof body === "object" ? body : { data: [], pagination: { next_cursor: null, has_more: false } };
        break;
      }
      case "getHoldersByMarket": {
        const condition = String(req.query.condition || req.query.condition_id || req.query.conditionId || "").trim();
        if (!condition) return res.status(400).json({ message: "Missing required parameter: condition (condition id from the market)" });
        const pnl = String(req.query.include_pnl ?? req.query.includePnl ?? "").trim() === "true";
        const cap = pnl ? 100 : 1000;
        const holderParams = new URLSearchParams();
        holderParams.set("condition", condition);
        const limit = Math.min(cap, Math.max(1, Number(req.query.limit) || 50));
        holderParams.set("limit", String(limit));
        const minBalance = String(req.query.min_balance ?? req.query.minBalance ?? "").trim();
        if (minBalance !== "" && Number.isFinite(Number(minBalance)) && Number(minBalance) >= 0) {
          holderParams.set("min_balance", minBalance);
        }
        if (pnl) holderParams.set("include_pnl", "true");
        const cursor = String(req.query.cursor || "").trim();
        if (cursor) holderParams.set("cursor", cursor);
        let body;
        try {
          body = await fetchJson(`${DATA_API_BASE}/v2/holders?${holderParams.toString()}`);
        } catch (err) {
          const text = err instanceof Error ? err.message : "Holders request failed";
          let parsed = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
          const detail = parsed && typeof parsed.error === "string" ? parsed.error : text;
          return res.status(400).json({ message: detail });
        }
        data = body && typeof body === "object" ? body : { data: [], pagination: { next_cursor: null, has_more: false } };
        break;
      }
      case "getTradesByUser": {
        const user = req.query.user;
        if (!user) return res.status(400).json({ message: "Missing required parameter: user (wallet address, 0x...)" });
        const tradesParams = new URLSearchParams();
        tradesParams.set("user", String(user));
        const limit = req.query.limit;
        const offset = req.query.offset;
        const side = req.query.side;
        const takerOnly = req.query.takerOnly;
        if (limit !== undefined && limit !== "") tradesParams.set("limit", String(limit));
        if (offset !== undefined && offset !== "") tradesParams.set("offset", String(offset));
        if (side === "BUY" || side === "SELL") tradesParams.set("side", side);
        if (takerOnly === "true" || takerOnly === "false") tradesParams.set("takerOnly", takerOnly);
        data = await fetchJson(`${DATA_API_BASE}/trades?${tradesParams.toString()}`);
        break;
      }
      case "metadataSuggestions": {
        const q = req.query.q;
        if (!q || !String(q).trim()) {
          return res.status(200).json({ query: "", suggestions: [], publicSearch: null });
        }
        const limitPerType = Math.min(50, Math.max(5, Number(req.query.limit_per_type) || 20));
        const payload = await runMetadataSuggestions(String(q).trim(), limitPerType, {
          searchTags: req.query.search_tags,
          searchProfiles: req.query.search_profiles,
          keepClosedMarkets: req.query.keep_closed_markets,
        });
        return res.status(200).json(payload);
      }
      case "metadataResolve": {
        let entity = String(req.query.entity || "").trim();
        const id = req.query.id != null ? String(req.query.id).trim() : "";
        const slug = req.query.slug != null ? String(req.query.slug).trim() : "";
        const tokenId = req.query.tokenId != null ? String(req.query.tokenId).trim() : "";
        const conditionId = req.query.conditionId != null ? String(req.query.conditionId).trim() : "";
        if (tokenId && !entity) entity = "market";
        if (entity !== "event" && entity !== "market") {
          return res.status(400).json({ message: "entity must be event or market" });
        }
        if (!id && !slug && !tokenId && !(entity === "market" && conditionId)) {
          return res.status(400).json({ message: "Provide id, slug, tokenId, or conditionId (for markets)" });
        }
        if (entity === "event" && tokenId) {
          return res.status(400).json({ message: "tokenId applies to markets only (CLOB /markets-by-token)" });
        }
        if (entity === "event" && conditionId) {
          return res.status(400).json({ message: "conditionId applies to markets only" });
        }
        const payload = await runMetadataResolve({ entity, id, slug, tokenId, conditionId });
        return res.status(200).json(payload);
      }
      case "metadataLookup": {
        const q = req.query.q;
        if (!q || !String(q).trim()) {
          return res.status(400).json({ message: "Missing required parameter: q" });
        }
        const eventListLimit = Math.min(250, Math.max(20, Number(req.query.eventListLimit) || 100));
        const marketListLimit = Math.min(250, Math.max(20, Number(req.query.marketListLimit) || 100));
        const payload = await runPolymarketMetadataLookup(String(q).trim(), {
          eventListLimit,
          marketListLimit,
        });
        return res.status(200).json(payload);
      }
      default:
        return res.status(400).json({ message: "Invalid query" });
    }

    const outcomeOptimizedFormat = req.query.outcomeOptimizedFormat === "true" || req.query.outcomeOptimizedFormat === "1";
    const skipFlatten = req.query.skipFlatten === "true" || req.query.skipFlatten === "1";
    const fieldsParam = req.query.fields;
    const fieldsFilter = fieldsParam
      ? String(fieldsParam).split(",").map((f) => f.trim()).filter(Boolean)
      : null;

    if (query === "listMarketsKeyset") {
      return res.status(200).json(data && typeof data === "object" ? data : { markets: [], next_cursor: "" });
    }

    let result;
    if (skipFlatten) {
      result = Array.isArray(data) ? data : data != null ? [data] : [];
    } else if (query === "getTopHolders") {
      result = expandHoldersResponse(data, fieldsFilter);
    } else if (outcomeOptimizedFormat && (query === "listEvents" || query === "getEvent" || query === "getEventBySlug" || query === "listMarkets" || query === "getMarket" || query === "getMarketBySlug")) {
      const source = (query === "listEvents" || query === "getEvent" || query === "getEventBySlug") ? "events" : "markets";
      result = toOutcomeOptimizedFormat(data, source, fieldsFilter);
    } else {
      result = normalizeResponse(data, fieldsFilter);
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error("[polymarket]", query, err.message);
    if (query === "getPricesHistory" && /invalid filters/i.test(String(err.message || ""))) {
      return res.status(400).json({
        message: "Polymarket rejected this price-history range. Reduce the time window or use a coarser interval.",
      });
    }
    return res.status(500).json({
      message: err.message || "Request failed",
    });
  }
}
