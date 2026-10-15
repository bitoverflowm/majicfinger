"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReadyTradeSheet, tradeTickerFromBlock, usesHistoricalTradeSheet } from "@/components/dashboardComposer/fullTradeSheet";
import { isOrderBookSheet, orderBookBlockHeight, rowsToFramedBooks, rowsToOrderBook } from "@/components/dashboardComposer/orderBookLadder";
import { cn } from "@/lib/utils";
import { ohlcRowsToCandles, rangesForCandles, tradesToCandles } from "@/components/dashboardComposer/tradeMarketCandles";
import { isPriceHistorySheet, priceHistoryOutcome, priceHistoryPoints } from "@/components/dashboardComposer/priceHistorySeries";
import { DatasetSummary, EventLinesChart } from "@/components/dashboardComposer/datasetChart";
import { PortfolioTreemap } from "@/components/dashboardComposer/portfolioTreemapChart";
import { VolumeTreemap } from "@/components/dashboardComposer/volumeTreemapChart";
import { PnlPortfolioChart } from "@/components/dashboardComposer/pnlPortfolioChart";
import { ActivityCalendarChart } from "@/components/dashboardComposer/activityCalendarChart";
import { ActivityStackChart } from "@/components/dashboardComposer/activityStackChart";
import { columnKey, countObservations, describeSheet, sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import { resolveVisualization } from "@/lib/visualizations/presetRegistry";
import { IndicatorChart } from "@/components/spectrumui/charts/indicator-chart";
import { MarketChart } from "@/components/spectrumui/charts/market-chart";
import { DepthChart } from "@/components/spectrumui/charts/depth-chart";
import { OrderBookChart } from "@/components/spectrumui/charts/order-book-chart";

function parseChartNumber(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/¢$/, "")
    .replace(/,/g, "");
  if (!raw) return null;
  const match = raw.match(/^(-?\d+(?:\.\d+)?)\s*([KMB])?$/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[(match[2] || "").toUpperCase()] || 1;
  return n * scale;
}

function looksLikeDates(labels) {
  const sample = labels.filter(Boolean).slice(0, 8);
  if (sample.length < 2) return false;
  const dated = sample.filter((label) => /\d/.test(label) && !Number.isNaN(Date.parse(label))).length;
  return dated / sample.length >= 0.6;
}

export function chartSeriesFromSheet(block) {
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const records = sheetRecords(block);
  if (!columns.length || !records.length) return null;

  const stats = columns.map((column, index) => {
    const id = columnKey(column);
    let numeric = 0;
    let filled = 0;
    for (const row of records) {
      const text = id ? row?.[id] : "";
      if (text == null || text === "") continue;
      filled += 1;
      if (parseChartNumber(text) != null) numeric += 1;
    }
    return { index, id, title: column.title || `Column ${index + 1}`, numeric, filled };
  });
  const numeric = stats.filter((column) => column.filled && column.numeric / column.filled >= 0.6);
  const value =
    numeric.find((column) => /volume/i.test(column.title)) ||
    numeric.find((column) => /price/i.test(column.title)) ||
    numeric[0];
  if (!value) return null;
  const label = stats.find((column) => column.index !== value.index && column.filled && column.numeric / column.filled < 0.6);

  const data = [];
  for (const row of records) {
    const n = parseChartNumber(value.id ? row?.[value.id] : "");
    if (n == null) continue;
    data.push({
      label: label?.id ? String(row?.[label.id] || data.length + 1) : String(data.length + 1),
      value: n,
    });
  }
  if (!data.length) return null;
  return {
    data: data.slice(0, 80),
    valueTitle: value.title,
    labelTitle: label?.title || "Row",
    kind: looksLikeDates(data.map((point) => point.label)) ? "line" : "bar",
    truncated: data.length > 80,
  };
}

function isCandleSheet(sheet) {
  if (!sheet) return false;
  const table = String(sheet.table || "");
  if (table === "candlesticks" || table === "event_candlesticks") return true;
  if (/^candlesticks\s·/i.test(String(sheet.title || ""))) return true;
  const ids = new Set((sheet.columns || []).map((column) => String(column?.id || "")));
  return ids.has("price_open_dollars") && ids.has("price_close_dollars");
}

function sheetSymbol(sheet) {
  const title = String(sheet?.title || "");
  const match = title.match(/^(?:Trades|Candlesticks|Order book)\s·\s(.+)$/i);
  return match ? match[1].trim() : tradeTickerFromBlock(sheet);
}

function isTradeSheet(sheet) {
  if (!sheet || sheet.type === "chart") return false;
  const table = String(sheet.table || "");
  if (table === "trades" || table === "getTradesByMarket") return true;
  const title = String(sheet.title || "");
  if (/^trade history\b/i.test(title) || /^trades\s·/i.test(title)) return true;
  if (tradeTickerFromBlock(sheet)) return true;
  const titles = (sheet.columns || []).map((column) => String(column?.title || "").trim().toLowerCase());
  return titles.includes("yes price") && titles.some((entry) => entry.includes("created"));
}

function matrixFromCells(sheet) {
  const columns = sheet?.columns || [];
  if (Array.isArray(sheet?.records) && sheet.records.length) {
    return sheet.records.map((row) =>
      columns.map((column) => {
        const value = column?.id ? row?.[column.id] : "";
        return value == null ? "" : value;
      }),
    );
  }
  const cells = sheet?.cells || {};
  let max = -1;
  for (const key of Object.keys(cells)) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) max = Math.max(max, row);
  }
  if (max < 0) return [];
  const rows = [];
  for (let row = 0; row <= max; row += 1) {
    rows.push(columns.map((_, column) => cells[`${column},${row}`] ?? ""));
  }
  return rows;
}

