import { createRunReporter } from "@/components/dashboardComposer/integrationRunFeed";
import { claimSheetId, recordsFromRows } from "@/components/dashboardComposer/integrationRunSheets";
import { polymarketTraderJoinSheetTitle } from "@/components/dashboardComposer/polymarketLiveBuild";
import { createRunSheetStage } from "@/components/dashboardComposer/runSheetStage";
import { lifePull } from "@/lib/markets/marketLife";
import { TRADER_ACTIVITY_ENDPOINT_ID } from "@/lib/polymarketLive/traderActivityCompose";
import { TRADER_PNL_ENDPOINT_ID } from "@/lib/polymarketLive/traderPnlCompose";
import { TRADER_POSITIONS_ENDPOINT_ID } from "@/lib/polymarketLive/traderPositionsCompose";
import { chartSpecsForSheet } from "@/lib/visualizations/sheetCharts";
import { pageIdForTab, tabIdFromPage } from "@/lib/workspaceDashboardDocument";
import { newStartTabId, saveWorkspaceStartTabs } from "@/lib/workspaceStartTabs";
import {
  HOLDER_COLUMNS,
  HOLDER_PAGES,
  pullMarketHolders,
  pullTraderBundle,
  RECIPE_POLYMARKET_HOLDER_ANALYSIS,
  TRADER_ROW_LIMIT,
} from "./polymarketHolderAnalysisSource";

const CHART_PROBE_ROWS = 200;
const PNL_FILTERS = { interval: { value: "max" }, fidelity: { value: "1d" } };
/** Each trader is three pulls, and Polymarket rate-limits bursts across them. */
const TRADER_CONCURRENCY = 2;

async function mapPool(items, size, work) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await work(item);
    }
  });
  await Promise.all(lanes);
}

