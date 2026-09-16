import { CONNECT_HOME_CENTER_VIEW } from "@/lib/connectHomeFlow";
import { createEmptyDashboardLayout } from "@/lib/dashboardLayoutDefaults";

/** Same id as `CONNECT_WORKSPACE.BLANK` — kept local so this module stays JSX-free for unit tests. */
const BLANK_CONNECT_WORKSPACE = "blank";

export const KALSHI_POLYMARKET_COMPARE_LAYOUT_KIND = "kalshi-vs-polymarket-compare";
export const KALSHI_POLYMARKET_COMPARE_NARRATIVE_ROW_ID = "kalshi-poly-compare-narrative";
export const KALSHI_POLYMARKET_COMPARE_DEFAULT_NAME = "Kalshi vs Polymarket";
export const KALSHI_POLYMARKET_COMPARE_DEFAULT_SUBHEADING = "Live odds comparison dashboard.";

export function isKalshiPolymarketCompareLayout(layout) {
  return Boolean(
    layout &&
      typeof layout === "object" &&
      layout.kind === KALSHI_POLYMARKET_COMPARE_LAYOUT_KIND,
  );
}

export function compareNarrativeBody(pair = null) {
  const kalshiTitle = String(pair?.kalshiTitle || "").trim();
  const polyTitle = String(pair?.polyTitle || "").trim();
  if (kalshiTitle && polyTitle) {
    return `Live Kalshi vs Polymarket comparison of ${kalshiTitle} and ${polyTitle}.`;
  }
  return "Live Kalshi vs Polymarket comparison dashboard. Pick matching markets, then save and publish this workspace.";
}

export function compareDashboardTitle(pair = null) {
  const kalshiTitle = String(pair?.kalshiTitle || "").trim();
  const polyTitle = String(pair?.polyTitle || "").trim();
  if (kalshiTitle && polyTitle) return `${kalshiTitle} vs ${polyTitle}`;
  return KALSHI_POLYMARKET_COMPARE_DEFAULT_NAME;
}

export function createKalshiPolymarketCompareLayout(pair = null) {
  return {
    ...createEmptyDashboardLayout(),
    kind: KALSHI_POLYMARKET_COMPARE_LAYOUT_KIND,
    compare: { pair: pair || null },
    rows: [
      {
        id: KALSHI_POLYMARKET_COMPARE_NARRATIVE_ROW_ID,
        type: "text",
        textVariant: "paragraph",
        body: compareNarrativeBody(pair),
      },
    ],
  };
}

export function readComparePairFromLayout(layout) {
  if (!isKalshiPolymarketCompareLayout(layout)) return null;
  const pair = layout?.compare?.pair;
  if (!pair || typeof pair !== "object") return null;
  if (!pair.kalshiTicker || !pair.polyMarket) return null;
  return pair;
}

export function isCompareNarrativeRow(row) {
  return row?.id === KALSHI_POLYMARKET_COMPARE_NARRATIVE_ROW_ID;
}

/**
 * Keep extra composer rows (charts, text, card grids) when the live pair changes.
 */
export function applyComparePairToLayout(layout, pair = null) {
  const next = createKalshiPolymarketCompareLayout(pair);
  const extra = Array.isArray(layout?.rows)
    ? layout.rows.filter((row) => row && !isCompareNarrativeRow(row))
    : [];
  return {
    ...(layout && typeof layout === "object" ? layout : {}),
    ...next,
    rows: [next.rows[0], ...extra],
  };
}

export function applyComparePairToDraft(draft, pair = null) {
  const cur = draft && typeof draft === "object" ? draft : {};
  const titled = compareDashboardTitle(pair);
  const heading = String(cur.page_heading || "").trim();
  const name = String(cur.dashboard_name || "").trim();
  const sub = String(cur.page_subheading || "").trim();
  const keepHeading = heading && heading !== KALSHI_POLYMARKET_COMPARE_DEFAULT_NAME;
  const keepName = name && name !== KALSHI_POLYMARKET_COMPARE_DEFAULT_NAME;
  const keepSub =
    sub &&
    sub !== KALSHI_POLYMARKET_COMPARE_DEFAULT_SUBHEADING &&
    !sub.startsWith("Live Kalshi vs Polymarket comparison");
  return {
    ...cur,
    layout: applyComparePairToLayout(cur.layout, pair),
    dashboard_name: keepName ? cur.dashboard_name : titled,
    page_heading: keepHeading ? cur.page_heading : titled,
    page_subheading: keepSub ? cur.page_subheading : compareNarrativeBody(pair),
  };
}

/**
 * Open a Kalshi vs Polymarket comparison dashboard in the Connect workspace
 * composer so it can be saved and published with the existing dashboard flow.
 */
export function startKalshiPolymarketCompareDashboard(ctx) {
  if (!ctx) return;
  const dataSetId = ctx.loadedDataMeta?._id || ctx.savedDataSets?.[0]?._id || "";
  if (!ctx.connectWorkspace) {
    ctx.requestConnectWorkspace?.(BLANK_CONNECT_WORKSPACE, { scroll: false });
  }
  ctx.providerValue?.setPolymarketLiveDashboardActive?.(false);
  ctx.setConnectHomeAnalyzeActive?.(true);
  ctx.setConnectHomeCenterView?.(CONNECT_HOME_CENTER_VIEW.DASHBOARD);
  ctx.setRightPanelTab?.("dashboard");
  ctx.setRightPanelOpen?.(true);
  ctx.setActiveChartDashboardId?.(null);
  ctx.setChartDashboardDraft?.({
    dashboard_name: KALSHI_POLYMARKET_COMPARE_DEFAULT_NAME,
    seo_title: KALSHI_POLYMARKET_COMPARE_DEFAULT_NAME,
    tags: ["kalshi", "polymarket", "comparison"],
    keywords: ["kalshi vs polymarket", "prediction markets"],
    page_heading: KALSHI_POLYMARKET_COMPARE_DEFAULT_NAME,
    page_subheading: KALSHI_POLYMARKET_COMPARE_DEFAULT_SUBHEADING,
    layout: createKalshiPolymarketCompareLayout(null),
    theme: { background: "none", background_color: "" },
    data_set_id: dataSetId ? String(dataSetId) : "",
    public_slug: "",
    is_public: false,
  });
  ctx.requestConnectAnalyzeScroll?.();
}