function candlesFromPreset(preset) {
  if (preset?.kind === "trade-market" && preset.candles?.length) {
    return { candles: preset.candles, volumeLabel: preset.volumeLabel || "Count fp", symbol: preset.symbol || "", mode: preset.mode || "trades" };
  }
  if (preset?.kind === "trade-price" && preset.points?.length) {
    return {
      candles: preset.points.map((point) => ({
        t: point.time,
        open: point.price,
        high: point.price,
        low: point.price,
        close: point.price,
        volume: point.size || 0,
      })),
      volumeLabel: preset.sizeTitle || "Volume",
      symbol: "",
      mode: "trades",
    };
  }
  return null;
}

function TradeMarketChart({ sheet, rows, live, snapshot, onSnapshot, mode = "trades" }) {
  const built = useMemo(
    () => (mode === "ohlc" ? ohlcRowsToCandles(sheet?.columns, rows) : tradesToCandles(sheet?.columns, rows)),
    [mode, rows, sheet?.columns],
  );
  const preset = candlesFromPreset(snapshot);
  const candles = live || built.candles.length ? built.candles : preset?.candles || [];
  const volumeLabel = built.volumeLabel || preset?.volumeLabel || (mode === "ohlc" ? "Volume fp" : "Count fp");
  const ranges = useMemo(() => rangesForCandles(candles), [candles]);
  const symbol = built.outcome || sheetSymbol(sheet) || preset?.symbol || "";
  const units = built.units || "currency";
  const candleKey = candles.length
    ? `${candles.length}|${candles[candles.length - 1].t}|${candles[candles.length - 1].close}|${candles[candles.length - 1].volume}`
    : "";
  const sentKey = useRef("");
  useEffect(() => {
    if (live || !candleKey || !built.candles.length || sentKey.current === candleKey) return;
    sentKey.current = candleKey;
    onSnapshot?.({
      kind: "trade-market",
      candles: built.candles,
      volumeLabel,
      symbol,
      mode,
    });
  }, [built.candles, candleKey, live, mode, onSnapshot, symbol, volumeLabel]);

  return (
    <MarketChart
      data={candles}
      symbol={symbol}
      variant={mode === "ohlc" ? "candles" : "area"}
      name={mode === "ohlc" ? "Price" : units === "probability" ? "Last traded price" : "Yes"}
      units={units}
      volumeLabel={volumeLabel || (mode === "ohlc" ? "Volume fp" : "Count fp")}
      ranges={ranges}
      defaultRange="All"
      live={live}
      status={candles.length ? "ready" : "empty"}
      emptyLabel={mode === "ohlc" ? "This candlestick sheet has no price bars yet." : "This trades sheet has no yes price to chart yet."}
    />
  );
}

