/**
 * Polymarket Live in the v2 builder.
 * Legacy connect keeps its own category list. This map follows the Kalshi Live
 * sister layout: markets, series, events, and traders, with websocket feeds
 * badged on the HTTP endpoints that seed them.
 */
import { getPolymarketLiveColumnsForEndpoint, POLYMARKET_LIVE_CONNECT_ENDPOINTS } from "@/config/polymarketLiveConnect";
import { expandOrderBookSummaryToRows, orderbooksMarketRefFromSuggestion, parseOutcomeList, parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";
import { flattenPolymarketMarket, polymarketMarketExtraColumns } from "@/lib/polymarketLive/polymarketMarketScan";

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
  getOpenInterestCompose: { kind: "token", prompt: "Token required" },
  getMarketPrices: { kind: "token", prompt: "Token required" },
  getOrderbooks: { kind: "token", prompt: "Token required" },
  getMidpointPrices: { kind: "token", prompt: "Token required" },
  getSpreads: { kind: "token", prompt: "Token required" },
  getLastTradePrices: { kind: "token", prompt: "Token required" },
  getBatchPricesHistory: { kind: "token", prompt: "Token required" },
  getTradesByMarket: { kind: "token", prompt: "Token required" },
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
  if (String(endpointId) !== "getMarkets") return columns;
  return [...columns, ...polymarketMarketExtraColumns(columns.map((column) => column.id)).filter((column) => !column.queryOnly)];
}

function cellValue(value) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function projectRows(rows, columns, flatten) {
  return (Array.isArray(rows) ? rows : []).slice(0, 50).map((row) => {
    const source = flatten ? flattenPolymarketMarket(row) : row && typeof row === "object" ? row : {};
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
  const projected = projectRows(rows, columns, endpointId === "getMarkets");
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

function flattenHistory(payload, market) {
  const root = payload && typeof payload === "object" ? payload : {};
  const history = root.history && typeof root.history === "object" ? root.history : root;
  const rows = [];
  for (const [tokenId, points] of Object.entries(history)) {
    if (!Array.isArray(points)) continue;
    points.forEach((point, index) => {
      if (!point || typeof point !== "object") return;
      const seconds = Number(point.t);
      rows.push(
        stampMarket(
          {
            token_id: tokenId,
            outcome: market?.outcomes?.[index] || market?.outcomes?.[0] || "",
            t: Number.isFinite(seconds) ? seconds : "",
            timestamp: Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : "",
            p: point.p ?? "",
          },
          market,
        ),
      );
    });
  }
  return rows.slice(-50);
}

function flattenTokenPayload(data, tokens, market) {
  if (Array.isArray(data)) {
    return data.map((row, index) =>
      stampMarket(
        { ...(row && typeof row === "object" ? row : { value: row }), token_id: tokens[index] || row?.token_id || "" },
        market,
      ),
    );
  }
  if (data && typeof data === "object") {
    const entries = Object.entries(data).filter(([key]) => key !== "error" && key !== "message");
    if (entries.length) {
      return entries.map(([tokenId, value]) =>
        stampMarket(
          {
            token_id: tokenId,
            ...(value && typeof value === "object" && !Array.isArray(value) ? value : { value }),
          },
          market,
        ),
      );
    }
  }
  return objectRows(data).map((row, index) => stampMarket({ ...row, token_id: tokens[index] || "" }, market));
}

async function tokenRows(endpointId, pick) {
  const market = await resolveMarket(pick);
  const tokens = (market?.tokenIds || []).slice(0, 2);
  if (!tokens.length) throw new Error("This market has no CLOB token id.");
  if (endpointId === "getOrderbooks") {
    const books = await Promise.all(tokens.map((tokenId) => polymarketGet("getOrderBook", { token_id: tokenId })));
    const meta = {
      id: market.entityId,
      slug: market.slug,
      conditionId: market.conditionId,
      title: market.title,
      tokenIds: market.tokenIds,
      outcomes: market.outcomes,
    };
    return books.flatMap((book) => {
      const pages = Array.isArray(book) ? book : [book];
      return pages.flatMap((page) => expandOrderBookSummaryToRows(page, { marketMeta: meta }));
    });
  }
  if (endpointId === "getMarketPrices") {
    const data = await polymarketGet("getMarketPrices", {
      token_ids: tokens.join(","),
      sides: tokens.map(() => "BUY").join(","),
    });
    return flattenTokenPayload(data, tokens, market).map((row) => ({ ...row, side: row.side || "BUY" }));
  }
  if (endpointId === "getMidpointPrices" || endpointId === "getSpreads" || endpointId === "getLastTradePrices") {
    const query = endpointId === "getMidpointPrices" ? "getMidpointPrices" : endpointId === "getSpreads" ? "getSpreads" : "getLastTradePrices";
    const data = await polymarketPost(query, tokens.map((token_id) => ({ token_id })));
    return flattenTokenPayload(data, tokens, market);
  }
  if (endpointId === "getBatchPricesHistory") {
    const data = await polymarketPost("getBatchPricesHistory", { markets: tokens.slice(0, 1), interval: "1h" });
    return flattenHistory(data, market);
  }
  if (endpointId === "getTradesByMarket") {
    if (!market.conditionId) throw new Error("This market has no condition id.");
    const data = await polymarketGet("getTradesByMarket", {
      market: market.conditionId,
      limit: "50",
      takerOnly: "true",
    });
    return objectRows(data).map((row) => stampMarket(row, market));
  }
  if (endpointId === "getOpenInterestCompose") {
    const data = await polymarketGet("getOpenInterest", { market: market.conditionId });
    return objectRows(data).map((row) => stampMarket(row, market));
  }
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
    return objectRows(page?.data || page);
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

async function directedRows(endpointId, picks) {
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
  if (REQUIREMENTS[endpointId]?.kind === "token") return tokenRows(endpointId, pick);
  return discoveryRows(endpointId);
}

/**
 * @param {string} endpointId
 * @param {Array<Record<string, unknown>>} [picks]
 */
export function loadPolymarketLiveTable(endpointId, picks = []) {
  const requirement = REQUIREMENTS[endpointId];
  if (requirement && !picks.length) {
    return Promise.resolve(pack(endpointId, []));
  }
  return directedRows(endpointId, picks)
    .then((rows) => pack(endpointId, rows))
    .catch((error) => {
      throw error instanceof Error ? error : new Error("Pull failed");
    });
}
