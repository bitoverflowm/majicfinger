import { createRunReporter } from "@/components/dashboardComposer/integrationRunFeed";
import { claimSheetId, recordsFromRows } from "@/components/dashboardComposer/integrationRunSheets";
import { polymarketTraderJoinSheetTitle } from "@/components/dashboardComposer/polymarketLiveBuild";
import { createRunSheetStage } from "@/components/dashboardComposer/runSheetStage";
import { isFeatureTipDismissed } from "@/components/ui/feature-tip";
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
  NEW_WALLET_DAYS,
  PROTOCOL_CONTRACT,
  pullMarketHolders,
  pullTraderBundle,
  RECIPE_POLYMARKET_HOLDER_ANALYSIS,
  TRADER_ROW_LIMIT,
} from "./polymarketHolderAnalysisSource";

export const HOLDER_TOUR_ID = "recipe-polymarket-holder-analysis-tour";

const CHART_PROBE_ROWS = 200;
const PNL_FILTERS = { interval: { value: "max" }, fidelity: { value: "1d" } };
/** Each trader is three pulls, and Polymarket rate-limits bursts across them. */
const TRADER_CONCURRENCY = 2;
/** After a tab switch, before its first sheet lands. */
const TAB_SETTLE_MS = 280;
/** Between one trader's tab and the next, so each tab is seen filled. */
const TRADER_PAUSE_MS = 700;
/** How long a clean run's card stays up before the tour takes over. */
const HAND_OFF_MS = 1400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs at most `size` tasks at once, in the order they were queued. */
function limiter(size) {
  let active = 0;
  const waiting = [];
  const next = () => {
    if (active >= size || !waiting.length) return;
    active += 1;
    const { task, resolve, reject } = waiting.shift();
    task()
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        next();
      });
  };
  return (task) =>
    new Promise((resolve, reject) => {
      waiting.push({ task, resolve, reject });
      next();
    });
}

/**
 * Takes the user to each tab as the run fills it. Stops for good once the user picks a tab of
 * their own, so the run never pulls them away from where they went.
 */
function createFollower(canvas) {
  const current = () => canvas?.getPageId?.() || "";
  let following = typeof canvas?.requestTab === "function" && typeof canvas?.getPageId === "function";
  let at = current();
  return {
    async show(pageId) {
      if (!following || !pageId) return;
      if (current() !== at) {
        following = false;
        return;
      }
      if (pageId === at) return;
      canvas.requestTab(tabIdFromPage(pageId));
      at = pageId;
      for (let waited = 0; current() !== pageId && waited < 2000; waited += 50) await sleep(50);
      await sleep(TAB_SETTLE_MS);
    },
  };
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
  if (parts.every(([, part]) => PROTOCOL_CONTRACT.test(part.error || ""))) {
    return "A Polymarket contract, not a trader, so it has no positions, activity, or PnL";
  }
  return parts
    .map(([noun, part]) => {
      if (!part.error) return `${part.rows.length.toLocaleString()} ${noun}`;
      return /too many requests/i.test(part.error) ? `${noun} rate-limited by Polymarket` : `${noun} failed`;
    })
    .join(" · ");
}

/** Polymarket's own contracts keep their rows, named so they don't read as a trader. */
function labelContracts(side, contracts) {
  const wallets = new Set(contracts.map((trader) => String(trader.wallet || "").toLowerCase()));
  if (!wallets.size) return side;
  return {
    ...side,
    rows: side.rows.map((row) => (wallets.has(row.proxy_wallet) ? { ...row, name: `Polymarket contract · ${row.name}` } : row)),
  };
}

