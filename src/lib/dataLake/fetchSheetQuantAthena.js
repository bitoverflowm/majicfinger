import { athenaRowsToObjects } from "@/lib/duckdb/athenaRowsToObjects";

/**
 * @param {object} payload
 * @returns {Promise<{ rows: object[], columns: string[], rowCount: number, queryExecutionId?: string }>}
 */
export async function fetchSheetQuantAthena(payload) {
  const res = await fetch("/api/data-lake/sheet-quant-athena", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || res.statusText || "Quant Athena request failed");
  }
  const colNames = Array.isArray(json.columns) ? json.columns : [];
  const rawRows = Array.isArray(json.rows) ? json.rows : [];
  return {
    rows: athenaRowsToObjects(colNames, rawRows),
    columns: colNames,
    rowCount: json.rowCount ?? rawRows.length,
    queryExecutionId: json.queryExecutionId,
  };
}
