/**
 * Polymarket Live in the v2 builder.
 * Legacy connect keeps its own category list. This map follows the Kalshi Live
 * sister layout: markets, series, events, and traders, with websocket feeds
 * badged on the HTTP endpoints that seed them.
 */
import { getPolymarketLiveColumnsForEndpoint, POLYMARKET_LIVE_CONNECT_ENDPOINTS } from "@/config/polymarketLiveConnect";
import { flattenLastTradePricesRows } from "@/lib/polymarketLive/lastTradePricesCompose";
import { expandOrderBookSummaryToRows, orderbooksMarketRefFromSuggestion, parseOutcomeList, parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";
import { flattenPolymarketMarket, polymarketMarketExtraColumns } from "@/lib/polymarketLive/polymarketMarketScan";
import {
  isPolymarketQuoteTable,
  polymarketBookDepth,
  polymarketBookSide,
  polymarketHistoryBody,
  polymarketQuoteColumnType,
  polymarketQuoteDefaultColumns,
  polymarketQuoteOutcome,
  polymarketQuoteTarget,
  polymarketQuoteTokens,
  polymarketTradeQuery,
  sliceBookLevels,
} from "@/lib/polymarketLive/polymarketQuoteQuery";
import { flattenSamplingMarket, samplingMarketSheetColumns } from "@/lib/polymarketLive/polymarketSamplingScan";

export const POLYMARKET_LIVE_BUILD_CATEGORIES = [
  { id: "markets", label: "Markets" },
  { id: "series", label: "Series" },
  { id: "events", label: "Events" },
  { id: "holders", label: "Traders" },
];

/** Compose endpoint id → v2 category. Orderbooks, prices, and trades sit under Markets. */
const BUILD_GROUP = {
  getMarkets: "markets",
  getSamplingMarkets: "markets",
  getMarketsByEvents: "events",
  getOpenInterestCompose: "markets",
  getMarketPrices: "markets",
  getOrderbooks: "markets",
  getMidpointPrices: "markets",
  getSpreads: "markets",
  getLastTradePrices: "markets",
  getBatchPricesHistory: "markets",
  getTradesByMarket: "markets",
  series: "series",
  getEvents: "events",
  getLiveVolumeForEvent: "events",
  getHoldersByMarkets: "holders",
  getPublicProfiles: "holders",
  getCurrentPositions: "holders",
  getClosedPositions: "holders",
  getUserActivity: "holders",
  getHolderPositionValue: "holders",
  getHolderTrades: "holders",
  getHolderTradedMarkets: "holders",
  getTraderLeaderboard: "holders",
};

/**
 * HTTP endpoints that seed an enabled CLOB socket.
 * book / best_bid_ask / tick_size_change → orderbooks.
 * price_change / candlesticks → price history.
 * last_trade_price → executed trade history.
 */
const REALTIME_ENDPOINTS = new Set([
  "getOrderbooks",
  "getMarketPrices",
  "getMidpointPrices",
  "getSpreads",
  "getLastTradePrices",
  "getBatchPricesHistory",
  "getTradesByMarket",
]);

/** @type {Record<string, { kind: "token" | "event" | "address"; prompt: string }>} */
const REQUIREMENTS = {
  getMarketsByEvents: { kind: "event", prompt: "Event required" },
  getOpenInterestCompose: { kind: "token", prompt: "Market required" },
  getMarketPrices: { kind: "token", prompt: "Market required" },
  getOrderbooks: { kind: "token", prompt: "Market required" },
  getMidpointPrices: { kind: "token", prompt: "Market required" },
  getSpreads: { kind: "token", prompt: "Market required" },
  getLastTradePrices: { kind: "token", prompt: "Market required" },
  getBatchPricesHistory: { kind: "token", prompt: "Market required" },
  getTradesByMarket: { kind: "token", prompt: "Market required" },
  getLiveVolumeForEvent: { kind: "event", prompt: "Event required" },
  getHoldersByMarkets: { kind: "token", prompt: "Market required" },
  getPublicProfiles: { kind: "address", prompt: "Wallet address required" },
  getCurrentPositions: { kind: "address", prompt: "Wallet address required" },
  getClosedPositions: { kind: "address", prompt: "Wallet address required" },
  getUserActivity: { kind: "address", prompt: "Wallet address required" },
  getHolderPositionValue: { kind: "address", prompt: "Wallet address required" },
  getHolderTrades: { kind: "address", prompt: "Wallet address required" },
  getHolderTradedMarkets: { kind: "address", prompt: "Wallet address required" },
};

const PREFERRED_COLUMNS = [
  "question",
  "title",
  "series:title",
  "market_title",
  "userName",
  "outcome",
  "side",
  "price",
  "p",
  "volume",
  "volume24hr",
  "slug",
  "rank",
  "pnl",
];

const BUILD_COPY = {
  getTradesByMarket: {
    title: "Trade History",
    description: "Executed trades for a market, with price, size, side, and time.",
  },
};

const ADDRESS_QUERIES = {
  getPublicProfiles: "getPublicProfile",
  getCurrentPositions: "getCurrentPositions",
  getClosedPositions: "getClosedPositions",
  getUserActivity: "getUserActivity",
  getHolderPositionValue: "getHolderPositionValue",
  getHolderTrades: "getHolderTrades",
  getHolderTradedMarkets: "getHolderTradedMarkets",
};

export function polymarketLiveRealtimeEndpointIds() {
  return [...REALTIME_ENDPOINTS];
}

export function polymarketLiveBuildEndpoints() {
  const groupOrder = { markets: 0, series: 1, events: 2, holders: 3 };
  const endpoints = POLYMARKET_LIVE_CONNECT_ENDPOINTS.filter((endpoint) => BUILD_GROUP[endpoint.id])
    .map((endpoint) => ({
      ...endpoint,
      ...(BUILD_COPY[endpoint.id] || {}),
      category: BUILD_GROUP[endpoint.id],
      realtime: REALTIME_ENDPOINTS.has(endpoint.id),
    }))
    .sort((a, b) => {
      const group = groupOrder[a.category] - groupOrder[b.category];
      if (group) return group;
      return (REQUIREMENTS[a.id] ? 1 : 0) - (REQUIREMENTS[b.id] ? 1 : 0);
    });
  const priceIndex = endpoints.findIndex((endpoint) => endpoint.id === "getBatchPricesHistory");
  const tradeIndex = endpoints.findIndex((endpoint) => endpoint.id === "getTradesByMarket");
  if (priceIndex >= 0 && tradeIndex >= 0 && tradeIndex !== priceIndex + 1) {
    const [trade] = endpoints.splice(tradeIndex, 1);
    endpoints.splice(priceIndex + 1, 0, trade);
  }
  return endpoints;
}

/**
 * @param {string} tableId
 * @returns {{ kind: "token" | "event" | "address"; prompt: string } | null}
 */
export function polymarketLiveBuildRequirement(tableId) {
  return REQUIREMENTS[tableId] || null;
}

/**
 * @param {string} tableId
 * @returns {{ entities: string[]; placeholder: string; prompt: string } | null}
 */
export function polymarketLiveBuildSearch(tableId) {
  const requirement = REQUIREMENTS[tableId];
  if (requirement?.kind === "event") {
    return { entities: ["event"], placeholder: "Search for an event", prompt: requirement.prompt };
  }
  if (requirement?.kind === "address") {
    return { entities: ["profile"], placeholder: "Search for a trader", prompt: requirement.prompt };
  }
  if (requirement?.kind === "token") {
    return { entities: ["market"], placeholder: "Search for a market", prompt: requirement.prompt };
  }
  if (tableId === "getEvents") return { entities: ["event"], placeholder: "Search for an event", prompt: "" };
  if (tableId === "getMarkets" || tableId === "getSamplingMarkets") {
    return { entities: ["market"], placeholder: "Search for a market", prompt: "" };
  }
  if (tableId === "getTraderLeaderboard") {
    return { entities: ["profile"], placeholder: "Search for a trader", prompt: "" };
  }
  return null;
}

/**
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion | null | undefined} suggestion
 */
export function polymarketPickFromSuggestion(suggestion) {
  if (!suggestion || suggestion.entity === "tag") return null;
  const ref = orderbooksMarketRefFromSuggestion(suggestion);
  const kind = suggestion.entity === "profile" ? "profile" : suggestion.entity === "event" ? "event" : "market";
  const address = String(suggestion.proxyWallet || "").trim();
  const id = String(suggestion.id || suggestion.slug || address || suggestion.title || "").trim();
  if (!id && !address) return null;
  const label = String(suggestion.title || suggestion.pseudonym || suggestion.slug || address || id).trim();
  return {
    id: `${kind}:${id || address}`,
    kind,
    entityId: String(suggestion.id || "").trim(),
    slug: String(suggestion.slug || "").trim(),
    title: label,
    label: label.slice(0, 80),
    conditionId: String(ref?.conditionId || suggestion.conditionId || "").trim(),
    tokenIds: Array.isArray(ref?.tokenIds) ? ref.tokenIds : [],
    outcomes: Array.isArray(ref?.outcomes) ? ref.outcomes : [],
    address,
  };
}

function titleFor(name) {
  const bare = String(name || "").split(":").pop() || "";
  const spaced = bare
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

function columnType(raw) {
  const type = String(raw || "").toLowerCase();
  if (type === "boolean") return "boolean";
  if (type === "timestamp" || type === "date") return "date";
  if (type === "int" || type === "integer" || type === "number" || type === "nullable_number") return "number";
  return "text";
}

export function polymarketLiveBuildColumns(endpointId) {
  const meta = getPolymarketLiveColumnsForEndpoint(endpointId);
  const names = meta.map((entry) => entry.name);
  const preferred = PREFERRED_COLUMNS.filter((name) => names.includes(name));
  const defaults = new Set([...preferred, ...names.filter((name) => !preferred.includes(name))].slice(0, 6));
  const columns = meta.map((entry) => ({
    id: entry.name,
    title: titleFor(entry.name),
    type: columnType(entry.type),
    description: entry.description || "",
    defaultOn: defaults.has(entry.name),
  }));
  if (isPolymarketQuoteTable(endpointId)) {
    const defaults = new Set(polymarketQuoteDefaultColumns(endpointId));
    return columns.map((column) => {
      const type = polymarketQuoteColumnType(column.id) || column.type;
      const next = { ...column, type, defaultOn: defaults.has(column.id) };
      if (column.id === "side" || column.id === "last_trade_side") {
        next.enumOptions = [
          ["BUY", "Buy"],
          ["SELL", "Sell"],
        ];
      }
      if (column.id === "timestamp") next.dateEpoch = "unix";
      return next;
    });
  }
  if (String(endpointId) === "getSamplingMarkets") {
    const defaults = new Set(["question", "market_slug", "condition_id", "accepting_orders", "end_date_iso", "tags"]);
    return samplingMarketSheetColumns(columns).map((column) => ({ ...column, defaultOn: defaults.has(column.id) }));
  }
  if (String(endpointId) !== "getMarkets") return columns;
  return [...columns, ...polymarketMarketExtraColumns(columns.map((column) => column.id)).filter((column) => !column.queryOnly)];
}

function cellValue(value) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function projectRows(rows, columns, flatten, limit = 50) {
  return (Array.isArray(rows) ? rows : []).slice(0, limit).map((row) => {
    const source = flatten === "sampling"
      ? flattenSamplingMarket(row)
      : flatten
        ? flattenPolymarketMarket(row)
        : row && typeof row === "object"
          ? row
          : {};
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const column of columns) {
      const bare = column.id.includes(":") ? column.id.split(":").pop() : column.id;
      out[column.id] = cellValue(source[column.id] ?? source[bare]);
    }
    return out;
  });
}

function pack(endpointId, rows) {
  const columns = polymarketLiveBuildColumns(endpointId);
  const limit = isPolymarketQuoteTable(endpointId) ? Math.max(Array.isArray(rows) ? rows.length : 0, 1) : 50;
  const projected = projectRows(rows, columns, endpointId === "getSamplingMarkets" ? "sampling" : endpointId === "getMarkets", limit);
  return {
    columns,
    rows: projected,
    total: projected.length,
    capped: projected.length >= 50,
  };
}

async function polymarketGet(query, params = {}) {
  const search = new URLSearchParams({ query, skipFlatten: "true" });
  for (const [key, value] of Object.entries(params)) {
    if (value != null && String(value).trim() !== "") search.set(key, String(value));
  }
  const res = await fetch(`/api/integrations/polymarket?${search.toString()}`, { credentials: "same-origin" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || "Pull failed");
  return json;
}

async function polymarketPost(query, body) {
  const res = await fetch(`/api/integrations/polymarket?query=${encodeURIComponent(query)}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || "Pull failed");
  return json;
}

function objectRows(payload) {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === "object");
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) return payload.data.filter((item) => item && typeof item === "object");
    return [payload];
  }
  return [];
}

async function resolveMarket(pick) {
  if (!pick) return null;
  if (pick.tokenIds?.length && pick.conditionId) return pick;
  const params = pick.entityId
    ? { id: pick.entityId, limit: "1" }
    : pick.slug
      ? { slug: pick.slug, limit: "1" }
      : pick.conditionId
        ? { condition_ids: pick.conditionId, limit: "1" }
        : null;
  if (!params) return pick;
  const data = await polymarketGet("listMarkets", params);
  const row = objectRows(data)[0];
  if (!row) return pick;
  const tokenIds = parseTokenIdList(row.clobTokenIds || row.clob_token_ids || pick.tokenIds);
  return {
    ...pick,
    entityId: String(row.id || pick.entityId || ""),
    slug: String(row.slug || pick.slug || ""),
    title: String(row.question || row.groupItemTitle || pick.title || ""),
    label: String(row.question || pick.label || "").slice(0, 80),
    conditionId: String(row.conditionId || row.condition_id || pick.conditionId || ""),
    tokenIds,
    outcomes: parseOutcomeList(row.outcomes),
  };
}

function stampMarket(row, market) {
  return {
    ...row,
    market_id: market?.entityId || "",
    market_title: market?.title || "",
    market_slug: market?.slug || "",
    condition_id: market?.conditionId || "",
  };
}

function flattenHolders(payload) {
  const rows = [];
  for (const entry of objectRows(payload)) {
    const holders = Array.isArray(entry.holders) ? entry.holders : [];
    if (!holders.length) {
      rows.push(entry);
      continue;
    }
    for (const holder of holders) {
      if (holder && typeof holder === "object") rows.push({ token: entry.token, ...holder });
    }
  }
  return rows;
}

function asNum(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function asRecord(data) {
  if (Array.isArray(data)) {
    const first = data[0];
    if (data.length === 1 && first && typeof first === "object" && !Array.isArray(first) && !first.bids && !first.price) return first;
    return null;
  }
  return data && typeof data === "object" ? data : null;
}

function quoteScalar(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = /** @type {Record<string, unknown>} */ (value);
    return row.mid ?? row.midpoint ?? row.price ?? row.spread ?? "";
  }
  return value ?? "";
}

function marketRef(market) {
  return {
    id: market?.entityId || "",
    slug: market?.slug || "",
    conditionId: market?.conditionId || "",
    title: market?.title || "",
    tokenIds: market?.tokenIds || [],
    outcomes: market?.outcomes || [],
  };
}

async function quoteMarkets(picks) {
  const selected = (Array.isArray(picks) ? picks : []).filter(Boolean).slice(0, 20);
  const markets = [];
  for (const pick of selected) markets.push(await resolveMarket(pick));
  return markets.filter(Boolean);
}

function quotePairs(markets, filters) {
  const outcome = polymarketQuoteOutcome(filters);
  return markets.flatMap((market) =>
    polymarketQuoteTokens(marketRef(market), outcome).map((pair) => ({ ...pair, market })),
  );
}

function stampedQuote(pair, extra) {
  return stampMarket(
    {
      token_id: pair.tokenId,
      outcome: pair.outcome,
      ...extra,
    },
    pair.market,
  );
}

function unwrapBooks(payload) {
  const pages = Array.isArray(payload) ? payload : [payload];
  return pages.filter((page) => page && typeof page === "object" && (page.bids || page.asks || page.asset_id));
}

async function quoteRows(endpointId, picks, options = {}) {
  const markets = await quoteMarkets(picks);
  const filters = options.filters || {};
  if (endpointId === "getOpenInterestCompose") {
    const rows = [];
    await Promise.all(
      markets.map(async (market) => {
        if (!market.conditionId) return;
        const data = await polymarketGet("getOpenInterest", { market: market.conditionId });
        for (const row of objectRows(data)) rows.push(stampMarket({ ...row, value: asNum(row.value) }, market));
      }),
    );
    return rows;
  }
  const pairs = quotePairs(markets, filters);
  if (!pairs.length) throw new Error("This market has no CLOB token id.");
  if (endpointId === "getOrderbooks") {
    const side = polymarketBookSide(filters);
    const depth = polymarketBookDepth(filters);
    const books = await Promise.all(
      pairs.map(async (pair) => {
        const payload = await polymarketGet("getOrderBook", { token_id: pair.tokenId });
        return unwrapBooks(payload).flatMap((page) =>
          expandOrderBookSummaryToRows(sliceBookLevels(page, depth), {
            side,
            marketMeta: marketRef(pair.market),
          }),
        );
      }),
    );
    return books.flat().map((row) => ({
      ...row,
      price: asNum(row.price),
      size: asNum(row.size),
      last_trade_price: asNum(row.last_trade_price),
      min_order_size: asNum(row.min_order_size),
      tick_size: asNum(row.tick_size),
    }));
  }
  if (endpointId === "getMarketPrices") {
    const data = await polymarketPost(
      "getMarketPrices",
      pairs.flatMap((pair) => [
        { token_id: pair.tokenId, side: "BUY" },
        { token_id: pair.tokenId, side: "SELL" },
      ]),
    );
    const map = asRecord(data) || {};
    return pairs.map((pair) => {
      const prices = map[pair.tokenId] && typeof map[pair.tokenId] === "object" ? map[pair.tokenId] : {};
      return stampedQuote(pair, {
        buy_price: asNum(prices.BUY ?? prices.buy),
        sell_price: asNum(prices.SELL ?? prices.sell),
      });
    });
  }
  if (endpointId === "getMidpointPrices" || endpointId === "getSpreads") {
    const query = endpointId === "getMidpointPrices" ? "getMidpointPrices" : "getSpreads";
    const data = await polymarketPost(query, pairs.map((pair) => ({ token_id: pair.tokenId })));
    const map = asRecord(data) || {};
    const field = endpointId === "getMidpointPrices" ? "midpoint_price" : "spread";
    return pairs.map((pair) => stampedQuote(pair, { [field]: asNum(quoteScalar(map[pair.tokenId])) }));
  }
  if (endpointId === "getLastTradePrices") {
    const data = await polymarketPost("getLastTradePrices", pairs.map((pair) => ({ token_id: pair.tokenId })));
    const payload = Array.isArray(data) ? data : [];
    return flattenLastTradePricesRows(payload, markets.map(marketRef), undefined, polymarketQuoteOutcome(filters)).map((row) => ({
      ...row,
      last_trade_price: asNum(row.last_trade_price),
    }));
  }
  if (endpointId === "getBatchPricesHistory") {
    const tokens = [...new Set(pairs.map((pair) => pair.tokenId))];
    const body = polymarketHistoryBody(filters);
    const payloads = [];
    for (let index = 0; index < tokens.length; index += 20) {
      payloads.push(await polymarketPost("getBatchPricesHistory", { markets: tokens.slice(index, index + 20), ...body }));
    }
    const target = polymarketQuoteTarget(options.rowLimit, options.planLimit, 50, 2000);
    return historyRows(payloads, pairs).slice(0, target);
  }
  if (endpointId === "getTradesByMarket") {
    const tradable = markets.filter((market) => market.conditionId);
    if (!tradable.length) throw new Error("This market has no condition id.");
    const params = polymarketTradeQuery(filters);
    const target = polymarketQuoteTarget(options.rowLimit, options.planLimit, 50, 10000);
    const perMarket = Math.max(1, Math.ceil(target / tradable.length));
    const collected = [];
    for (const market of tradable) {
      let offset = 0;
      let got = 0;
      while (got < perMarket && offset <= 10000) {
        const pageSize = Math.min(500, perMarket - got);
        const data = await polymarketGet("getTradesByMarket", {
          market: market.conditionId,
          limit: String(pageSize),
          offset: String(offset),
          ...params,
        });
        const page = objectRows(data).map((row) =>
          stampMarket({ ...row, price: asNum(row.price), size: asNum(row.size), outcomeIndex: asNum(row.outcomeIndex) }, market),
        );
        if (!page.length) break;
        collected.push(...page);
        got += page.length;
        if (page.length < pageSize) break;
        offset += page.length;
      }
    }
    return collected.slice(0, target);
  }
  return [];
}

function historyRows(payloads, pairs) {
  const byToken = new Map(pairs.map((pair) => [pair.tokenId, pair]));
  const rows = [];
  for (const payload of payloads) {
    const root = payload && typeof payload === "object" ? payload : {};
    const history = root.history && typeof root.history === "object" ? root.history : root;
    for (const [tokenId, points] of Object.entries(history)) {
      if (!Array.isArray(points)) continue;
      const pair = byToken.get(tokenId);
      for (const point of points) {
        if (!point || typeof point !== "object") continue;
        const seconds = Number(point.t);
        rows.push(
          stampMarket(
            {
              token_id: tokenId,
              outcome: pair?.outcome || "",
              t: Number.isFinite(seconds) ? seconds : "",
              timestamp: Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : "",
              p: asNum(point.p),
            },
            pair?.market,
          ),
        );
      }
    }
  }
  rows.sort((a, b) => Number(b.t) - Number(a.t));
  return rows;
}

async function tokenRows(endpointId, pick) {
  const market = await resolveMarket(pick);
  const tokens = (market?.tokenIds || []).slice(0, 2);
  if (!tokens.length) throw new Error("This market has no CLOB token id.");
  if (endpointId === "getHoldersByMarkets") {
    const data = await polymarketGet("getTopHolders", { market: market.conditionId, limit: "20" });
    return flattenHolders(data).map((row) => stampMarket(row, market));
  }
  return [];
}

async function discoveryRows(endpointId) {
  if (endpointId === "getMarkets") {
    return objectRows(
      await polymarketGet("listMarkets", {
        limit: "50",
        closed: "false",
        order: "volume24hr",
        ascending: "false",
        include_tag: "true",
      }),
    );
  }
  if (endpointId === "getSamplingMarkets") {
    const page = await polymarketGet("getSamplingMarkets");
    const body = Array.isArray(page) ? page[0] : page;
    return objectRows(body?.data || body);
  }
  if (endpointId === "getEvents") {
    return objectRows(await polymarketGet("listEvents", { limit: "50", closed: "false", order: "volume", ascending: "false" }));
  }
  if (endpointId === "series") {
    return objectRows(await polymarketGet("listSeries", { limit: "50", closed: "false" }));
  }
  if (endpointId === "getTraderLeaderboard") {
    return objectRows(await polymarketGet("getTraderLeaderboard", { category: "OVERALL", timePeriod: "DAY", orderBy: "PNL", limit: "50" }));
  }
  return [];
}

async function directedRows(endpointId, picks, options = {}) {
  const pick = picks[0];
  if (!pick) return discoveryRows(endpointId);
  if (endpointId === "getMarkets" || endpointId === "getSamplingMarkets") {
    if (pick.kind !== "market") return discoveryRows(endpointId);
    const market = await resolveMarket(pick);
    const data = market?.entityId
      ? await polymarketGet("getMarket", { id: market.entityId })
      : await polymarketGet("listMarkets", { slug: market?.slug, limit: "1" });
    return objectRows(data);
  }
  if (endpointId === "getEvents") {
    if (!pick.entityId) return discoveryRows(endpointId);
    return objectRows(await polymarketGet("getEvent", { id: pick.entityId }));
  }
  if (endpointId === "getMarketsByEvents" || endpointId === "getLiveVolumeForEvent") {
    if (!pick.entityId) throw new Error("Search for an event.");
    if (endpointId === "getLiveVolumeForEvent") {
      return objectRows(await polymarketGet("getLiveVolume", { id: pick.entityId }));
    }
    const event = await polymarketGet("getEvent", { id: pick.entityId });
    const markets = Array.isArray(event?.markets) ? event.markets : objectRows(event);
    return markets.map((market) => ({ ...market, event_id: pick.entityId, event_title: pick.title }));
  }
  if (endpointId === "getTraderLeaderboard" && pick.address) {
    return objectRows(
      await polymarketGet("getTraderLeaderboard", {
        category: "OVERALL",
        timePeriod: "DAY",
        orderBy: "PNL",
        limit: "50",
        user: pick.address,
      }),
    );
  }
  if (ADDRESS_QUERIES[endpointId]) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(pick.address || "")) throw new Error("Search for a trader wallet.");
    const data = await polymarketGet(ADDRESS_QUERIES[endpointId], { user: pick.address, address: pick.address, limit: "50" });
    return objectRows(data);
  }
  if (isPolymarketQuoteTable(endpointId)) return quoteRows(endpointId, picks, options);
  if (REQUIREMENTS[endpointId]?.kind === "token") return tokenRows(endpointId, pick);
  return discoveryRows(endpointId);
}

/**
 * @param {string} endpointId
 * @param {Array<Record<string, unknown>>} [picks]
 */
export function loadPolymarketLiveTable(endpointId, picks = [], options = {}) {
  const requirement = REQUIREMENTS[endpointId];
  if (requirement && !picks.length) {
    return Promise.resolve(pack(endpointId, []));
  }
  return directedRows(endpointId, picks, options)
    .then((rows) => pack(endpointId, rows))
    .catch((error) => {
      throw error instanceof Error ? error : new Error("Pull failed");
    });
}
