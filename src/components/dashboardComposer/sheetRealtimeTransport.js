"use client";

import { flattenKalshiLiveCandlestickGroups } from "@/lib/kalshiLive/normalizeCandlestickRow";
import { normalizeKalshiLiveOrderbook } from "@/lib/kalshiLive/normalizeOrderbookRow";
import { normalizeKalshiLiveTradeRow } from "@/lib/kalshiLive/normalizeTradeRow";
import {
  cellsFromRecords,
  patchPriceCells,
  priceSymbolsForSheet,
  sheetAssetIds,
  sheetField,
  sheetMarketTicker,
} from "@/lib/realtime/sheetRealtime";

const POLL_MS = {
  trades: 4000,
  orderbook: 4000,
  candlesticks: 20000,
  event_candlesticks: 20000,
};

/**
 * Start the registry transport for one sheet.
 * Calls `onFatal` and stops itself when the sheet does not have the parameters that pull needs.
 *
 * @param {object} block
 * @param {import("@/lib/realtime/endpointRegistry").RealtimeEndpointDef} def
 * @param {{ onCells: (cells: Record<string, string>) => void, onStatus: (status: string) => void, onFatal: (status: string) => void }} handlers
 * @returns {{ stop: () => void }}
 */
export function startSheetRealtimeTransport(block, def, handlers) {
  if (def.livePath === "client_websocket" && (def.integration === "chainlink" || def.integration === "binance")) {
    return startPriceSocket(block, def, handlers);
  }
  if (def.livePath === "api_poll") {
    return startKalshiPoll(block, def, handlers);
  }
  if (def.livePath === "client_websocket" && def.integration === "polymarket") {
    return startPolymarketSocket(block, def, handlers);
  }
  queueMicrotask(() => handlers.onFatal("This endpoint is marked realtime, but this sheet cannot start a pull yet."));
  return { stop() {} };
}

function startPriceSocket(block, def, handlers) {
  const symbols = priceSymbolsForSheet(block, def);
  if (!symbols.length || typeof WebSocket === "undefined") {
    queueMicrotask(() => handlers.onFatal("Live prices need a browser connection."));
    return { stop() {} };
  }
  let stopped = false;
  let cells = { ...(block.cells || {}) };
  let ping = 0;
  let emitTimer = 0;
  let primed = false;
  const ws = new WebSocket(def.socketUrl);
  const subscriptions =
    def.integration === "binance"
      ? symbols.map((symbol) => ({ topic: def.topic, type: "update", filters: JSON.stringify([symbol]) }))
      : symbols.map((symbol) => ({ topic: def.topic, type: "*", filters: JSON.stringify({ symbol }) }));

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(ping);
    window.clearTimeout(emitTimer);
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  };

  const emit = () => {
    if (stopped) return;
    if (!primed) {
      primed = true;
      handlers.onCells({ ...cells });
      return;
    }
    if (emitTimer) return;
    emitTimer = window.setTimeout(() => {
      emitTimer = 0;
      if (!stopped) handlers.onCells({ ...cells });
    }, 200);
  };

  ws.onopen = () => {
    if (stopped) return;
    ws.send(JSON.stringify({ action: "subscribe", subscriptions }));
    handlers.onStatus("Connected, waiting for prices");
    ping = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("PING");
    }, 4000);
  };
  ws.onmessage = (event) => {
    if (stopped || event.data === "PONG") return;
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg?.topic !== def.topic || !msg.payload) return;
    const payload = msg.payload;
    const history = Array.isArray(payload.data) ? payload.data : null;
    const point = history?.length ? history[history.length - 1] : payload;
    const symbol = String(point?.symbol || payload.symbol || "").toLowerCase();
    if (!symbols.includes(symbol)) return;
    const price = Number(point?.value);
    if (!Number.isFinite(price)) return;
    cells = patchPriceCells(block.columns, cells, {
      symbol,
      price,
      at: Number(point?.timestamp) || Date.now(),
    });
    handlers.onStatus("Receiving prices");
    emit();
  };
  ws.onerror = () => {
    if (!stopped) handlers.onStatus("Reconnecting");
  };
  ws.onclose = () => {
    if (!stopped) handlers.onFatal("The price stream closed.");
  };

  return { stop };
}

