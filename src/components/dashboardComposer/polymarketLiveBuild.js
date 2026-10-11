/**
 * Polymarket Live in the v2 builder.
 * Legacy connect keeps its own category list. This map follows the Kalshi Live
 * sister layout: markets, series, events, and traders, with websocket feeds
 * badged on the HTTP endpoints that seed them.
 */
import { getPolymarketLiveColumnsForEndpoint, POLYMARKET_LIVE_CONNECT_ENDPOINTS } from "@/config/polymarketLiveConnect";
import { flattenLastTradePricesRows } from "@/lib/polymarketLive/lastTradePricesCompose";
import { openInterestRowsFromPayload } from "@/lib/polymarketLive/openInterestCompose";
import { expandOrderBookSummaryToRows, orderbooksMarketRefFromSuggestion, parseOutcomeList, parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";
import { flattenPolymarketMarket, polymarketMarketExtraColumns } from "@/lib/polymarketLive/polymarketMarketScan";
import {
  defaultPolymarketQuoteFilters,
  HOLDER_COLUMNS,
  isPolymarketQuoteTable,
  polymarketBookSide,
  polymarketHistoryBody,
  polymarketHolderLimit,
  polymarketHolderQuery,
  polymarketQuoteColumnType,
  polymarketQuoteDefaultColumns,
  polymarketQuoteOutcome,
  polymarketQuoteTarget,
  polymarketQuoteTokens,
  polymarketTokenHistoryParams,
  polymarketTradeQuery,
  TICK_SIZE_COLUMNS,
  TOKEN_PRICE_HISTORY_COLUMNS,
  TRADE_COLUMNS,
} from "@/lib/polymarketLive/polymarketQuoteQuery";
import { flattenSamplingMarket, samplingMarketSheetColumns } from "@/lib/polymarketLive/polymarketSamplingScan";
import {
  biggestWinnerSheetRow,
  polymarketBiggestWinnersPage,
  polymarketBiggestWinnersQuery,
  polymarketBiggestWinnersTarget,
  POLYMARKET_BIGGEST_WINNERS_COLUMNS,
  POLYMARKET_BIGGEST_WINNERS_DEFAULT_COLUMNS,
} from "@/lib/polymarketLive/biggestWinnersCompose";
import {
  leaderboardSheetRow,
  polymarketLeaderboardPage,
  polymarketLeaderboardQuery,
  polymarketLeaderboardTarget,
  POLYMARKET_TRADER_LEADERBOARD_COLUMNS,
} from "@/lib/polymarketLive/traderLeaderboardCompose";
import {
  mergeTraderByAddress,
  traderAddressesFromPicks,
  TRADER_BY_ADDRESS_COLUMNS,
  TRADER_BY_ADDRESS_DEFAULT_COLUMNS,
  TRADER_BY_ADDRESS_ENDPOINT_ID,
} from "@/lib/polymarketLive/traderByAddressCompose";
import {
  mergePolymarketPositionCohorts,
  polymarketPositionPage,
  polymarketPositionPageParams,
  polymarketPositionQuery,
  polymarketPositionTarget,
  polymarketPositionWalks,
  positionSheetRow,
  TRADER_POSITIONS_COLUMNS,
  TRADER_POSITIONS_DEFAULT_COLUMNS,
  TRADER_POSITIONS_ENDPOINT_ID,
} from "@/lib/polymarketLive/traderPositionsCompose";

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
  getBiggestWinners: "holders",
};

