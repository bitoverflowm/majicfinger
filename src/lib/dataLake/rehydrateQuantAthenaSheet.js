import { athenaRowsToObjects } from "@/lib/duckdb/athenaRowsToObjects";
import { buildSheetGraphForAthena } from "@/lib/dataLake/buildSheetGraph";
import { fetchSheetQuantAthena } from "@/lib/dataLake/fetchSheetQuantAthena";
import { normalizeQuantAthenaRows } from "@/lib/dataLake/normalizeQuantAthenaRows";
import { restoreQuantAthenaReplayConfig } from "@/lib/dataLake/restoreQuantAthenaReplayConfig";
import { runSheetQuantAthena } from "@/lib/dataLake/sheetQuantAthenaCore";
import { findQuantAthenaOperation } from "@/lib/projectPersistence";

function buildQuantAthenaReplayPayload({ sheet, dataSheets, operation }) {
  const op = operation || findQuantAthenaOperation(sheet);
  if (!op) {
    throw new Error("This sheet has no saved quant Athena operation.");
  }

  const rootSheetId = String(op.rootSheetId || sheet?.sourceSheetId || "").trim();
  if (!rootSheetId) {
    throw new Error("Missing source sheet for quant replay.");
  }

  const sheetGraph = buildSheetGraphForAthena(rootSheetId, dataSheets || {});
  if (!sheetGraph) {
    throw new Error(
      "Source sheet is not Athena-rebuildable. Reload the parent Data Lake sheet first.",
    );
  }

  const { join, quant } = restoreQuantAthenaReplayConfig({
    sheet,
    operation: op,
    dataSheets,
    rootSheetId,
  });

  return {
    rootSheetId,
    sheetGraph,
    join: {
      lake: join.lake || "kalshi",
      table: join.table || "trades",
      joinType: join.joinType || "inner",
      leftKeyColumn: join.leftKeyColumn || quant.groupColumn,
      rightKeyColumn: join.rightKeyColumn || join.leftKeyColumn || quant.groupColumn,
      columns: join.columns,
    },
    quant,
  };
}

function finalizeQuantAthenaReplayRows({ rows, rowCount, sheetId }) {
  if (!rows.length) {
    throw new Error("Quant Athena replay returned no rows.");
  }
  return {
    rows,
    json: {
      rowCount: rowCount ?? rows.length,
      sheetId: sheetId || null,
    },
  };
}

/**
 * Re-run a saved quant.relative_position.athena operation against the source sheet graph.
 * @param {{
 *   sheet: object;
 *   sheetId?: string;
 *   dataSheets: Record<string, object>;
 *   operation?: object;
 * }} params
 */
export async function rehydrateQuantAthenaSheetAsync({ sheet, sheetId, dataSheets, operation, groupColumnFilterValues }) {
  const { sheetGraph, rootSheetId, join, quant } = buildQuantAthenaReplayPayload({
    sheet,
    dataSheets,
    operation,
  });

  if (Array.isArray(groupColumnFilterValues) && groupColumnFilterValues.length) {
    quant.groupColumnFilterValues = groupColumnFilterValues;
  }

  const { rows, rowCount } = await fetchSheetQuantAthena({
    sheetGraph,
    rootSheetId,
    join,
    quant,
  });

  return finalizeQuantAthenaReplayRows({ rows, rowCount, sheetId });
}

/**
 * Server-side quant Athena replay (public embed / API routes — no browser fetch).
 * @param {{
 *   access: object;
 *   sheet: object;
 *   sheetId?: string;
 *   dataSheets: Record<string, object>;
 *   operation?: object;
 *   maxWaitMs?: number;
 *   groupColumnFilterValues?: string[];
 * }} params
 */
export async function rehydrateQuantAthenaSheetServer({
  access,
  sheet,
  sheetId,
  dataSheets,
  operation,
  maxWaitMs,
  groupColumnFilterValues,
}) {
  const { sheetGraph, rootSheetId, join, quant } = buildQuantAthenaReplayPayload({
    sheet,
    dataSheets,
    operation,
  });

  if (Array.isArray(groupColumnFilterValues) && groupColumnFilterValues.length) {
    quant.groupColumnFilterValues = groupColumnFilterValues;
  }

  const result = await runSheetQuantAthena({
    access,
    sheetGraph,
    rootSheetId,
    join,
    quant,
    maxWaitMs,
  });
  const colNames = Array.isArray(result.columns) ? result.columns : [];
  const rawRows = Array.isArray(result.rows) ? result.rows : [];
  const rows = normalizeQuantAthenaRows(athenaRowsToObjects(colNames, rawRows));

  return finalizeQuantAthenaReplayRows({
    rows,
    rowCount: result.rowCount ?? rows.length,
    sheetId,
  });
}
