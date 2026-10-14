import { displayCell, recordsFromRows } from "@/components/dashboardComposer/integrationRunSheets";
import { loadKalshiLiveDirect, loadKalshiLiveEventMarkets, loadKalshiLiveMarketByTicker, loadKalshiLiveMarketsForScope } from "@/components/dashboardComposer/integrationBuildCatalog";
import { loadPolymarketLiveTable, loadPolymarketTraderJoin, polymarketTraderEntities, polymarketTraderJoinSheetTitle } from "@/components/dashboardComposer/polymarketLiveBuild";
import { defaultPolymarketQuoteFilters } from "@/lib/polymarketLive/polymarketQuoteQuery";
import { defaultPolymarketBiggestWinnersFilters } from "@/lib/polymarketLive/biggestWinnersCompose";
import { defaultPolymarketLeaderboardFilters } from "@/lib/polymarketLive/traderLeaderboardCompose";
import { sheetAssetIds } from "@/lib/realtime/sheetRealtime";
import { backfillTraderQueries } from "@/lib/workspaceDashboardDocument";
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

const TRADER_REPLAY_TABLES = new Set([
  "getTraderPositions",
  "getTraderPnlSeries",
  "getTraderActivity",
  "getTraderByAddress",
  "getPublicProfiles",
]);

function recordAddress(block) {
  const rows = Array.isArray(block?.records) ? block.records : [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const key of ["user", "proxy_wallet", "user_id"]) {
      const value = String(row[key] || "").trim();
      if (/^0x[a-fA-F0-9]{40}$/.test(value)) return value;
    }
  }
  return "";
}

function columnCell(block, columnId, row = 0) {
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const index = columns.findIndex((column) => column?.id === columnId);
  if (index < 0) return "";
  return String(block?.cells?.[`${index},${row}`] || "").trim();
}

function fieldValue(block, columnId) {
  const rows = Array.isArray(block?.records) ? block.records : [];
  for (const row of rows) {
    const value = String(row?.[columnId] ?? "").trim();
    if (value) return value;
  }
  return columnCell(block, columnId);
}

function walletText(value) {
  const text = String(value || "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(text) ? text : "";
}

/** Copy a missing wallet onto the query. The id is only a leftover from sheets saved before queries kept it. */
export function repairSheetQuery(block) {
  const query = block?.query && typeof block.query === "object" ? { ...block.query } : {};
  if (!walletText(query.address)) {
    const fromPull = walletText(block?.pull?.address);
    if (fromPull) query.address = fromPull;
  }
  if (!walletText(query.address) && TRADER_REPLAY_TABLES.has(String(block?.table || block?.pull?.table || ""))) {
    const fromId = String(block?.id || "").match(/0x[a-fA-F0-9]{40}/);
    if (fromId) query.address = fromId[0];
  }
  return query;
}

const TRADER_JOIN_SOURCES = new Set([
  "getTraderLeaderboard",
  "getBiggestWinners",
  "getHoldersByMarkets",
  "getTraderByAddress",
  "getPublicProfiles",
]);

function traderJoinFilters(table) {
  if (table === "getTraderPnlSeries") return { interval: { value: "max" }, fidelity: { value: "1d" } };
  return null;
}

/**
 * Parent query records which joins were run. Each child query records the wallet and the parent.
 * @param {object[]} sheets
 * @param {string} parentTable
 */
export function attachJoinRegistry(sheets, parentTable) {
  const list = (Array.isArray(sheets) ? sheets : []).map((sheet) => ({
    ...sheet,
    query: { ...(sheet?.query || {}) },
  }));
  const parent = list.find((sheet) => sheet.table === parentTable && !walletText(sheet.pull?.address || sheet.query?.address))
    || list.find((sheet) => sheet.table === parentTable)
    || null;
  if (!parent) return list;
  const joins = [];
  const seen = new Set();
  for (const sheet of list) {
    if (sheet.id === parent.id) continue;
    const address = walletText(sheet.pull?.address || sheet.query?.address);
    if (!TRADER_REPLAY_TABLES.has(sheet.table) || !address) continue;
    if (!seen.has(sheet.table)) {
      seen.add(sheet.table);
      const filters = traderJoinFilters(sheet.table);
      joins.push({ table: sheet.table, anchor: "trader", ...(filters ? { filters } : {}) });
    }
    sheet.query = { ...sheet.query, parentSheetId: parent.id, address };
  }
  if (joins.length) parent.query = { ...(parent.query || {}), joins };
  return list;
}

function countedRows(block) {
  const stored = Math.floor(Number(block?.rowCount) || 0);
  if (stored > 0) return stored;
  let max = -1;
  for (const key of Object.keys(block?.cells || {})) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row) && row > max) max = row;
  }
  return max >= 0 ? max + 1 : 0;
}

/**
 * The request a saved sheet should replay.
 * The query is the request. A trader sheet with no saved limit uses the plan row limit.
 * A parent sheet replays the row count already stored on its query.
 */