/** Data API path the Traders menu actually calls. Gamma is a separate host. */
const API_VERSION = {
  getHoldersByMarkets: "v2",
  getTraderLeaderboard: "v2",
  getBiggestWinners: "v2",
  getCurrentPositions: "v1",
  getClosedPositions: "v1",
  getUserActivity: "v1",
  getHolderPositionValue: "v1",
  getHolderTrades: "v1",
  getHolderTradedMarkets: "v1",
  getPublicProfiles: "gamma",
  [TRADER_BY_ADDRESS_ENDPOINT_ID]: "v2",
  [TRADER_POSITIONS_ENDPOINT_ID]: "v2",
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
  getTickSize: { kind: "token", prompt: "Market required" },
  getLastTradePrices: { kind: "token", prompt: "Market required" },
  getBatchPricesHistory: { kind: "token", prompt: "Market required" },
  getTokenPriceHistory: { kind: "token", prompt: "Market required" },
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
  [TRADER_BY_ADDRESS_ENDPOINT_ID]: { kind: "address", prompt: "Wallet address required" },
  [TRADER_POSITIONS_ENDPOINT_ID]: { kind: "address", prompt: "Wallet address required" },
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
  getSamplingMarkets: {
    description: "Markets that are open and can be traded right now.",
  },
  getOrderbooks: {
    description: "The buy and sell prices, and the size available at each price.",
  },
  getMarketPrices: {
    description: "The best price to buy and the best price to sell.",
  },
  getMidpointPrices: {
    description: "The price halfway between the best buy and the best sell.",
  },
  getLastTradePrices: {
    description: "The price and side of the most recent trade.",
  },
  getBatchPricesHistory: {
    description: "How a market's price has moved over time.",
  },
  getTradesByMarket: {
    title: "Trade History",
    description: "Each executed trade, with its price, size, side, and time.",
  },
  getOpenInterestCompose: {
    description: "The dollar value of shares still held in a market.",
  },
  getMarketsByEvents: {
    description: "The markets that belong to an event.",
  },
  getEvents: {
    description: "Events, with their title, volume, and whether they are still open.",
  },
  series: {
    description: "A group of related events, with its title and volume.",
  },
  getLiveVolumeForEvent: {
    description: "How much is trading on an event right now, including each market.",
  },
  getHoldersByMarkets: {
    title: "Top Holders",
    description: "The largest holders of a market, and how many shares each one holds.",
  },
  getPublicProfiles: {
    description: "A trader's public name and profile.",
  },
  getCurrentPositions: {
    description: "Positions a trader still has open.",
  },
  getClosedPositions: {
    description: "Positions a trader has already closed.",
  },
  getUserActivity: {
    description: "A trader's recent trades and other account activity.",
  },
  getHolderPositionValue: {
    description: "The total value of a trader's open positions.",
  },
  getHolderTrades: {
    description: "Trades a trader has made.",
  },
  getHolderTradedMarkets: {
    description: "How many markets a trader has traded.",
  },
  getTraderLeaderboard: {
    description: "Traders ranked by profit or by trading volume.",
  },
  getBiggestWinners: {
    title: "Biggest Wins",
    description: "The biggest winning positions, including combo wins. A combo row keeps its joined title and has no event link.",
  },
  [TRADER_BY_ADDRESS_ENDPOINT_ID]: {
    title: "Get trader's profile and stats",
    description: "Name, markets traded, biggest win, profile views, all-time PnL, volume, and portfolio value.",
  },
  [TRADER_POSITIONS_ENDPOINT_ID]: {
    title: "Get trader's positions",
    description: "A trader's open, redeemable, and closed positions, with size, price, and PnL.",
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
      ...(API_VERSION[endpoint.id] ? { api: API_VERSION[endpoint.id] } : {}),
    }))
    .sort((a, b) => {
      const group = groupOrder[a.category] - groupOrder[b.category];
      if (group) return group;
      return (REQUIREMENTS[a.id] ? 1 : 0) - (REQUIREMENTS[b.id] ? 1 : 0);
    });
  const spreadAt = endpoints.findIndex((endpoint) => endpoint.id === "getSpreads");
  if (spreadAt >= 0 && !endpoints.some((endpoint) => endpoint.id === "getTickSize")) {
    endpoints.splice(spreadAt + 1, 0, {
      id: "getTickSize",
      title: "Tick Size",
      description: "The smallest price step for an outcome.",
      category: "markets",
      realtime: false,
    });
  }
  const priceIndex = endpoints.findIndex((endpoint) => endpoint.id === "getBatchPricesHistory");
  const tradeIndex = endpoints.findIndex((endpoint) => endpoint.id === "getTradesByMarket");
  if (priceIndex >= 0 && tradeIndex >= 0 && tradeIndex !== priceIndex + 1) {
    const [trade] = endpoints.splice(tradeIndex, 1);
    endpoints.splice(priceIndex + 1, 0, trade);
  }
  const historyAt = endpoints.findIndex((endpoint) => endpoint.id === "getBatchPricesHistory");
  if (historyAt >= 0 && !endpoints.some((endpoint) => endpoint.id === "getTokenPriceHistory")) {
    endpoints.splice(historyAt + 1, 0, {
      id: "getTokenPriceHistory",
      title: "Token Price History",
      description: "The price of one outcome over time, and how wide each point is.",
      category: "markets",
      realtime: false,
    });
  }
  if (!endpoints.some((endpoint) => endpoint.id === TRADER_BY_ADDRESS_ENDPOINT_ID)) {
    const afterWins = endpoints.findIndex((endpoint) => endpoint.id === "getBiggestWinners");
    endpoints.splice(afterWins >= 0 ? afterWins + 1 : endpoints.length, 0, {
      id: TRADER_BY_ADDRESS_ENDPOINT_ID,
      ...(BUILD_COPY[TRADER_BY_ADDRESS_ENDPOINT_ID] || {}),
      category: "holders",
      realtime: false,
      api: "v2",
    });
  }
  if (!endpoints.some((endpoint) => endpoint.id === TRADER_POSITIONS_ENDPOINT_ID)) {
    const afterProfile = endpoints.findIndex((endpoint) => endpoint.id === TRADER_BY_ADDRESS_ENDPOINT_ID);
    endpoints.splice(afterProfile >= 0 ? afterProfile + 1 : endpoints.length, 0, {
      id: TRADER_POSITIONS_ENDPOINT_ID,
      ...(BUILD_COPY[TRADER_POSITIONS_ENDPOINT_ID] || {}),
      category: "holders",
      realtime: false,
      api: "v2",
    });
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
    const byAddress = tableId === TRADER_BY_ADDRESS_ENDPOINT_ID;
    return {
      entities: ["profile"],
      placeholder: byAddress ? "Search a username or paste an address" : "Search for a trader",
      prompt: requirement.prompt,
      ...(byAddress ? { acceptAddress: true } : {}),
    };
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
    closed: marketIsClosed(suggestion) || marketIsClosed(suggestion.raw),
    ...marketLifeFromRow(suggestion),
  };
}

export const POLYMARKET_CLOSED_ORDERBOOK_MESSAGE =
  "Market is closed so no live orderbook snapshot is available.";

/** Price, trade, and other market pulls. Each selected market is its own sheet. */
export function polymarketMarketFanout(tableId) {
  return isPolymarketQuoteTable(tableId) || tableId === "getHoldersByMarkets" || tableId === TRADER_POSITIONS_ENDPOINT_ID;
}

/** Downstream market sources a pull can join. Order matches the Markets menu. */
const POLYMARKET_JOIN_IDS = [
  "getOrderbooks",
  "getMarketPrices",
  "getMidpointPrices",
  "getSpreads",
  "getTickSize",
  "getLastTradePrices",
  "getBatchPricesHistory",
  "getTokenPriceHistory",
  "getTradesByMarket",
  "getOpenInterestCompose",
  "getHoldersByMarkets",
];

export const POLYMARKET_PARENT_MARKET_JOIN = {
  id: "parent-market",
  title: "Parent market",
  detail: "The market this pull belongs to.",
  realtime: false,
};

let polymarketJoinCache = null;

/** Titles and sentences come from the builder menu so the join list stays in step with it. */
export function polymarketLiveMarketJoins() {
  if (polymarketJoinCache) return polymarketJoinCache;
  const byId = new Map(polymarketLiveBuildEndpoints().map((endpoint) => [endpoint.id, endpoint]));
  polymarketJoinCache = POLYMARKET_JOIN_IDS.map((id) => {
    const endpoint = byId.get(id);
    return {
      id,
      title: endpoint?.title || id,
      detail: endpoint?.description || "",
      realtime: Boolean(endpoint?.realtime),
    };
  });
  return polymarketJoinCache;
}

/**
 * Find markets and sampling markets join every downstream source.
 * A downstream pull joins the parent market and every other source.
 * @param {string} tableId
 */
export function polymarketJoinChoices(tableId) {
  const joins = polymarketLiveMarketJoins().filter((item) => item.id !== tableId);
  if (tableId === "getMarkets" || tableId === "getSamplingMarkets") return joins;
  if (isPolymarketQuoteTable(tableId)) return [POLYMARKET_PARENT_MARKET_JOIN, ...joins];
  return [];
}

