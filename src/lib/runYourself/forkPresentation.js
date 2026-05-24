import { RUN_YOURSELF_ALL_CATEGORIES } from "@/config/runYourselfDashboardCharts";

/** @param {string} raw @param {number} [maxLen] */
export function slugifyForkTabName(raw, maxLen = 48) {
  let s = String(raw || "")
    .trim()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/_+$/, "");
  return s || "data";
}

const MARKET_TITLE_STOP = new Set([
  "will",
  "the",
  "be",
  "a",
  "an",
  "in",
  "on",
  "at",
  "by",
  "for",
  "to",
  "of",
  "and",
  "or",
  "is",
  "was",
  "are",
  "who",
  "what",
  "when",
  "where",
  "how",
]);

/** Shorter tab slug from a full market title / question. */
export function slugifyMarketTitle(title) {
  const t = String(title || "").trim();
  if (!t) return "market";
  const words = t
    .replace(/[?!.,:;'"()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const significant = words
    .filter((w) => !MARKET_TITLE_STOP.has(w.toLowerCase()))
    .slice(0, 5);
  if (significant.length >= 2) return slugifyForkTabName(significant.join(" "));
  return slugifyForkTabName(t.slice(0, 72));
}

/**
 * @param {{
 *   runConfig?: { label?: string };
 *   paramValue?: string;
 *   parameterMode?: string;
 *   patchKind?: "category" | "ticker";
 * }} opts
 */
export function buildForkPresentationContext({ runConfig, paramValue, parameterMode, patchKind }) {
  const analysisLabel = String(runConfig?.label || "Analysis").trim() || "Analysis";
  const analysisSlug = slugifyForkTabName(analysisLabel);
  const rawParam = String(paramValue || "").trim();
  const allCategories = rawParam === RUN_YOURSELF_ALL_CATEGORIES;
  const paramLabel = rawParam && !allCategories ? rawParam : null;

  const mode = String(parameterMode || "");
  const isCategory =
    patchKind === "category" ||
    mode === "category" ||
    mode === "category_optional" ||
    mode === "category_dropdown" ||
    mode === "dual_category_optional";

  const categoryLabel = isCategory && paramLabel ? paramLabel : null;
  const marketLabel = !isCategory && paramLabel ? paramLabel : null;

  let subjectSlug = analysisSlug;
  if (marketLabel) subjectSlug = slugifyMarketTitle(marketLabel);
  else if (categoryLabel) subjectSlug = `${analysisSlug}_${slugifyForkTabName(categoryLabel)}`;

  return {
    analysisLabel,
    analysisSlug,
    marketLabel,
    categoryLabel,
    subjectSlug,
    paramLabel,
  };
}

/**
 * @param {object | object[] | null | undefined} cp
 * @param {{ analysisHeading?: string; marketSubheading?: string }} labels
 */
export function applyPresentationToChartProperties(cp, { analysisHeading, marketSubheading }) {
  const list = Array.isArray(cp) ? cp : cp && typeof cp === "object" ? [cp] : [];
  const props = list[0] && typeof list[0] === "object" ? list[0] : {};
  const next = JSON.parse(JSON.stringify(props));
  const heading = String(analysisHeading || next.title || "").trim();
  const sub = String(marketSubheading || "").trim();

  if (heading) next.title = heading;
  if (next.rechartsBuilder && typeof next.rechartsBuilder === "object") {
    if (heading) next.rechartsBuilder.title = heading;
    if (sub) {
      next.rechartsBuilder.subTitle = sub;
      next.rechartsBuilder.subTitleHidden = false;
    }
  } else if (heading || sub) {
    next.rechartsBuilder = {
      v: 1,
      ...(heading ? { title: heading } : {}),
      ...(sub ? { subTitle: sub, subTitleHidden: false } : {}),
    };
  }
  return Array.isArray(cp) ? [next, ...list.slice(1)] : next;
}

/** @param {string} analysisHeading @param {string} [marketSubheading] */
export function forkChartDisplayName(analysisHeading, marketSubheading) {
  const h = String(analysisHeading || "").trim();
  const s = String(marketSubheading || "").trim();
  if (h && s) return `${h} — ${s}`.slice(0, 100);
  return h.slice(0, 100) || "Chart";
}

/**
 * Resolve per-chart subheading for dashboard forks.
 * @param {object} slotParams
 * @param {string} parameterMode
 * @param {{ categoryLabel?: string; marketLabel?: string }} global
 */
export function forkChartSubheadingFromParams(slotParams, parameterMode, global) {
  const mode = String(parameterMode || "");
  if (mode === "dual_category_optional") {
    const k = slotParams?.kalshiCategory;
    const p = slotParams?.polymarketCategory;
    const parts = [];
    if (k && k !== RUN_YOURSELF_ALL_CATEGORIES) parts.push(`Kalshi: ${k}`);
    if (p && p !== RUN_YOURSELF_ALL_CATEGORIES) parts.push(`Polymarket: ${p}`);
    if (parts.length) return parts.join(" · ");
  }
  if (mode === "category_optional" || mode === "category") {
    const c = slotParams?.kalshiCategory || slotParams?.category || slotParams?.value;
    if (c && c !== RUN_YOURSELF_ALL_CATEGORIES) return String(c);
  }
  if (mode === "trade_search" || mode === "market_search") {
    const t = slotParams?.ticker || slotParams?.value;
    if (t) return String(t);
  }
  return global.categoryLabel || global.marketLabel || "";
}