function startKalshiPoll(block, def, handlers) {
  const ticker = sheetMarketTicker(block);
  const series = sheetField(block, ["series_ticker"], /^series ticker$/i);
  const eventTicker = sheetField(block, ["event_ticker"], /^event ticker$/i);
  if (def.endpoint === "event_candlesticks") {
    if (!series || !eventTicker) {
      queueMicrotask(() =>
        handlers.onFatal("This sheet needs an event ticker and a series ticker before event candlesticks can poll."),
      );
      return { stop() {} };
    }
  } else if (!ticker) {
    queueMicrotask(() => handlers.onFatal("This sheet has no market ticker to poll."));
    return { stop() {} };
  }

  let stopped = false;
  let timer = 0;
  const abort = new AbortController();
  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    abort.abort();
  };

  const tick = async () => {
    if (stopped) return;
    try {
      const rows = await fetchKalshiRows(def, { ticker, series, eventTicker }, abort.signal);
      if (stopped) return;
      handlers.onCells(cellsFromRecords(block.columns, rows));
      handlers.onStatus("Receiving data");
    } catch (err) {
      if (stopped || err?.name === "AbortError") return;
      handlers.onStatus(err instanceof Error ? err.message : "The live pull failed");
    }
    if (!stopped) timer = window.setTimeout(tick, POLL_MS[def.endpoint] || 8000);
  };
  handlers.onStatus("Pulling");
  void tick();
  return { stop };
}

async function fetchKalshiRows(def, { ticker, series, eventTicker }, signal) {
  const end = Math.floor(Date.now() / 1000);
  if (def.endpoint === "trades") {
    const json = await getJson(`${def.apiRoute}?ticker=${encodeURIComponent(ticker)}&limit=80`, signal);
    return (Array.isArray(json.trades) ? json.trades : []).map((row) => normalizeKalshiLiveTradeRow(row));
  }
  if (def.endpoint === "orderbook") {
    const json = await getJson(`${def.apiRoute}?ticker=${encodeURIComponent(ticker)}&depth=100`, signal);
    return normalizeKalshiLiveOrderbook(json.ticker || ticker, json.orderbook_fp);
  }
  if (def.endpoint === "candlesticks") {
    const start = end - 80 * 60;
    const params = new URLSearchParams({
      market_tickers: ticker,
      start_ts: String(start),
      end_ts: String(end),
      period_interval: "1",
      per_ticker: "1",
    });
    const json = await getJson(`${def.apiRoute}?${params}`, signal);
    return flattenKalshiLiveCandlestickGroups(json.markets);
  }
  if (def.endpoint === "event_candlesticks") {
    const start = end - 3600;
    const params = new URLSearchParams({
      ticker: eventTicker,
      series_ticker: series,
      start_ts: String(start),
      end_ts: String(end),
      period_interval: "60",
    });
    const json = await getJson(`${def.apiRoute}?${params}`, signal);
    const tickers = Array.isArray(json.market_tickers) ? json.market_tickers : [];
    const sticks = Array.isArray(json.market_candlesticks) ? json.market_candlesticks : [];
    return flattenKalshiLiveCandlestickGroups(
      tickers.map((market, index) => ({
        market_ticker: market,
        candlesticks: Array.isArray(sticks[index]) ? sticks[index] : [],
      })),
    );
  }
  throw new Error("This endpoint is marked realtime, but this sheet cannot start a pull yet.");
}

