import { getColumnMetaForLakeTable } from "@/lib/dataLake/lakeTableColumns";
import { genComposeRowId, composeSourceColumnLabel } from "@/lib/dataLakeComposeHelpers";
import {
  KALSHI_MARKETS_CONNECT_COLUMNS,
  KALSHI_TRADES_CONNECT_COLUMNS,
} from "@/lib/kalshiConnectColumns";

/**
 * @typedef {{ name: string; type: string; description?: string }} JoinTargetColumnMeta
 */

/**
 * Column metadata for join-target multi-select (rich labels for Kalshi; Glue types elsewhere).
 * @param {string} lake
 * @param {string} table
 * @returns {JoinTargetColumnMeta[]}
 */
export function getJoinTargetColumnsForPicker(lake, table) {
  const L = String(lake || "").toLowerCase();
  const T = String(table || "").toLowerCase();
  const glueMeta = getColumnMetaForLakeTable(L, T);
  const rich =
    L === "kalshi" && T === "markets"
      ? KALSHI_MARKETS_CONNECT_COLUMNS
      : L === "kalshi" && T === "trades"
        ? KALSHI_TRADES_CONNECT_COLUMNS
        : null;
  const richByName = rich ? Object.fromEntries(rich.map((c) => [c.name, c])) : {};
  return glueMeta.map((c) => {
    const extra = richByName[c.name];
    return {
      name: c.name,
      type: extra?.type || c.type,
      description: extra?.description || "",
    };
  });
}

/** Display label for a join-target column row. */
export function joinTargetColumnDisplayLabel(col) {
  return composeSourceColumnLabel(col.name) || col.name;
}

/**
 * @typedef {{ name: string; type: string; sourceTable: string | null; key: string }} ComposeJoinColumnRef
 */

function isComposeDateLikeColumn(column, typeNorm) {
  return (
    (typeNorm === "bigint" || typeNorm === "int") &&
    /(^timestamp$)|(_at$)|(_time$)|(^created_)|(_date$)|date|time/i.test(String(column || ""))
  );
}

/**
 * One compose SELECT row for a column pulled from a joined Glue table.
 * @param {{ column: string; sourceTable: string; columnType?: string | null }} params
 */
export function buildComposeJoinTargetColumnItem({ column, sourceTable, columnType = null }) {
  const st = String(sourceTable || "").trim().toLowerCase();
  const col = String(column || "").trim();
  const typeNorm = String(columnType || "").toLowerCase();
  return {
    id: genComposeRowId(),
    column: col,
    sourceTable: st,
    alias: defaultComposeJoinColumnAlias(st, col),
    aggregate: null,
    dateBucket: null,
    dateFormat: null,
    stringBucket: null,
    numberBucket: null,
    numberScale: "none",
    decimals: null,
    treatAsDate: isComposeDateLikeColumn(col, typeNorm),
    sumCase: { enabled: false, branches: [], elseColumn: "" },
    equation: { enabled: false },
  };
}

/**
 * Append every column from a joined Glue table (skips columns already selected).
 * @param {object[]} existingItems
 * @param {{ lake: string; joinTable: string; columnNames?: string[] }} params
 * @returns {object[]}
 */
export function appendJoinTargetColumns(existingItems, { lake, joinTable, columnNames }) {
  const st = String(joinTable || "").trim().toLowerCase();
  if (!st) return existingItems || [];

  const meta = getColumnMetaForLakeTable(String(lake || "").toLowerCase(), st);
  const names =
    Array.isArray(columnNames) && columnNames.length
      ? columnNames.map((n) => String(n).trim()).filter(Boolean)
      : meta.map((c) => c.name);

  const existingKeys = new Set((existingItems || []).map((i) => composeItemRefKey(i)));
  const toAdd = [];
  for (const column of names) {
    const refKey = `${st}.${column}`;
    if (existingKeys.has(refKey)) continue;
    const columnType = meta.find((c) => c.name === column)?.type ?? null;
    toAdd.push(buildComposeJoinTargetColumnItem({ column, sourceTable: st, columnType }));
    existingKeys.add(refKey);
  }
  if (!toAdd.length) return existingItems || [];
  return [...(existingItems || []), ...toAdd];
}

/**
 * Remove joined-table columns from compose SELECT (one column, a list, or all from a table).
 * @param {object[]} existingItems
 * @param {{ joinTable: string; columnNames?: string[] }} params
 * @returns {object[]}
 */
