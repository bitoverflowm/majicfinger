import { ATHENA_INGEST_CHUNK_SIZE } from "@/config/dataLakeParquetSamples";
import { yieldToMain } from "@/lib/yieldToMain";

function rowToObject(columns, row, isObjectRow) {
  const o = {};
  if (isObjectRow) {
    const r = row && typeof row === "object" ? row : {};
    for (const col of columns) {
      const v = r[col];
      o[col] = v === "" || v == null ? null : v;
    }
    return o;
  }
  const arr = Array.isArray(row) ? row : [];
  columns.forEach((col, i) => {
    const v = arr[i];
    o[col] = v === "" || v == null ? null : v;
  });
  return o;
}

/**
 * Turn Athena poll rows into plain objects for JSON → DuckDB.
 * Poll API returns `string[][]`; Kalshi taxonomy roll-up (and similar) may pass row objects keyed by alias.
 * @param {string[]} columns
 * @param {unknown[]} rows
 * @returns {Record<string, unknown>[]}
 */
export function athenaRowsToObjects(columns, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const first = rows[0];
  const isObjectRow =
    first != null &&
    typeof first === "object" &&
    !Array.isArray(first) &&
    !(first instanceof Uint8Array);
  if (isObjectRow) {
    return rows.map((row) => rowToObject(columns, row, true));
  }
  return rows.map((row) => rowToObject(columns, row, false));
}

/**
 * Chunked conversion with optional progress (0–1) for large pulls.
 * @param {string[]} columns
 * @param {unknown[]} rows
 * @param {{ chunkSize?: number; onProgress?: (fraction: number) => void }} [opts]
 */
export async function athenaRowsToObjectsChunked(columns, rows, opts = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const chunkSize = Math.max(500, Number(opts.chunkSize) || ATHENA_INGEST_CHUNK_SIZE);
  const first = rows[0];
  const isObjectRow =
    first != null &&
    typeof first === "object" &&
    !Array.isArray(first) &&
    !(first instanceof Uint8Array);

  const out = [];
  const total = rows.length;
  for (let start = 0; start < total; start += chunkSize) {
    const end = Math.min(total, start + chunkSize);
    for (let i = start; i < end; i++) {
      out.push(rowToObject(columns, rows[i], isObjectRow));
    }
    opts.onProgress?.(end / total);
    if (end < total) await yieldToMain();
  }
  return out;
}
