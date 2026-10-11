/**
 * Maps a dataset descriptor to a default view.
 * Selection is saved user view, then the dataset preset, then a simpler fallback, then the table.
 */

const PRESETS = {
  candles: { view: "candles", curve: "ohlc", label: "Candlesticks" },
  "candles:event": { view: "event-lines", curve: "linear", label: "Event prices", limit: 5 },
  "trades:one": { view: "trade-price", curve: "linear", label: "Last traded price" },
  "trades:many": { view: "trade-volume", curve: "linear", label: "Trade volume" },
  price_history: { view: "price", curve: "linear", units: "probability", label: "Price" },
  "price_history:token": { view: "price", curve: "linear", units: "probability", label: "Outcome price" },
  orderbook: { view: "order-book", label: "Order book", depth: 20 },
  "quote:midpoint": { view: "metric", label: "Midpoint" },
  "quote:trade": { view: "metric", label: "Last traded price" },
  quote: { view: "quote", label: "Bid / ask" },
  spread: { view: "metric", label: "Spread" },
  tick_size: { view: "spec", label: "Tick size" },
  open_interest: { view: "metric", label: "Open interest" },
  "markets:one": { view: "overview", label: "Market" },
  markets: { view: "bars", label: "Volume", limit: 10, noun: "markets" },
  "events:one": { view: "bars", label: "Market prices", limit: 10, noun: "markets" },
  events: { view: "bars", label: "Event volume", limit: 10, noun: "events" },
  series: { view: "overview", label: "Series" },
  holders: { view: "bars", label: "Shares", limit: 10, noun: "holders" },
  leaderboard: { view: "bars", label: "Rank", limit: 10, noun: "traders" },
  biggest_wins: { view: "bars", label: "Wins", limit: 10, noun: "wins" },
  positions_open: { view: "bars", label: "Position value", limit: 10, noun: "positions" },
  positions_closed: { view: "diverging", label: "Realized PnL", limit: 10, noun: "positions" },
  trader_positions: { view: "treemap", label: "Portfolio", noun: "positions" },
  holder_trades: { view: "activity", label: "Buy / sell", curve: "linear" },
};

const FIELD_NEEDS = {
  candles: ["time", "close"],
  "event-lines": ["market", "time", "close"],
  "trade-price": ["price"],
  "trade-volume": ["size"],
  price: ["price"],
  "order-book": ["price", "size", "side"],
  depth: ["price", "size", "side"],
  "visual-table": ["label"],
  metric: ["value"],
  quote: ["bid"],
  spec: ["value"],
  overview: ["label"],
  bars: ["value", "label"],
  diverging: ["value"],
  treemap: ["value", "label"],
  activity: ["side", "price", "size"],
  scatter: ["price", "time"],
  table: [],
};

function presetKey(dataset) {
  if (!dataset) return "";
  if (dataset.datasetType === "candles" && dataset.scope === "event") return "candles:event";
  if (dataset.datasetType === "trades") return dataset.seriesCount > 1 ? "trades:many" : "trades:one";
  if (dataset.datasetType === "price_history" && dataset.scope === "token") return "price_history:token";
  if (dataset.datasetType === "quote" && dataset.priceBasis === "midpoint") return "quote:midpoint";
  if (dataset.datasetType === "quote" && dataset.priceBasis === "trade") return "quote:trade";
  if (dataset.datasetType === "markets") return dataset.shape === "snapshot" || dataset.seriesCount <= 1 ? "markets:one" : "markets";
  if (dataset.datasetType === "events") return dataset.seriesCount <= 1 ? "events:one" : "events";
  return dataset.datasetType;
}

function hasField(dataset, columnIds, key) {
  const field = dataset?.fields?.[key];
  if (!field) return false;
  if (!columnIds) return true;
  return columnIds.has(field);
}

function viewValid(view, dataset, columnIds) {
  const needs = FIELD_NEEDS[view] || [];
  return needs.every((key) => hasField(dataset, columnIds, key));
}

function fallbackFor(view, dataset, columnIds) {
  const chain = {
    candles: ["price", "table"],
    "event-lines": ["bars", "table"],
    "trade-price": ["trade-volume", "metric", "table"],
    "trade-volume": ["table"],
    price: ["metric", "table"],
    "order-book": ["table"],
    quote: ["metric", "table"],
    metric: ["table"],
    spec: ["table"],
    overview: ["table"],
    bars: ["table"],
    diverging: ["table"],
    treemap: ["bars", "table"],
    activity: ["scatter", "table"],
    scatter: ["table"],
    "visual-table": ["bars", "table"],
  };
  for (const next of chain[view] || ["table"]) {
    if (next === "table" || viewValid(next, dataset, columnIds)) {
      return { view: next, source: "fallback", label: PRESETS[dataset?.datasetType]?.label || "Table" };
    }
  }
  return { view: "table", source: "table", label: "Table" };
}

