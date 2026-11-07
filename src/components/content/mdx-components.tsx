import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import { TypographyInlineCode, VideoEmbed, YouTube } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ContentImage } from "./content-image";
import { TweetCard } from "./TweetCard";
import { LYCHEE_CONTENT_TYPE, ArticleDivider } from "./article-prose";
import { ArticleTable } from "./ArticleTable";
import { KalshiHistoricalDataQuery } from "./KalshiHistoricalDataQuery";
import { PolymarketHistoricalDataQuery } from "./PolymarketHistoricalDataQuery";
import { PublicChart } from "./PublicChart";
import { KalshiTradeHistoryRecipeDemo } from "./KalshiTradeHistoryRecipeDemo";
import { PolymarketTradeHistoryRecipeDemo } from "./PolymarketTradeHistoryRecipeDemo";
import { PolymarketHolderAnalysisRecipeDemo } from "./PolymarketHolderAnalysisRecipeDemo";
import {
  RecipeExportAnimation,
  RecipeFindMarketAnimation,
  RecipeMarketDetailsAnimation,
  RecipeRunAnimation,
  RecipeWalkthroughAnimation,
} from "./guide-animations/kalshi-trade-history-recipe-steps";
import {
  TradeRowAnatomy,
  TradeSourceRoutingDiagram,
  TradesVsCandlesChart,
} from "./guide-animations/kalshi-trade-history-diagrams";
import {
  PolymarketFillsToTradeRowDiagram,
  PolymarketSourceTimelineDiagram,
  PolymarketTradeRowAnatomy,
} from "./guide-animations/polymarket-trade-history-diagrams";
import {
  HolderFindMarketAnimation,
  HolderRunAnimation,
  HolderTablesAnimation,
  HolderTreemapAnimation,
  HolderWalkthroughAnimation,
  TraderTabAnimation,
} from "./guide-animations/polymarket-holder-analysis-animations";
import {
  ChanceBenchmarkAnimation,
  ForecastScorecardAnimation,
  HorizonFadeAnimation,
  MarketQuestionsAnimation,
  StudyScaleAnimation,
  ThinkingStyleAnimation,
} from "@/components/university/lesson-animations";
import {
  ExpectedVsActualAnimation,
  ExponentCurvesAnimation,
  NotOwedWinsAnimation,
  ProbabilityVsPriceAnimation,
  PythagoreanCalculator,
  PythagoreanSquaresAnimation,
  SameDifferentialAnimation,
  SameRecordTwoTeamsAnimation,
  ThreeNumbersAnimation,
} from "@/components/university/pythagorean-animations";
import {
  DrawnNotFittedAnimation,
  ExpectedWinsAnimation,
  GapExplorer,
  LeagueScatterExplorer,
  MarginBlindAnimation,
  RunBalanceExplorer,
  ScatterSetupAnimation,
  TableToScatterAnimation,
  WinPercentageGrid,
} from "@/components/university/expected-wins-animations";
import {
  ByEyeLinesAnimation,
  EquationAnatomyAnimation,
  InterceptZoomAnimation,
  LeastSquaresExplorer,
  NewSeasonAnimation,
  RegressionLineExplorer,
  ResidualExplorer,
  SpreadExplorer,
  TableScatterLineAnimation,
  TwoLinesAnimation,
  TwoLinesExplorer,
  WhySquareAnimation,
} from "@/components/university/linear-regression-animations";
import { NewsletterSignup } from "@/components/newsletter/newsletter-signup";

// MDX may pass legacy `ref` (string refs); use loose props to avoid @types/react version skew (e.g. @hello-pangea/dnd).
function MdxCode({ children, className, ...props }: any) {
  // Fenced blocks get a `language-*` class from the MDX compiler; inline backticks do not.
  if (className) {
    return (
      <code className={cn("font-mono text-sm", className)} {...props}>
        {children}
      </code>
    );
  }
  return <TypographyInlineCode {...props}>{children}</TypographyInlineCode>;
}

function MdxHeading({
  as: Tag,
  className,
  children,
  ...props
}: {
  as: "h1" | "h2" | "h3" | "h4";
  className: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <Tag className={className} {...props}>
      {children}
    </Tag>
  );
}