export function sheetReplayRequest(block) {
  const stored = block?.query && typeof block.query === "object" ? block.query : {};
  const table = String(block?.table || block?.pull?.table || "");
  const storedLimit = Math.floor(Number(stored.rowLimit) || 0);
  const traderSheet = TRADER_REPLAY_TABLES.has(table);
  const rowLimit = storedLimit > 0 ? storedLimit : traderSheet ? 0 : countedRows(block);
  let filters = stored.filters && typeof stored.filters === "object" ? stored.filters : null;
  if (!filters && table === "getTraderLeaderboard") {
    const inferred = {};
    for (const id of ["time_period", "category", "sort_by"]) {
      const value = fieldValue(block, id);
      if (value) inferred[id] = { value };
    }
    if (Object.keys(inferred).length) filters = { ...defaultPolymarketLeaderboardFilters(), ...inferred };
  }
  if (!filters && table === "getTraderPnlSeries") {
    filters = { interval: { value: "max" }, fidelity: { value: "1d" } };
  }
  const rawAddress = String(stored.address || block?.pull?.address || "").trim()
    || (traderSheet
      ? recordAddress(block) || fieldValue(block, "user") || fieldValue(block, "proxy_wallet") || fieldValue(block, "user_id")
      : "");
  return {
    rowLimit,
    filters,
    sortKeys: Array.isArray(stored.sortKeys) ? stored.sortKeys : [],
    address: /^0x[a-fA-F0-9]{40}$/.test(rawAddress) ? rawAddress : "",
  };
}

async function replayPolymarket(block, planLimit) {
  const table = String(block.table || block.pull?.table || "");
  const request = sheetReplayRequest(block);
  const pick = polymarketReplayPick(block);
  const picks = [];
  if (pick) picks.push(pick);
  else if (request.address) picks.push({ kind: "profile", address: request.address, id: `profile:${request.address}` });
  const rowLimit = request.rowLimit > 0 ? Math.min(request.rowLimit, planLimit) : planLimit;
  const packed = await loadPolymarketLiveTable(table, picks, {
    rowLimit,
    planLimit: rowLimit,
    sorts: request.sortKeys,
    filters: request.filters
      || (table === "getTraderLeaderboard"
        ? defaultPolymarketLeaderboardFilters()
        : table === "getBiggestWinners"
          ? defaultPolymarketBiggestWinnersFilters()
          : table === "getTraderPnlSeries" || table === "getTraderPositions" || table === "getTraderActivity"
            ? null
            : defaultPolymarketQuoteFilters(table)),
  });
  return packed?.rows || [];
}

