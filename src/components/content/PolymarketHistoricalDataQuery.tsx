import dynamic from "next/dynamic";
import {
  ARTICLE_PAGE_BREAK_INNER_CLASS,
  markArticlePageBreakComponent,
} from "./article-page-break";
import {
  KalshiExplorerDemoChrome,
  type KalshiDemoReadingKind,
} from "./KalshiExplorerDemoChrome";
import { HubPolymarketExplorerBranding } from "@/components/hubs/HubPolymarketExplorerBranding";
import { HubKalshiQueryMockup } from "@/components/hubs/kalshiQuery/HubKalshiQueryMockup";
import { POLYMARKET_HISTORICAL_EXPLORE_SECTION } from "@/config/hubs/polymarketHistorical";

const HubPolymarketQueryBuilder = dynamic(
  () =>
    import("@/components/hubs/polymarketQuery/HubPolymarketQueryBuilder").then(
      (m) => m.HubPolymarketQueryBuilder,
    ),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse bg-muted/40" /> },
);

export type PolymarketHistoricalDataQueryProps = {
  /** Section heading — defaults to the hub explore-data title. */
  title?: string;
  /** Short intro under the heading — defaults to the hub explore-data description. */
  description?: string;
  /** Anchor id for in-page links, e.g. `#polymarket-historical-data-query`. */
  id?: string;
  /** Show Lychee × Polymarket branding badge (default true). */
  showBranding?: boolean;
  /**
   * Wording for the continue link: research vs guide.
   * When omitted, inferred from the current `/guides/...` slug via the content registry.
   */
  readingKind?: KalshiDemoReadingKind;
};

/**
 * MDX: embed the Polymarket historical data query builder (same as the hub page).
 *
 * @example
 * ```mdx
 * <PolymarketHistoricalDataQuery />
 * ```
 */
export function PolymarketHistoricalDataQuery({
  title = POLYMARKET_HISTORICAL_EXPLORE_SECTION.title,
  description = POLYMARKET_HISTORICAL_EXPLORE_SECTION.description,
  id = "polymarket-historical-data-query",
  showBranding = true,
  readingKind,
}: PolymarketHistoricalDataQueryProps) {
  return (
    <section
      id={id}
      data-article-page-break
      className="not-prose scroll-mt-28 font-sans antialiased"
    >
      <div className={ARTICLE_PAGE_BREAK_INNER_CLASS}>
        <div className="mx-auto w-full max-w-3xl space-y-4 text-center">
          <KalshiExplorerDemoChrome sectionId={id} readingKind={readingKind} />
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {title}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
            {description}
          </p>
          {showBranding ? <HubPolymarketExplorerBranding /> : null}
        </div>

        <div className="relative z-20 mx-auto mt-12 w-full max-w-6xl px-2 sm:px-4">
          <HubKalshiQueryMockup>
            <HubPolymarketQueryBuilder embedded mockup />
          </HubKalshiQueryMockup>
        </div>
      </div>
    </section>
  );
}

markArticlePageBreakComponent(PolymarketHistoricalDataQuery);