function OrderBookSheetChart({ sheet, rows, live, snapshot, onSnapshot, onFitHeight }) {
  const built = useMemo(() => rowsToOrderBook(sheet?.columns, rows), [rows, sheet?.columns]);
  const frames = useMemo(() => rowsToFramedBooks(sheet?.columns, rows), [rows, sheet?.columns]);
  const [outcome, setOutcome] = useState("");
  const active = frames.find((frame) => frame.outcome === outcome) || frames[0] || null;
  const saved = snapshot?.kind === "order-book" ? snapshot : null;
  const book = active || (built.bids.length || built.asks.length ? built : saved || built);
  const symbol = active?.outcome || sheetSymbol(sheet) || saved?.symbol || "";
  const levelCount = Math.max(
    built.bids.length + built.asks.length,
    ...frames.map((frame) => frame.bids.length + frame.asks.length),
    0,
  );
  const bookKey = `${book.bids.length}|${book.asks.length}|${book.bids[0]?.price}|${book.bids[0]?.size}|${book.asks[0]?.price}|${book.asks[0]?.size}|${book.bids[book.bids.length - 1]?.total ?? 0}|${book.asks[book.asks.length - 1]?.total ?? 0}`;
  const sentKey = useRef("");
  useEffect(() => {
    if (!levelCount || !onFitHeight) return;
    onFitHeight(orderBookBlockHeight(levelCount, { tabs: frames.length > 1 }));
  }, [frames.length, levelCount, onFitHeight]);
  useEffect(() => {
    if (live || (!book.bids.length && !book.asks.length) || sentKey.current === bookKey) return;
    sentKey.current = bookKey;
    onSnapshot?.({
      kind: "order-book",
      bids: book.bids,
      asks: book.asks,
      mid: book.mid,
      symbol,
    });
  }, [book, bookKey, live, onSnapshot, symbol]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {frames.length > 1 ? (
        <div className="flex shrink-0 items-center gap-1 px-2.5 pt-2">
          {frames.map((frame) => {
            const selected = frame.outcome === (active?.outcome || "");
            return (
              <button
                key={frame.outcome}
                type="button"
                onClick={() => setOutcome(frame.outcome)}
                className={cn(
                  "rounded-md px-2 py-0.5 font-mono text-[10px]",
                  selected
                    ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                    : "text-neutral-500 hover:bg-black/5 dark:hover:bg-white/8",
                )}
              >
                {frame.outcome}
              </button>
            );
          })}
        </div>
      ) : null}
      <OrderBookChart
        book={book}
        symbol={symbol}
        live={live}
        status={book.bids.length || book.asks.length ? "ready" : "empty"}
      />
    </div>
  );
}

function DepthSheetChart({ sheet, rows, live }) {
  const book = useMemo(() => rowsToOrderBook(sheet?.columns, rows), [rows, sheet?.columns]);
  const name = String(sheet?.pull?.marketTitle || sheet?.title || "Depth").trim();
  const symbol = String(sheet?.pull?.side || "").trim();
  return (
    <DepthChart
      book={book}
      symbol={symbol}
      name={name}
      live={live}
      status={book.bids.length || book.asks.length ? "ready" : "empty"}
    />
  );
}

function PriceHistorySheetChart({ sheet, live }) {
  const points = useMemo(() => priceHistoryPoints(sheet), [sheet]);
  const ranges = useMemo(
    () => rangesForCandles(points.map((point) => ({ t: point.t }))),
    [points],
  );
  const name = String(sheet?.pull?.marketTitle || sheet?.title || "Price").trim();
  const symbol = String(sheet?.pull?.side || priceHistoryOutcome(sheet) || "").trim();
  return (
    <IndicatorChart
      points={points}
      indicators={[]}
      symbol={symbol}
      name={name}
      ranges={ranges}
      defaultRange="All"
      live={live}
      status={points.length ? "ready" : "empty"}
      emptyLabel="This price history has no points to chart yet."
      units="probability"
      curve="linear"
    />
  );
}

const SUMMARY_VIEWS = new Set(["metric", "spec", "overview", "bars", "diverging", "quote", "quote-table"]);

