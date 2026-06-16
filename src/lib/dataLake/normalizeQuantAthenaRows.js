import { expandScientificNotationIntegerString } from "@/lib/dataLake/lakeBigintNormalize";
import { isDateLikeColumnName } from "@/lib/dataLake/lakeTableColumns";
import { parseCheckpointInput } from "@/lib/sheetOperations/quant/columnInference";
import { temporalToMs } from "@/lib/temporalParse";

function isQuantDatetimeColumn(columnName) {
  const col = String(columnName || "").trim();
  if (!col) return false;
  if (col === "selected_progress_value") return true;
  const m = /^selected_(.+)$/.exec(col);
  return Boolean(m && isDateLikeColumnName(m[1]));
}

function epochValueToIsoString(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  let ms = temporalToMs(value);
  if (!Number.isFinite(ms)) {
    const raw = typeof value === "string" ? value.trim() : String(value).trim();
    if (/[eE]/.test(raw)) {
      const n = Number(raw);
      if (Number.isFinite(n)) ms = temporalToMs(n);
    }
    if (!Number.isFinite(ms) && typeof value === "string") {
      const expanded = expandScientificNotationIntegerString(raw);
      if (expanded != null) ms = temporalToMs(expanded);
    }
  }
  if (!Number.isFinite(ms)) return value;

  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

/**
 * Normalize Athena quant snapshot rows for sheet use (ISO datetimes, numeric checkpoints).
 * @param {Record<string, unknown>[]} rows
 */
export function normalizeQuantAthenaRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return list;

  return list.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    let out = null;

    for (const [key, value] of Object.entries(row)) {
      let nextVal = value;

      if (key === "lifecycle_checkpoint" && typeof value === "string" && /%$/.test(value.trim())) {
        nextVal = parseCheckpointInput(value);
      } else if (isQuantDatetimeColumn(key)) {
        nextVal = epochValueToIsoString(value);
      }

      if (nextVal !== value) {
        if (!out) out = { ...row };
        out[key] = nextVal;
      }
    }

    return out || row;
  });
}
