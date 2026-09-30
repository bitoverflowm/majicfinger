/**
 * Default preview pulls for the build workspace.
 * One table is loaded at a time, capped at 50 rows. Types are a first pass.
 */
import { fetchAthenaLakeSample } from "@/lib/dataLake/fetchAthenaSample";
import { getColumnMetaForLakeTable, isDateLikeColumnName } from "@/lib/dataLake/lakeTableColumns";
import { KALSHI_HISTORICAL_V2_TRADES_COLUMNS } from "@/lib/kalshiHistoricalV2/historicalTradesColumns";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { MARKETS_RESPONSE_FIELDS } from "@/components/integrationsView/integrationPlayground/integrations/polymarket/config";

export const PREVIEW_ROW_CAP = 50;

const SAVED_SEARCHES_KEY = "lycheeIntegrationSavedSearches";

export const BUILD_SOURCES = {
  kalshiHistorical: {
    name: "Kalshi Historical",
    defaultTable: "markets",
    tables: {
      markets: {
        label: "Markets search",
        description: "Each row is a Kalshi contract from the deep history, highest volume first.",
      },
      trades: {
        label: "Trades search",
        description: "Each row is a fill from the historical tape.",
      },
    },
  },
  kalshiHistoricalV2: {
    name: "Kalshi Historical v2",
    defaultTable: "markets",
    tables: {
      markets: {
        label: "Markets search",
        description: "Recent Kalshi contracts up to the live cutoff.",
      },
      trades: {
        label: "Trades search",
        description: "Recent fills up to the live cutoff.",
      },
    },
  },
  kalshiLive: {
    name: "Kalshi Live",
    defaultTable: "markets",
    tables: {
      markets: {
        label: "Markets search",
        description: "Open Kalshi markets on the live book.",
      },
    },
  },
  polymarketHistorical: {
    name: "Polymarket Historical",
    defaultTable: "markets",
    tables: {
      markets: {
        label: "Markets search",
        description: "Each row is a Polymarket market from the historical lake, highest volume first.",
      },
      trades: {
        label: "Trades search",
        description: "Each row is an on-chain fill from the historical lake.",
      },
    },
  },
  polymarket: {
    name: "Polymarket Live",
    defaultTable: "markets",
    tables: {
      markets: {
        label: "Markets search",
        description: "Live Polymarket markets, busiest volume first.",
      },
    },
  },
  chainlink: {
    name: "Chainlink",
    defaultTable: "prices",
    tables: {
      prices: {
        label: "Live prices",
        description: "Latest Chainlink oracle answer for each pair.",
      },
    },
  },
  binance: {
    name: "Binance",
    defaultTable: "prices",
    tables: {
      prices: {
        label: "Live prices",
        description: "Latest Binance price for each pair on the live feed.",
      },
    },
  },
};

const TITLE = {
  ticker: "Ticker",
  title: "Title",
  question: "Question",
  status: "Status",
  last_price: "Last price",
  yes_bid: "Yes bid",
  yes_ask: "Yes ask",
  volume: "Volume",
  liquidity: "Liquidity",
  close_time: "Close time",
  closed: "Closed",
  outcome_prices: "Outcome prices",
  end_date: "End date",
  count: "Size",
  yes_price: "Yes price",
  taker_side: "Side",
  maker: "Maker",
  taker: "Taker",
  maker_amount: "Maker amount",
  taker_amount: "Taker amount",
  fee: "Fee",
  name: "Name",
  symbol: "Symbol",
  price: "Price",
  updated: "Updated",
};

