/**
 * Published dashboards load chart data in fixed groups (layout order, CHART_CHUNK_SIZE per group)
 * so every visitor requests identical URLs and the CDN can serve them. The page preloads the
 * first group's URL so above-the-fold data downloads alongside the JS bundle.
 */

export const CHART_CHUNK_SIZE = 6;

type LayoutLike = {
  rows?: Array<{ type?: string; columns?: Array<{ chart_id?: string | null } | null> } | null>;
} | null | undefined;

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export function layoutChartIds(layout: LayoutLike): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const row of layout?.rows || []) {
    if (!row || row.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      const id = col?.chart_id ? String(col.chart_id) : "";
      if (!id || !OBJECT_ID_RE.test(id) || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function publicChartChunkUrl(username: string, slug: string, ids: string[]): string {
  return `/api/public/dashboards/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/charts?ids=${ids.join(",")}`;
}

export function chunkChartIds(ids: string[], size = CHART_CHUNK_SIZE): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}
