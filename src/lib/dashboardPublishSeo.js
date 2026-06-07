/**
 * SEO completeness checks for publishing a dashboard.
 * Ensures crawlers receive H1, meta description, and substantive content.
 */
export function collectChartIdsFromLayout(layout) {
  const ids = new Set();
  if (!layout || typeof layout !== "object") return ids;
  const rows = Array.isArray(layout.rows) ? layout.rows : [];
  for (const row of rows) {
    if (!row || row.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      if (col?.chart_id) ids.add(String(col.chart_id));
    }
  }
  return ids;
}

export function validateDashboardPublishSeo({ layout, page_heading, page_subheading }) {
  const heading = String(page_heading || "").trim();
  const sub = String(page_subheading || "").trim();
  if (!heading) {
    return "Page heading is required to publish (becomes the H1 for search engines).";
  }
  if (!sub) {
    return "Page subheading is required to publish (becomes the meta description).";
  }

  const chartIds = collectChartIdsFromLayout(layout);
  let textBlocks = 0;
  const rows = Array.isArray(layout?.rows) ? layout.rows : [];
  for (const row of rows) {
    if (row?.type === "text" && String(row.body || "").trim()) textBlocks += 1;
  }

  if (chartIds.size === 0 && textBlocks === 0) {
    return "Add at least one chart or narrative text block before publishing.";
  }

  return null;
}
