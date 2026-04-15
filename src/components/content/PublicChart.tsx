import Link from "next/link";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

type PublicChartProps = {
  username: string;
  slug: string;
  height?: number;
};

/**
 * MDX: embed a published interactive chart with a visible dofollow-style link for SEO.
 * Usage in MDX: `<PublicChart username="MrPink" slug="my-chart" />`
 */
export function PublicChart({ username, slug, height = 480 }: PublicChartProps) {
  const path = `/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`;
  const src = `${SITE.replace(/\/$/, "")}${path}`;
  return (
    <figure className="my-8 space-y-2">
      <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
        <iframe title={`Chart: ${slug}`} src={src} width="100%" height={height} style={{ border: 0 }} loading="lazy" />
      </div>
      <figcaption className="text-center text-sm text-muted-foreground">
        <Link href={src} className="font-medium text-foreground underline">
          View this chart on Lychee Data
        </Link>
        {" · "}
        <Link href={SITE} className="underline">
          lycheedata.com
        </Link>
      </figcaption>
    </figure>
  );
}
