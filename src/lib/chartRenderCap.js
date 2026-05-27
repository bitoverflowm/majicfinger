import { CHART_RENDER_ROW_CAP } from "@/config/dataLakeParquetSamples";

/**
 * Uniform downsample so Recharts stays responsive; sheet/grid keep the full row set.
 * @template T
 * @param {T[]} rows
 * @param {number} [cap]
 * @returns {T[]}
 */
export function downsampleRowsForChart(rows, cap = CHART_RENDER_ROW_CAP) {
  if (!Array.isArray(rows) || rows.length <= cap) return rows;
  const limit = Math.max(1, Math.floor(cap));
  const step = Math.ceil(rows.length / limit);
  const out = [];
  for (let i = 0; i < rows.length; i += step) {
    out.push(rows[i]);
    if (out.length >= limit) break;
  }
  return out;
}
