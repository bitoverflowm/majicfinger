import kalshiPatterns from "./kalshiPatterns.json";

/** @type {readonly (readonly [string, string, string, string])[]} */
const SUBCATEGORY_PATTERNS = kalshiPatterns;

export const KALSHI_GROUP_COLORS = {
  Sports: "#1f77b4",
  Politics: "#d62728",
  Crypto: "#ff7f0e",
  Finance: "#2ca02c",
  "Science/Tech": "#9467bd",
  Weather: "#17becf",
  Entertainment: "#e377c2",
  Media: "#bcbd22",
  "World Events": "#8c564b",
  Esports: "#7f7f7f",
  Other: "#aaaaaa",
};

const KNOWN_TOP_GROUPS = new Set(Object.keys(KALSHI_GROUP_COLORS));

/**
 * Map event_ticker prefix (or already-rolled-up top group label) to (group, mid, sub).
 * Mirrors Becker Python: `pattern in cat_upper` with list order preserved.
 * @param {string} categoryPrefix
 * @returns {readonly [string, string, string]}
 */
export function getKalshiHierarchy(categoryPrefix) {
  const raw = String(categoryPrefix ?? "").trim();
  if (KNOWN_TOP_GROUPS.has(raw)) {
    return [raw, raw, raw];
  }
  const catUpper = raw.toUpperCase();
  for (const row of SUBCATEGORY_PATTERNS) {
    const [pattern, group, mid, sub] = row;
    if (catUpper.includes(pattern)) {
      return [group, mid, sub];
    }
  }
  return ["Other", "Other", raw];
}

/** @param {string} categoryPrefix */
export function getKalshiTaxonomyGroup(categoryPrefix) {
  return getKalshiHierarchy(categoryPrefix)[0];
}

function hashHue(label) {
  let h = 0;
  const s = String(label ?? "");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

/** Fill for chart cells: respects rolled-up top groups and prefix taxonomy. */
export function kalshiColorForSheetCategoryLabel(label) {
  const s = String(label ?? "").trim();
  if (KNOWN_TOP_GROUPS.has(s)) {
    return KALSHI_GROUP_COLORS[s] || KALSHI_GROUP_COLORS.Other;
  }
  const g = getKalshiTaxonomyGroup(s);
  return KALSHI_GROUP_COLORS[g] || `hsl(${hashHue(s)} 55% 45%)`;
}

/**
 * Client-side roll-up matching pandas: groupby get_group(category), sum volumes and market counts.
 * @param {Record<string, unknown>[]} rows
 * @param {string} categoryAlias
 * @param {string} volumeAlias
 * @param {string} countAlias
 */
export function rollupKalshiPrefixRowsByTaxonomyGroup(rows, categoryAlias, volumeAlias, countAlias) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  /** @type {Map<string, Record<string, unknown>>} */
  const map = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const prefix = String(row[categoryAlias] ?? "");
    const group = getKalshiTaxonomyGroup(prefix);
    const vol = Number(row[volumeAlias]) || 0;
    const cnt = Number(row[countAlias]) || 0;
    const cur = map.get(group) || {
      [categoryAlias]: group,
      [volumeAlias]: 0,
      [countAlias]: 0,
    };
    cur[volumeAlias] = Number(cur[volumeAlias]) + vol;
    cur[countAlias] = Number(cur[countAlias]) + cnt;
    map.set(group, cur);
  }
  return Array.from(map.values()).sort((a, b) => Number(b[volumeAlias]) - Number(a[volumeAlias]));
}
