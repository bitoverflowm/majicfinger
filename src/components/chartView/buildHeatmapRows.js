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
 * Step a raw magnitude into a readable legend/cap value.
 * @param {number} max
 * @returns {number}
 */
export function stepHeatmapCap(max) {
  const n = Number(max);
  if (!Number.isFinite(n) || n <= 0) return 6;
  if (n <= 1) return 1;
  if (n <= 2) return 2;
  if (n <= 4) return 4;
  if (n <= 6) return 6;
  if (n <= 10) return 10;
  return Math.ceil(n);
}

/**
 * Cap that saturates the diverging color ramp from change values.
 * @param {number[]} changes
 * @returns {number}
 */
export function inferHeatmapCap(changes) {
  return inferHeatmapScale(changes).cap;
}

/**
 * Infer color-scale polarity + saturation from change values.
 * All-non-negative → sequential 0…+cap; all-non-positive → −cap…0; mixed → ±cap.
 *
 * @param {number[]} changes
 * @returns {{ mode: "diverging" | "positive" | "negative"; cap: number; min: number; max: number }}
 */
export function inferHeatmapScale(changes) {
  const vals = (Array.isArray(changes) ? changes : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (!vals.length) {
    return { mode: "diverging", cap: 6, min: 0, max: 0 };
  }
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const hasNeg = min < -1e-12;
  const hasPos = max > 1e-12;
  if (hasPos && !hasNeg) {
    return { mode: "positive", cap: stepHeatmapCap(max), min, max };
  }
  if (hasNeg && !hasPos) {
    return { mode: "negative", cap: stepHeatmapCap(Math.abs(min)), min, max };
  }
  return {
    mode: "diverging",
    cap: stepHeatmapCap(Math.max(Math.abs(min), Math.abs(max))),
    min,
    max,
  };
}

/**
 * Map sheet rows → Spectrum TreemapInput[].
 * @param {object[]} rows
 * @param {{ labelKey?: string; weightKey?: string; changeKey?: string; nameKey?: string | null }} keys
 * @returns {{ items: { label: string; weight: number; change: number; name?: string; payload?: object }[]; inferredCap: number; scaleMode: "diverging" | "positive" | "negative" }}
 */
export function buildHeatmapItems(rows, keys = {}) {
  const labelKey = String(keys.labelKey || "").trim();
  const weightKey = String(keys.weightKey || "").trim();
  const changeKey = String(keys.changeKey || "").trim();
  const nameKey = keys.nameKey != null ? String(keys.nameKey).trim() : "";
  const list = Array.isArray(rows) ? rows : [];
  if (!labelKey || !weightKey || !changeKey) {
    return { items: [], inferredCap: 6, scaleMode: "diverging" };
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
  // Prefer merged tile changes for scale polarity so the legend matches what is drawn.
  const scale = inferHeatmapScale(items.length ? items.map((i) => i.change) : changes);
  return { items, inferredCap: scale.cap, scaleMode: scale.mode };
}
