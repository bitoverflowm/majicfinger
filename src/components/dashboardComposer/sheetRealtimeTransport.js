"use client";

import { CHAINLINK_STREAM_CAP, chainlinkFeed, chainlinkRowsFromPoints, openChainlinkStream } from "@/lib/chainlinkFeeds";
import { flattenKalshiLiveCandlestickGroups } from "@/lib/kalshiLive/normalizeCandlestickRow";
import { normalizeKalshiLiveOrderbook } from "@/lib/kalshiLive/normalizeOrderbookRow";
import { normalizeKalshiLiveTradeRow } from "@/lib/kalshiLive/normalizeTradeRow";
import {
  appendLiveCells,
  appendLiveRecords,
  cellsFromRecords,
  liveRecordsFromRows,
  patchPriceCells,
  patchPriceRecords,
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
  const streamSymbol = def.integration === "chainlink" ? chainlinkStreamSymbol(block) : "";
  if (def.livePath === "client_websocket" && streamSymbol) {
    return startChainlinkPairStream(block, def, handlers, streamSymbol);
  }
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
  let priceRecords = Array.isArray(block.records) && block.records.length ? block.records.map((row) => ({ ...row })) : null;
  let ping = 0;
  let emitTimer = 0;
  let primed = false;
  // Chainlink topics only stream live updates for one symbol per connection.
  const groups =
    def.integration === "binance"
      ? [symbols.map((symbol) => ({ topic: def.topic, type: "update", filters: JSON.stringify([symbol]) }))]
      : symbols.map((symbol) => [{ topic: def.topic, type: "*", filters: JSON.stringify({ symbol }) }]);
  const sockets = groups.map(() => new WebSocket(def.socketUrl));

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(ping);
    window.clearTimeout(emitTimer);
    for (const ws of sockets) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
  };

  const emit = () => {
    if (stopped) return;
    if (!primed) {
      primed = true;
      handlers.onCells({ ...cells });
      if (priceRecords) handlers.onRecords?.(priceRecords);
      return;
    }
    if (emitTimer) return;
    emitTimer = window.setTimeout(() => {
      emitTimer = 0;
      if (stopped) return;
      handlers.onCells({ ...cells });
      if (priceRecords) handlers.onRecords?.(priceRecords);
    }, 200);
  };

  const onMessage = (event) => {
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
    const at = Number(point?.timestamp) || Date.now();
    cells = patchPriceCells(block.columns, cells, { symbol, price, at });
    if (priceRecords) priceRecords = patchPriceRecords(block.columns, priceRecords, { symbol, price, at });
    handlers.onStatus("Receiving prices");
    emit();
  };
  sockets.forEach((ws, index) => {
    ws.onopen = () => {
      if (stopped) return;
      ws.send(JSON.stringify({ action: "subscribe", subscriptions: groups[index] }));
      handlers.onStatus("Connected, waiting for prices");
    };
    ws.onmessage = onMessage;
    ws.onerror = () => {
      if (!stopped) handlers.onStatus("Reconnecting");
    };
    ws.onclose = () => {
      if (stopped) return;
      stop();
      handlers.onFatal("The price stream closed.");
    };
  });
  ping = window.setInterval(() => {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) ws.send("PING");
    }
  }, 4000);

  return { stop };
}

/** The pair a Chainlink pair sheet streams. Older Chainlink sheets hold one row per coin and return "". */
function chainlinkStreamSymbol(block) {
  if (block?.pull?.mode === "stream" && block.pull.symbol) return String(block.pull.symbol).toLowerCase();
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  if (!columns.some((column) => column?.id === "time") || columns.some((column) => column?.id === "updated")) return "";
  const first = Array.isArray(block?.records) ? block.records.find((row) => row?.symbol) : null;
  return first ? String(first.symbol).toLowerCase() : "";
}

function latestStreamTime(block) {
  const records = Array.isArray(block?.records) ? block.records : [];
  let last = -Infinity;
  for (const row of records) {
    const time = Number(row?.time);
    if (Number.isFinite(time) && time > last) last = time;
  }
  if (records.length || !Object.keys(block?.cells || {}).length) return last;
  return Date.now();
}

/** Appends each new tick to the bottom of a pair sheet. Stops at the stream cap rather than dropping old rows. */
function startChainlinkPairStream(block, def, handlers, symbol) {
  let stopped = false;
  let cells = { ...(block.cells || {}) };
  let records = Array.isArray(block.records) ? block.records.map((row) => ({ ...row })) : null;
  let nextRow = maxRow(cells) + 1;
  let last = latestStreamTime(block);
  const windowSeconds = chainlinkFeed(def.endpoint)?.windowSeconds || null;
  let close = () => {};
  const stop = () => {
    if (stopped) return;
    stopped = true;
    close();
  };
  close = openChainlinkStream({
    topic: def.topic,
    symbol,
    onStatus(status) {
      if (stopped) return;
      if (status === "connecting") handlers.onStatus("Connected, waiting for prices");
      if (status === "closed") {
        stop();
        handlers.onFatal(typeof WebSocket === "undefined" ? "Live prices need a browser connection." : "The price stream closed.");
      }
    },
    onPoints(points) {
      if (stopped) return;
      const added = chainlinkRowsFromPoints(points, { symbol, windowSeconds, after: last });
      if (!added.length) return;
      if (nextRow + added.length > CHAINLINK_STREAM_CAP) {
        stop();
        handlers.onFatal(`This sheet reached ${CHAINLINK_STREAM_CAP.toLocaleString()} rows, so streaming stopped.`);
        return;
      }
      last = added[added.length - 1].time;
      cells = { ...cells };
      for (const [key, value] of Object.entries(cellsFromRecords(block.columns, added))) {
        const [col, row] = key.split(",");
        cells[`${col},${nextRow + Number(row)}`] = value;
      }
      nextRow += added.length;
      if (records) {
        records = records.concat(liveRecordsFromRows(block.columns, added));
        handlers.onRecords?.(records);
      }
      handlers.onStatus("Receiving prices");
      handlers.onCells(cells);
    },
  });
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
      handlers.onRecords?.(liveRecordsFromRows(block.columns, rows));
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
  const protectedThrough = maxRow(block.cells);
  let history = Array.isArray(block.records) && block.records.length ? block.records.map((row) => ({ ...row })) : null;
  const historyFloor = history ? history.length - 1 : -1;
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
    cells = appendLiveCells(cells, added, 120, protectedThrough);
    if (history) {
      history = appendLiveRecords(history, liveRecordsFromRows(block.columns, records), 120, historyFloor);
      handlers.onRecords?.(history);
    }
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