export function removeJoinTargetColumns(existingItems, { joinTable, columnNames }) {
  const st = String(joinTable || "").trim().toLowerCase();
  if (!st) return existingItems || [];
  const nameSet =
    Array.isArray(columnNames) && columnNames.length
      ? new Set(columnNames.map((n) => String(n).trim()).filter(Boolean))
      : null;
  return (existingItems || []).filter((i) => {
    const itemSt = String(i?.sourceTable || "").trim().toLowerCase();
    if (itemSt !== st) return true;
    if (!nameSet) return false;
    return !nameSet.has(String(i?.column || "").trim());
  });
}

/**
 * @param {{ lake: string; baseTable: string; composeJoins?: object[] }} params
 * @returns {ComposeJoinColumnRef[]}
 */
export function composeColumnsWithJoinTargets({ lake, baseTable, composeJoins = [] }) {
  const L = String(lake || "").toLowerCase();
  const T = String(baseTable || "").toLowerCase();
  const baseMeta = T ? getColumnMetaForLakeTable(L, T) : [];
  const out = baseMeta.map((c) => ({
    name: c.name,
    type: c.type,
    sourceTable: null,
    key: c.name,
  }));

  const seenTables = new Set([T]);
  for (const j of composeJoins || []) {
    if (!j || j.targetKind !== "table") continue;
    const joinTable = String(j.targetTable || "").trim().toLowerCase();
    if (!joinTable || seenTables.has(joinTable)) continue;
    seenTables.add(joinTable);
    for (const c of getColumnMetaForLakeTable(L, joinTable)) {
      out.push({
        name: c.name,
        type: c.type,
        sourceTable: joinTable,
        key: `${joinTable}.${c.name}`,
      });
    }
  }
  return out;
}

/**
 * Default output alias when pulling a column from a joined Glue table.
 * @param {string | null | undefined} sourceTable
 * @param {string} column
 */
export function defaultComposeJoinColumnAlias(sourceTable, column) {
  const col = String(column || "").trim();
  const st = String(sourceTable || "").trim().toLowerCase();
  return st ? `${st}_${col}` : col;
}

/** Stable key for a compose row (base column or joined-table column). */
export function composeItemRefKey(item) {
  const col = String(item?.column || "").trim();
  const st = String(item?.sourceTable || "").trim().toLowerCase();
  return st ? `${st}.${col}` : col;
}

/** True when at least one Glue table join is fully configured. */
export function hasConfiguredTableJoins(composeJoins) {
  return (composeJoins || []).some(
    (j) =>
      j &&
      j.targetKind === "table" &&
      String(j.targetTable || "").trim() &&
      String(j.leftColumn || "").trim() &&
      String(j.rightColumn || "").trim(),
  );
}

/**
 * @param {object | null | undefined} composeSpec
 * @returns {string[]}
 */
export function summarizeComposeJoinClauses(composeSpec) {
  const lines = [];
  const preset =
    composeSpec?.join && typeof composeSpec.join === "object"
      ? String(composeSpec.join.preset || "").trim()
      : "";
  if (preset) {
    lines.push(`JOIN preset ${preset}`);
  }
  const joins = Array.isArray(composeSpec?.joins) ? composeSpec.joins : [];
  for (const j of joins) {
    if (!j || typeof j !== "object") continue;
    const jt = String(j.joinType || "inner").toLowerCase() === "left" ? "LEFT JOIN" : "INNER JOIN";
    const table = String(j.table || "").trim() || "?";
    const leftCol = String(j.on?.leftColumn || "").trim() || "?";
    const rightCol = String(j.on?.rightColumn || "").trim() || "?";
    lines.push(`${jt} ${table} ON ${leftCol} = ${rightCol}`);
  }
  const cteJoins = Array.isArray(composeSpec?.cteJoins) ? composeSpec.cteJoins : [];
  for (const j of cteJoins) {
    if (!j || typeof j !== "object") continue;
    const jt = String(j.joinType || "inner").toLowerCase() === "left" ? "LEFT JOIN" : "INNER JOIN";
    const cteName = String(j.cteName || "").trim() || "?";
    const leftCol = String(j.on?.leftColumn || "").trim() || "?";
    const rightCol = String(j.on?.rightColumn || "").trim() || "?";
    lines.push(`${jt} ${cteName} ON ${leftCol} = ${rightCol}`);
  }
  return lines;
}
