import { parseColorToRgb } from "@/components/chartView/paletteExtrapolation";
import {
  DEFAULT_CHART_SERIES_COLORS,
  getShadcnChartPaletteArray,
  getShadcnRainbowBarPalette,
} from "@/components/chartView/panels/shadcnChartPalettes";

export const SCATTER_COLOR_SCALE_MODES = [
  {
    value: "sequential",
    label: "Sequential",
    description: "Low-to-high gradient for values moving in one direction.",
  },
  {
    value: "diverging",
    label: "Diverging",
    description: "Two colors separated by a midpoint, ideal for negative and positive values.",
  },
  {
    value: "categories",
    label: "Categories",
    description: "A different color for each distinct category.",
  },
];

function clamp01(t) {
  return Math.min(1, Math.max(0, t));
}

function lerpHex(a, b, t) {
  const A = parseColorToRgb(a);
  const B = parseColorToRgb(b);
  if (!A || !B) return a || b || "#64748b";
  const u = clamp01(t);
  const r = Math.round(A.r + (B.r - A.r) * u);
  const g = Math.round(A.g + (B.g - A.g) * u);
  const bl = Math.round(A.b + (B.b - A.b) * u);
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(bl)}`;
}

function sampleStops(stops, t) {
  const list = (stops || []).filter(Boolean);
  if (!list.length) return "#64748b";
  if (list.length === 1) return list[0];
  const u = clamp01(t) * (list.length - 1);
  const i = Math.min(Math.floor(u), list.length - 2);
  return lerpHex(list[i], list[i + 1], u - i);
}

/** Resolve the color ramp used for scatter Color-by encoding. */
export function resolveScatterColorStops({
  mode,
  paletteId,
  reverse,
  selectedPalette,
  fallbackPalette = DEFAULT_CHART_SERIES_COLORS,
}) {
  let stops = [];
  if (paletteId) {
    const ramp = getShadcnChartPaletteArray(paletteId);
    if (ramp.length) stops = [...ramp];
  }
  if (!stops.length && Array.isArray(selectedPalette) && selectedPalette.length) {
    stops = [...selectedPalette];
  }
  if (!stops.length) {
    if (mode === "categories") {
      stops = getShadcnRainbowBarPalette(600);
    } else {
      stops = [...(fallbackPalette || DEFAULT_CHART_SERIES_COLORS)];
    }
  }
  if (mode === "diverging" && stops.length >= 3) {
    // Prefer light → mid → dark ends for a readable diverging feel.
    const lo = stops[0];
    const mid = stops[Math.floor(stops.length / 2)];
    const hi = stops[stops.length - 1];
    stops = [lo, mid, hi];
  }
  if (reverse) stops = [...stops].reverse();
  return stops;
}

export function computeScatterColorNumericExtent(rows, column) {
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows || []) {
    const n = Number(row?.[column]);
    if (!Number.isFinite(n)) continue;
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min, max: min + 1 };
  return { min, max };
}

export function resolveScatterColorRange({
  rangeMode,
  customMin,
  customMax,
  autoMin,
  autoMax,
}) {
  if (rangeMode === "custom") {
    const lo = Number(customMin);
    const hi = Number(customMax);
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo !== hi) {
      return { min: Math.min(lo, hi), max: Math.max(lo, hi) };
    }
  }
  return { min: autoMin, max: autoMax };
}

export function collectScatterColorCategories(rows, column, { limit = 24 } = {}) {
  const seen = new Map();
  for (const row of rows || []) {
    const raw = row?.[column];
    if (raw == null || raw === "") continue;
    const key = String(raw);
    if (!seen.has(key)) seen.set(key, raw);
    if (seen.size >= limit) break;
  }
  return Array.from(seen.entries()).map(([key, value]) => ({ key, value }));
}

/**
 * @returns {{ color: string, label?: string, kind: "point" | "category" }}
 */
export function colorForScatterValue({
  value,
  mode,
  stops,
  range,
  categoryIndexByKey,
}) {
  const palette = stops?.length ? stops : DEFAULT_CHART_SERIES_COLORS;

  if (mode === "categories") {
    const key = value == null || value === "" ? "" : String(value);
    const idx =
      categoryIndexByKey instanceof Map && categoryIndexByKey.has(key)
        ? categoryIndexByKey.get(key)
        : Math.abs(
            Array.from(key).reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 0),
          ) % Math.max(1, palette.length);
    return {
      kind: "category",
      color: palette[idx % palette.length] || palette[0],
      label: key || "(empty)",
    };
  }

  const n = Number(value);
  if (!Number.isFinite(n)) {
    return { kind: "point", color: palette[Math.floor(palette.length / 2)] || "#64748b" };
  }

  const min = Number(range?.min);
  const max = Number(range?.max);
  const span = Number.isFinite(min) && Number.isFinite(max) ? max - min : 0;

  if (mode === "diverging") {
    const mid =
      Number.isFinite(min) && Number.isFinite(max) && min < 0 && max > 0
        ? 0
        : Number.isFinite(min) && Number.isFinite(max)
          ? (min + max) / 2
          : 0;
    if (n <= mid) {
      const lo = Number.isFinite(min) ? min : mid - 1;
      const t = mid === lo ? 0 : clamp01((n - lo) / (mid - lo));
      // low → mid uses first half of stops
      return { kind: "point", color: sampleStops(palette, t * 0.5) };
    }
    const hi = Number.isFinite(max) ? max : mid + 1;
    const t = hi === mid ? 1 : clamp01((n - mid) / (hi - mid));
    return { kind: "point", color: sampleStops(palette, 0.5 + t * 0.5) };
  }

  // sequential
  const t = span === 0 || !Number.isFinite(span) ? 0.5 : clamp01((n - min) / span);
  return { kind: "point", color: sampleStops(palette, t) };
}

/** Build legend payload entries for ChartLegendContent or a custom ramp legend. */
export function buildScatterColorLegendModel({
  mode,
  stops,
  range,
  categories,
  columnLabel,
}) {
  const palette = stops?.length ? stops : DEFAULT_CHART_SERIES_COLORS;
  const title = columnLabel || "Color";

  if (mode === "categories") {
    return {
      kind: "categories",
      title,
      items: (categories || []).map((cat, i) => ({
        key: cat.key,
        label: cat.key,
        color: palette[i % palette.length] || palette[0],
      })),
    };
  }

  const min = Number(range?.min);
  const max = Number(range?.max);
  const mid =
    mode === "diverging" && Number.isFinite(min) && Number.isFinite(max) && min < 0 && max > 0
      ? 0
      : Number.isFinite(min) && Number.isFinite(max)
        ? (min + max) / 2
        : null;

  return {
    kind: mode === "diverging" ? "diverging" : "sequential",
    title,
    gradientCss: `linear-gradient(90deg, ${palette.join(", ")})`,
    minLabel: Number.isFinite(min) ? formatLegendNumber(min) : "",
    midLabel: mid == null || !Number.isFinite(mid) ? "" : formatLegendNumber(mid),
    maxLabel: Number.isFinite(max) ? formatLegendNumber(max) : "",
    swatches: palette.slice(0, Math.min(7, palette.length)),
  };
}

function formatLegendNumber(n) {
  const abs = Math.abs(n);
  if (abs >= 1000 || (abs > 0 && abs < 0.01)) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2, notation: "compact" });
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
