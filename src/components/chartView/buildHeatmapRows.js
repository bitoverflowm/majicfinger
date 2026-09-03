import { parseNumberTypedCell } from "@/lib/coerceNumberTypedCells";
import { deScopeChartColumnKey } from "@/lib/chartSnapshotDataDeps";

/**
 * Resolve a sheet cell to a finite number (weight / change).
 * @param {unknown} raw
 * @returns {number | null}
 */
export function heatmapNumeric(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const parsed = parseNumberTypedCell(raw);
  if (parsed != null && Number.isFinite(parsed)) return parsed;
  const n = Number(String(raw).replace(/[%,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Cap that saturates the diverging color ramp from change values.
 * @param {number[]} changes
 * @returns {number}
 */
export function inferHeatmapCap(changes) {
  const vals = (Array.isArray(changes) ? changes : [])
    .map((v) => Math.abs(Number(v)))
    .filter((v) => Number.isFinite(v) && v > 0);
  if (!vals.length) return 6;
  const max = Math.max(...vals);
  if (max <= 1) return 1;
  if (max <= 2) return 2;
  if (max <= 4) return 4;
  if (max <= 6) return 6;
  if (max <= 10) return 10;
  return Math.ceil(max);
}

/**
 * Map sheet rows → Spectrum TreemapInput[].
 * @param {object[]} rows
 * @param {{ labelKey?: string; weightKey?: string; changeKey?: string; nameKey?: string | null }} keys
 * @returns {{ items: { label: string; weight: number; change: number; name?: string; payload?: object }[]; inferredCap: number }}
 */
export function buildHeatmapItems(rows, keys = {}) {
  const labelKey = String(keys.labelKey || "").trim();
  const weightKey = String(keys.weightKey || "").trim();
  const changeKey = String(keys.changeKey || "").trim();
  const nameKey = keys.nameKey != null ? String(keys.nameKey).trim() : "";
  const list = Array.isArray(rows) ? rows : [];
  if (!labelKey || !weightKey || !changeKey) {
    return { items: [], inferredCap: 6 };
  }

  const plainLabel = deScopeChartColumnKey(labelKey);
  const plainWeight = deScopeChartColumnKey(weightKey);
  const plainChange = deScopeChartColumnKey(changeKey);
  const plainName = nameKey ? deScopeChartColumnKey(nameKey) : "";

  const seen = new Map();
  const changes = [];

  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const labelRaw = row[labelKey] ?? row[plainLabel];
    const label = String(labelRaw ?? "").trim();
    if (!label) continue;
    const weight = heatmapNumeric(row[weightKey] ?? row[plainWeight]);
    const change = heatmapNumeric(row[changeKey] ?? row[plainChange]);
    if (weight == null || weight <= 0 || change == null) continue;
    changes.push(change);

    const name =
      plainName && (row[nameKey] ?? row[plainName]) != null
        ? String(row[nameKey] ?? row[plainName]).trim()
        : undefined;

    const prev = seen.get(label);
    if (prev) {
      const nextWeight = prev.weight + weight;
      const nextChange = (prev.change * prev.weight + change * weight) / nextWeight;
      seen.set(label, {
        ...prev,
        weight: nextWeight,
        change: nextChange,
        name: name || prev.name,
        payload: row,
      });
    } else {
      seen.set(label, {
        label,
        weight,
        change,
        ...(name ? { name } : {}),
        payload: row,
      });
    }
  }

  const items = [...seen.values()].sort((a, b) => b.weight - a.weight);
  return { items, inferredCap: inferHeatmapCap(changes) };
}
