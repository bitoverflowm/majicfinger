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
 * CLOB batch token endpoints. The documented GET/query-parameter variants of
 * these routes reject every request with `Invalid payload`; only the POST body
 * form works, so all batch reads go through POST regardless of how the caller
 * reached this proxy.
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

function flattenPublicSearchToSuggestions(searchPayload, max = 28) {
  const out = [];
  const seen = new Set();
  const add = (row) => {
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
            live: m.fpmmLive ?? null,
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
  const ps = new URLSearchParams();
  ps.set("q", trimmed);
  ps.set("limit_per_type", String(cap));
  ps.set("search_tags", searchTags ? "true" : "false");
  ps.set("search_profiles", searchProfiles ? "true" : "false");
  ps.set("keep_closed_markets", keepClosed ? "1" : "0");
  const publicSearch = await fetchJson(`${GAMMA_BASE}/public-search?${ps.toString()}`);
  return {
    query: trimmed,
    suggestions: flattenPublicSearchToSuggestions(publicSearch, 40),
    publicSearch,
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
      const data = await postClobTokenBatch(clobPath, payload);
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
        const tokenIds = String(req.query.token_ids || "").trim();
        const sides = String(req.query.sides || "").trim();
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
        data = await postClobTokenBatch(
          "prices",
          tokenList.map((token_id, i) => ({ token_id, side: sideList[i] })),
        );
        break;
      }
      case "getMidpointPrices": {
        const tokenIds = String(req.query.token_ids || "").trim();
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
        data = await postClobTokenBatch(
          "midpoints",
          tokenList.map((token_id) => ({ token_id })),
        );
        break;
      }
      case "getLastTradePrices": {
        const tokenIds = String(req.query.token_ids || "").trim();
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
        data = await postClobTokenBatch(
          "last-trades-prices",
          tokenList.map((token_id) => ({ token_id })),
        );
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