export function SheetBlockChart({ sheet, snapshot, onSnapshot, live = false, view = "", onViewChange, onOpenRow, onFitHeight }) {
  const storedSheet = useReadyTradeSheet(sheet?.id);
  const fullSheet = usesHistoricalTradeSheet(sheet) ? storedSheet : null;
  const priceHistory = isPriceHistorySheet(sheet);
  const orderBook = !priceHistory && (isOrderBookSheet(sheet) || snapshot?.kind === "order-book");
  const candle = !priceHistory && !orderBook && (isCandleSheet(sheet) || snapshot?.mode === "ohlc");
  const trade = !priceHistory && !orderBook && !candle && (isTradeSheet(sheet) || snapshot?.kind === "trade-market" || snapshot?.kind === "trade-price");
  const series = useMemo(
    () => (priceHistory || trade || candle || orderBook ? null : chartSeriesFromSheet(sheet)),
    [candle, orderBook, priceHistory, sheet, trade],
  );
  const seriesKey = series ? `${series.kind}|${series.data.length}|${series.data[0]?.label}|${series.data[series.data.length - 1]?.value}` : "";
  useEffect(() => {
    if (!series) return;
    onSnapshot?.({
      kind: "sheet-series",
      seriesKind: series.kind,
      valueTitle: series.valueTitle,
      labelTitle: series.labelTitle,
      points: series.data,
    });
  }, [onSnapshot, series, seriesKey]);

  const dataset = describeSheet(sheet);
  const columnIds = (sheet?.columns || []).map((column) => columnKey(column)).filter(Boolean);
  const resolved = dataset
    ? resolveVisualization(dataset, {
        userView: view,
        custom: Boolean(view),
        columnIds,
        observations: countObservations(sheet, dataset),
      })
    : null;
  if (resolved?.view === "treemap") {
    if (dataset?.datasetType === "markets" || dataset?.datasetType === "events") {
      return <VolumeTreemap sheet={sheet} dataset={dataset} onOpenRow={onOpenRow} />;
    }
    return <PortfolioTreemap sheet={sheet} dataset={dataset} onOpenRow={onOpenRow} />;
  }
  if (resolved?.view === "portfolio") {
    return <PnlPortfolioChart sheet={sheet} />;
  }
  if (resolved?.view === "activity-calendar") {
    return <ActivityCalendarChart sheet={sheet} />;
  }
  if (resolved?.view === "activity-stack") {
    return <ActivityStackChart sheet={sheet} />;
  }
  if (resolved?.view === "price") {
    return <PriceHistorySheetChart sheet={sheet} live={live} />;
  }
  if (resolved?.view === "event-lines") {
    return <EventLinesChart sheet={sheet} dataset={dataset} />;
  }
  if (resolved?.view === "trade-volume") {
    return (
      <DatasetSummary
        sheet={sheet}
        dataset={{ ...dataset, fields: { ...dataset.fields, value: dataset.fields.size, label: dataset.fields.market } }}
        view={{ ...resolved, label: "Volume by market", noun: "markets" }}
      />
    );
  }
  if (resolved && SUMMARY_VIEWS.has(resolved.view)) {
    return <DatasetSummary sheet={sheet} dataset={dataset} view={resolved} limit={resolved.limit || 10} />;
  }
  if (resolved?.view === "table" || resolved?.view === "activity" || resolved?.view === "scatter") {
    return (
      <p className="px-3 text-[12px] text-muted-foreground">
        {resolved.view === "table"
          ? "This dataset stays in the table."
          : "These trades stay in the table. A time bucket is drawn once the sheet has one market and a price."}
      </p>
    );
  }

  if (priceHistory) {
    return <PriceHistorySheetChart sheet={sheet} live={live} />;
  }

  if (resolved?.view === "trade-price" || trade) {
    const liveRows = matrixFromCells(sheet);
    const rows = live && liveRows.length ? liveRows : fullSheet?.rows?.length ? fullSheet.rows : liveRows;
    return (
      <TradeMarketChart
        sheet={sheet}
        rows={rows}
        live={live && liveRows.length > 0}
        snapshot={snapshot}
        onSnapshot={onSnapshot}
        mode="trades"
      />
    );
  }

  if ((orderBook || resolved?.view === "order-book" || resolved?.view === "depth") && dataset?.datasetType !== "trades") {
    const rows = matrixFromCells(sheet);
    const depth = view === "depth" || resolved?.view === "depth";
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {depth ? (
          <DepthSheetChart sheet={sheet} rows={rows} live={live} />
        ) : (
          <OrderBookSheetChart
            sheet={sheet}
            rows={rows}
            live={live}
            snapshot={snapshot}
            onSnapshot={onSnapshot}
            onFitHeight={onFitHeight}
          />
        )}
      </div>
    );
  }

  if (trade || candle) {
    const liveRows = matrixFromCells(sheet);
    const rows = live && liveRows.length ? liveRows : !candle && fullSheet?.rows?.length ? fullSheet.rows : liveRows;
    return (
      <TradeMarketChart
        sheet={sheet}
        rows={rows}
        live={live && liveRows.length > 0}
        snapshot={snapshot}
        onSnapshot={onSnapshot}
        mode={candle ? "ohlc" : "trades"}
      />
    );
  }
  const drawn = series || (snapshot?.kind === "sheet-series" && snapshot.points?.length
    ? { data: snapshot.points, valueTitle: snapshot.valueTitle, labelTitle: snapshot.labelTitle, kind: snapshot.seriesKind || "bar", truncated: false }
    : null);
  if (!drawn) {
    return (
      <p className="px-3 text-[12px] text-muted-foreground">
        {sheet ? "This table has no numeric column to chart yet." : "The source table is no longer on this tab."}
      </p>
    );
  }

  const Chart = drawn.kind === "line" ? LineChart : BarChart;
  return (
    <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
      <p className="px-1 pb-1 text-[11px] text-muted-foreground">
        {drawn.valueTitle}
        {drawn.labelTitle ? ` by ${drawn.labelTitle}` : ""}
        {drawn.truncated ? " · first 80 rows" : ""}
      </p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={drawn.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis
              tick={{ fontSize: 10 }}
              width={48}
              tickFormatter={(value) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)}
            />
            <Tooltip />
            {drawn.kind === "line" ? (
              <Line type="monotone" dataKey="value" name={drawn.valueTitle} stroke="#0d99ff" strokeWidth={2} dot={false} />
            ) : (
              <Bar dataKey="value" name={drawn.valueTitle} fill="#0d99ff" radius={[3, 3, 0, 0]} />
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