/**
 * MDX `#` lines render as h2+ so layout `ArticleTitle` is the only page H1.
 */
function MdxH1({ children, id, ...props }: any) {
  return (
    <MdxHeading as="h2" id={id} className={LYCHEE_CONTENT_TYPE.sectionH2} {...props}>
      {children}
    </MdxHeading>
  );
}

function MdxH2({ children, id, ...props }: any) {
  return (
    <MdxHeading as="h2" id={id} className={LYCHEE_CONTENT_TYPE.sectionH2} {...props}>
      {children}
    </MdxHeading>
  );
}

const SITE_HOSTS = new Set(["lycheedata.com", "www.lycheedata.com"]);

function isExternalHref(href: string) {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return !SITE_HOSTS.has(new URL(href).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Links to other sites open in a new tab; Lychee links stay in place. */
function MdxLink({ href = "", children, ...props }: any) {
  const { ref: _ref, ...rest } = props || {};
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

/** Markdown `---` → Making Software–style mono dash divider. */
function MdxHr() {
  return <ArticleDivider className="my-10 !mb-0" />;
}

/**
 * MDX components for blog/guide content.
 * - img: Standard markdown images get styled and optimized via Next.js Image
 * - ContentImage: For images with captions and explicit control
 * - VideoEmbed: iframe embed with full embed URL (any provider)
 * - YouTube: `<YouTube videoId="..." />` — id or watch/youtu.be URL
 * - Inline code: backticks or `<TypographyInlineCode>` (shadcn-style muted pill)
 * - TweetCard: `<TweetCard id="..." />` or `<TweetCard url="https://x.com/.../status/..." />`
 * - PublicChart: `<PublicChart username="..." slug="..." />`
 * - KalshiHistoricalDataQuery: `<KalshiHistoricalDataQuery />` — Kalshi markets/trades query builder
 * - PolymarketHistoricalDataQuery: `<PolymarketHistoricalDataQuery />` — Polymarket markets/trades query builder
 * - NewsletterSignup: `<NewsletterSignup />` — inline newsletter capture (hidden for logged-in users and subscribers)
 * - KalshiTradeHistoryRecipeDemo: `<KalshiTradeHistoryRecipeDemo />` — recipe preview + link into the live demo
 * - PolymarketTradeHistoryRecipeDemo: `<PolymarketTradeHistoryRecipeDemo />` — full recipe walkthrough + link into the live demo
 * - Recipe step animations: `<RecipeFindMarketAnimation />`, `<RecipeMarketDetailsAnimation />`, `<RecipeRunAnimation />`, `<RecipeExportAnimation />`,
 *   `<RecipeWalkthroughAnimation />`. Each takes `venue="kalshi" | "polymarket"` (default kalshi).
 * - Trade history diagrams: `<TradeSourceRoutingDiagram />`, `<TradesVsCandlesChart />`, `<TradeRowAnatomy />`
 * - Polymarket trade history diagrams: `<PolymarketSourceTimelineDiagram />`, `<PolymarketFillsToTradeRowDiagram />`, `<PolymarketTradeRowAnatomy />`
 * - PolymarketHolderAnalysisRecipeDemo: `<PolymarketHolderAnalysisRecipeDemo />` — full holder analysis walkthrough + link into the live demo
 * - Holder analysis animations: `<HolderFindMarketAnimation />`, `<HolderRunAnimation />`, `<HolderTablesAnimation />`,
 *   `<HolderTreemapAnimation focus="concentration" | "both" | "new" />`, `<TraderTabAnimation view="positions" | "activity" | "pnl" />`, `<HolderWalkthroughAnimation />`
 * - Pythagorean expectation lesson: `<SameRecordTwoTeamsAnimation />`, `<PythagoreanSquaresAnimation />`, `<PythagoreanCalculator />`,
 *   `<ExpectedVsActualAnimation />`, `<NotOwedWinsAnimation />`, `<ExponentCurvesAnimation />`, `<ThreeNumbersAnimation />`,
 *   `<ProbabilityVsPriceAnimation />`, `<SameDifferentialAnimation />`
 * - Actual vs expected wins lesson: `<WinPercentageGrid />`, `<MarginBlindAnimation />`, `<ExpectedWinsAnimation />`,
 *   `<RunBalanceExplorer />`, `<ScatterSetupAnimation />`, `<GapExplorer />`, `<TableToScatterAnimation />`,
 *   `<LeagueScatterExplorer />`, `<DrawnNotFittedAnimation />`
 * - Linear regression lesson: `<ByEyeLinesAnimation />`, `<EquationAnatomyAnimation />`, `<RegressionLineExplorer />`,
 *   `<InterceptZoomAnimation />`, `<ResidualExplorer />`, `<WhySquareAnimation />`, `<LeastSquaresExplorer />`,
 *   `<TwoLinesAnimation />`, `<TwoLinesExplorer />`, `<SpreadExplorer />`, `<NewSeasonAnimation />`, `<TableScatterLineAnimation />`
 * - GIFs: Use standard markdown ![alt](/path/to.gif) or ContentImage
 */
export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    h1: MdxH1,
    h2: MdxH2,
    hr: MdxHr,
    a: MdxLink,
    code: MdxCode,
    TypographyInlineCode,
    table: ({ children, ...props }: any) => {
      const { ref: _ref, ...rest } = props || {};
      return <ArticleTable {...rest}>{children}</ArticleTable>;
    },
    img: ({ src, alt }) => {
      if (!src) return null;
      const isExternal = src.startsWith("http");
      return (
        <span className="block my-6 overflow-hidden rounded-xl">
          <Image
            src={src}
            alt={alt || ""}
            width={1200}
            height={800}
            className="w-full h-auto object-contain"
            unoptimized={isExternal}
          />
        </span>
      );
    },
    ContentImage,
    TweetCard,
    VideoEmbed,
    YouTube,
    PublicChart,
    KalshiHistoricalDataQuery,
    PolymarketHistoricalDataQuery,
    KalshiTradeHistoryRecipeDemo,
    PolymarketTradeHistoryRecipeDemo,
    RecipeFindMarketAnimation,
    RecipeMarketDetailsAnimation,
    RecipeRunAnimation,
    RecipeExportAnimation,
    RecipeWalkthroughAnimation,
    TradeSourceRoutingDiagram,
    TradesVsCandlesChart,
    TradeRowAnatomy,
    PolymarketSourceTimelineDiagram,
    PolymarketFillsToTradeRowDiagram,
    PolymarketTradeRowAnatomy,
    PolymarketHolderAnalysisRecipeDemo,
    HolderFindMarketAnimation,
    HolderRunAnimation,
    HolderTablesAnimation,
    HolderTreemapAnimation,
    HolderWalkthroughAnimation,
    TraderTabAnimation,
    NewsletterSignup,
    ChanceBenchmarkAnimation,
    StudyScaleAnimation,
    HorizonFadeAnimation,
    ThinkingStyleAnimation,
    ForecastScorecardAnimation,
    MarketQuestionsAnimation,
    SameRecordTwoTeamsAnimation,
    PythagoreanSquaresAnimation,
    PythagoreanCalculator,
    ExpectedVsActualAnimation,
    NotOwedWinsAnimation,
    ExponentCurvesAnimation,
    ThreeNumbersAnimation,
    ProbabilityVsPriceAnimation,
    SameDifferentialAnimation,
    WinPercentageGrid,
    MarginBlindAnimation,
    ExpectedWinsAnimation,
    RunBalanceExplorer,
    ScatterSetupAnimation,
    GapExplorer,
    TableToScatterAnimation,
    LeagueScatterExplorer,
    DrawnNotFittedAnimation,
    ByEyeLinesAnimation,
    EquationAnatomyAnimation,
    RegressionLineExplorer,
    InterceptZoomAnimation,
    ResidualExplorer,
    WhySquareAnimation,
    LeastSquaresExplorer,
    TwoLinesAnimation,
    TwoLinesExplorer,
    SpreadExplorer,
    NewSeasonAnimation,
    TableScatterLineAnimation,
    ...components,
  };
}