/**
 * @param {object | null | undefined} dataset
 * @param {{ userView?: string, custom?: boolean, columnIds?: Iterable<string>, observations?: number }} [options]
 */
export function resolveVisualization(dataset, options = {}) {
  if (!dataset) return { view: "table", source: "table", label: "Table" };
  const columnIds = options.columnIds ? new Set(options.columnIds) : null;
  const userView = String(options.userView || "").trim();
  if (options.custom && userView && viewValid(userView, dataset, columnIds)) {
    return { view: userView, source: "user", label: userView, curve: "linear" };
  }
  if (options.custom && userView) {
    const dropped = fallbackFor(userView, dataset, columnIds);
    return { ...dropped, source: "fallback", reason: "fields-missing" };
  }

  const key = presetKey(dataset);
  const preset = PRESETS[key] || PRESETS[dataset.datasetType];
  if (!preset) return { view: "table", source: "table", label: "Table" };

  let chosen = { ...preset, source: "preset" };
  if (!viewValid(chosen.view, dataset, columnIds)) {
    chosen = fallbackFor(chosen.view, dataset, columnIds);
  }

  const observations = options.observations;
  if (Number.isFinite(observations) && observations < 2 && (chosen.view === "price" || chosen.view === "trade-price" || chosen.view === "candles" || chosen.view === "event-lines")) {
    if (observations === 0) return { view: "table", source: "fallback", label: chosen.label, reason: "empty" };
    if (viewValid("metric", dataset, columnIds) || chosen.view === "price") {
      return { view: "metric", source: "fallback", label: chosen.label, reason: "single" };
    }
  }
  if (dataset.datasetType === "open_interest" && dataset.seriesCount > 1 && chosen.view === "metric") {
    return { ...PRESETS.markets, view: "bars", source: "preset", label: "Open interest", noun: "markets" };
  }
  if (dataset.datasetType === "spread" && dataset.seriesCount > 1 && chosen.view === "metric") {
    return { view: "bars", source: "preset", label: "Spread", limit: 10, noun: "markets" };
  }
  if (dataset.datasetType === "quote" && dataset.priceBasis === "midpoint" && dataset.seriesCount > 1) {
    return { view: "bars", source: "preset", label: "Midpoint", limit: 10, noun: "outcomes" };
  }
  if (dataset.datasetType === "quote" && !dataset.priceBasis && dataset.seriesCount > 1) {
    return { view: "quote-table", source: "preset", label: "Quotes" };
  }
  return chosen;
}

const SAVED_VIEWS = new Set([
  "depth",
  "order-book",
  "price",
  "candles",
  "event-lines",
  "trade-price",
  "trade-volume",
  "metric",
  "bars",
  "diverging",
  "treemap",
  "quote",
  "quote-table",
  "spec",
  "overview",
  "activity",
  "scatter",
  "visual-table",
  "table",
]);

export function isSavedChartView(view) {
  return SAVED_VIEWS.has(view);
}

/** Leaderboard and biggest wins are the specific types. Stats is the family that shares Visual Table. */
export function isStatsDataset(dataset) {
  return dataset?.category === "stats" || dataset?.datasetType === "leaderboard" || dataset?.datasetType === "biggest_wins";
}

/** Sheets that can switch into the visual table. Positions keep their own log. */
export function hasVisualTable(dataset) {
  return isStatsDataset(dataset) || dataset?.datasetType === "trader_positions";
}

/**
 * Views offered for a pull. Visual Table is available on every stats dataset.
 * @param {object | null | undefined} dataset
 * @param {Iterable<string>} [columnIds]
 */
export function visualizationChoices(dataset, columnIds) {
  if (!hasVisualTable(dataset)) return [];
  const ids = columnIds ? new Set(columnIds) : null;
  const key = presetKey(dataset);
  const preset = PRESETS[key] || PRESETS[dataset.datasetType];
  const choices = [];
  if (preset && viewValid(preset.view, dataset, ids)) {
    choices.push({ view: preset.view, label: preset.label });
  }
  if (viewValid("visual-table", dataset, ids)) {
    choices.push({ view: "visual-table", label: "Visual Table" });
  }
  return choices;
}

export function presetViews() {
  return Object.values(PRESETS).map((preset) => preset.view);
}
