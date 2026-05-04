import shadcnChartPalettesJson from "./panels/shadcnChartPalettes.json";

/**
 * Rainbow bar hue order: predictable chromatic walk (matches Shadcn palette JSON keys).
 */
export const RAINBOW_BAR_HUE_ORDER = [
  "mist",
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

/** One lightness step per full pass through {@link RAINBOW_BAR_HUE_ORDER}. */
const RAINBOW_BAR_SHADE_ORDER = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const RAINBOW_BAR_SLOT_COUNT = RAINBOW_BAR_HUE_ORDER.length * RAINBOW_BAR_SHADE_ORDER.length;

function rainbowBarHexAtSlot(slotIndex) {
  const nHue = RAINBOW_BAR_HUE_ORDER.length;
  const nShade = RAINBOW_BAR_SHADE_ORDER.length;
  const s = Math.floor(slotIndex / nHue) % nShade;
  const h = slotIndex % nHue;
  const baseId = RAINBOW_BAR_HUE_ORDER[h];
  const shade = RAINBOW_BAR_SHADE_ORDER[s];
  const row = shadcnChartPalettesJson[baseId];
  return row?.[String(shade)] || row?.["500"] || "#94a3b8";
}

/**
 * Deterministic rainbow fill: walk hues in order, then bump shade (100→…→900), repeat.
 * Linear index per cell: `rowIndex * numSeries + seriesIndex`.
 *
 * `shuffleNonce` rotates the slot (same order, shifted) — not random.
 *
 * @param {unknown} _legacyPalette unused (kept for call-site stability)
 * @param {number} rowIndex
 * @param {number} seriesIndex
 * @param {unknown} _xPivot unused
 * @param {number} [shuffleNonce] added to linear index before wrapping
 * @param {number} [numSeries] Y series count (stack width)
 */
export function rainbowBarFillFromPalette(
  _legacyPalette,
  rowIndex,
  seriesIndex,
  _xPivot,
  shuffleNonce = 0,
  numSeries = 1,
) {
  const n = Math.max(1, Math.floor(Number(numSeries)) || 1);
  const ri = Math.max(0, Math.floor(Number(rowIndex)) || 0);
  const si = Math.max(0, Math.floor(Number(seriesIndex)) || 0);
  const k = ri * n + si;
  const rot = Math.floor(Number(shuffleNonce)) || 0;
  const slot = ((k + rot) % RAINBOW_BAR_SLOT_COUNT + RAINBOW_BAR_SLOT_COUNT) % RAINBOW_BAR_SLOT_COUNT;
  return rainbowBarHexAtSlot(slot);
}
