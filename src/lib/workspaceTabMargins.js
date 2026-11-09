/**
 * A dashboard tab's margins: the space between the canvas edges and its blocks, in pixels.
 * `top` is measured below the tab bar. A tab without saved margins uses its defaults, which for
 * a terminal follow the canvas width.
 */
export const TAB_MARGIN_SIDES = ["left", "right", "top", "bottom"];

export const DEFAULT_TAB_MARGINS = { left: 28, right: 28, top: 44, bottom: 120 };

/** The old terminal page: a column at most 1152px wide with 24px padding, 40px from the top and 64px from the bottom. */
const TERMINAL_COLUMN = 1104;
const TERMINAL_MIN_SIDE = 24;

const MAX_MARGIN = 2000;

/** `{ left, right, top, bottom }` as whole pixels, or null when it isn't a margins object. */
export function sanitizeTabMargins(margins) {
  if (!margins || typeof margins !== "object") return null;
  const clean = {};
  for (const side of TAB_MARGIN_SIDES) {
    const value = Math.round(Number(margins[side]));
    clean[side] = Number.isFinite(value) ? Math.min(MAX_MARGIN, Math.max(0, value)) : DEFAULT_TAB_MARGINS[side];
  }
  return clean;
}

/** `{ margins }` for a tab that has them, otherwise nothing. Spread into saved tabs. */
export function tabMarginsField(tab) {
  const margins = sanitizeTabMargins(tab?.margins);
  return margins ? { margins } : {};
}

/** A terminal's margins on a canvas `width` wide, matching the page terminals used to be. */
export function terminalTabMargins(width) {
  const side = Math.max(TERMINAL_MIN_SIDE, Math.round((Number(width) - TERMINAL_COLUMN) / 2) || 0);
  return { left: side, right: side, top: 40, bottom: 64 };
}

/** The margins a tab starts with: a terminal's own, otherwise the defaults. */
export function defaultMarginsForTab(tab, width) {
  return tab?.terminal ? terminalTabMargins(width) : { ...DEFAULT_TAB_MARGINS };
}

/** The margins a tab shows on a canvas `width` wide: its saved ones, otherwise its defaults. */
export function resolveTabMargins(tab, width) {
  return sanitizeTabMargins(tab?.margins) || defaultMarginsForTab(tab, width);
}

export function sameTabMargins(a, b) {
  return TAB_MARGIN_SIDES.every((side) => a?.[side] === b?.[side]);
}
