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
 * Diverging heat color for a change value.
 * Prefer concrete hex via `colors` so SVG exports (html-to-image) paint correctly —
 * `color-mix` + CSS vars often rasterize as transparent in cloned SVG.
 *
 * @param {number} change
 * @param {number} [cap=4]
 * @param {{ up?: string; down?: string; flat?: string; cssVars?: boolean }} [colors]
 * @returns {string}
 */
export function changeColor(change, cap = 4, colors = {}) {
  const t = Math.max(-1, Math.min(1, change / (cap || 1)));
  const useCss = colors.cssVars === true;
  const up = colors.up || (useCss ? "var(--spectrum-chart-up)" : SPECTRUM_HEAT_DEFAULTS.light.up);
  const down = colors.down || (useCss ? "var(--spectrum-chart-down)" : SPECTRUM_HEAT_DEFAULTS.light.down);
  const flat =
    colors.flat || (useCss ? "var(--spectrum-heat-flat)" : SPECTRUM_HEAT_DEFAULTS.light.flat);

  if (Math.abs(t) < 0.04) return flat;
  const weight = 0.22 + Math.abs(t) * 0.78;
  const base = t > 0 ? up : down;
  if (useCss || String(base).includes("var(") || String(flat).includes("var(")) {
    return `color-mix(in srgb, ${base} ${(weight * 100).toFixed(0)}%, ${flat})`;
  }
  return mixSrgbHex(base, flat, weight);
}
