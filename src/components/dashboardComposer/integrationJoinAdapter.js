/**
 * The enrich stepper stays shared. Ticker matching and outcome-token matching
 * live here so a new lake adds an adapter instead of another branch in the workspace.
 */
import {
  buildKalshiHistoricalRequest,
  buildPolymarketHistoricalRequest,
  kalshiHistoricalMarketColumnList,
  loadKalshiHistoricalMarketsForTickers,
  loadKalshiHistoricalPreview,
  loadKalshiHistoricalTradesForTicker,
  loadPolymarketHistoricalMarketsForTokens,
  loadPolymarketHistoricalPreview,
  loadPolymarketHistoricalTradesForTokens,
  polymarketHistoricalColumnList,
  polymarketTokenIds,
} from "@/components/dashboardComposer/integrationBuildCatalog";

function orderByKeys(rows, keys, keyOf) {
  const byKey = new Map();
  for (const row of rows || []) {
    const key = keyOf(row);
    if (key && !byKey.has(key)) byKey.set(key, row);
  }
  const ordered = [];
  const used = new Set();
  for (const key of keys || []) {
    const row = byKey.get(key);
    if (!row || used.has(key)) continue;
    used.add(key);
    ordered.push(row);
  }
  for (const [key, row] of byKey) {
    if (used.has(key)) continue;
    ordered.push(row);
  }
  return ordered;
}

function kalshiMarketKey(row) {
  return String(row?.ticker || "").trim();
}

const kalshiJoin = {
  match: "ticker",
  matchNoun: "ticker",
  venue: "kalshi",
  tradesTarget: "kalshiHistoricalTrades",
  marketsTarget: "kalshiHistoricalMarkets",
  ensureColumns: ["ticker"],
  marketKey: kalshiMarketKey,
  marketLabel(row) {
    return kalshiMarketKey(row);
  },
  tradeKeys(row) {
    const ticker = kalshiMarketKey(row);
    return ticker ? [ticker] : [];
  },
  matchTrade: undefined,
  orderMarkets(marketRows, _tradeRows, tickers) {
    return orderByKeys(marketRows, tickers, kalshiMarketKey);
  },
  marketsFromRows(rows, cap) {
    const seen = new Set();
    const markets = [];
    for (const row of rows || []) {
      const ticker = kalshiMarketKey(row);
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      markets.push({ ticker, title: String(row?.title || ticker), label: ticker, tokens: [] });
      if (markets.length >= cap) break;
    }
    return markets;
  },
  loadTrades(market, limit, options) {
    return loadKalshiHistoricalTradesForTicker(market?.ticker, limit, options);
  },
  loadMarkets(rows, options) {
    const tickers = [];
    const seen = new Set();
    for (const row of rows || []) {
      const ticker = kalshiMarketKey(row);
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      tickers.push(ticker);
    }
    return loadKalshiHistoricalMarketsForTickers(tickers, options);
  },
  loadPreview(tableId, predicates, sortKeys) {
    return loadKalshiHistoricalPreview(tableId, predicates, sortKeys);
  },
  buildRequest(args) {
    return buildKalshiHistoricalRequest(args);
  },
  marketColumns() {
    return kalshiHistoricalMarketColumnList();
  },
};

function polymarketMarketKey(row) {
  return String(row?.condition_id || row?.id || "").trim();
}

function polymarketMarketLabel(row) {
  const slug = String(row?.slug || "").trim();
  if (slug) return slug;
  const question = String(row?.question || "").trim();
  if (!question) {
    const key = polymarketMarketKey(row);
    return key.length > 12 ? `${key.slice(0, 10)}…` : key;
  }
  return question.length > 48 ? `${question.slice(0, 46)}…` : question;
}

function polymarketTradeTokens(row) {
  return [...polymarketTokenIds(row?.maker_asset_id), ...polymarketTokenIds(row?.taker_asset_id)];
}

function matchPolymarketTrade(row, marketRows) {
  const tokens = new Set(polymarketTradeTokens(row));
  if (!tokens.size) return {};
  return (marketRows || []).find((market) => polymarketTokenIds(market?.clob_token_ids).some((token) => tokens.has(token))) || {};
}

function orderPolymarketMarkets(marketRows, tradeRows) {
  const tokenOrder = [];
  const seenToken = new Set();
  for (const row of tradeRows || []) {
    for (const token of polymarketTradeTokens(row)) {
      if (seenToken.has(token)) continue;
      seenToken.add(token);
      tokenOrder.push(token);
    }
  }
  const ranked = [];
  const used = new Set();
  for (const token of tokenOrder) {
    for (const row of marketRows || []) {
      const key = polymarketMarketKey(row);
      if (!key || used.has(key)) continue;
      if (!polymarketTokenIds(row?.clob_token_ids).includes(token)) continue;
      used.add(key);
      ranked.push(row);
    }
  }
  for (const row of marketRows || []) {
    const key = polymarketMarketKey(row);
    if (key && used.has(key)) continue;
    if (key) used.add(key);
    ranked.push(row);
  }
  return ranked;
}

const polymarketJoin = {
  match: "outcomeToken",
  matchNoun: "outcome token",
  venue: "polymarket",
  tradesTarget: "polymarketHistoricalTrades",
  marketsTarget: "polymarketHistoricalMarkets",
  ensureColumns: ["condition_id", "clob_token_ids"],
  marketKey: polymarketMarketKey,
  marketLabel: polymarketMarketLabel,
  tradeKeys: polymarketTradeTokens,
  matchTrade: matchPolymarketTrade,
  orderMarkets(marketRows, tradeRows) {
    return orderPolymarketMarkets(marketRows, tradeRows);
  },
  marketsFromRows(rows, cap) {
    const seen = new Set();
    const markets = [];
    for (const row of rows || []) {
      const ticker = polymarketMarketKey(row);
      const tokens = polymarketTokenIds(row?.clob_token_ids);
      if (!ticker || !tokens.length || seen.has(ticker)) continue;
      seen.add(ticker);
      markets.push({
        ticker,
        title: String(row?.question || polymarketMarketLabel(row)),
        label: polymarketMarketLabel(row),
        tokens,
      });
      if (markets.length >= cap) break;
    }
    return markets;
  },
  loadTrades(market, limit, options) {
    return loadPolymarketHistoricalTradesForTokens(market?.tokens, limit, options);
  },
  loadMarkets(rows, options) {
    const tokens = [];
    const seen = new Set();
    for (const row of rows || []) {
      for (const token of polymarketTradeTokens(row)) {
        if (seen.has(token)) continue;
        seen.add(token);
        tokens.push(token);
      }
    }
    return loadPolymarketHistoricalMarketsForTokens(tokens, options);
  },
  loadPreview(tableId, predicates, sortKeys) {
    return loadPolymarketHistoricalPreview(tableId, predicates, sortKeys);
  },
  buildRequest(args) {
    return buildPolymarketHistoricalRequest(args);
  },
  marketColumns() {
    return polymarketHistoricalColumnList("markets");
  },
};

export function joinAdapterFor(match) {
  if (match === "outcomeToken") return polymarketJoin;
  if (match === "ticker") return kalshiJoin;
  return null;
}
