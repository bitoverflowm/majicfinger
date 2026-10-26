import { rememberTradeSheet } from "@/components/dashboardComposer/fullTradeSheet";
import { createRunReporter } from "@/components/dashboardComposer/integrationRunFeed";
import { stampRunSheets } from "@/components/dashboardComposer/integrationProvenance";
import { claimSheetId, displayMatrix, recordsFromRows } from "@/components/dashboardComposer/integrationRunSheets";
import { createRunSheetStage } from "@/components/dashboardComposer/runSheetStage";
import { lifePull } from "@/lib/markets/marketLife";
import { chartSpecsForSheet } from "@/lib/visualizations/sheetCharts";
import { describePlan, pullKalshiTradeHistory } from "./kalshiTradeHistorySource";

const CHART_PROBE_ROWS = 200;
const PREVIEW_ROWS = 50;

/**
 * Save and Go: closes the picker, then pulls the market's trades onto the open tab with the
 * progress card on top. The sheet and its default charts land as soon as the rows are in.
 */
export async function runKalshiTradeHistory({ meta, plan, canvas, close, limit, accountId }) {
  const reporter = createRunReporter((feed) => canvas?.reportRun?.(feed));
  const route = describePlan(plan);
  canvas?.armReplay?.(() => runKalshiTradeHistory({ meta, plan, canvas, close: null, limit, accountId }));
  reporter.plan(
    [
      { id: "find", name: "find_market", status: "pending", args: { ticker: meta.ticker } },
      { id: "route", name: "route_source", status: "pending", args: { source: route.label } },
      { id: "pull", name: "pull_trades", status: "pending", args: { ticker: meta.ticker, limit } },
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

  reporter.start("pull");
  let pulled;
  try {
    pulled = await pullKalshiTradeHistory(meta, plan, { limit, onProgress: (text) => reporter.note("pull", text) });
  } catch (err) {
    reporter.fail("pull", err instanceof Error ? err.message : "The pull did not finish.");
    return;
  }
  if (!pulled.rows.length) {
    reporter.fail("pull", "Kalshi has no trades or candlesticks for this market yet.");
    return;
  }
  const candles = pulled.table === "candlesticks";
  const noun = candles ? "candlesticks" : "trades";
  reporter.succeed("pull", {
    name: candles ? "pull_candlesticks" : "pull_trades",
    result: `${pulled.rows.length.toLocaleString()} ${noun} from ${pulled.label}${pulled.truncated ? ` · stopped at your plan's ${Number(limit).toLocaleString()} rows` : ""}`,
  });

  reporter.start("place");
  const pageId = canvas?.pageId || "";
  const occupied = new Set(((canvas?.blocksByPage || {})[pageId] || []).map((block) => block?.id).filter(Boolean));
  const id = claimSheetId(`run-recipe-${pulled.table}-${meta.ticker.replace(/[^A-Za-z0-9]+/g, "-")}`, occupied, new Map());
  if (pulled.rows.length > PREVIEW_ROWS) {
    rememberTradeSheet(id, meta.ticker, pulled.columns, displayMatrix(pulled.columns, pulled.rows), limit, accountId);
  }
  const [sheet] = stampRunSheets(
    [
      {
        id,
        title: `${candles ? "Candlesticks" : "Trades"} · ${meta.ticker}`,
        columns: pulled.columns,
        rows: pulled.rows,
        rowCount: pulled.rows.length,
        keepAllRows: true,
        span: "full",
        table: pulled.table,
        integrationId: pulled.integrationId,
        summary: `${pulled.label} · ${candles ? "Candlesticks" : "Trades"} · ${meta.ticker}`,
        pull: {
          ticker: meta.ticker,
          table: pulled.table,
          marketTitle: meta.title,
          ...(meta.subtitle ? { side: meta.subtitle } : {}),
          ...(meta.eventTicker ? { eventTicker: meta.eventTicker } : {}),
          ...lifePull({ openTime: meta.openMs || undefined, closeTime: meta.closeMs || undefined, status: meta.status, result: meta.result }),
        },
        ...(pulled.composeRequest ? { composeRequest: pulled.composeRequest } : {}),
      },
    ],
    { integrationId: pulled.integrationId },
  );
  const stage = createRunSheetStage({
    reveal: (list, extra) => canvas?.revealRunSheets?.(list, { ...extra }),
    opensChart: (item) =>
      chartSpecsForSheet({ ...item, type: "sheet", records: recordsFromRows(item.columns, (item.rows || []).slice(0, CHART_PROBE_ROWS)) }).length > 0,
  });
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
