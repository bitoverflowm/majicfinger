import { buildSheetGraphForAthena } from "@/lib/dataLake/buildSheetGraph";
import { fetchSheetQuantAthena } from "@/lib/dataLake/fetchSheetQuantAthena";
import { findQuantAthenaOperation } from "@/lib/projectPersistence";

/**
 * Re-run a saved quant.relative_position.athena operation against the source sheet graph.
 * @param {{
 *   sheet: object;
 *   sheetId?: string;
 *   dataSheets: Record<string, object>;
 *   operation?: object;
 * }} params
 */
export async function rehydrateQuantAthenaSheetAsync({ sheet, sheetId, dataSheets, operation }) {
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

  const join = op.join && typeof op.join === "object" ? op.join : {};
  const quant = { mode: "snapshot", ...(op.quant && typeof op.quant === "object" ? op.quant : {}) };
  let joinColumns = Array.isArray(join.columns) ? join.columns.filter(Boolean) : [];
  if (!joinColumns.length) {
    joinColumns = [
      ...new Set(
        [
          quant.progressColumn,
          ...(Array.isArray(quant.metricColumns) ? quant.metricColumns : []),
        ].filter(Boolean),
      ),
    ];
  }
  if (!joinColumns.length) joinColumns = ["created_time"];
  const progressColumn = String(quant.progressColumn || "").trim();
  const colsForJoin = [...joinColumns];
  if (progressColumn && !colsForJoin.includes(progressColumn)) colsForJoin.push(progressColumn);

  const { rows, rowCount } = await fetchSheetQuantAthena({
    sheetGraph,
    rootSheetId,
    join: {
      lake: join.lake || "kalshi",
      table: join.table || "trades",
      joinType: join.joinType || "inner",
      leftKeyColumn: join.leftKeyColumn || quant.groupColumn,
      rightKeyColumn: join.rightKeyColumn || join.leftKeyColumn || quant.groupColumn,
      columns: colsForJoin,
    },
    quant,
  });

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