/**
 * A market row from Find markets or sampling, shaped like a search pick.
 * @param {Record<string, unknown>} row
 */
export function polymarketJoinPickFromRow(row) {
  if (!row || typeof row !== "object") return null;
  const entityId = String(row.id || row.market_id || "").trim();
  const conditionId = String(row.conditionId || row.condition_id || "").trim();
  const slug = String(row.slug || row.market_slug || "").trim();
  const title = String(row.question || row.market_title || row.title || slug || entityId || conditionId).trim();
  if (!entityId && !conditionId && !slug) return null;
  return {
    id: `market:${entityId || conditionId || slug}`,
    kind: "market",
    entityId,
    slug,
    title,
    label: title.slice(0, 80),
    conditionId,
    tokenIds: parseTokenIdList(row.clobTokenIds || row.clob_token_ids || row.token_ids || row.tokenIds),
    outcomes: parseOutcomeList(row.outcomes),
    closed: row.closed === true || row.closed === "true",
    ...marketLifeFromRow(row),
  };
}

export function polymarketPickMatchesRow(pick, row) {
  if (!pick || !row || typeof row !== "object") return false;
  if (pick.kind === "profile") {
    const wallet = String(pick.address || "").trim().toLowerCase();
    if (!wallet) return false;
    const held = String(row.proxy_wallet || "").trim().toLowerCase();
    const asked = String(row.user || "").trim().toLowerCase();
    return wallet === held || wallet === asked;
  }
  const title = String(row.market_title || "").trim();
  const id = String(row.market_id || "").trim();
  const slug = String(row.market_slug || "").trim();
  const condition = String(row.condition_id || row.conditionId || "").trim();
  if (id && String(pick.entityId || "") === id) return true;
  if (condition && String(pick.conditionId || "") === condition) return true;
  if (slug && String(pick.slug || "") === slug) return true;
  if (title && (title === String(pick.title || "") || title === String(pick.label || ""))) return true;
  return false;
}

export function polymarketRowsForMarket(rows, pick, picks) {
  const list = Array.isArray(rows) ? rows : [];
  const selected = (Array.isArray(picks) ? picks : []).filter(Boolean);
  if (!pick || selected.length < 2) return list;
  return list.filter((row) => polymarketPickMatchesRow(pick, row));
}

/**
 * A preview with no row limit stays at the fallback (50).
 * A save-and-run passes the plan as rowLimit, so the ceiling is the plan.
 * @param {unknown} planLimit
 * @param {number} endpointCap
 */
function quotePullCap(planLimit, endpointCap) {
  const plan = Number(planLimit);
  if (Number.isFinite(plan) && plan > endpointCap) return Math.floor(plan);
  return endpointCap;
}

/** Rows requested for this pull. An empty row limit is the preview size. */
function pullSize(options, fallback = 50) {
  const requested = Number(options?.rowLimit);
  const plan = Number(options?.planLimit);
  const asked = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : fallback;
  const planCap = Number.isFinite(plan) && plan > 0 ? Math.floor(plan) : asked;
  return Math.max(1, Math.min(planCap, asked));
}

/** Keep each market's own newest rows. A shared cap would blend markets into one sheet. */
function takePerMarket(rows, limit) {
  const groups = new Map();
  const order = [];
  for (const row of rows) {
    const key = String(row?.condition_id || row?.market_id || row?.market_slug || "");
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    const bucket = groups.get(key);
    if (bucket.length < limit) bucket.push(row);
  }
  return order.flatMap((key) => groups.get(key));
}

function lifeSeconds(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const seconds = value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
    return seconds > 0 ? seconds : null;
  }
  const parsed = Date.parse(String(value).trim().replace(" ", "T").replace(/\+00$/, "Z"));
  if (!Number.isFinite(parsed)) return null;
  const seconds = Math.floor(parsed / 1000);
  return seconds > 0 ? seconds : null;
}

function marketLifeFromRow(row) {
  const source = row && typeof row === "object" ? row : {};
  const raw = source.raw && typeof source.raw === "object" ? source.raw : source;
  const closesAt = lifeSeconds(raw.closedTime || raw.closed_time || raw.endDate || raw.end_date || raw.endDateIso || source.closesAt || source.endedAt);
  const startedAt = lifeSeconds(raw.startDate || raw.start_date || source.startedAt);
  const outcome = String(raw.result || raw.outcome || source.outcome || "").trim();
  return {
    endedAt: closesAt && closesAt * 1000 <= Date.now() ? closesAt : null,
    closesAt: closesAt || null,
    startedAt: startedAt || null,
    outcome: outcome && !outcome.startsWith("[") ? outcome : "",
  };
}

function marketIsClosed(value) {
  if (!value || typeof value !== "object") return value === true || value === "true";
  return value.closed === true || value.closed === "true";
}