function names(list) {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** The first placed trader from `start` on that has `key`, so tour steps can visit different tabs. */
function pickTrader(placed, start, key) {
  for (let step = 0; step < placed.length; step += 1) {
    const item = placed[(start + step) % placed.length];
    if (item.ids[key]) return item;
  }
  return null;
}

function holderTour({ runId, marketPageId, sheets, sides, bothCount, newCount, traders, placed }) {
  const [yes, no] = sides;
  const bothTraders = traders.filter((trader) => trader.both).map((trader) => trader.label);
  const newTraders = traders.filter((trader) => trader.isNew).map((trader) => trader.label);
  const steps = [
    {
      pageId: marketPageId,
      targets: [{ sheet: sheets[0].id, part: "sheet" }],
      title: `${yes.outcome} holders`,
      description: `Everyone holding ${yes.outcome}, largest first, with their shares, share of the listed total, value, average price, and PnL.`,
    },
    {
      pageId: marketPageId,
      targets: [{ sheet: sheets[1].id, part: "sheet" }],
      title: `${no.outcome} holders`,
      description: `The same table for ${no.outcome}, so you can compare who's betting on each side.`,
    },
    {
      pageId: marketPageId,
      targets: sheets.map((sheet) => ({ sheet: sheet.id, part: "charts" })),
      title: "How concentrated each side is",
      description: "Each tile is one holder, sized by shares. A few big tiles means a handful of wallets control that side. Hover a tile for its details.",
    },
    {
      pageId: marketPageId,
      targets: sheets.map((sheet) => ({ sheet: sheet.id, part: "charts" })),
      title: "Wallets on both sides",
      description: bothCount
        ? [
            `${bothCount.toLocaleString()} ${bothCount === 1 ? "wallet holds" : "wallets hold"} both ${yes.outcome} and ${no.outcome}. They're outlined in amber here and checked in the Holds both sides column.`,
            ...(bothTraders.length ? [`Of the top ${traders.length}, ${names(bothTraders)} ${bothTraders.length === 1 ? "does" : "do"} too.`] : []),
          ]
        : `No listed wallet holds both ${yes.outcome} and ${no.outcome}. When one does, it's outlined in amber here and checked in the Holds both sides column.`,
    },
    {
      pageId: marketPageId,
      targets: sheets.map((sheet) => ({ sheet: sheet.id, part: "charts" })),
      title: "New wallets",
      description: newCount
        ? [
            `${newCount.toLocaleString()} ${newCount === 1 ? "wallet was" : "wallets were"} set up in the last ${NEW_WALLET_DAYS} days. Each has a violet dot here, and the tables show New wallet, Age (days), and Wallet created.`,
            ...(newTraders.length ? [`Of the top ${traders.length}, ${names(newTraders)} ${newTraders.length === 1 ? "is" : "are"} new.`] : []),
          ]
        : `No listed wallet is younger than ${NEW_WALLET_DAYS} days. The tables still show each wallet's Age (days) and when it was created.`,
    },
  ];
  const positions = pickTrader(placed, 0, "positions");
  if (positions) {
    steps.push({
      pageId: positions.pageId,
      targets: [{ sheet: positions.ids.positions, part: "all" }],
      title: `${positions.trader.label}'s tab`,
      description: [
        `Each of the top ${placed.length} traders gets a tab. It starts with every open position, and the treemap shows where their money sits.`,
        "Holds both sides flags markets where they own both outcomes.",
      ],
    });
  }
  const activity = pickTrader(placed, 1, "activity");
  if (activity) {
    steps.push({
      pageId: activity.pageId,
      targets: [{ sheet: activity.ids.activity, part: "all" }],
      title: `${activity.trader.label}'s activity`,
      description: "Their latest trades, splits, merges, and redemptions, with charts of when and how much they trade.",
    });
  }
  const pnl = pickTrader(placed, 2, "pnl");
  if (pnl) {
    steps.push({
      pageId: pnl.pageId,
      targets: [{ sheet: pnl.ids.pnl, part: "charts" }],
      title: `${pnl.trader.label}'s PnL`,
      description: `Profit and loss over time. Switch between the trader tabs to compare all ${placed.length}.`,
    });
  }
  return { id: HOLDER_TOUR_ID, runId, steps };
}

/**
 * Save and Go: the market's Yes and No holders land on one tab with a treemap under each, then
 * each top trader gets a tab of their own with positions, activity, and PnL. The run takes the
 * user to each tab as it fills, then hands off to a short tour of what's where.
 * A replay refreshes the same tabs instead of opening new ones.
 */
export async function runPolymarketHolderAnalysis({ meta, holders, traders, contracts = [], canvas, ctx, close, accountId, reuse = null }) {
  let runId = "";
  const reporter = createRunReporter((feed) => {
    runId = feed.id;
    canvas?.reportRun?.(feed);
  });
  const handle = meta.slug || meta.conditionId;
  const [first = "Yes", second = "No"] = meta.outcomes || [];
  const tourDue = !reuse && !isFeatureTipDismissed(HOLDER_TOUR_ID, accountId || undefined);
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
      readyDetail: tourDue
        ? "The holders are on the market tab and each top trader has a tab. Take a quick tour of what's where."
        : "The holders are on the market tab and each top trader has a tab of their own.",
      viewLabel: tourDue ? "Show me around" : undefined,
      dock: "side",
      partialOk: true,
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
  const [yes, no] = pulled.sides.map((side) => labelContracts(side, contracts));
  if (!yes.rows.length && !no.rows.length) {
    reporter.fail("holders", "Polymarket lists no holders for this market yet.");
    return;
  }
  reporter.succeed("holders", {
    result: `${yes.rows.length.toLocaleString()} ${yes.outcome} and ${no.rows.length.toLocaleString()} ${no.outcome} holders${
      pulled.bothCount ? ` · ${pulled.bothCount} hold both sides` : ""
    }${pulled.newCount ? ` · ${pulled.newCount} new ${pulled.newCount === 1 ? "wallet" : "wallets"}` : ""}`,
  });

  const onTab = String(canvas?.pageId || "").startsWith("welcome:");
  let marketPageId = reuse?.marketPageId || "";
  let traderTabIds = reuse?.traderTabIds || [];
  if (!reuse) {
    const tabNames = [...(onTab ? [] : [shortTitle(`Holders · ${meta.title}`)]), ...traders.map(traderTabName)];
    const ids = addTabs(ctx, tabNames, accountId);
    marketPageId = onTab ? canvas.pageId : pageIdForTab(ids[0]);
    traderTabIds = onTab ? ids : ids.slice(1);
  }
  canvas?.armReplay?.(() =>
    runPolymarketHolderAnalysis({ meta, holders: null, traders, contracts, canvas, ctx, close: null, accountId, reuse: { marketPageId, traderTabIds } }),
  );
  const follower = createFollower(canvas);
  await follower.show(marketPageId);

  reporter.start("place");
  const occupied = new Set(((canvas?.blocksByPage || {})[marketPageId] || []).map((block) => block?.id).filter(Boolean));
  const claimed = new Map();
  const base = `run-recipe-holders-${handle.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 60)}`;
  const holderStage = stageFor(canvas, marketPageId);
  const sheets = [yes, no].map((side, index) => holderSheet(side, index, meta, reuse ? `${base}-${index}` : claimSheetId(`${base}-${index}`, occupied, claimed)));
  for (const sheet of sheets) await holderStage.put(sheet);
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
  const pull = limiter(TRADER_CONCURRENCY);
  const bundles = live.map(({ trader }) =>
    pull(async () => {
      reporter.patchChild("traders", trader.wallet, { status: "running", result: "Pulling positions, activity, and PnL" });
      const bundle = await pullTraderBundle(trader, {
        onWait: (seconds) => reporter.patchChild("traders", trader.wallet, { result: `Polymarket is busy · retrying in ${seconds}s` }),
      });
      reporter.patchChild("traders", trader.wallet, { result: `${partsLine(bundle)} · placing next` });
      return bundle;
    }),
  );

  let failed = 0;
  const placed = [];
  for (const [at, { trader, tabId }] of live.entries()) {
    const bundle = await bundles[at];
    if (reuse && !tabStillOpen(ctx, tabId)) continue;
    const pageId = pageIdForTab(tabIdFromPage(tabId));
    const wallet = trader.wallet.toLowerCase();
    const parts = [
      [TRADER_POSITIONS_ENDPOINT_ID, bundle.positions, "positions"],
      [TRADER_ACTIVITY_ENDPOINT_ID, bundle.activity, "activity"],
      [TRADER_PNL_ENDPOINT_ID, bundle.pnl, "pnl"],
    ].filter(([, part]) => part.rows.length);
    if (!parts.length) {
      failed += 1;
      reporter.patchChild("traders", trader.wallet, { status: "error", result: partsLine(bundle) });
      continue;
    }
    reporter.patchChild("traders", trader.wallet, { result: `Placing ${partsLine(bundle)}` });
    await follower.show(pageId);
    const stage = stageFor(canvas, pageId);
    const ids = {};
    for (const [endpointId, part, key] of parts) {
      ids[key] = `run-recipe-holder-${key}-${wallet}`;
      await stage.put(traderSheet(endpointId, part, trader, ids[key]));
    }
    placed.push({ trader, pageId, ids });
    reporter.patchChild("traders", trader.wallet, { status: "success", result: partsLine(bundle) });
    if (at < live.length - 1) await sleep(TRADER_PAUSE_MS);
  }
  if (live.length && failed === live.length) {
    reporter.fail("traders", "None of the trader pulls returned rows.");
    return;
  }
  reporter.succeed("traders", {
    result: `${(live.length - failed).toLocaleString()} of ${live.length.toLocaleString()} trader tabs filled`,
  });
  await follower.show(marketPageId);
  reporter.finish();

  if (!tourDue) return;
  canvas?.startTour?.(
    holderTour({
      runId,
      marketPageId,
      sheets,
      sides: [yes, no],
      bothCount: pulled.bothCount || 0,
      newCount: pulled.newCount || 0,
      traders: live.map((item) => item.trader),
      placed,
    }),
  );
  if (failed) return;
  await sleep(HAND_OFF_MS);
  canvas?.reportRun?.((current) => (current?.id === runId ? null : current));
}
