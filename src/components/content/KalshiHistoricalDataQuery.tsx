import dynamic from "next/dynamic";
import {
  ARTICLE_PAGE_BREAK_INNER_CLASS,
  markArticlePageBreakComponent,
} from "./article-page-break";
import { HubKalshiExplorerBranding } from "@/components/hubs/HubKalshiExplorerBranding";
import { HubKalshiQueryMockup } from "@/components/hubs/kalshiQuery/HubKalshiQueryMockup";
import { KALSHI_HISTORICAL_EXPLORE_SECTION } from "@/config/hubs/kalshiHistorical";

const HubKalshiQueryBuilder = dynamic(
  () =>
    import("@/components/hubs/kalshiQuery/HubKalshiQueryBuilder").then(
      (m) => m.HubKalshiQueryBuilder,
    ),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse bg-muted/40" /> },
);

export type KalshiHistoricalDataQueryProps = {
  /** Section heading — defaults to the hub explore-data title. */
  title?: string;
  /** Short intro under the heading — defaults to the hub explore-data description. */
  description?: string;
  /** Anchor id for in-page links, e.g. `#kalshi-historical-data-query`. */
  id?: string;
  /** Show Lychee × Kalshi branding badge (default true). */
  showBranding?: boolean;
};

/**
 * MDX: embed the Kalshi historical data query builder (same as the hub page).
 *
 * @example
 * ```mdx
 * <KalshiHistoricalDataQuery />
 * ```
 */
export function KalshiHistoricalDataQuery({
  title = KALSHI_HISTORICAL_EXPLORE_SECTION.title,
  description = KALSHI_HISTORICAL_EXPLORE_SECTION.description,
  id = "kalshi-historical-data-query",
  showBranding = true,
}: KalshiHistoricalDataQueryProps) {
  return (
    <section
      id={id}
      data-article-page-break
      className="not-prose scroll-mt-28 font-sans antialiased"
    >
      <div className={ARTICLE_PAGE_BREAK_INNER_CLASS}>
        <div className="mx-auto w-full max-w-3xl space-y-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {title}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
            {description}
          </p>
          {showBranding ? <HubKalshiExplorerBranding /> : null}
        </div>

        <div className="relative z-20 mx-auto mt-12 w-full max-w-6xl px-2 sm:px-4">
          <HubKalshiQueryMockup>
            <HubKalshiQueryBuilder embedded mockup />
          </HubKalshiQueryMockup>
        </div>
      </div>
    </section>
  );
}

markArticlePageBreakComponent(KalshiHistoricalDataQuery);
