const GAMMA_BASE = "https://gamma-api.polymarket.com";
const DATA_API_BASE = "https://data-api.polymarket.com";

const EVENTS_PARAMS = [
  "limit", "offset", "order", "ascending",
  "id", "tag_id", "exclude_tag_id", "slug", "tag_slug", "related_tags",
  "active", "archived", "featured", "cyom", "include_chat", "include_template",
  "recurrence", "closed", "liquidity_min", "liquidity_max", "volume_min", "volume_max",
  "start_date_min", "start_date_max", "end_date_min", "end_date_max",
];

const MARKETS_PARAMS = [
  "limit", "offset", "order", "ascending", "slug", "clob_token_ids", "condition_ids",
  "market_maker_address", "liquidity_num_min", "liquidity_num_max", "volume_num_min", "volume_num_max",
  "start_date_min", "start_date_max", "end_date_min", "end_date_max",
  "tag_id", "related_tags", "cyom", "uma_resolution_status", "game_id", "sports_market_types",
  "rewards_min_size", "question_ids", "include_tag", "closed",
];

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
        out[key] = v.join(", ");
      }
    } else if (v !== null && typeof v === "object" && !(v instanceof Date) && typeof v !== "function") {
      Object.assign(out, flattenForSheet(v, key));
    } else {
      out[key] = v === null || v === undefined ? "" : v;
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
  return res.json();
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

    const fieldsParam = req.query.fields;
    const fieldsFilter = fieldsParam
      ? String(fieldsParam).split(",").map((f) => f.trim()).filter(Boolean)
      : null;
    const normalized = normalizeResponse(data, fieldsFilter);
    return res.status(200).json(normalized);
  } catch (err) {
    console.error("[polymarket]", query, err.message);
    return res.status(500).json({
      message: err.message || "Request failed",
    });
  }
}
