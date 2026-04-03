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
 * Full chart palette: one stop per Tailwind shade (50 → 950), same order as Shadcn / Tailwind docs.
 * @param {string} baseId
 * @returns {string[]}
 */
export function getShadcnChartPaletteArray(baseId) {
  const row = shadcnChartPalettesJson[baseId];
  if (!row) return [];
  return SHADCN_CHART_SHADE_KEYS.map((k) => row[String(k)]).filter(Boolean);
}

/** Darkest swatch for base picker UI. */
export function getShadcnChartBaseSwatch950(baseId) {
  const row = shadcnChartPalettesJson[baseId];
  return row?.["950"] || "#737373";
}
