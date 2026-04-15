const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";
const IS_DEV = process.env.NODE_ENV === "development";

type PublicChartProps = {
  username: string;
  slug: string;
  height?: number;
};

/**
 * MDX: embed a published interactive chart with a visible dofollow-style link for SEO.
 * Usage in MDX: `<PublicChart username="MrPink" slug="my-chart" />`
 */
export function PublicChart({ username, slug, height = 500 }: PublicChartProps) {
  const path = `/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`;
  const src = IS_DEV ? path : `${SITE.replace(/\/$/, "")}${path}`;
  return (
    <figure className="my-4">
      <div className="">
        <iframe title={`Chart: ${slug}`} src={src} width="100%" height={height} style={{ border: 0 }} loading="lazy" />
      </div>
    </figure>
  );
}