function titleFor(id) {
  if (TITLE[id]) return TITLE[id];
  return String(id)
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function column(id, type, scale, defaultOn = true, description = "") {
  return { id, title: titleFor(id), type, defaultOn, description, ...(scale ? { scale } : {}) };
}

const KALSHI_HISTORICAL_MARKET_FIELDS = [
  ["ticker", "text", "Ticker", "Unique market identifier (e.g., PRES-2024-DJT)"],
  ["kalshi_event_ticker_category", "text", "Event ticker simplified", "Simplified ticker parsed from event_ticker."],
  ["event_ticker", "text", "Event ticker", "Parent event identifier, used for categorization."],
  ["kalshi_taxonomy_category", "text", "Category", "Market category bucket (Sports, Weather, Politics, Crypto, …)."],
  ["market_type", "text", "Market type", "Market type (typically binary)."],
  ["title", "text", "Title", "Human-readable market title."],
  ["yes_sub_title", "text", "Yes sub title", "Label for the Yes outcome."],
  ["no_sub_title", "text", "No sub title", "Label for the No outcome."],
  ["status", "text", "Status", "Market status: open, closed, finalized."],
  ["yes_bid", "number", "Yes bid", "Best bid price for Yes contracts (cents, 1–99)."],
  ["yes_ask", "number", "Yes ask", "Best ask price for Yes contracts (cents, 1–99)."],
  ["no_bid", "number", "No bid", "Best bid price for No contracts (cents, 1–99)."],
  ["no_ask", "number", "No ask", "Best ask price for No contracts (cents, 1–99)."],
  ["last_price", "number", "Last price", "Last traded price (cents, 1–99)."],
  ["volume", "number", "Volume", "Total contracts traded."],
  ["volume_24h", "number", "Volume 24h", "Contracts traded in the last 24 hours."],
  ["open_interest", "number", "Open interest", "Outstanding contracts."],
  ["result", "text", "Result", "Market outcome: yes, no, or empty if unresolved."],
  ["created_time", "date", "Created time", "When the market was created."],
  ["open_time", "date", "Open time", "When trading opened."],
  ["close_time", "date", "Close time", "When trading closed."],
  ["_fetched_at", "date", "Fetched at", "When this record was fetched."],
];

const KALSHI_HISTORICAL_MARKET_DEFAULTS = new Set([
  "ticker",
  "title",
  "status",
  "last_price",
  "yes_bid",
  "volume",
  "close_time",
]);

function kalshiHistoricalMarketColumns() {
  return KALSHI_HISTORICAL_MARKET_FIELDS.map(([id, type, title, description]) => ({
    id,
    title,
    type,
    description,
    defaultOn: KALSHI_HISTORICAL_MARKET_DEFAULTS.has(id),
    ...(LAKE_CENTS.has(id) ? { scale: "cents" } : {}),
  }));
}

const LAKE_COMPUTED = new Set(["kalshi_event_ticker_category", "kalshi_taxonomy_category"]);
const LAKE_CENTS = new Set(["last_price", "yes_bid", "yes_ask", "no_bid", "no_ask", "yes_price", "no_price"]);

function uiType(rawType, name) {
  const type = String(rawType || "").toLowerCase();
  if (type === "boolean") return "boolean";
  if (type === "timestamp" || (type !== "string" && isDateLikeColumnName(name))) return "date";
  if (type === "string") {
    if (isDateLikeColumnName(name)) return "date";
    return "text";
  }
  if (type === "bigint" || type === "int" || type === "double" || type === "number") return "number";
  return "text";
}

function catalogColumns(meta, defaults, { cents = false } = {}) {
  const on = new Set(defaults);
  return meta.map((entry) => {
    const id = entry.name;
    const scale = cents && LAKE_CENTS.has(id) ? "cents" : undefined;
    return column(id, uiType(entry.type, id), scale, on.has(id));
  });
}

function lakeColumns(lake, table, defaults) {
  const meta = getColumnMetaForLakeTable(lake, table).filter((entry) => !LAKE_COMPUTED.has(entry.name));
  return catalogColumns(meta, defaults, { cents: lake === "kalshi" });
}

function cellValue(value) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function projectRows(columns, records) {
  return records.slice(0, PREVIEW_ROW_CAP).map((record) => {
    const row = {};
    for (const entry of columns) row[entry.id] = cellValue(record?.[entry.id]);
    return row;
  });
}

const POLYMARKET_LIVE_NUMBER = /volume|liquidity|fee|price|spread|score|bound|size|tick|delay|liveness|change|line|reward|bond/i;
const POLYMARKET_LIVE_BOOL = new Set([
  "active",
  "closed",
  "new",
  "featured",
  "archived",
  "restricted",
  "wideFormat",
  "ready",
  "funded",
  "acceptingOrders",
  "notificationsEnabled",
  "commentsEnabled",
  "hasReviewedDates",
  "readyForCron",
  "automaticallyResolved",
  "automaticallyActive",
  "clearBookOnStart",
  "manualActivation",
  "negRiskOther",
  "pendingDeployment",
  "deploying",
  "rfqEnabled",
  "enableOrderBook",
  "fpmmLive",
  "winner",
]);

function polymarketLiveColumns(defaults) {
  const on = new Set(defaults);
  return MARKETS_RESPONSE_FIELDS.map((name) => {
    let type = "text";
    if (POLYMARKET_LIVE_BOOL.has(name)) type = "boolean";
    else if (isDateLikeColumnName(name)) type = "date";
    else if (POLYMARKET_LIVE_NUMBER.test(name)) type = "number";
    return column(name, type, undefined, on.has(name));
  });
}

const pullCache = new Map();
const countCache = new Map();
const countValues = new Map();

const EXACT_UNIVERSE = {
  kalshiHistorical: "kalshi",
  polymarketHistorical: "polymarket",
};

export const APPROXIMATE_UNIVERSE = 1_000_000;

export function usesExactUniverse(integrationId) {
  return Boolean(EXACT_UNIVERSE[integrationId]);
}

function num(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function getJson(url) {
  const res = await fetch(url, { credentials: "same-origin" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Pull failed");
  return json;
}

async function postAthena(body) {
  const res = await fetch("/api/data-lake/athena-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Pull failed");
  const columns = json.columns || [];
  return (json.rows || []).map((cells) => {
    const row = {};
    columns.forEach((name, index) => {
      row[name] = cells[index];
    });
    return row;
  });
}

async function kalshiHistoricalMarkets() {
  const columns = kalshiHistoricalMarketColumns();
  const rows = await postAthena({
    lake: "kalshi",
    table: "markets",
    queryType: "compose",
    limit: PREVIEW_ROW_CAP,
    compose: {
      select: columns.map((entry) => ({ column: entry.id, alias: entry.id })),
      groupByAliases: [],
      orderBy: [{ alias: "volume", direction: "desc" }],
    },
  });
  return {
    columns,
    rows: rows.slice(0, PREVIEW_ROW_CAP),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

async function kalshiHistoricalTrades() {
  const columns = lakeColumns("kalshi", "trades", ["created_time", "ticker", "taker_side", "yes_price", "count"]);
  const rows = await postAthena({
    lake: "kalshi",
    table: "trades",
    limit: PREVIEW_ROW_CAP,
    columns: columns.map((entry) => entry.id),
  });
  return {
    columns,
    rows: rows.slice(0, PREVIEW_ROW_CAP),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

async function kalshiV2Markets() {
  const columns = catalogColumns(
    KALSHI_LIVE_MARKETS_COLUMNS,
    ["ticker", "yes_sub_title", "status", "last_price_dollars", "yes_bid_dollars", "volume_fp", "close_time"],
  );
  const json = await getJson(
    `/api/integrations/kalshi-live/historical/markets?discovery=1&ticker_scope=general&limit=${PREVIEW_ROW_CAP}&mve_filter=exclude`,
  );
  const markets = Array.isArray(json.markets) ? json.markets : [];
  return {
    columns,
    rows: projectRows(columns, markets),
    capped: Boolean(json.cursor) || markets.length >= PREVIEW_ROW_CAP,
  };
}

async function kalshiV2Trades() {
  const columns = catalogColumns(KALSHI_HISTORICAL_V2_TRADES_COLUMNS, [
    "created_time",
    "ticker",
    "taker_outcome_side",
    "yes_price_dollars",
    "count_fp",
  ]);
  const json = await getJson(`/api/integrations/kalshi-live/historical/trades?limit=${PREVIEW_ROW_CAP}`);
  const trades = Array.isArray(json.trades) ? json.trades : [];
  return {
    columns,
    rows: projectRows(columns, trades),
    capped: Boolean(json.cursor) || trades.length >= PREVIEW_ROW_CAP,
  };
}

async function kalshiLiveMarkets() {
  const columns = catalogColumns(
    KALSHI_LIVE_MARKETS_COLUMNS,
    ["ticker", "yes_sub_title", "status", "last_price_dollars", "yes_bid_dollars", "yes_ask_dollars", "volume_fp"],
  );
  const json = await getJson(
    `/api/integrations/kalshi-live/markets?discovery=1&limit=${PREVIEW_ROW_CAP}&status=open&mve_filter=exclude`,
  );
  const markets = Array.isArray(json.markets) ? json.markets : [];
  return {
    columns,
    rows: projectRows(columns, markets),
    capped: Boolean(json.cursor) || markets.length >= PREVIEW_ROW_CAP,
  };
}

async function polymarketHistoricalMarkets() {
  const columns = lakeColumns("polymarket", "markets", [
    "question",
    "volume",
    "liquidity",
    "outcome_prices",
    "closed",
    "end_date",
  ]);
  const rows = await postAthena({
    lake: "polymarket",
    table: "markets",
    queryType: "compose",
    limit: PREVIEW_ROW_CAP,
    compose: {
      select: columns.map((entry) => ({ column: entry.id, alias: entry.id })),
      groupByAliases: [],
      orderBy: [{ alias: "volume", direction: "desc" }],
    },
  });
  return {
    columns,
    rows: rows.slice(0, PREVIEW_ROW_CAP),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

async function polymarketHistoricalTrades() {
  const columns = lakeColumns("polymarket", "trades", [
    "timestamp",
    "maker",
    "taker",
    "maker_amount",
    "taker_amount",
    "fee",
  ]);
  const rows = await postAthena({
    lake: "polymarket",
    table: "trades",
    limit: PREVIEW_ROW_CAP,
    columns: columns.map((entry) => entry.id),
  });
  return {
    columns,
    rows: rows.slice(0, PREVIEW_ROW_CAP),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

async function polymarketLiveMarkets() {
  const columns = polymarketLiveColumns(["question", "volume", "liquidity", "outcomePrices", "closed", "endDate"]);
  const json = await getJson(
    `/api/integrations/polymarket?query=listMarkets&limit=${PREVIEW_ROW_CAP}&order=volumeNum&ascending=false`,
  );
  const markets = Array.isArray(json) ? json : [];
  return {
    columns,
    rows: projectRows(columns, markets),
    capped: markets.length >= PREVIEW_ROW_CAP,
  };
}

const QUOTE_PAIRS = [
  { name: "Bitcoin", binance: "btcusdt", chainlink: "btc/usd" },
  { name: "Ethereum", binance: "ethusdt", chainlink: "eth/usd" },
  { name: "Solana", binance: "solusdt", chainlink: "sol/usd" },
  { name: "XRP", binance: "xrpusdt", chainlink: "xrp/usd" },
];

function listenQuotes(feed) {
  if (feed === "chainlink") {
    return Promise.all(
      QUOTE_PAIRS.map((pair) =>
        collectQuotes({
          feed,
          subscriptions: [
            {
              topic: "crypto_prices_chainlink",
              type: "*",
              filters: JSON.stringify({ symbol: pair.chainlink }),
            },
          ],
          stopWhen: (quotes) => quotes.size >= 1,
        }).catch(() => new Map()),
      ),
    ).then((maps) => {
      const merged = new Map();
      for (const map of maps) {
        for (const [name, quote] of map) merged.set(name, quote);
      }
      if (!merged.size) throw new Error("No live prices came through");
      return merged;
    });
  }
  return collectQuotes({
    feed,
    subscriptions: QUOTE_PAIRS.map((pair) => ({
      topic: "crypto_prices",
      type: "update",
      filters: JSON.stringify([pair.binance]),
    })),
    stopWhen: (quotes) => quotes.size >= QUOTE_PAIRS.length,
  });
}

function collectQuotes({ feed, subscriptions, stopWhen }) {
  return new Promise((resolve, reject) => {
    if (typeof WebSocket === "undefined") {
      reject(new Error("Live prices are only available in the browser"));
      return;
    }
    const quotes = new Map();
    const ws = new WebSocket("wss://ws-live-data.polymarket.com");
    let ping;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (ping) window.clearInterval(ping);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      if (!quotes.size) {
        reject(new Error("No live prices came through"));
        return;
      }
      resolve(quotes);
    };
    const timer = window.setTimeout(finish, 5000);
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "subscribe", subscriptions }));
      ping = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("PING");
      }, 4000);
    };
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      const topicFeed = msg.topic === "crypto_prices" ? "binance" : msg.topic === "crypto_prices_chainlink" ? "chainlink" : null;
      if (topicFeed !== feed || !msg.payload) return;
      const symbol = String(msg.payload.symbol || "").toLowerCase();
      const pair = QUOTE_PAIRS.find((item) => item.binance === symbol || item.chainlink === symbol);
      if (!pair) return;
      const history = Array.isArray(msg.payload.data) ? msg.payload.data : null;
      const point = history?.length ? history[history.length - 1] : msg.payload;
      const price = num(point?.value);
      if (price == null) return;
      quotes.set(pair.name, {
        price,
        at: num(point?.timestamp) || Date.now(),
        symbol: feed === "binance" ? pair.binance.toUpperCase() : pair.chainlink.toUpperCase(),
      });
      if (stopWhen(quotes)) finish();
    };
    ws.onerror = () => finish();
  });
}

async function livePrices(feed) {
  const quotes = await listenQuotes(feed);
  const rows = QUOTE_PAIRS.map((pair) => quotes.get(pair.name))
    .filter(Boolean)
    .map((quote) => ({
      name: QUOTE_PAIRS.find((pair) => (feed === "binance" ? pair.binance.toUpperCase() : pair.chainlink.toUpperCase()) === quote.symbol)?.name || quote.symbol,
      symbol: quote.symbol,
      price: quote.price,
      updated: quote.at,
    }));
  return {
    columns: [column("name", "text"), column("symbol", "text"), column("price", "number"), column("updated", "date")],
    rows,
    capped: false,
  };
}

const LOADERS = {
  "kalshiHistorical:markets": kalshiHistoricalMarkets,
  "kalshiHistorical:trades": kalshiHistoricalTrades,
  "kalshiHistoricalV2:markets": kalshiV2Markets,
  "kalshiHistoricalV2:trades": kalshiV2Trades,
  "kalshiLive:markets": kalshiLiveMarkets,
  "polymarketHistorical:markets": polymarketHistoricalMarkets,
  "polymarketHistorical:trades": polymarketHistoricalTrades,
  "polymarket:markets": polymarketLiveMarkets,
  "chainlink:prices": () => livePrices("chainlink"),
  "binance:prices": () => livePrices("binance"),
};

function universeCountKey(integrationId, tableId, filter) {
  const lake = EXACT_UNIVERSE[integrationId];
  if (!lake || (tableId !== "markets" && tableId !== "trades")) return "";
  const column = String(filter?.column || "").trim();
  const value = String(filter?.value || "").trim();
  const narrowed = Boolean(column && value);
  return `${lake}:${tableId}:${narrowed ? `${column}\0${value.toLowerCase()}` : ""}`;
}

export function peekBuildUniverseCount(integrationId, tableId, filter) {
  const key = universeCountKey(integrationId, tableId, filter);
  if (!key || !countValues.has(key)) return null;
  return countValues.get(key);
}

export function loadBuildUniverseCount(integrationId, tableId, filter) {
  const lake = EXACT_UNIVERSE[integrationId];
  const key = universeCountKey(integrationId, tableId, filter);
  if (!key) return Promise.resolve(null);
  if (countValues.has(key)) return Promise.resolve(countValues.get(key));
  if (!countCache.has(key)) {
    const column = String(filter?.column || "").trim();
    const value = String(filter?.value || "").trim();
    const narrowed = Boolean(column && value);
    const body = {
      lake,
      table: tableId,
      queryType: "count",
      countAlias: "row_count",
      limit: 1,
      caseSensitive: false,
      filters: narrowed
        ? { and: [{ column, kind: "string", op: "contains", value }], or: [] }
        : null,
    };
    countCache.set(
      key,
      fetchAthenaLakeSample(body, { maxWaitMs: 180000, pollIntervalMs: 800 })
        .then((result) => {
          const total = Number(result.rows?.[0]?.[0]);
          if (!Number.isFinite(total)) throw new Error("Count missing");
          countValues.set(key, total);
          return total;
        })
        .catch((error) => {
          countCache.delete(key);
          throw error;
        }),
    );
  }
  return countCache.get(key);
}

export function loadBuildPreview(integrationId, tableId) {
  const key = `${integrationId}:${tableId}`;
  const loader = LOADERS[key];
  if (!loader) return Promise.reject(new Error("This table is not available yet"));
  if (!pullCache.has(key)) pullCache.set(key, loader());
  return pullCache.get(key).catch((error) => {
    pullCache.delete(key);
    throw error;
  });
}

export function readSavedSearches() {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSearch(entry) {
  const next = [entry, ...readSavedSearches().filter((item) => item.id !== entry.id)].slice(0, 40);
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(next));
  return next;
}
