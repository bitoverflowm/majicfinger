import { displayCell } from "@/components/dashboardComposer/integrationRunSheets";
import { loadKalshiLiveDirect, loadKalshiLiveEventMarkets, loadKalshiLiveMarketByTicker, loadKalshiLiveMarketsForScope } from "@/components/dashboardComposer/integrationBuildCatalog";
import { loadPolymarketLiveTable } from "@/components/dashboardComposer/polymarketLiveBuild";
import { defaultPolymarketQuoteFilters } from "@/lib/polymarketLive/polymarketQuoteQuery";
import { defaultPolymarketBiggestWinnersFilters } from "@/lib/polymarketLive/biggestWinnersCompose";
import { defaultPolymarketLeaderboardFilters } from "@/lib/polymarketLive/traderLeaderboardCompose";
import { sheetAssetIds } from "@/lib/realtime/sheetRealtime";
import { rehydrateSheetFromProvenance } from "@/lib/rehydrateSheetFromProvenance";

function rowValue(row, column) {
  if (!row || typeof row !== "object") return "";
  const id = String(column?.id || "");
  if (id && row[id] != null && row[id] !== "") return row[id];
  const title = String(column?.title || "").trim();
  if (title && row[title] != null && row[title] !== "") return row[title];
  return "";
}

/** Project a fresh pull onto the columns already on the sheet. */
export function cellsFromQueryRows(columns, rows) {
  const cells = {};
  (Array.isArray(rows) ? rows : []).forEach((row, rowIndex) => {
    (Array.isArray(columns) ? columns : []).forEach((column, columnIndex) => {
      const text = displayCell(rowValue(row, column), column);
      if (text) cells[`${columnIndex},${rowIndex}`] = text;
    });
  });
  return cells;
}

/** compose = Athena provenance. polymarket and kalshiLive = the live builders. */
export function sheetReplayKind(block) {
  if (!block || block.type !== "sheet" || block.enrichment) return "";
  const provenance = block.provenance;
  if (provenance?.kind === "compose" && provenance.lake && provenance.table) return "compose";
  const integration = String(block.integrationId || provenance?.integrationId || "");
  const table = String(block.table || block.pull?.table || provenance?.table || "");
  if (integration === "polymarket" && table) return "polymarket";
  if (integration === "kalshiLive" && table) return "kalshiLive";
  return "";
}

/** A saved Polymarket sheet can be replayed from its pull, or from the token column already on the grid. */
export function polymarketReplayPick(block) {
  const pull = block?.pull || {};
  const ticker = String(pull.ticker || "").trim();
  const tokenIds = sheetAssetIds(block);
  if (!ticker && !tokenIds.length) return null;
  const outcome = String(pull.outcome || "").trim();
  const rawTitle = String(block?.pull?.marketTitle || block?.title || "").split("·").pop()?.trim() || "";
  const title = /^(price history|token price history|trade history|order book|orderbook|tick size|open interest|top holders|market price|midpoint|spreads|last trade)$/i.test(rawTitle)
    ? ""
    : rawTitle;
  return {
    slug: /^\d+$/.test(ticker) ? "" : ticker,
    entityId: /^\d+$/.test(ticker) ? ticker : "",
    tokenIds,
    ...(outcome ? { outcomes: [outcome] } : {}),
    title,
    closed: pull.closed === true,
    outcome,
    startedAt: pull.openAt || null,
    endedAt: pull.closeAt || null,
    closesAt: pull.closeAt || null,
  };
}

function sheetAlreadyHasRows(block) {
  if (Number(block?.rowCount) > 0) return true;
  return Object.keys(block?.cells || {}).length > 0;
}

async function replayPolymarket(block, planLimit) {
  const table = String(block.table || block.pull?.table || "");
  const pick = polymarketReplayPick(block);
  const packed = await loadPolymarketLiveTable(table, pick ? [pick] : [], {
    rowLimit: planLimit,
    planLimit,
    filters: table === "getTraderLeaderboard"
      ? defaultPolymarketLeaderboardFilters()
      : table === "getBiggestWinners"
        ? defaultPolymarketBiggestWinnersFilters()
        : defaultPolymarketQuoteFilters(table),
  });
  return packed?.rows || [];
}