function isMissingOrderbookError(error) {
  const text = error instanceof Error ? error.message : String(error || "");
  return /no orderbook exists/i.test(text);
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

function sheetColumns(endpointId, entries) {
  const defaults = new Set(polymarketQuoteDefaultColumns(endpointId));
  return entries.map((entry) => {
    const column = {
      id: entry.name,
      title: titleFor(entry.name),
      type: entry.name === "observed_at" ? "date" : columnType(entry.type),
      description: entry.description || "",
      defaultOn: defaults.has(entry.name),
    };
    if (entry.name === "observed_at") column.dateEpoch = "iso";
    return column;
  });
}

export function polymarketLiveBuildColumns(endpointId) {
  if (endpointId === "getTraderLeaderboard") {
    const defaults = new Set(["rank", "user_name", "pnl", "volume", "time_period", "category", "sort_by"]);
    return POLYMARKET_TRADER_LEADERBOARD_COLUMNS.map((entry) => ({
      id: entry.name,
      title: titleFor(entry.name),
      type: columnType(entry.type),
      description: entry.description || "",
      defaultOn: defaults.has(entry.name),
    }));
  }
  if (endpointId === "getBiggestWinners") {
    const defaults = new Set(POLYMARKET_BIGGEST_WINNERS_DEFAULT_COLUMNS);
    return POLYMARKET_BIGGEST_WINNERS_COLUMNS.map((entry) => {
      const column = {
        id: entry.name,
        title: titleFor(entry.name),
        type: columnType(entry.type),
        description: entry.description || "",
        defaultOn: defaults.has(entry.name),
      };
      if (entry.name === "resolved_at") {
        column.type = "date";
        column.dateEpoch = "unix";
      }
      return column;
    });
  }
  if (endpointId === TRADER_POSITIONS_ENDPOINT_ID) {
    const defaults = new Set(TRADER_POSITIONS_DEFAULT_COLUMNS);
    return TRADER_POSITIONS_COLUMNS.map((entry) => {
      const column = {
        id: entry.name,
        title: entry.title || titleFor(entry.name),
        type: columnType(entry.type),
        description: entry.description || "",
        defaultOn: defaults.has(entry.name),
      };
      if (entry.dateEpoch) column.dateEpoch = entry.dateEpoch;
      if (entry.exact) column.exact = true;
      return column;
    });
  }
  if (endpointId === TRADER_BY_ADDRESS_ENDPOINT_ID) {
    const defaults = new Set(TRADER_BY_ADDRESS_DEFAULT_COLUMNS);
    return TRADER_BY_ADDRESS_COLUMNS.map((entry) => {
      const column = {
        id: entry.name,
        title: entry.title || titleFor(entry.name),
        type: columnType(entry.type),
        description: entry.description || "",
        defaultOn: defaults.has(entry.name),
      };
      if (entry.dateEpoch) column.dateEpoch = entry.dateEpoch;
      if (entry.exact) column.exact = true;
      return column;
    });
  }
  if (endpointId === "getTickSize") return sheetColumns(endpointId, TICK_SIZE_COLUMNS);
  if (endpointId === "getTokenPriceHistory") return sheetColumns(endpointId, TOKEN_PRICE_HISTORY_COLUMNS);
  if (endpointId === "getTradesByMarket") return sheetColumns(endpointId, TRADE_COLUMNS);
  if (endpointId === "getHoldersByMarkets") return sheetColumns(endpointId, HOLDER_COLUMNS);
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
      if (column.id === "t") next.exact = true;
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
  const limit = Math.max(Array.isArray(rows) ? rows.length : 0, 1);
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

function tradePage(payload) {
  const root = Array.isArray(payload) ? payload[0] : payload;
  const rows = Array.isArray(root?.data)
    ? root.data.filter((item) => item && typeof item === "object")
    : objectRows(payload);
  const cursor = root?.pagination?.next_cursor ? String(root.pagination.next_cursor) : "";
  return { rows, cursor };
}

function tradeSheetRow(row, market) {
  const seconds = Number(row.timestamp);
  const index = row.outcome_index ?? row.outcomeIndex;
  return stampMarket(
    {
      title: row.title || "",
      slug: row.slug || "",
      event_slug: row.event_slug || row.eventSlug || "",
      token_id: String(row.token_id || row.asset || ""),
      outcome: row.outcome || "",
      outcome_index: index == null || index === "" ? "" : asNum(index),
      side: row.side || "",
      price: asNum(row.price),
      size: asNum(row.size),
      timestamp: Number.isFinite(seconds) ? String(seconds) : "",
      observed_at: Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : "",
      proxy_wallet: row.proxy_wallet || row.proxyWallet || "",
      name: row.name || "",
      pseudonym: row.pseudonym || "",
      transaction_hash: row.transaction_hash || row.transactionHash || "",
    },
    market,
  );
}

async function resolveMarket(pick) {
  if (!pick) return null;
  const closedKnown = pick.closed === true || pick.closed === false;
  if (pick.tokenIds?.length && pick.conditionId && closedKnown) return pick;
  const tokenId = Array.isArray(pick.tokenIds) ? pick.tokenIds.map((token) => String(token || "").trim()).find(Boolean) : "";
  const params = pick.entityId
    ? { id: pick.entityId, limit: "1" }
    : pick.slug
      ? { slug: pick.slug, limit: "1" }
      : pick.conditionId
        ? { condition_ids: pick.conditionId, limit: "1" }
        : tokenId
          ? { clob_token_ids: tokenId, limit: "1" }
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
    closed: marketIsClosed(row) || pick.closed === true,
    endedAt: marketLifeFromRow(row).endedAt || pick.endedAt || null,
    closesAt: marketLifeFromRow(row).closesAt || pick.closesAt || null,
    startedAt: marketLifeFromRow(row).startedAt || pick.startedAt || null,
    outcome: marketLifeFromRow(row).outcome || pick.outcome || "",
  };
}

function metaFromGammaRow(row, token = "") {
  if (!row) return null;
  const life = marketLifeFromRow(row);
  const tokenIds = parseTokenIdList(row.clobTokenIds || row.clob_token_ids);
  const outcomes = parseOutcomeList(row.outcomes);
  const wanted = String(token || "").trim();
  const index = wanted ? tokenIds.findIndex((id) => id === wanted) : -1;
  const side = index >= 0 ? String(outcomes[index] || "").trim() : "";
  const closed = marketIsClosed(row);
  const marketTitle = String(row.question || row.groupItemTitle || "").trim();
  if (!marketTitle) return null;
  return {
    marketTitle,
    ticker: String(row.slug || row.id || "").trim(),
    side: side && !side.startsWith("[") ? side : "",
    openAt: life.startedAt ? life.startedAt * 1000 : 0,
    closeAt: life.closesAt ? life.closesAt * 1000 : 0,
    closed,
    outcome: closed ? life.outcome : "",
    status: closed ? "closed" : "active",
  };
}

/** Title, outcome side, and trading window for one Polymarket token. */
export async function polymarketMarketMeta(tokenId) {
  const token = String(tokenId || "").trim();
  if (!token) return null;
  const data = await polymarketGet("listMarkets", { clob_token_ids: token, limit: "1" });
  return metaFromGammaRow(objectRows(data)[0], token);
}

/**
 * The same market line, from a token, a slug, or a condition id.
 * Closed markets are retried with the closed catalog when the open lookup is empty.
 */
export async function polymarketMarketMetaLookup({ token = "", slug = "", conditionId = "" } = {}) {
  const tokenId = String(token || "").trim();
  if (tokenId) {
    const fromToken = await polymarketMarketMeta(tokenId);
    if (fromToken?.marketTitle) return fromToken;
  }
  const slugText = String(slug || "").trim();
  if (slugText) {
    const fromSlug = metaFromGammaRow(objectRows(await polymarketGet("listMarkets", { slug: slugText, limit: "1" }))[0], tokenId);
    if (fromSlug?.marketTitle) return fromSlug;
  }
  const condition = String(conditionId || "").trim();
  if (!condition) return null;
  let row = objectRows(await polymarketGet("listMarkets", { condition_ids: condition, limit: "1" }))[0];
  if (!row) row = objectRows(await polymarketGet("listMarkets", { condition_ids: condition, limit: "1", closed: "true" }))[0];
  return metaFromGammaRow(row, tokenId);
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
    return row.mid ?? row.mid_price ?? row.midpoint ?? row.price ?? row.spread ?? "";
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

const ORDER_BOOK_BATCH = 500;

async function loadOrderBookPages(pairs) {
  if (pairs.length === 1) {
    try {
      const payload = await polymarketGet("getOrderBook", { token_id: pairs[0].tokenId });
      return unwrapBooks(payload);
    } catch (error) {
      if (pairs[0].market?.closed === true || isMissingOrderbookError(error)) {
        throw new Error(
          pairs[0].market?.closed === true
            ? POLYMARKET_CLOSED_ORDERBOOK_MESSAGE
            : "No orderbook exists for the requested token id.",
        );
      }
      throw error;
    }
  }
  const pages = [];
  for (let i = 0; i < pairs.length; i += ORDER_BOOK_BATCH) {
    const chunk = pairs.slice(i, i + ORDER_BOOK_BATCH);
    const payload = await polymarketPost(
      "getOrderBooks",
      chunk.map((pair) => ({ token_id: pair.tokenId })),
    );
    pages.push(...unwrapBooks(payload));
  }
  if (!pages.length) throw new Error("No orderbook exists for the requested token id.");
  return pages;
}

function holderGroups(payload) {
  const body = asRecord(payload);
  return Array.isArray(body?.data) ? body.data : [];
}

function holderOutcome(market, tokenId, index) {
  const ids = Array.isArray(market?.tokenIds) ? market.tokenIds.map(String) : [];
  const names = Array.isArray(market?.outcomes) ? market.outcomes.map(String) : [];
  const at = ids.findIndex((id) => id === String(tokenId || ""));
  if (at >= 0 && names[at]) return names[at];
  const numeric = Number(index);
  if (numeric === 0 && names[0]) return names[0];
  if (numeric === 1 && names[1]) return names[1];
  return "";
}

async function holderRows(markets, filters, options) {
  const selected = markets.filter((market) => market.conditionId);
  if (!selected.length) throw new Error("This market has no condition id.");
  const query = polymarketHolderQuery(filters);
  const limit = polymarketHolderLimit(filters, options.rowLimit, options.planLimit);
  const outcome = polymarketQuoteOutcome(filters);
  const rows = [];
  for (const market of selected) {
    const payload = await polymarketGet("getHoldersByMarket", {
      condition: market.conditionId,
      limit: String(limit),
      ...query,
    });
    const allowed = new Set(polymarketQuoteTokens(marketRef(market), outcome).map((pair) => String(pair.tokenId)));
    for (const group of holderGroups(payload)) {
      const tokenId = String(group?.token_id || group?.tokenId || "");
      if (outcome !== "both" && allowed.size && !allowed.has(tokenId)) continue;
      const holders = Array.isArray(group?.holders) ? group.holders : [];
      for (const holder of holders) {
        if (!holder || typeof holder !== "object") continue;
        rows.push(
          stampMarket(
            {
              token_id: tokenId,
              outcome: holderOutcome(market, tokenId, holder.outcome_index),
              outcome_index: asNum(holder.outcome_index),
              proxy_wallet: holder.proxy_wallet || "",
              name: holder.name || "",
              pseudonym: holder.pseudonym || "",
              bio: holder.bio || "",
              amount: asNum(holder.amount),
              display_username_public: holder.display_username_public === true,
              profile_image: holder.profile_image || "",
              profile_image_optimized: holder.profile_image_optimized || "",
              verified: holder.verified === true,
              avg_price: asNum(holder.avg_price),
              entry_cost_usdc: asNum(holder.entry_cost_usdc),
              current_price: asNum(holder.current_price),
              current_value: asNum(holder.current_value),
              realized_pnl: asNum(holder.realized_pnl),
              unrealized_pnl: asNum(holder.unrealized_pnl),
              total_pnl: asNum(holder.total_pnl),
            },
            market,
          ),
        );
      }
    }
  }
  return rows;
}

async function quoteRows(endpointId, picks, options = {}) {
  const markets = await quoteMarkets(picks);
  const filters = options.filters || {};
  if (endpointId === "getHoldersByMarkets") return holderRows(markets, filters, options);
  if (endpointId === "getOpenInterestCompose") {
    const selected = markets.filter((market) => market.conditionId);
    if (!selected.length) throw new Error("This market has no condition id.");
    const byCondition = new Map(selected.map((market) => [String(market.conditionId).toLowerCase(), market]));
    const data = await polymarketGet("getOpenInterest", {
      condition: selected.map((market) => market.conditionId).join(","),
    });
    return openInterestRowsFromPayload(data).map((row) => {
      const market = byCondition.get(String(row.condition_id || "").toLowerCase());
      return stampMarket({ ...row, value: asNum(row.value) }, market);
    });
  }
  const bookMarkets =
    endpointId === "getOrderbooks" ? markets.filter((market) => market.closed !== true) : markets;
  if (endpointId === "getOrderbooks" && markets.length && !bookMarkets.length) {
    throw new Error(POLYMARKET_CLOSED_ORDERBOOK_MESSAGE);
  }
  const pairs = quotePairs(bookMarkets, filters);
  if (!pairs.length) throw new Error("This market has no CLOB token id.");
  if (endpointId === "getOrderbooks") {
    const side = polymarketBookSide(filters);
    const pages = await loadOrderBookPages(pairs);
    const byToken = new Map(pairs.map((pair) => [String(pair.tokenId), pair]));
    return pages.flatMap((page) => {
      const assetId = String(page?.asset_id || page?.assetId || "").trim();
      const pair = byToken.get(assetId);
      return expandOrderBookSummaryToRows(page, {
        side,
        marketMeta: marketRef(pair?.market),
      });
    }).map((row) => ({
      ...row,
      price: asNum(row.price),
      size: asNum(row.size),
      last_trade_price: asNum(row.last_trade_price),
      min_order_size: asNum(row.min_order_size),
      tick_size: asNum(row.tick_size),
    }));
  }
  if (endpointId === "getMarketPrices") {
    const requests = pairs.flatMap((pair) => [
      { token_id: pair.tokenId, side: "BUY" },
      { token_id: pair.tokenId, side: "SELL" },
    ]);
    let data;
    try {
      data = requests.length === 1
        ? await polymarketGet("getMarketPrices", requests[0])
        : await polymarketPost("getMarketPrices", requests);
    } catch (error) {
      if (isMissingOrderbookError(error)) {
        throw new Error("No orderbook exists for the requested token id.");
      }
      throw error;
    }
    const map = asRecord(data) || {};
    return pairs.map((pair) => {
      const prices = map[pair.tokenId] && typeof map[pair.tokenId] === "object" ? map[pair.tokenId] : {};
      return stampedQuote(pair, {
        buy_price: asNum(prices.BUY ?? prices.buy),
        sell_price: asNum(prices.SELL ?? prices.sell),
      });
    });
  }
  if (endpointId === "getMidpointPrices") {
    const tokenIds = pairs.map((pair) => pair.tokenId);
    let data;
    try {
      data = tokenIds.length === 1
        ? await polymarketGet("getMidpointPrices", { token_id: tokenIds[0] })
        : await polymarketPost("getMidpointPrices", tokenIds.map((token_id) => ({ token_id })));
    } catch (error) {
      if (isMissingOrderbookError(error)) {
        throw new Error("No orderbook exists for the requested token id.");
      }
      throw error;
    }
    const map = asRecord(data) || {};
    return pairs.map((pair) => stampedQuote(pair, { midpoint_price: asNum(quoteScalar(map[pair.tokenId])) }));
  }
  if (endpointId === "getSpreads") {
    const tokenIds = pairs.map((pair) => pair.tokenId);
    let data;
    try {
      data = tokenIds.length === 1
        ? await polymarketGet("getSpreads", { token_id: tokenIds[0] })
        : await polymarketPost("getSpreads", tokenIds.map((token_id) => ({ token_id })));
    } catch (error) {
      if (isMissingOrderbookError(error)) {
        throw new Error("No orderbook exists for the requested token id.");
      }
      throw error;
    }
    const map = asRecord(data) || {};
    return pairs.map((pair) => stampedQuote(pair, { spread: asNum(quoteScalar(map[pair.tokenId])) }));
  }
  if (endpointId === "getTickSize") {
    const rows = [];
    for (const pair of pairs) {
      const data = await polymarketGet("getTickSize", { token_id: pair.tokenId });
      const record = asRecord(data) || {};
      rows.push(stampedQuote(pair, { minimum_tick_size: asNum(record.minimum_tick_size) }));
    }
    return rows;
  }
  if (endpointId === "getLastTradePrices") {
    let data;
    try {
      data = pairs.length === 1
        ? await polymarketGet("getLastTradePrices", { token_id: pairs[0].tokenId })
        : await polymarketPost("getLastTradePrices", pairs.map((pair) => ({ token_id: pair.tokenId })));
    } catch (error) {
      if (isMissingOrderbookError(error)) {
        throw new Error("No orderbook exists for the requested token id.");
      }
      throw error;
    }
    const payload = Array.isArray(data) ? data : [];
    return flattenLastTradePricesRows(payload, markets.map(marketRef), undefined, polymarketQuoteOutcome(filters)).map((row) => ({
      ...row,
      last_trade_price: asNum(row.last_trade_price),
    }));
  }
  if (endpointId === "getBatchPricesHistory") {
    const groups = new Map();
    for (const pair of pairs) {
      const body = polymarketHistoryBody(filters, pair.market);
      const key = JSON.stringify(body);
      const group = groups.get(key) || { body, tokens: [] };
      if (!group.tokens.includes(pair.tokenId)) group.tokens.push(pair.tokenId);
      groups.set(key, group);
    }
    const payloads = [];
    for (const group of groups.values()) {
      for (let index = 0; index < group.tokens.length; index += 20) {
        payloads.push(await polymarketPost("getBatchPricesHistory", { markets: group.tokens.slice(index, index + 20), ...group.body }));
      }
    }
    const target = polymarketQuoteTarget(options.rowLimit, options.planLimit, 50, quotePullCap(options.planLimit, 2000));
    return takePerMarket(historyRows(payloads, pairs), target);
  }
  if (endpointId === "getTokenPriceHistory") {
    const target = polymarketQuoteTarget(options.rowLimit, options.planLimit, 50, quotePullCap(options.planLimit, 10000));
    const rows = [];
    for (const pair of pairs) {
      const params = polymarketTokenHistoryParams(filters, pair.market);
        const data = await polymarketGet("getTokenPriceHistory", {
        token_id: pair.tokenId,
        limit: String(target),
        ...params,
      });
      const points = Array.isArray(data) ? data : [];
      for (const point of points) {
        if (!point || typeof point !== "object") continue;
        const seconds = Number(point.timestamp);
        rows.push(
          stampMarket(
            {
              token_id: pair.tokenId,
              outcome: pair.outcome || "",
              timestamp: Number.isFinite(seconds) ? String(seconds) : "",
              observed_at: Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : "",
              price: asNum(point.price),
              resolution_seconds: asNum(point.resolution_seconds),
            },
            pair.market,
          ),
        );
      }
    }
    rows.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    return takePerMarket(rows, target);
  }
  if (endpointId === "getTradesByMarket") {
    const tradable = markets.filter((market) => market.conditionId);
    if (!tradable.length) throw new Error("This market has no condition id.");
    const params = polymarketTradeQuery(filters);
    const target = polymarketQuoteTarget(options.rowLimit, options.planLimit, 50, quotePullCap(options.planLimit, 10000));
    const tokenIds = new Set(pairs.map((pair) => String(pair.tokenId)));
    const narrow = polymarketQuoteOutcome(filters) !== "both";
    const pageCap = 1000;
    const maxPages = Math.max(20, Math.ceil(target / pageCap));
    const collected = [];
    for (const market of tradable) {
      let cursor = "";
      let got = 0;
      for (let page = 0; page < maxPages && got < target; page += 1) {
        const data = await polymarketGet("getTradesByMarket", {
          condition: market.conditionId,
          limit: String(narrow ? pageCap : Math.min(pageCap, target - got)),
          ...(cursor ? { cursor } : {}),
          ...params,
        });
        const unpacked = tradePage(data);
        const matched = unpacked.rows.filter((row) => tokenIds.has(String(row.token_id || row.asset || "")));
        collected.push(...matched.map((row) => tradeSheetRow(row, market)));
        got += matched.length;
        if (!unpacked.cursor || !unpacked.rows.length) break;
        cursor = unpacked.cursor;
      }
    }
    return collected;
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

async function pagedObjects(query, params, target) {
  const pageSize = Math.min(100, Math.max(1, target));
  const rows = [];
  const seen = new Set();
  for (let offset = 0; rows.length < target; offset += pageSize) {
    const page = objectRows(
      await polymarketGet(query, {
        ...params,
        limit: String(Math.min(pageSize, target - rows.length)),
        offset: String(offset),
      }),
    );
    let added = 0;
    for (const row of page) {
      const id = String(row.id || row.slug || row.conditionId || "");
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      rows.push(row);
      added += 1;
      if (rows.length >= target) break;
    }
    if (!page.length || added === 0 || page.length < pageSize) break;
  }
  return rows;
}

async function biggestWinnersRows(filters, options = {}) {
  const query = polymarketBiggestWinnersQuery(filters);
  const target = polymarketBiggestWinnersTarget(options);
  const match = typeof options.match === "function" ? options.match : null;
  const explain = typeof options.explain === "function" ? options.explain : null;
  const rows = [];
  const removed = [];
  let scanned = 0;
  let removedCount = 0;
  let cursor = "";
  let exhausted = false;
  const report = () => {
    options.onProgress?.({
      scanned,
      rows: rows.slice(),
      removed: removed.slice(),
      removedCount,
      exhausted,
    });
  };
  for (let page = 0; rows.length < target && page < 500; page += 1) {
    const pageLimit = match ? 1000 : Math.min(1000, target - rows.length);
    const params = cursor
      ? { cursor }
      : {
          time_period: query.time_period,
          category: query.category,
          limit: String(pageLimit),
        };
    const next = polymarketBiggestWinnersPage(await polymarketGet("getBiggestWinners", params));
    if (!next.rows.length) {
      exhausted = true;
      break;
    }
    for (const raw of next.rows) {
      const row = biggestWinnerSheetRow(raw, query);
      scanned += 1;
      if (!match || match(row)) {
        rows.push(row);
        if (rows.length >= target) break;
      } else {
        removedCount += 1;
        if (removed.length < 8) {
          removed.push({
            label: row.user_name || row.event_title || row.user_id || "Win",
            reason: explain ? explain(row) : "",
          });
        }
      }
    }
    report();
    if (rows.length >= target) break;
    if (!next.cursor || next.cursor === cursor) {
      exhausted = true;
      break;
    }
    cursor = next.cursor;
  }
  report();
  return rows;
}

async function leaderboardRows(filters, options = {}) {
  const query = polymarketLeaderboardQuery(filters);
  const target = polymarketLeaderboardTarget(filters, options);
  if (query.user) {
    const page = polymarketLeaderboardPage(await polymarketGet("getTraderLeaderboard", {
      time_period: query.time_period,
      category: query.category,
      user: query.user,
    }));
    return page.rows.slice(0, 1).map((row) => leaderboardSheetRow(row, query));
  }
  const rows = [];
  let cursor = "";
  for (let page = 0; rows.length < target && page < 200; page += 1) {
    const params = cursor
      ? { cursor }
      : {
          time_period: query.time_period,
          category: query.category,
          sort_by: query.sort_by,
          limit: String(Math.min(1000, target - rows.length)),
        };
    const next = polymarketLeaderboardPage(await polymarketGet("getTraderLeaderboard", params));
    if (!next.rows.length) break;
    for (const row of next.rows) {
      rows.push(leaderboardSheetRow(row, query));
      if (rows.length >= target) break;
    }
    if (!next.cursor || next.cursor === cursor) break;
    cursor = next.cursor;
  }
  return rows;
}

async function discoveryRows(endpointId, options = {}) {
  const target = pullSize(options, 50);
  if (endpointId === "getMarkets") {
    return pagedObjects(
      "listMarkets",
      { closed: "false", order: "volume24hr", ascending: "false", include_tag: "true" },
      target,
    );
  }
  if (endpointId === "getSamplingMarkets") {
    const page = await polymarketGet("getSamplingMarkets");
    const body = Array.isArray(page) ? page[0] : page;
    return objectRows(body?.data || body).slice(0, target);
  }
  if (endpointId === "getEvents") {
    return pagedObjects("listEvents", { closed: "false", order: "volume", ascending: "false" }, target);
  }
  if (endpointId === "series") {
    return pagedObjects("listSeries", { closed: "false" }, target);
  }
  if (endpointId === "getTraderLeaderboard") return leaderboardRows(options.filters || {}, options);
  if (endpointId === "getBiggestWinners") return biggestWinnersRows(options.filters || {}, options);
  return [];
}

function missingTraderRecord(error) {
  const message = String(error instanceof Error ? error.message : error || "");
  return /not found|404|unknown user|no profile/i.test(message);
}

async function readPublicProfile(address) {
  try {
    const data = await polymarketGet("getPublicProfile", { address });
    const row = Array.isArray(data) ? data[0] : data;
    return row && typeof row === "object" ? row : null;
  } catch (error) {
    if (missingTraderRecord(error)) return null;
    throw error;
  }
}

async function readPortfolioValue(address) {
  try {
    const data = await polymarketGet("getPortfolioValue", { user: address });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") return null;
    if ("data" in row) return row.data && typeof row.data === "object" ? row.data : null;
    return row;
  } catch (error) {
    if (missingTraderRecord(error)) return null;
    throw error;
  }
}

async function readUserStats(address) {
  try {
    const data = await polymarketGet("getUserStats", { user: address });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") return null;
    if ("data" in row) return row.data && typeof row.data === "object" ? row.data : null;
    return row;
  } catch (error) {
    if (missingTraderRecord(error)) return null;
    throw error;
  }
}

/** One sheet's worth of positions per wallet. Statuses and market batches are separate calls, then merged. */
async function traderPositionRows(picks, options = {}) {
  const addresses = traderAddressesFromPicks(picks);
  if (!addresses.length) throw new Error("Search for a trader wallet.");
  const query = polymarketPositionQuery(options.filters || {}, options.sorts || []);
  const walks = polymarketPositionWalks(query);
  const target = polymarketPositionTarget(options);
  const rows = [];
  for (const address of addresses) {
    const cohorts = [];
    for (const walk of walks) {
      const cohort = [];
      let cursor = "";
      let got = 0;
      for (let page = 0; got < target && page < 500; page += 1) {
        const params = polymarketPositionPageParams(address, walk, cursor, Math.min(1000, target - got));
        const next = polymarketPositionPage(await polymarketGet("getTraderPositions", params));
        for (const raw of next.rows) {
          cohort.push(positionSheetRow(raw, address));
          got += 1;
          if (got >= target) break;
        }
        if (!next.rows.length || !next.cursor || next.cursor === cursor) break;
        cursor = next.cursor;
      }
      cohorts.push(cohort);
    }
    rows.push(...mergePolymarketPositionCohorts(cohorts, target));
  }
  return rows;
}

/** One merged row per submitted wallet. Profile, stats, and portfolio value share that row. */
async function traderByAddressRows(picks) {
  const addresses = traderAddressesFromPicks(picks);
  if (!addresses.length) throw new Error("Search for a trader wallet.");
  const rows = [];
  let firstError = null;
  for (const address of addresses) {
    const [profileResult, statsResult, valueResult] = await Promise.allSettled([
      readPublicProfile(address),
      readUserStats(address),
      readPortfolioValue(address),
    ]);
    const profileFailed = profileResult.status === "rejected";
    const statsFailed = statsResult.status === "rejected";
    const valueFailed = valueResult.status === "rejected";
    if (profileFailed && statsFailed && valueFailed) {
      firstError = firstError || profileResult.reason;
      continue;
    }
    rows.push(mergeTraderByAddress(
      address,
      profileFailed ? null : profileResult.value,
      statsFailed ? null : statsResult.value,
      valueFailed ? null : valueResult.value,
    ));
  }
  if (!rows.length && firstError) {
    throw firstError instanceof Error ? firstError : new Error("Pull failed");
  }
  return rows;
}

async function directedRows(endpointId, picks, options = {}) {
  const pick = picks[0];
  if (!pick) return discoveryRows(endpointId, options);
  if (endpointId === "getMarkets" || endpointId === "getSamplingMarkets") {
    if (pick.kind !== "market") return discoveryRows(endpointId, options);
    const market = await resolveMarket(pick);
    const data = market?.entityId
      ? await polymarketGet("getMarket", { id: market.entityId })
      : await polymarketGet("listMarkets", { slug: market?.slug, limit: "1" });
    return objectRows(data);
  }
  if (endpointId === "getEvents") {
    if (!pick.entityId) return discoveryRows(endpointId, options);
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
  if (endpointId === "getTraderLeaderboard") {
    const filters = { ...(options.filters || {}) };
    const typed = String(filters.user?.value || "").trim();
    if (!typed && pick.address) filters.user = { value: pick.address };
    return leaderboardRows(filters, options);
  }
  if (endpointId === "getBiggestWinners") return biggestWinnersRows(options.filters || {}, options);
  if (endpointId === TRADER_POSITIONS_ENDPOINT_ID) return traderPositionRows(picks, options);
  if (endpointId === TRADER_BY_ADDRESS_ENDPOINT_ID) return traderByAddressRows(picks);
  if (ADDRESS_QUERIES[endpointId]) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(pick.address || "")) throw new Error("Search for a trader wallet.");
    const data = await polymarketGet(ADDRESS_QUERIES[endpointId], {
      user: pick.address,
      address: pick.address,
      limit: String(Math.min(10000, pullSize(options, 50))),
    });
    return objectRows(data);
  }
  if (isPolymarketQuoteTable(endpointId)) return quoteRows(endpointId, picks, options);
  return discoveryRows(endpointId, options);
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

function shownJoinColumns(columns) {
  const list = Array.isArray(columns) ? columns : [];
  const on = list.filter((column) => column.defaultOn);
  return on.length ? on : list;
}

/**
 * One joined sheet for one market. Parent market is the market record.
 * Every other source uses the same pull as opening that endpoint, with its default filters.
 * @param {string} endpointId
 * @param {Record<string, unknown>} pick
 */
export async function loadPolymarketLiveJoin(endpointId, pick, options = {}) {
  if (!pick) throw new Error("Choose a market before joining.");
  if (endpointId === POLYMARKET_PARENT_MARKET_JOIN.id) {
    let row = null;
    if (pick.entityId) {
      try {
        row = objectRows(await polymarketGet("getMarket", { id: pick.entityId }))[0] || null;
      } catch {
        row = null;
      }
    }
    if (!row && pick.slug) {
      try {
        row = objectRows(await polymarketGet("getMarketBySlug", { slug: pick.slug }))[0] || null;
      } catch {
        row = null;
      }
    }
    if (!row && pick.conditionId) {
      row = objectRows(await polymarketGet("listMarkets", { condition_ids: pick.conditionId, limit: "1", closed: "true" }))[0] || null;
    }
    if (!row) throw new Error("No market metadata for this market.");
    const columns = shownJoinColumns(polymarketLiveBuildColumns("getMarkets"));
    return { columns, rows: projectRows([row], columns, true, 1) };
  }
  const limit = Math.max(1, Number(options.rowLimit) || 50);
  const packed = await loadPolymarketLiveTable(endpointId, [pick], {
    rowLimit: limit,
    planLimit: Number(options.planLimit) || limit,
    filters: defaultPolymarketQuoteFilters(endpointId),
  });
  return { columns: shownJoinColumns(packed.columns), rows: packed.rows || [] };
}
