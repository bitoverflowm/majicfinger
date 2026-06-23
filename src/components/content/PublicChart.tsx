"use client";

import { PublicChartIframe } from "./PublicChartIframe";
import { useArticleChartLoad } from "./ArticleChartLoadProvider";
import { Skeleton } from "@/components/ui/skeleton";

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

function ArticleChartPlaceholder({ height }: { height: number }) {
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-lg bg-white"
      style={{ height }}
      aria-hidden="true"
      aria-label="Chart loading"
    >
      <Skeleton className="mx-3 mt-3 h-[calc(100%-3.5rem)] w-[calc(100%-1.5rem)] rounded-lg" />
      <div className="flex items-center justify-center gap-2 px-3 pb-3">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

/**
 * MDX: embed a published interactive chart with a visible dofollow-style link for SEO.
 * Usage in MDX: `<PublicChart username="MrPink" slug="my-chart" />`
 */
export function PublicChart({
  username,
  slug,
  height = LYCHEE_CONTENT_CHART_EMBED_HEIGHT,
}: PublicChartProps) {
  const { allowed, notifyReady } = useArticleChartLoad(username, slug);
  const path = `/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}?embed=1`;
  const src = IS_DEV ? path : `${SITE.replace(/\/$/, "")}${path}`;

  return (
    <figure className="not-prose my-4 w-full max-w-full overflow-hidden sm:my-6">
      {allowed ? (
        <PublicChartIframe
          src={src}
          title={`Chart: ${slug}`}
          initialHeight={height}
          onReady={notifyReady}
        />
      ) : (
        <ArticleChartPlaceholder height={height} />
      )}
    </figure>
  );
}
