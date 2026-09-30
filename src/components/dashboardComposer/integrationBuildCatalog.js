/**
 * Default preview pulls for the build workspace.
 * One table is loaded at a time, capped at 50 rows. Types are a first pass.
 */

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
  created_time: "Time",
  timestamp: "Time",
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
  return TITLE[id] || id.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function column(id, type, scale) {
  return { id, title: titleFor(id), type, ...(scale ? { scale } : {}) };
}

const pullCache = new Map();

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

function pick(row, ids) {
  const out = {};
  for (const id of ids) out[id] = row?.[id] ?? "";
  return out;
}

async function kalshiHistoricalMarkets() {
  const rows = await postAthena({
    lake: "kalshi",
    table: "markets",
    queryType: "compose",
    limit: PREVIEW_ROW_CAP,
    compose: {
      select: ["ticker", "title", "status", "last_price", "yes_bid", "volume", "close_time"].map((name) => ({
        column: name,
        alias: name,
      })),
      groupByAliases: [],
      orderBy: [{ alias: "volume", direction: "desc" }],
    },
  });
  return {
    columns: [
      column("ticker", "text"),
      column("title", "text"),
      column("status", "text"),
      column("last_price", "number", "cents"),
      column("yes_bid", "number", "cents"),
      column("volume", "number"),
      column("close_time", "date"),
    ],
    rows: rows.slice(0, PREVIEW_ROW_CAP),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

async function kalshiHistoricalTrades() {
  const rows = await postAthena({
    lake: "kalshi",
    table: "trades",
    limit: PREVIEW_ROW_CAP,
    columns: ["ticker", "count", "yes_price", "taker_side", "created_time"],
  });
  return {
    columns: [
      column("created_time", "date"),
      column("ticker", "text"),
      column("taker_side", "text"),
      column("yes_price", "number", "cents"),
      column("count", "number"),
    ],
    rows: rows.slice(0, PREVIEW_ROW_CAP).map((row) => ({
      created_time: row.created_time,
      ticker: row.ticker,
      taker_side: row.taker_side,
      yes_price: row.yes_price,
      count: row.count,
    })),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

async function kalshiV2Markets() {
  const json = await getJson(
    `/api/integrations/kalshi-live/historical/markets?discovery=1&ticker_scope=general&limit=${PREVIEW_ROW_CAP}&mve_filter=exclude`,
  );
  const markets = Array.isArray(json.markets) ? json.markets : [];
  const ids = ["ticker", "title", "status", "last_price", "yes_bid", "volume", "close_time"];
  return {
    columns: [
      column("ticker", "text"),
      column("title", "text"),
      column("status", "text"),
      column("last_price", "number"),
      column("yes_bid", "number"),
      column("volume", "number"),
      column("close_time", "date"),
    ],
    rows: markets.slice(0, PREVIEW_ROW_CAP).map((market) =>
      pick(
        {
          ticker: market.ticker,
          title: market.title,
          status: market.status,
          last_price: market.last_price_dollars,
          yes_bid: market.yes_bid_dollars,
          volume: market.volume_fp,
          close_time: market.close_time,
        },
        ids,
      ),
    ),
    capped: Boolean(json.cursor) || markets.length >= PREVIEW_ROW_CAP,
  };
}

async function kalshiV2Trades() {
  const json = await getJson(`/api/integrations/kalshi-live/historical/trades?limit=${PREVIEW_ROW_CAP}`);
  const trades = Array.isArray(json.trades) ? json.trades : [];
  return {
    columns: [
      column("created_time", "date"),
      column("ticker", "text"),
      column("taker_side", "text"),
      column("yes_price", "number"),
      column("count", "number"),
    ],
    rows: trades.slice(0, PREVIEW_ROW_CAP).map((trade) => ({
      created_time: trade.created_time,
      ticker: trade.ticker,
      taker_side: trade.taker_side,
      yes_price: trade.yes_price_dollars,
      count: trade.count_fp,
    })),
    capped: Boolean(json.cursor) || trades.length >= PREVIEW_ROW_CAP,
  };
}

async function kalshiLiveMarkets() {
  const json = await getJson(
    `/api/integrations/kalshi-live/markets?discovery=1&limit=${PREVIEW_ROW_CAP}&status=open&mve_filter=exclude`,
  );
  const markets = Array.isArray(json.markets) ? json.markets : [];
  return {
    columns: [
      column("ticker", "text"),
      column("title", "text"),
      column("status", "text"),
      column("last_price", "number"),
      column("yes_bid", "number"),
      column("yes_ask", "number"),
      column("volume", "number"),
    ],
    rows: markets.slice(0, PREVIEW_ROW_CAP).map((market) => ({
      ticker: market.ticker,
      title: market.title,
      status: market.status,
      last_price: market.last_price_dollars,
      yes_bid: market.yes_bid_dollars,
      yes_ask: market.yes_ask_dollars,
      volume: market.volume_fp ?? market.volume_24h_fp,
    })),
    capped: Boolean(json.cursor) || markets.length >= PREVIEW_ROW_CAP,
  };
}

async function polymarketHistoricalMarkets() {
  const rows = await postAthena({
    lake: "polymarket",
    table: "markets",
    queryType: "compose",
    limit: PREVIEW_ROW_CAP,
    compose: {
      select: ["question", "volume", "liquidity", "outcome_prices", "closed", "end_date"].map((name) => ({
        column: name,
        alias: name,
      })),
      groupByAliases: [],
      orderBy: [{ alias: "volume", direction: "desc" }],
    },
  });
  return {
    columns: [
      column("question", "text"),
      column("volume", "number"),
      column("liquidity", "number"),
      column("outcome_prices", "text"),
      column("closed", "boolean"),
      column("end_date", "date"),
    ],
    rows: rows.slice(0, PREVIEW_ROW_CAP),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

async function polymarketHistoricalTrades() {
  const rows = await postAthena({
    lake: "polymarket",
    table: "trades",
    limit: PREVIEW_ROW_CAP,
    columns: ["timestamp", "maker", "taker", "maker_amount", "taker_amount", "fee"],
  });
  return {
    columns: [
      column("timestamp", "date"),
      column("maker", "text"),
      column("taker", "text"),
      column("maker_amount", "number"),
      column("taker_amount", "number"),
      column("fee", "number"),
    ],
    rows: rows.slice(0, PREVIEW_ROW_CAP),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

async function polymarketLiveMarkets() {
  const json = await getJson(
    `/api/integrations/polymarket?query=listMarkets&limit=${PREVIEW_ROW_CAP}&order=volumeNum&ascending=false`,
  );
  const markets = Array.isArray(json) ? json : [];
  return {
    columns: [
      column("question", "text"),
      column("volume", "number"),
      column("liquidity", "number"),
      column("outcome_prices", "text"),
      column("closed", "boolean"),
      column("end_date", "date"),
    ],
    rows: markets.slice(0, PREVIEW_ROW_CAP).map((market) => ({
      question: market.question,
      volume: market.volumeNum ?? market.volume,
      liquidity: market.liquidityNum ?? market.liquidity,
      outcome_prices: market.outcomePrices,
      closed: market.closed,
      end_date: market.endDate,
    })),
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
