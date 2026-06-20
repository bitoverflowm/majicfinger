const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";
const IS_DEV = process.env.NODE_ENV === "development";

/** Default iframe height for lychee_content MDX embeds (20% below prior 820px). */
export const LYCHEE_CONTENT_CHART_EMBED_HEIGHT = 656;

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
    <figure className="not-prose my-6 overflow-hidden">
      <iframe
        title={`Chart: ${slug}`}
        src={src}
        width="100%"
        height={height}
        style={{ border: 0, background: "#ffffff" }}
        loading="lazy"
      />
    </figure>
  );
}
