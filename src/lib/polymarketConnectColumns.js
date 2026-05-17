/** @typedef {{ name: string; type: string; description: string; label?: string }} PolymarketConnectColumn */

import { getColumnMetaForLakeTable } from "@/lib/dataLake/lakeTableColumns";

/** Human-readable type labels for Connect home column picker. */
function formatHiveType(type) {
  const t = String(type || "").toLowerCase();
  if (t === "bigint") return "int";
  if (t === "double") return "float";
  return t || "string";
}

/** @param {string} name */
function defaultDescription(name) {
  return String(name || "")
    .replace(/^_+/, "")
    .replace(/_/g, " ");
}

/**
 * @param {"markets" | "trades" | "blocks"} table
 * @returns {PolymarketConnectColumn[]}
 */
function columnsForTable(table) {
  return getColumnMetaForLakeTable("polymarket", table).map((col) => ({
    name: col.name,
    type: formatHiveType(col.type),
    description: defaultDescription(col.name),
  }));
}

/** @type {PolymarketConnectColumn[]} */
export const POLYMARKET_MARKETS_CONNECT_COLUMNS = columnsForTable("markets");

/** @type {PolymarketConnectColumn[]} */
export const POLYMARKET_TRADES_CONNECT_COLUMNS = columnsForTable("trades");

/** @type {PolymarketConnectColumn[]} */
export const POLYMARKET_BLOCKS_CONNECT_COLUMNS = columnsForTable("blocks");

/** @param {PolymarketConnectColumn | string} col */
export function getPolymarketColumnDisplayLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/** @param {string} sampleId */
export function getPolymarketConnectColumnsForSample(sampleId) {
  if (sampleId === "athena-pm-markets") return POLYMARKET_MARKETS_CONNECT_COLUMNS;
  if (sampleId === "athena-pm-trades") return POLYMARKET_TRADES_CONNECT_COLUMNS;
  if (sampleId === "athena-pm-blocks") return POLYMARKET_BLOCKS_CONNECT_COLUMNS;
  return [];
}
