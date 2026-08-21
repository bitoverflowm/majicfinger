export const POLYMARKET_CANDLE_INTERVALS = [
  { value: "1m", label: "1 minute", milliseconds: 60_000 },
  { value: "5m", label: "5 minutes", milliseconds: 5 * 60_000 },
  { value: "15m", label: "15 minutes", milliseconds: 15 * 60_000 },
  { value: "30m", label: "30 minutes", milliseconds: 30 * 60_000 },
  { value: "1h", label: "1 hour", milliseconds: 60 * 60_000 },
  { value: "4h", label: "4 hours", milliseconds: 4 * 60 * 60_000 },
  { value: "1d", label: "1 day", milliseconds: 24 * 60 * 60_000 },
];

const INTERVAL_MS = Object.fromEntries(
  POLYMARKET_CANDLE_INTERVALS.map((interval) => [interval.value, interval.milliseconds]),
);

export function normalizePolymarketCandleInterval(value) {
  return Object.hasOwn(INTERVAL_MS, value) ? value : "5m";
}

export function polymarketCandleIntervalMs(value) {
  return INTERVAL_MS[normalizePolymarketCandleInterval(value)];
}

function timestampMs(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number < 1e12 ? number * 1000 : number;
}

function candleRow({ assetId, bucketStart, intervalMs, price, volume = 0, source, final }) {
  const bucketEnd = bucketStart + intervalMs;
  return {
    source,
    event_type: "candlestick",
    asset_id: assetId,
    interval: `${intervalMs}`,
    start_period_ts: Math.floor(bucketStart / 1000),
    end_period_ts: Math.floor(bucketEnd / 1000),
    time: new Date(bucketEnd).toISOString(),
    price_open_dollars: price,
    price_high_dollars: price,
    price_low_dollars: price,
    price_close_dollars: price,
    volume,
    is_final: final,
  };
}

/** Aggregate REST price-history points into deterministic OHLC seed candles. */
export function buildPolymarketCandlestickSeedRows(historyRows, interval = "5m") {
  const intervalMs = polymarketCandleIntervalMs(interval);
  const byCandle = new Map();
  for (const row of historyRows || []) {
    const assetId = String(row?.asset_id || "");
    const time = timestampMs(row?.timestamp);
    const price = Number(row?.price);
    if (!assetId || time == null || !Number.isFinite(price)) continue;
    const bucketStart = Math.floor(time / intervalMs) * intervalMs;
    const key = `${assetId}:${bucketStart}`;
    const existing = byCandle.get(key);
    if (!existing) {
      byCandle.set(
        key,
        candleRow({
          assetId,
          bucketStart,
          intervalMs,
          price,
          volume: Number(row?.size) || 0,
          source: "rest_seed",
          final: true,
        }),
      );
      continue;
    }
    existing.price_high_dollars = Math.max(existing.price_high_dollars, price);
    existing.price_low_dollars = Math.min(existing.price_low_dollars, price);
    existing.price_close_dollars = price;
    existing.volume += Number(row?.size) || 0;
  }
  return [...byCandle.values()].sort(
    (a, b) => a.end_period_ts - b.end_period_ts || a.asset_id.localeCompare(b.asset_id),
  );
}

/** Upsert one last_trade_price message into its token's active candle. */
export function upsertPolymarketTradeCandle(rows, trade, interval = "5m") {
  const intervalMs = polymarketCandleIntervalMs(interval);
  const assetId = String(trade?.asset_id || "");
  const time = timestampMs(trade?.timestamp);
  const price = Number(trade?.price);
  const size = Number(trade?.size);
  if (!assetId || time == null || !Number.isFinite(price)) return rows || [];
  const bucketStart = Math.floor(time / intervalMs) * intervalMs;
  const endPeriod = Math.floor((bucketStart + intervalMs) / 1000);
  const next = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : [];
  const existingIndex = next.findIndex(
    (row) => String(row?.asset_id) === assetId && Number(row?.end_period_ts) === endPeriod,
  );

  for (const row of next) {
    if (String(row?.asset_id) === assetId && Number(row?.end_period_ts) < endPeriod) {
      row.is_final = true;
    }
  }

  if (existingIndex >= 0) {
    const candle = next[existingIndex];
    candle.source = "live";
    candle.price_high_dollars = Math.max(Number(candle.price_high_dollars), price);
    candle.price_low_dollars = Math.min(Number(candle.price_low_dollars), price);
    candle.price_close_dollars = price;
    candle.volume = (Number(candle.volume) || 0) + (Number.isFinite(size) ? size : 0);
    candle.is_final = false;
    candle.last_transaction_hash = trade.transaction_hash || candle.last_transaction_hash || "";
  } else {
    next.push({
      ...candleRow({
        assetId,
        bucketStart,
        intervalMs,
        price,
        volume: Number.isFinite(size) ? size : 0,
        source: "live",
        final: false,
      }),
      last_transaction_hash: trade.transaction_hash || "",
    });
  }
  return next
    .sort((a, b) => Number(a.end_period_ts) - Number(b.end_period_ts))
    .slice(-2500);
}

/**
 * Finalize elapsed candles and synthesize zero-volume candles by carrying the
 * previous close forward. Called on a timer so quiet markets still advance.
 */
export function advancePolymarketCandles(rows, now = Date.now(), interval = "5m") {
  const intervalMs = polymarketCandleIntervalMs(interval);
  const currentStart = Math.floor(now / intervalMs) * intervalMs;
  const next = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : [];
  const assets = new Set(next.map((row) => String(row?.asset_id || "")).filter(Boolean));

  for (const assetId of assets) {
    const assetRows = next
      .filter((row) => String(row?.asset_id) === assetId)
      .sort((a, b) => Number(a.end_period_ts) - Number(b.end_period_ts));
    const latest = assetRows[assetRows.length - 1];
    if (!latest) continue;
    let bucketStart = Number(latest.end_period_ts) * 1000;
    let close = Number(latest.price_close_dollars);
    if (!Number.isFinite(close)) continue;
    latest.is_final = bucketStart <= currentStart;

    let added = 0;
    while (bucketStart <= currentStart && added < 500) {
      next.push(
        candleRow({
          assetId,
          bucketStart,
          intervalMs,
          price: close,
          volume: 0,
          source: "carry_forward",
          final: bucketStart < currentStart,
        }),
      );
      bucketStart += intervalMs;
      added += 1;
    }
  }

  return next
    .sort((a, b) => Number(a.end_period_ts) - Number(b.end_period_ts))
    .slice(-2500);
}

/** Apply top-of-book values as overlays without changing candle OHLC. */
export function applyPolymarketCandleOverlay(rows, change) {
  const assetId = String(change?.asset_id || "");
  if (!assetId || !Array.isArray(rows)) return rows || [];
  let latestIndex = -1;
  let latestEnd = -Infinity;
  rows.forEach((row, index) => {
    const end = Number(row?.end_period_ts);
    if (String(row?.asset_id) === assetId && end > latestEnd) {
      latestIndex = index;
      latestEnd = end;
    }
  });
  if (latestIndex < 0) return rows;
  const bid = Number(change?.best_bid);
  const ask = Number(change?.best_ask);
  const next = [...rows];
  next[latestIndex] = {
    ...next[latestIndex],
    best_bid: Number.isFinite(bid) ? bid : "",
    best_ask: Number.isFinite(ask) ? ask : "",
    midpoint: Number.isFinite(bid) && Number.isFinite(ask) ? (bid + ask) / 2 : "",
    spread: Number.isFinite(bid) && Number.isFinite(ask) ? ask - bid : "",
  };
  return next;
}
