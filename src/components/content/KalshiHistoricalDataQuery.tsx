import dynamic from "next/dynamic";
import {
  ARTICLE_PAGE_BREAK_INNER_CLASS,
  markArticlePageBreakComponent,
} from "./article-page-break";

const HubKalshiQueryBuilder = dynamic(
  () =>
    import("@/components/hubs/kalshiQuery/HubKalshiQueryBuilder").then(
      (m) => m.HubKalshiQueryBuilder,
    ),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse bg-muted/40" /> },
);

export type KalshiHistoricalDataQueryProps = {
  /** Section heading. */
  title?: string;
  /** Short intro under the heading (SEO + context for the guide). */
  description?: string;
  /** Anchor id for in-page links, e.g. `#kalshi-historical-data-query`. */
  id?: string;
};

/**
 * MDX: embed the Kalshi historical data query builder (same as the hub page).
 *
 * @example
 * ```mdx
 * <KalshiHistoricalDataQuery />
 * ```
 *
 * @example
 * ```mdx
 * <KalshiHistoricalDataQuery
 *   title="Search Kalshi weather markets now"
 *   description="Filter markets by category or pull trade history for a specific ticker."
 * />
 * ```
 */
export function KalshiHistoricalDataQuery({
  title = "Kalshi Historical Data API & Search",
  description = "Query Kalshi historical markets or trade data — select columns, add filters, and run your request in Lychee. No credit card required.",
  id = "kalshi-historical-data-query",
}: KalshiHistoricalDataQueryProps) {
  return (
    <section
      id={id}
      data-article-page-break
      className="not-prose scroll-mt-28 font-sans antialiased"
    >
      <div className={ARTICLE_PAGE_BREAK_INNER_CLASS}>
        <div className="w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <div className="space-y-1.5 border-b border-border/60 px-4 py-4 text-center md:px-5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {description}
            </p>
          </div>
          <HubKalshiQueryBuilder embedded />
        </div>
      </div>
    </section>
  );
}

markArticlePageBreakComponent(KalshiHistoricalDataQuery);
