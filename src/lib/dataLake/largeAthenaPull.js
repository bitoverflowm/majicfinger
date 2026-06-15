import { athenaRowsToObjects } from "@/lib/duckdb/athenaRowsToObjects";

/** Above this row count, use JSON-first browse + background sheet parse. */
export const LARGE_ATHENA_PULL_THRESHOLD = 15000;

export const LARGE_PULL_PARSE_BATCH_SIZE = 5000;

/** Yield so React can paint between heavy Athena phases. */
export function yieldToUi() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * @param {number} rowCount
 * @returns {boolean}
 */
export function shouldUseLargeAthenaPullPath(rowCount) {
  return Number(rowCount) > LARGE_ATHENA_PULL_THRESHOLD;
}

/**
 * Convert Athena `string[][]` rows to sheet objects in batches (yields to the main thread).
 *
 * @param {{
 *   columns: string[];
 *   rows: string[][];
 *   signal?: AbortSignal;
 *   onProgress?: (p: { processed: number; total: number }) => void;
 * }} opts
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function parseAthenaPullInBackground({ columns, rows, signal, onProgress }) {
  const total = Array.isArray(rows) ? rows.length : 0;
  const objects = new Array(total);
  for (let start = 0; start < total; start += LARGE_PULL_PARSE_BATCH_SIZE) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const end = Math.min(start + LARGE_PULL_PARSE_BATCH_SIZE, total);
    const batch = athenaRowsToObjects(columns, rows.slice(start, end));
    for (let i = 0; i < batch.length; i++) {
      objects[start + i] = batch[i];
    }
    onProgress?.({ processed: end, total });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return objects;
}

/**
 * @param {string[]} columns
 * @param {string[][]} rows
 * @param {number} start inclusive
 * @param {number} end exclusive
 */
export function rawAthenaRowsSliceToObjects(columns, rows, start, end) {
  return athenaRowsToObjects(columns, rows.slice(start, end));
}