async function replayKalshi(block, planLimit) {
  const table = String(block.table || block.pull?.table || "");
  const pull = block.pull || {};
  const limit = planLimit;
  if (table === "markets" && pull.eventTicker && !pull.seriesTicker) {
    const result = await loadKalshiLiveEventMarkets(pull.eventTicker, limit);
    return result?.rows || [];
  }
  if (table === "markets" && (pull.seriesTicker || pull.eventTickers || pull.seriesTickers)) {
    const eventTicker = pull.eventTicker || (Array.isArray(pull.eventTickers) ? pull.eventTickers[0] : "");
    const seriesTicker = pull.seriesTicker || (Array.isArray(pull.seriesTickers) ? pull.seriesTickers[0] : "");
    return loadKalshiLiveMarketsForScope({ seriesTicker, eventTicker, limit });
  }
  if (table === "markets" && pull.ticker) {
    const row = await loadKalshiLiveMarketByTicker(pull.ticker);
    return row ? [row] : [];
  }
  const result = await loadKalshiLiveDirect(table, { ...pull, limit });
  return result?.rows || [];
}

async function replayCompose(block, planLimit, onPhase) {
  const { rows } = await rehydrateSheetFromProvenance({
    targetSheetId: block.id,
    provenance: block.provenance,
    dataSheets: {
      [block.id]: {
        name: block.title || block.id,
        provenance: block.provenance,
        fullRowCount: block.rowCount || planLimit,
      },
    },
    maxRows: planLimit,
    pollOpts: onPhase ? { onPhase } : undefined,
  });
  return rows || [];
}

async function rowsForSheet(block, planLimit, onPhase) {
  const kind = sheetReplayKind(block);
  if (kind === "compose") return replayCompose(block, planLimit, onPhase);
  if (kind === "polymarket") return replayPolymarket(block, planLimit);
  if (kind === "kalshiLive") return replayKalshi(block, planLimit);
  return [];
}

/**
 * Re-run every saved query on this tab and hand the new cells back to the canvas.
 * @param {object[]} blocks
 * @param {{ planLimit: number, reporter: { plan: Function, start: Function, note: Function, succeed: Function, miss: Function, fail: Function, finish: Function }, onSheet: Function }} options
 */
export async function replayTabSheets(blocks, { planLimit, reporter, onSheet }) {
  const sheets = (blocks || []).filter((block) => sheetReplayKind(block));
  const limit = Math.max(1, Math.floor(Number(planLimit) || 1));
  if (!sheets.length) {
    reporter.plan(
      [{ id: "replay", name: "replay_tab", status: "pending", args: { sheets: 0 } }],
      { title: "Replay queries" },
    );
    reporter.fail("replay", "No queries on this tab");
    return;
  }
  reporter.plan(
    sheets.map((block) => ({
      id: block.id,
      name: `replay_${block.table || block.provenance?.table || "sheet"}`,
      status: "pending",
      args: { table: block.table || block.provenance?.table || "", title: block.title || "Sheet", limit },
    })),
    { title: "Replay queries" },
  );
  for (const block of sheets) {
    reporter.start(block.id);
    try {
      const rows = await rowsForSheet(block, limit, (info) => {
        const count = Number(info?.rowCount ?? info?.processed);
        if (Number.isFinite(count)) reporter.note(block.id, `${count.toLocaleString()} rows`);
      });
      if (!rows.length && sheetAlreadyHasRows(block)) {
        reporter.miss(block.id, "This query returned no rows, so the sheet was left unchanged.");
        continue;
      }
      const cells = cellsFromQueryRows(block.columns, rows);
      onSheet?.(block.id, cells, rows.length);
      reporter.succeed(block.id, { result: `${rows.length.toLocaleString()} rows` });
    } catch (error) {
      reporter.miss(block.id, error instanceof Error ? error.message : "Replay failed");
    }
  }
  reporter.finish();
}
