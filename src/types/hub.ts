export type HubLink = {
  title: string;
  href: string;
  description?: string;
};

export type HubCta = {
  label: string;
  href: string;
  requiresAuth?: boolean;
  ariaLabel?: string;
  /** Distinct analytics label, e.g. kalshi_historical_access_now */
  eventLabel?: string;
  tracking?: {
    page?: string;
    destination?: string;
  };
};

export type HubLinkGroup = {
  label: string;
  links: HubLink[];
};

export type HubStat = {
  label: string;
  value: string;
};

export type HubHeroBodyPart =
  | { type: "text"; value: string }
  | { type: "metric"; value: string };

export type HubHeroSection = {
  type: "hero";
  eyebrow?: string;
  title: string;
  subtitle: string;
  microtext?: string;
  supportingText?: string;
  /** Inline body copy with optional emphasized metrics (replaces microtext + supportingText when set). */
  heroBody?: { parts: HubHeroBodyPart[] };
  variant?: "default" | "premium";
  /** Featured chart shown in the premium split-layout hero (right column). */
  heroChart?: { username: string; slug: string };
  primaryCTAs: HubCta[];
  secondaryCTAs?: HubCta[];
};

export type HubPublicChartPayload = {
  chart: Record<string, unknown>;
  rows: unknown[];
  dataSheets: Record<string, unknown>;
  owner_handle?: string;
  owner_name?: string | null;
  owner_profile_pic?: string | null;
};

export type HubProofMetric = {
  value: string;
  label: string;
  static?: boolean;
  tickerValue?: number;
  decimalPlaces?: number;
  suffix?: string;
};

export type HubProofMetricsSection = {
  type: "proof_metrics";
  primaryMetrics: HubProofMetric[];
  trustMetrics: HubProofMetric[];
  capabilityPills: string[];
};

export type HubStatsSection = {
  type: "stats";
  title?: string;
  stats: HubStat[];
  variant?: "default" | "proof_strip";
};

export type HubQuerySection = {
  type: "query";
  anchorId?: string;
  title: string;
  description: string;
  examplesTitle?: string;
  examples: string[];
  cta?: HubCta;
};

export type HubTextBlockSection = {
  type: "text_block";
  title: string;
  content: string;
};

export type HubCard = {
  title: string;
  description: string;
};

export type HubCardsSection = {
  type: "cards";
  anchorId?: string;
  title: string;
  intro?: string;
  note?: string;
  cards: HubCard[];
};

export type HubBulletsSection = {
  type: "bullets";
  title: string;
  intro?: string;
  bullets: string[];
};

export type HubFaqItem = {
  question: string;
  answer: string;
};

export type HubFaqSection = {
  type: "faq";
  title: string;
  items: HubFaqItem[];
};

export type HubLinkGroupSection = {
  type: "link_group";
  anchorId?: string;
  title: string;
  groups: HubLinkGroup[];
};

export type HubCtaSection = {
  type: "cta";
  title: string;
  description: string;
  cta: HubCta;
  secondaryCta?: HubCta;
};

export type HubPublishedChartsSection = {
  type: "published_charts";
  anchorId?: string;
  title: string;
  description?: string;
};

export type HubPublishedDashboardsSection = {
  type: "published_dashboards";
  anchorId?: string;
  title: string;
  description?: string;
};

export type HubVideoInstruction = {
  videoId: string;
  title: string;
  description?: string;
  guideHref: string;
};

export type HubVideoCarouselSection = {
  type: "video_carousel";
  anchorId?: string;
  title: string;
  description?: string;
  videos: HubVideoInstruction[];
};

export type HubSection =
  | HubHeroSection
  | HubStatsSection
  | HubProofMetricsSection
  | HubQuerySection
  | HubTextBlockSection
  | HubCardsSection
  | HubBulletsSection
  | HubFaqSection
  | HubLinkGroupSection
  | HubCtaSection
  | HubPublishedChartsSection
  | HubPublishedDashboardsSection
  | HubVideoCarouselSection;

export type HubAssetFilter = {
  /** Match dashboards whose tags include any of these (case-insensitive). */
  dashboardTags?: string[];
  /** Match charts whose name or slug contains any keyword (case-insensitive). */
  chartKeywords?: string[];
  /** Always include these published charts. */
  chartSlugs?: Array<{ username: string; slug: string }>;
  /** Limit chart/dashboard queries to this owner when set. */
  username?: string;
  /** When true, keyword and lake chart queries are not scoped to `username`. */
  chartSearchAllUsers?: boolean;
  /** When true, dashboard tag queries are not scoped to `username`. */
  dashboardSearchAllUsers?: boolean;
  /** Include public charts whose dataset sheets pull from this data lake (e.g. "kalshi"). */
  chartLake?: string;
  /** Cap charts returned (default 24). */
  maxCharts?: number;
  /** Cap dashboards returned (default 24). */
  maxDashboards?: number;
};

export type HubPageConfig = {
  id: string;
  /** URL segment, e.g. "kalshi-historical-data" → /kalshi-historical-data */
  slug: string;
  /** Display / schema name */
  title: string;
  /** Overrides `<title>` and OG/Twitter titles when set */
  seoTitle?: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
  topics?: string[];
  integration?: string[];
  coverImage?: string;
  ogImage?: string;
  featured?: boolean;
  readingTime?: string;
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  sections: HubSection[];
  assetFilter?: HubAssetFilter;
};

export type HubPublishedChart = {
  username: string;
  slug: string;
  title: string;
  hasOgImage: boolean;
};

export type HubPublishedDashboard = {
  username: string;
  slug: string;
  title: string;
  description: string;
  hasOgImage: boolean;
  tags: string[];
};

export type HubPublishedAssets = {
  charts: HubPublishedChart[];
  dashboards: HubPublishedDashboard[];
};
