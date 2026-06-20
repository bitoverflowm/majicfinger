import { PublicChartIframe } from "./PublicChartIframe";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";
const IS_DEV = process.env.NODE_ENV === "development";

/** Fallback iframe height before embed auto-resize reports true content height. */
export const LYCHEE_CONTENT_CHART_EMBED_HEIGHT = 520;

type PublicChartProps = {
  username: string;
  slug: string;
  /** Pixel height of the embed iframe (chart + footer). Default tuned for guide layouts. */
  height?: number;
};

/**
 * MDX: embed a published interactive chart with a visible dofollow-style link for SEO.
 * Usage in MDX: `<PublicChart username="MrPink" slug="my-chart" />`
 */
export function PublicChart({
  username,
  slug,
  height = LYCHEE_CONTENT_CHART_EMBED_HEIGHT,
}: PublicChartProps) {
  const path = `/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}?embed=1`;
  const src = IS_DEV ? path : `${SITE.replace(/\/$/, "")}${path}`;
  return (
    <figure className="not-prose my-6">
      <PublicChartIframe src={src} title={`Chart: ${slug}`} initialHeight={height} />
    </figure>
  );
}
