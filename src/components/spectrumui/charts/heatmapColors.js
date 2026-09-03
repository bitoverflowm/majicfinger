/** Concrete Spectrum heat defaults (export-safe; no CSS vars). */
export const SPECTRUM_HEAT_DEFAULTS = {
  light: { up: "#059669", down: "#e11d48", flat: "#e7e7ea" },
  dark: { up: "#34d399", down: "#fb7185", flat: "#26262b" },
};

/**
 * @param {string} input
 * @returns {{ r: number; g: number; b: number } | null}
 */
export function parseHexColor(input) {
  const raw = String(input || "").trim();
  const m = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

/**
 * Mix two hex colors in sRGB. `weight` is the portion of `colorA` (0–1).
 * @param {string} colorA
 * @param {string} colorB
 * @param {number} weight
 * @returns {string}
 */
export function mixSrgbHex(colorA, colorB, weight) {
  const a = parseHexColor(colorA);
  const b = parseHexColor(colorB);
  if (!a || !b) return colorA || colorB || "#888888";
  const t = Math.max(0, Math.min(1, Number(weight) || 0));
  const r = Math.round(a.r * t + b.r * (1 - t));
  const g = Math.round(a.g * t + b.g * (1 - t));
  const bl = Math.round(a.b * t + b.b * (1 - t));
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Heat color for a change value.
 * Prefer concrete hex via `colors` so SVG exports (html-to-image) paint correctly —
 * `color-mix` + CSS vars often rasterize as transparent in cloned SVG.
 *
 * `mode`:
 * - `diverging` (default): −cap…+cap through flat
 * - `positive`: 0…+cap (flat → up) — when data has no negatives
 * - `negative`: −cap…0 (down → flat) — when data has no positives
 *
 * @param {number} change
 * @param {number} [cap=4]
 * @param {{ up?: string; down?: string; flat?: string; cssVars?: boolean; mode?: "diverging" | "positive" | "negative" }} [colors]
 * @returns {string}
 */
export function changeColor(change, cap = 4, colors = {}) {
  const mode = colors.mode === "positive" || colors.mode === "negative" ? colors.mode : "diverging";
  const useCss = colors.cssVars === true;
  const up = colors.up || (useCss ? "var(--spectrum-chart-up)" : SPECTRUM_HEAT_DEFAULTS.light.up);
  const down = colors.down || (useCss ? "var(--spectrum-chart-down)" : SPECTRUM_HEAT_DEFAULTS.light.down);
  const flat =
    colors.flat || (useCss ? "var(--spectrum-heat-flat)" : SPECTRUM_HEAT_DEFAULTS.light.flat);
  const safeCap = cap || 1;

  const mix = (base, weight) => {
    if (useCss || String(base).includes("var(") || String(flat).includes("var(")) {
      return `color-mix(in srgb, ${base} ${(weight * 100).toFixed(0)}%, ${flat})`;
    }
    return mixSrgbHex(base, flat, weight);
  };

  if (mode === "positive") {
    const t = Math.max(0, Math.min(1, Number(change) / safeCap));
    if (t < 0.04) return flat;
    return mix(up, 0.22 + t * 0.78);
  }
  if (mode === "negative") {
    const t = Math.max(0, Math.min(1, -Number(change) / safeCap));
    if (t < 0.04) return flat;
    return mix(down, 0.22 + t * 0.78);
  }

  const t = Math.max(-1, Math.min(1, Number(change) / safeCap));
  if (Math.abs(t) < 0.04) return flat;
  const weight = 0.22 + Math.abs(t) * 0.78;
  return mix(t > 0 ? up : down, weight);
}

/**
 * Legend swatch samples for the active scale mode.
 * @param {number} cap
 * @param {"diverging" | "positive" | "negative"} mode
 * @param {number} [steps=9]
 * @returns {number[]}
 */
export function heatLegendSampleChanges(cap, mode = "diverging", steps = 9) {
  const n = Math.max(2, Math.floor(steps) || 9);
  const c = Number(cap) || 1;
  if (mode === "positive") {
    return Array.from({ length: n }, (_, i) => (i / (n - 1)) * c);
  }
  if (mode === "negative") {
    return Array.from({ length: n }, (_, i) => -c + (i / (n - 1)) * c);
  }
  return Array.from({ length: n }, (_, i) => ((i - (n - 1) / 2) / ((n - 1) / 2)) * c);
}
