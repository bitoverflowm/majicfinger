export type MdxPublicChartRef = {
  username: string;
  slug: string;
  /** Document order (0-based) in the MDX source. */
  order: number;
};

const PUBLIC_CHART_TAG_RE = /<PublicChart\b([^>]*)\/>/gi;
const ATTR_RE = /(\w+)=["']([^"']+)["']/g;

/**
 * Extract `<PublicChart username="…" slug="…" />` refs from MDX in document order.
 */
export function extractMdxPublicCharts(mdxSource: string): MdxPublicChartRef[] {
  const results: MdxPublicChartRef[] = [];
  let match: RegExpExecArray | null;
  let order = 0;

  while ((match = PUBLIC_CHART_TAG_RE.exec(mdxSource)) !== null) {
    const attrs = match[1] || "";
    const parsed: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = ATTR_RE.exec(attrs)) !== null) {
      parsed[attrMatch[1]] = attrMatch[2];
    }
    const username = parsed.username?.trim();
    const slug = parsed.slug?.trim();
    if (username && slug) {
      results.push({ username, slug, order: order++ });
    }
  }

  return results;
}
