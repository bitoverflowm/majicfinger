import dynamic from "next/dynamic";

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
    <section id={id} className="not-prose my-12 scroll-mt-28">
      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 bg-background">
        <div className="mx-auto max-w-3xl space-y-3 px-6 pb-2 pt-8 text-center md:pt-10">
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base text-pretty">
            {description}
          </p>
        </div>
        <div className="relative z-20 w-full">
          <HubKalshiQueryBuilder />
        </div>
      </div>
    </section>
  );
}
