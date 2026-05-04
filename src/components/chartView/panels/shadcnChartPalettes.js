import shadcnChartPalettesJson from "./shadcnChartPalettes.json";

/** @type {(keyof typeof shadcnChartPalettesJson)[]} */
export const SHADCN_CHART_BASE_ORDER = [
  "neutral",
  "stone",
  "zinc",
  "slate",
  "gray",
  "mauve",
  "olive",
  "mist",
  "taupe",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

export const SHADCN_CHART_SHADE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/**
 * "Single colors" palette: one representative swatch per base color.
 * Useful for letting users pick an explicit series color, independent of the global ramp palette.
 * @param {number} shadeKey Tailwind shade (default 600 for good contrast)
 * @returns {{ baseId: string, color: string }[]}
 */
export function getShadcnSingleColors(shadeKey = 600) {
  const key = String(shadeKey);
  return SHADCN_CHART_BASE_ORDER.map((baseId) => ({
    baseId,
    color: shadcnChartPalettesJson?.[baseId]?.[key] || shadcnChartPalettesJson?.[baseId]?.["600"] || shadcnChartPalettesJson?.[baseId]?.["500"],
  })).filter((x) => Boolean(x.color));
}

/**
 * Full chart palette: one stop per Tailwind shade (50 → 950), same order as Shadcn / Tailwind docs.
 * @param {string} baseId
 * @returns {string[]}
 */
export function getShadcnChartPaletteArray(baseId) {
  const row = shadcnChartPalettesJson[baseId];
  if (!row) return [];
  return SHADCN_CHART_SHADE_KEYS.map((k) => row[String(k)]).filter(Boolean);
}

/** Grey / near-grey Shadcn bases (ramps are achromatic). */
const SHADCN_CHART_GREY_BASE_IDS = new Set([
  "neutral",
  "stone",
  "zinc",
  "slate",
  "gray",
  "mauve",
  "olive",
  "mist",
  "taupe",
]);

/**
 * One saturated swatch per chromatic chart base (default shade 600) for bar "rainbow" mode.
 * Avoids sampling only greys when the active palette is neutral/stone/zinc/etc.
 * @param {number} [shadeKey]
 * @returns {string[]}
 */
export function getShadcnRainbowBarPalette(shadeKey = 600) {
  const singles = getShadcnSingleColors(shadeKey);
  const chromatic = singles.filter((x) => !SHADCN_CHART_GREY_BASE_IDS.has(x.baseId)).map((x) => x.color);
  return chromatic.length ? chromatic : singles.map((x) => x.color);
}

/** Darkest swatch for base picker UI. */
export function getShadcnChartBaseSwatch950(baseId) {
  const row = shadcnChartPalettesJson[baseId];
  return row?.["950"] || "#737373";
}

/**
 * All Tailwind shade stops per base (for full-spectrum color pickers).
 * @returns {{ baseId: string, shades: { shade: number, color: string }[] }[]}
 */
export function getGroupedShadcnPaletteSwatches() {
  return SHADCN_CHART_BASE_ORDER.map((baseId) => ({
    baseId,
    shades: SHADCN_CHART_SHADE_KEYS.map((shade) => {
      const color = shadcnChartPalettesJson?.[baseId]?.[String(shade)];
      return color ? { shade, color } : null;
    }).filter(Boolean),
  })).filter((g) => g.shades.length > 0);
}
