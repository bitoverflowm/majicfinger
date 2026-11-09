import { rememberTradeSheet } from "@/components/dashboardComposer/fullTradeSheet";
import { createRunReporter } from "@/components/dashboardComposer/integrationRunFeed";
import { stampRunSheets } from "@/components/dashboardComposer/integrationProvenance";
import { claimSheetId, displayMatrix, recordsFromRows } from "@/components/dashboardComposer/integrationRunSheets";
import { createRunSheetStage } from "@/components/dashboardComposer/runSheetStage";
import { lifePull } from "@/lib/markets/marketLife";
import { RECIPE_TRADE_HISTORY, RECIPE_TRADE_ROW_LIMIT } from "@/lib/dataLake/recipeLakeAccess";
import { chartSpecsForSheet } from "@/lib/visualizations/sheetCharts";
import { describePlan, pullKalshiTradeHistory } from "./kalshiTradeHistorySource";
import { fillingFor, streamTradeSheet } from "./tradeSheetStream";

const CHART_PROBE_ROWS = 200;
const PREVIEW_ROWS = 50;

/**
 * Save and Go: closes the picker, then pulls the market's trades onto the open tab with the
 * progress card on top. The sheet and its default charts land with the first page of trades
 * and fill in as the rest arrive.
 */
export async function runKalshiTradeHistory({ meta, plan, canvas, close, accountId }) {
  const reporter = createRunReporter((feed) => canvas?.reportRun?.(feed));
  const route = describePlan(plan);
  const limit = RECIPE_TRADE_ROW_LIMIT;
  canvas?.armReplay?.(() => runKalshiTradeHistory({ meta, plan, canvas, close: null, accountId }));
  reporter.plan(
    [
      { id: "find", name: "find_market", status: "pending", args: { ticker: meta.ticker } },
      { id: "route", name: "route_source", status: "pending", args: { source: route.label } },
      { id: "pull", name: "pull_trades", status: "pending", args: { ticker: meta.ticker, history: "full" } },
      { id: "place", name: "place_sheets", status: "pending", args: { charts: "default" } },
    ],
    {
      title: `Kalshi trade history · ${meta.ticker}`,
      runningLabel: "Pulling trade history",
      doneLabel: "Trade history ready",
      failLabel: "Trade history failed",
      readyDetail: "The trade sheet and its charts are on the canvas behind this card.",
    },
  );
  close?.();

  reporter.start("find");
  reporter.succeed("find", { result: [meta.title, meta.subtitle].filter(Boolean).join(" · ") });
  reporter.start("route");
  reporter.succeed("route", { result: route.detail });

  const pageId = canvas?.pageId || "";
  const occupied = new Set(((canvas?.blocksByPage || {})[pageId] || []).map((block) => block?.id).filter(Boolean));
  const ids = new Map();
  const idFor = (table) => {
    if (!ids.has(table)) ids.set(table, claimSheetId(`run-recipe-${table}-${meta.ticker.replace(/[^A-Za-z0-9]+/g, "-")}`, occupied, new Map()));
    return ids.get(table);
  };
  const sheetFor = (pulled, filling = null) => {
    const candles = pulled.table === "candlesticks";
    return stampRunSheets(
      [
        {
          id: idFor(pulled.table),
          title: `${candles ? "Candlesticks" : "Trades"} · ${meta.ticker}`,
          columns: pulled.columns,
          rows: pulled.rows,
          rowCount: pulled.rows.length,
          keepAllRows: true,
          span: "full",
          table: pulled.table,
          integrationId: pulled.integrationId,
          summary: `${pulled.label} · ${candles ? "Candlesticks" : "Trades"} · ${meta.ticker}`,
          ...(filling ? { filling } : {}),
          pull: {
            ticker: meta.ticker,
            table: pulled.table,
            limit,
            recipe: RECIPE_TRADE_HISTORY,
            marketTitle: meta.title,
            ...(meta.subtitle ? { side: meta.subtitle } : {}),
            ...(meta.eventTicker ? { eventTicker: meta.eventTicker } : {}),
            ...lifePull({ openTime: meta.openMs || undefined, closeTime: meta.closeMs || undefined, status: meta.status, result: meta.result }),
          },
          ...(pulled.composeRequest ? { composeRequest: pulled.composeRequest } : {}),
        },
      ],
      { integrationId: pulled.integrationId },
    )[0];
  };
  const stage = createRunSheetStage({
    reveal: (list, extra) => canvas?.revealRunSheets?.(list, { ...extra }),
    opensChart: (item) =>
      chartSpecsForSheet({ ...item, type: "sheet", records: recordsFromRows(item.columns, (item.rows || []).slice(0, CHART_PROBE_ROWS)) }).length > 0,
  });
  const stream = streamTradeSheet({
    canvas,
    stage,
    build: (partial) => sheetFor(partial, fillingFor(meta, partial.rows.length)),
  });

  reporter.start("pull");
  let pulled;
  try {
    pulled = await pullKalshiTradeHistory(meta, plan, {
      onProgress: (text) => reporter.note("pull", text),
      onRows: stream.onRows,
    });
  } catch (err) {
    await stream.stop();
    reporter.fail("pull", err instanceof Error ? err.message : "The pull did not finish.");
    return;
  }
  await stream.finish();
  if (!pulled.rows.length) {
    reporter.fail("pull", "Kalshi has no trades or candlesticks for this market yet.");
    return;
  }
  const candles = pulled.table === "candlesticks";
  const noun = candles ? "candlesticks" : "trades";
  reporter.succeed("pull", {
    name: candles ? "pull_candlesticks" : "pull_trades",
    result: `${pulled.rows.length.toLocaleString()} ${noun} from ${pulled.label}${pulled.truncated ? ` · stopped at ${limit.toLocaleString()} rows, the most one sheet holds` : ""}`,
  });

  reporter.start("place");
  const id = idFor(pulled.table);
  if (pulled.rows.length > PREVIEW_ROWS) {
    rememberTradeSheet(id, meta.ticker, pulled.columns, displayMatrix(pulled.columns, pulled.rows), limit, accountId);
  }
  const sheet = sheetFor(pulled);
  stage.put(sheet);
  await stage.settle();
  const charts = chartSpecsForSheet({ ...sheet, type: "sheet", records: recordsFromRows(sheet.columns, sheet.rows.slice(0, CHART_PROBE_ROWS)) });
  reporter.succeed("place", {
    result: charts.length
      ? `${sheet.title} and ${charts.length === 1 ? "its chart" : `${charts.length} charts`} on this tab`
      : `${sheet.title} on this tab`,
  });
  reporter.finish();
}