function shortTitle(text, max = 34) {
  const value = String(text || "").trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function traderTabName(trader) {
  const sides = trader.both ? trader.sides.map((side) => side.outcome).join(" + ") : trader.sides[0]?.outcome || "";
  return shortTitle(sides ? `${trader.label} · ${sides}` : trader.label, 40);
}

/**
 * Adds every tab the run needs in one update, so a later tab never overwrites an earlier one.
 * The landing demo keeps its tabs for this visit only.
 */
function addTabs(ctx, names, accountId) {
  const tabs = Array.isArray(ctx?.workspaceStartTabs) ? ctx.workspaceStartTabs : [];
  const added = names.map((name) => ({ id: newStartTabId(), name, blank: true }));
  const nextTabs = [...tabs, ...added];
  ctx?.setWorkspaceStartTabs?.(nextTabs);
  if (!ctx?.landingDemo) {
    saveWorkspaceStartTabs(accountId || "local", {
      welcomeRemoved: !!ctx?.welcomeTabRemoved,
      tabs: nextTabs,
      activeId: ctx?.activeWorkspaceStartTabId || null,
    });
  }
  return added.map((tab) => tab.id);
}

function tabStillOpen(ctx, tabId) {
  return (ctx?.workspaceStartTabs || []).some((tab) => tab.id === tabId);
}

function stageFor(canvas, pageId) {
  return createRunSheetStage({
    reveal: (list, extra) => canvas?.revealRunSheets?.(list, { ...extra, pageId }),
    opensChart: (item) =>
      chartSpecsForSheet({ ...item, type: "sheet", records: recordsFromRows(item.columns, (item.rows || []).slice(0, CHART_PROBE_ROWS)) }).length > 0,
  });
}

function holderSheet(side, index, meta, id) {
  return {
    id,
    title: `${side.outcome} holders`,
    columns: HOLDER_COLUMNS,
    rows: side.rows,
    rowCount: side.rows.length,
    keepAllRows: true,
    integrationId: "polymarket",
    table: "getHoldersByMarkets",
    summary: `Polymarket Live · ${side.outcome} holders · ${meta.title}`,
    query: {
      table: "getHoldersByMarkets",
      rowLimit: side.rows.length,
      filters: {
        quote_outcome: { value: index === 1 ? "no" : "yes" },
        include_pnl: { include: ["true"] },
      },
    },
    pull: {
      recipe: RECIPE_POLYMARKET_HOLDER_ANALYSIS,
      chartView: "treemap",
      ticker: meta.slug || meta.conditionId,
      conditionId: meta.conditionId,
      marketTitle: meta.title,
      ...lifePull({
        openTime: meta.openMs || undefined,
        closeTime: meta.closeMs || undefined,
        status: meta.status,
        closed: meta.closed,
        result: meta.winner,
      }),
      outcome: side.outcome,
      side: index,
    },
  };
}

function traderSheet(endpointId, part, trader, id) {
  const title = polymarketTraderJoinSheetTitle(endpointId, trader.label) || trader.label;
  return {
    id,
    title,
    columns: part.columns,
    rows: part.rows,
    rowCount: part.rows.length,
    keepAllRows: true,
    ...(endpointId === TRADER_POSITIONS_ENDPOINT_ID ? { span: "full" } : {}),
    integrationId: "polymarket",
    table: endpointId,
    query: {
      table: endpointId,
      address: trader.wallet,
      rowLimit: TRADER_ROW_LIMIT,
      ...(endpointId === TRADER_PNL_ENDPOINT_ID ? { filters: PNL_FILTERS } : {}),
    },
    pull: { recipe: RECIPE_POLYMARKET_HOLDER_ANALYSIS, address: trader.wallet },
  };
}

function partsLine(bundle) {
  const parts = [
    ["positions", bundle.positions],
    ["activity rows", bundle.activity],
    ["PnL points", bundle.pnl],
  ];
  return parts
    .map(([noun, part]) => {
      if (!part.error) return `${part.rows.length.toLocaleString()} ${noun}`;
      return /too many requests/i.test(part.error) ? `${noun} rate-limited by Polymarket` : `${noun} failed`;
    })
    .join(" · ");
}

/**
 * Save and Go: the market's Yes and No holders land on one tab with a treemap under each, then
 * each top trader gets a tab of their own with positions, activity, and PnL.
 * A replay refreshes the same tabs instead of opening new ones.
 */
export async function runPolymarketHolderAnalysis({ meta, holders, traders, canvas, ctx, close, accountId, reuse = null }) {
  const reporter = createRunReporter((feed) => canvas?.reportRun?.(feed));
  const handle = meta.slug || meta.conditionId;
  const [first = "Yes", second = "No"] = meta.outcomes || [];
  reporter.plan(
    [
      { id: "find", name: "find_market", status: "pending", args: { market: handle } },
      { id: "holders", name: "pull_holders", status: "pending", args: { outcomes: `${first}+${second}`, profit: true } },
      { id: "place", name: "place_holders", status: "pending", args: { charts: "treemap" } },
      { id: "tabs", name: "open_trader_tabs", status: "pending", args: { traders: traders.length } },
      { id: "traders", name: "pull_traders", status: "pending", args: { joins: "positions+activity+pnl" } },
    ],
    {
      title: `Polymarket holder analysis · ${handle}`,
      runningLabel: "Analyzing holders",
      doneLabel: "Holder analysis ready",
      failLabel: "Holder analysis failed",
      readyDetail: "Holders are on this tab. Each top trader has a tab of their own.",
    },
  );
  close?.();

  reporter.start("find");
  reporter.succeed("find", { result: [meta.title, meta.subtitle].filter(Boolean).join(" · ") });

  reporter.start("holders");
  let pulled = holders && !reuse ? holders : null;
  if (!pulled || pulled.pages < HOLDER_PAGES) {
    try {
      pulled = { ...(await pullMarketHolders(meta, { pages: HOLDER_PAGES, onProgress: (text) => reporter.note("holders", text) })), pages: HOLDER_PAGES };
    } catch (err) {
      if (!pulled) {
        reporter.fail("holders", err instanceof Error ? err.message : "The holders pull did not finish.");
        return;
      }
    }
  }
  const [yes, no] = pulled.sides;
  if (!yes.rows.length && !no.rows.length) {
    reporter.fail("holders", "Polymarket lists no holders for this market yet.");
    return;
  }
  reporter.succeed("holders", {
    result: `${yes.rows.length.toLocaleString()} ${yes.outcome} and ${no.rows.length.toLocaleString()} ${no.outcome} holders${
      pulled.bothCount ? ` · ${pulled.bothCount} hold both sides` : ""
    }`,
  });

  const onTab = String(canvas?.pageId || "").startsWith("welcome:");
  let marketPageId = reuse?.marketPageId || "";
  let traderTabIds = reuse?.traderTabIds || [];
  if (!reuse) {
    const names = [...(onTab ? [] : [shortTitle(`Holders · ${meta.title}`)]), ...traders.map(traderTabName)];
    const ids = addTabs(ctx, names, accountId);
    marketPageId = onTab ? canvas.pageId : pageIdForTab(ids[0]);
    traderTabIds = onTab ? ids : ids.slice(1);
    if (!onTab) canvas?.requestTab?.(ids[0]);
  }
  canvas?.armReplay?.(() =>
    runPolymarketHolderAnalysis({ meta, holders: null, traders, canvas, ctx, close: null, accountId, reuse: { marketPageId, traderTabIds } }),
  );

  reporter.start("place");
  const occupied = new Set(((canvas?.blocksByPage || {})[marketPageId] || []).map((block) => block?.id).filter(Boolean));
  const claimed = new Map();
  const base = `run-recipe-holders-${handle.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 60)}`;
  const holderStage = stageFor(canvas, marketPageId);
  const sheets = [yes, no].map((side, index) => holderSheet(side, index, meta, reuse ? `${base}-${index}` : claimSheetId(`${base}-${index}`, occupied, claimed)));
  for (const sheet of sheets) holderStage.put(sheet);
  await holderStage.settle();
  reporter.succeed("place", { result: `${sheets.map((sheet) => sheet.title).join(" and ")} with a treemap under each` });

  reporter.start("tabs");
  const live = traders.map((trader, index) => ({ trader, tabId: traderTabIds[index] })).filter((item) => item.tabId);
  reporter.succeed("tabs", {
    result: live.length
      ? live.map((item) => item.trader.label).join(", ")
      : "The trader tabs were closed, so only the holders were refreshed.",
  });

  reporter.start("traders");
  reporter.setChildren(
    "traders",
    live.map(({ trader }) => ({
      id: trader.wallet,
      name: trader.label,
      status: "pending",
      args: { sides: trader.sides.map((side) => side.outcome).join("+") },
    })),
  );
  let failed = 0;
  await mapPool(
    live,
    TRADER_CONCURRENCY,
    async ({ trader, tabId }) => {
      reporter.patchChild("traders", trader.wallet, { status: "running", result: "Pulling positions, activity, and PnL" });
      const bundle = await pullTraderBundle(trader, {
        onWait: (seconds) => reporter.patchChild("traders", trader.wallet, { result: `Polymarket is busy · retrying in ${seconds}s` }),
      });
      if (reuse && !tabStillOpen(ctx, tabId)) return;
      const pageId = pageIdForTab(tabIdFromPage(tabId));
      const stage = stageFor(canvas, pageId);
      const wallet = trader.wallet.toLowerCase();
      const parts = [
        [TRADER_POSITIONS_ENDPOINT_ID, bundle.positions, "positions"],
        [TRADER_ACTIVITY_ENDPOINT_ID, bundle.activity, "activity"],
        [TRADER_PNL_ENDPOINT_ID, bundle.pnl, "pnl"],
      ];
      for (const [endpointId, part, key] of parts) {
        if (!part.rows.length) continue;
        stage.put(traderSheet(endpointId, part, trader, `run-recipe-holder-${key}-${wallet}`));
      }
      await stage.settle();
      const empty = parts.every(([, part]) => !part.rows.length);
      if (empty) failed += 1;
      reporter.patchChild("traders", trader.wallet, { status: empty ? "error" : "success", result: partsLine(bundle) });
    },
  );
  if (live.length && failed === live.length) {
    reporter.fail("traders", "None of the trader pulls returned rows.");
    return;
  }
  reporter.succeed("traders", {
    result: `${(live.length - failed).toLocaleString()} of ${live.length.toLocaleString()} trader tabs filled`,
  });
  reporter.finish();
}