async function replayKalshi(block, planLimit) {
  const table = String(block.table || block.pull?.table || "");
  const pull = block.pull || {};
  const asked = sheetReplayRequest(block).rowLimit;
  const limit = asked > 0 ? Math.min(asked, planLimit) : planLimit;
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

function joinsForSource(source) {
  return Array.isArray(source?.query?.joins)
    ? source.query.joins.filter((join) => join?.table && join.anchor !== "market")
    : [];
}

function claimChildren(sheets, joins, claimed) {
  const tables = new Set(joins.map((join) => join.table));
  for (const sheet of sheets) {
    if (tables.has(sheet.table)) claimed.add(sheet.id);
  }
}

function takeChildSheet(sheets, table, wallet, claimed) {
  const key = String(wallet || "").toLowerCase();
  const open = sheets.filter((sheet) => sheet.table === table && !claimed.has(sheet.id));
  return open.find((sheet) => String(sheet.query?.address || "").toLowerCase() === key) || open[0] || null;
}

/**
 * Re-run every saved query on this tab.
 * A parent is replayed from its query. Registered joins then run once per wallet on those rows.
 * @param {object[]} blocks
 * @param {{ planLimit: number, reporter: { plan: Function, start: Function, note: Function, succeed: Function, miss: Function, fail: Function, finish: Function }, onSheet: Function }} options
 */
export async function replayTabSheets(blocks, { planLimit, reporter, onSheet }) {
  const sheets = backfillTraderQueries(
    (blocks || []).filter((block) => sheetReplayKind(block)).map((block) => {
      const query = block.query && typeof block.query === "object" ? { ...block.query } : {};
      if (Array.isArray(query.joins)) query.joins = query.joins.map((join) => ({ ...join }));
      return {
        ...block,
        query,
        ...(block.pull && typeof block.pull === "object" ? { pull: { ...block.pull } } : {}),
      };
    }),
  );
  const limit = Math.max(1, Math.floor(Number(planLimit) || 1));
  if (!sheets.length) {
    reporter.plan(
      [{ id: "replay", name: "replay_tab", status: "pending", args: { sheets: 0 } }],
      { title: "Replay queries" },
    );
    reporter.fail("replay", "No queries on this tab");
    return;
  }
  const claimed = new Set();
  const sources = sheets.filter((sheet) => TRADER_JOIN_SOURCES.has(sheet.table));
  for (const source of sources) {
    const joins = joinsForSource(source);
    if (joins.length) claimChildren(sheets, joins, claimed);
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

  const publish = (id, columns, rows, query, extra) => {
    const records = recordsFromRows(columns, rows);
    const cells = records.length ? {} : cellsFromQueryRows(columns, rows);
    onSheet?.(id, cells, rows.length, records, query, extra);
  };

  const usedChildren = new Set();
  for (const source of sources) {
    const prepared = { ...source, query: repairSheetQuery(source) };
    const request = sheetReplayRequest(prepared);
    const joins = joinsForSource(prepared);
    reporter.start(source.id);
    let rows = [];
    try {
      rows = await rowsForSheet(prepared, limit, (info) => {
        const count = Number(info?.rowCount ?? info?.processed);
        if (Number.isFinite(count)) reporter.note(source.id, `${count.toLocaleString()} rows`);
      });
      if (!rows.length && sheetAlreadyHasRows(source)) {
        reporter.miss(source.id, "This query returned no rows, so the sheet was left unchanged.");
      } else {
        const usedLimit = request.rowLimit > 0 ? Math.min(request.rowLimit, limit) : limit;
        publish(source.id, source.columns, rows, {
          table: source.table,
          rowLimit: usedLimit,
          ...(request.filters ? { filters: request.filters } : {}),
          ...(request.sortKeys.length ? { sortKeys: request.sortKeys } : {}),
          ...(joins.length ? { joins } : {}),
        });
        reporter.succeed(source.id, { result: `${rows.length.toLocaleString()} rows` });
      }
    } catch (error) {
      reporter.miss(source.id, error instanceof Error ? error.message : "Replay failed");
    }
    const people = polymarketTraderEntities(rows);
    if (!people.length && joins.length) {
      for (const join of joins) {
        for (const child of sheets) {
          if (child.table !== join.table || usedChildren.has(child.id)) continue;
          usedChildren.add(child.id);
          reporter.miss(child.id, "The replayed rows have no trader wallet to join.");
        }
      }
    }
    for (const join of joins) {
      const filters = join.filters || traderJoinFilters(join.table);
      for (const person of people) {
        const wallet = person.pick.address;
        const child = takeChildSheet(sheets, join.table, wallet, usedChildren);
        const id = child?.id || `run-live-${join.table}-${wallet}`;
        if (child) usedChildren.add(child.id);
        reporter.start(id);
        try {
          const result = await loadPolymarketTraderJoin(join.table, person.pick, {
            rowLimit: limit,
            planLimit: limit,
            ...(filters ? { filters } : {}),
          });
          const columns = child?.columns?.length ? child.columns : result.columns || [];
          const title = polymarketTraderJoinSheetTitle(join.table, person.label) || child?.title || "";
          publish(id, columns, result.rows || [], {
            table: join.table,
            rowLimit: limit,
            address: wallet,
            parentSheetId: source.id,
            ...(filters ? { filters } : {}),
          }, {
            title,
            columns,
            rows: result.rows || [],
            table: join.table,
            integrationId: source.integrationId || "polymarket",
          });
          reporter.succeed(id, { result: `${(result.rows || []).length.toLocaleString()} rows` });
        } catch (error) {
          reporter.miss(id, error instanceof Error ? error.message : "Replay failed");
        }
      }
    }
  }

  for (const block of sheets) {
    if (sources.some((source) => source.id === block.id) || usedChildren.has(block.id)) continue;
    if (claimed.has(block.id) && sources.length) continue;
    const prepared = { ...block, query: repairSheetQuery(block) };
    const request = sheetReplayRequest(prepared);
    reporter.start(block.id);
    try {
      const rows = await rowsForSheet(prepared, limit, (info) => {
        const count = Number(info?.rowCount ?? info?.processed);
        if (Number.isFinite(count)) reporter.note(block.id, `${count.toLocaleString()} rows`);
      });
      if (!rows.length && sheetAlreadyHasRows(block)) {
        reporter.miss(block.id, "This query returned no rows, so the sheet was left unchanged.");
        continue;
      }
      const usedLimit = request.rowLimit > 0 ? Math.min(request.rowLimit, limit) : limit;
      publish(block.id, block.columns, rows, {
        ...(block.table ? { table: block.table } : {}),
        rowLimit: usedLimit,
        ...(request.filters ? { filters: request.filters } : {}),
        ...(request.sortKeys.length ? { sortKeys: request.sortKeys } : {}),
        ...(request.address ? { address: request.address } : {}),
        ...(prepared.query.parentSheetId ? { parentSheetId: prepared.query.parentSheetId } : {}),
      });
      reporter.succeed(block.id, { result: `${rows.length.toLocaleString()} rows` });
    } catch (error) {
      reporter.miss(block.id, error instanceof Error ? error.message : "Replay failed");
    }
  }
  reporter.finish();
}
