const GAMMA_BASE = "https://gamma-api.polymarket.com";
const DATA_API_BASE = "https://data-api.polymarket.com";
const CLOB_BASE = "https://clob.polymarket.com";

const EVENTS_PARAMS = [
  "limit", "offset", "order", "ascending",
  "id", "tag_id", "exclude_tag_id", "slug", "tag_slug", "related_tags",
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

function buildSearchParams(allowed, query) {
  const p = new URLSearchParams();
  allowed.forEach((param) => {
    const v = query[param];
    if (v !== undefined && v !== "") p.set(param, String(v));
  });
  return p;
}

/** ERC1155 token/condition ID fields - must stay as strings, never parsed as numbers */
const TOKEN_ID_KEYS = ["conditionId", "condition_id", "id", "clobTokenIds", "clob_token_ids"];

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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { query } = req.query;
  if (!query) return res.status(400).json({ message: "Missing query parameter" });

  try {
    let data;
    switch (query) {
      case "listEvents": {
        const sp = buildSearchParams(EVENTS_PARAMS, req.query);
        data = await fetchJson(`${GAMMA_BASE}/events?${sp}`);
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
      case "listMarkets": {
        const sp = buildSearchParams(MARKETS_PARAMS, req.query);
        data = await fetchJson(`${GAMMA_BASE}/markets?${sp}`);
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
      case "getOpenInterest": {
        const market = req.query.market || "";
        data = await fetchJson(`${DATA_API_BASE}/oi${market ? `?market=${encodeURIComponent(market)}` : ""}`);
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
      case "getTradesByMarket": {
        const market = req.query.market;
        if (!market) return res.status(400).json({ message: "Missing required parameter: market (condition ID from List markets)" });
        const tradesParams = new URLSearchParams();
        tradesParams.set("market", String(market));
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
      default:
        return res.status(400).json({ message: "Invalid query" });
    }

    const outcomeOptimizedFormat = req.query.outcomeOptimizedFormat === "true" || req.query.outcomeOptimizedFormat === "1";
    const fieldsParam = req.query.fields;
    const fieldsFilter = fieldsParam
      ? String(fieldsParam).split(",").map((f) => f.trim()).filter(Boolean)
      : null;

    let result;
    if (outcomeOptimizedFormat && (query === "listEvents" || query === "getEvent" || query === "getEventBySlug" || query === "listMarkets" || query === "getMarket" || query === "getMarketBySlug")) {
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