function startPolymarketSocket(block, def, handlers) {
  const assetIds = sheetAssetIds(block);
  if (!assetIds.length || typeof WebSocket === "undefined" || !def.socketUrl) {
    queueMicrotask(() => handlers.onFatal("This sheet has no outcome token to subscribe with yet."));
    return { stop() {} };
  }
  let stopped = false;
  let cells = { ...(block.cells || {}) };
  let ping = 0;
  let wrote = false;
  const ws = new WebSocket(def.socketUrl);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(ping);
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  };

  ws.onopen = () => {
    if (stopped) return;
    ws.send(
      JSON.stringify({
        assets_ids: assetIds,
        type: "market",
        initial_dump: true,
        custom_feature_enabled: def.endpoint === "best_bid_ask",
      }),
    );
    handlers.onStatus("Connected, waiting for trades");
    ping = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("PING");
    }, 10000);
  };
  ws.onmessage = (event) => {
    if (stopped || event.data === "PONG") return;
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    const records = polymarketRecords(def.endpoint, msg);
    if (!records.length) return;
    const added = cellsFromRecords(block.columns, records);
    if (!Object.keys(added).length) {
      if (!wrote) handlers.onFatal("This sheet does not have columns for that live feed yet.");
      return;
    }
    wrote = true;
    cells = appendCells(cells, added, 120);
    handlers.onStatus("Receiving data");
    handlers.onCells(cells);
  };
  ws.onclose = () => {
    if (!stopped) handlers.onFatal("The market stream closed.");
  };
  return { stop };
}

function polymarketRecords(endpoint, msg) {
  if (!msg || typeof msg !== "object") return [];
  const at = msg.timestamp ? Number(msg.timestamp) : Date.now();
  const time = new Date(Number.isFinite(at) ? at : Date.now()).toLocaleTimeString();
  if (endpoint === "price_change" && msg.event_type === "price_change" && Array.isArray(msg.price_changes)) {
    return msg.price_changes.map((change) => ({
      asset_id: change.asset_id,
      price: change.price,
      size: change.size,
      side: change.side,
      best_bid: change.best_bid,
      best_ask: change.best_ask,
      time,
    }));
  }
  if (endpoint === "last_trade_price" && msg.event_type === "last_trade_price") {
    return [{ asset_id: msg.asset_id, price: msg.price, size: msg.size, side: msg.side, time }];
  }
  if (endpoint === "book" && msg.event_type === "book") {
    return [{ asset_id: msg.asset_id, market: msg.market, bids: JSON.stringify(msg.bids || []), asks: JSON.stringify(msg.asks || []), time }];
  }
  if (endpoint === "best_bid_ask" && msg.event_type === "best_bid_ask") {
    return [{ asset_id: msg.asset_id, best_bid: msg.best_bid, best_ask: msg.best_ask, spread: msg.spread, time }];
  }
  if (endpoint === "tick_size_change" && msg.event_type === "tick_size_change") {
    return [{ asset_id: msg.asset_id, old_tick_size: msg.old_tick_size, new_tick_size: msg.new_tick_size, time }];
  }
  if (endpoint === "candlesticks" && (msg.event_type === "last_trade_price" || msg.event_type === "price_change")) {
    const price = msg.price ?? msg.price_changes?.[0]?.price;
    return [{ asset_id: msg.asset_id || msg.price_changes?.[0]?.asset_id, price, time }];
  }
  return [];
}

function appendCells(existing, added, cap) {
  const base = maxRow(existing) + 1;
  const next = { ...existing };
  for (const [key, value] of Object.entries(added)) {
    const [col, row] = String(key).split(",");
    next[`${col},${base + Number(row || 0)}`] = value;
  }
  const rows = [];
  for (const key of Object.keys(next)) {
    const index = Number(String(key).split(",")[1]);
    if (Number.isFinite(index) && !rows.includes(index)) rows.push(index);
  }
  rows.sort((a, b) => a - b);
  if (rows.length <= cap) return next;
  const drop = new Set(rows.slice(0, rows.length - cap));
  const kept = {};
  for (const [key, value] of Object.entries(next)) {
    if (!drop.has(Number(String(key).split(",")[1]))) kept[key] = value;
  }
  return kept;
}

function maxRow(cells) {
  let max = -1;
  for (const key of Object.keys(cells || {})) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) max = Math.max(max, row);
  }
  return max;
}

async function getJson(url, signal) {
  const res = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" }, signal });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || body?.message || `Request failed (${res.status})`);
  }
  return body;
}
