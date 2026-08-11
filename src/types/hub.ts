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

export type HubLinkSubGroup = {
  label: string;
  links: HubLink[];
};

export type HubLinkCategory = {
  /** Omit for overview/general items — no category heading is shown. */
  label?: string;
  subgroups: HubLinkSubGroup[];
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
  /** Optional pill above the title (homepage-style). */
  badge?: string;
  /** When set, the badge is a link (shows a trailing arrow). */
  badgeHref?: string;
  /** Optional leading icon in the hero badge (matches landing `badgeIcon`). */
  badgeIcon?: "dot";
  title: string;
  subtitle: string;
  microtext?: string;
  supportingText?: string;
  /** Inline body copy with optional emphasized metrics (replaces microtext + supportingText when set). */
  heroBody?: { parts: HubHeroBodyPart[] };
  variant?: "default" | "premium";
  /** Featured chart shown in the premium split-layout hero (right column). */
  heroChart?: {
    username: string;
    slug: string;
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    caption?: string;
    captionLink?: {
      label: string;
      href: string;
    };
  };
  capabilityPills?: string[];
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
  /** Optional section title shown above the social-proof lines. */
  title?: string;
  heading?: string;
  subheading?: string;
  primaryMetrics: HubProofMetric[];
  trustMetrics: HubProofMetric[];
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
  /** Stacked Lychee + Kalshi logos and pill below the section title. */
  headerBranding?: "kalshi_historical";
  examplesTitle?: string;
  examples?: string[];
  cta?: HubCta;
};

/** Inline copy with optional links (UI); keep a plain `content`/`answer` string for JSON-LD. */
export type HubInlinePart =
  | { type: "text"; value: string }
  | { type: "link"; label: string; href: string };

export type HubTextBlockSection = {
  type: "text_block";
  title: string;
  /** Plain-text body (also used for schema / accessibility when contentParts is set). */
  content: string;
  /** When set, rendered instead of `content` so phrases can link out. */
  contentParts?: HubInlinePart[];
  /** Optional supporting line under the body paragraph. */
  supportingText?: string;
  /** Optional underlined text link after body (e.g. scroll to demo). */
  footerLink?: {
    label: string;
    href: string;
  };
  /** Reduce bottom padding so the next section reads as a continuation. */
  connectBelow?: boolean;
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
  /** Optional text link under the note (e.g. scroll to explore demo). */
  noteCta?: {
    label: string;
    href: string;
    /** DOM id to briefly highlight after scroll (e.g. guided workflow column). */
    highlightTargetId?: string;
  };
  cta?: HubCta;
  cards: HubCard[];
};

export type HubBulletsSection = {
  type: "bullets";
  title: string;
  intro?: string;
  bullets: string[];
};

export type HubComparisonColumn = {
  id: string;
  label: string;
  badge?: string;
};

export type HubComparisonRow = {
  feature: string;
  cells: Record<string, string>;
};

export type HubComparisonTableSection = {
  type: "comparison_table";
  anchorId?: string;
  title: string;
  intro?: string;
  /** Column id highlighted as the primary product (e.g. "lychee"). */
  featuredColumnId: string;
  columns: HubComparisonColumn[];
  rows: HubComparisonRow[];
  punchline?: string;
  cta?: HubCta;
  secondaryCta?: HubCta;
};

export type HubFaqItem = {
  question: string;
  /** Plain-text answer for JSON-LD and default UI. */
  answer: string;
  /** When set, rendered instead of `answer` so phrases can link out. */
  answerParts?: HubInlinePart[];
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
  description?: string;
  /** Flat topic groups (legacy / registry injection). */
  groups?: HubLinkGroup[];
  /** Category → subcategory hierarchy (Guides, Research, Charts, …). */
  categories?: HubLinkCategory[];
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

/** Contained Kalshi Live search → metadata demo (hub marketing page). */
export type HubKalshiLiveDemoSection = {
  type: "kalshi_live_demo";
  anchorId?: string;
  /** Optional heading; omit to nest visually under the previous section. */
  title?: string;
  description?: string;
  /** Continue muted band + tight top padding under the intro. */
  connectAbove?: boolean;
};

/** Bonus Kalshi Live features (event forecasts, batch candlesticks, leaderboards). */
export type HubKalshiLiveBonusFeaturesSection = {
  type: "kalshi_live_bonus_features";
  anchorId?: string;
  title?: string;
  description?: string;
};

export type HubSection =
  | HubHeroSection
  | HubStatsSection
  | HubProofMetricsSection
  | HubQuerySection
  | HubTextBlockSection
  | HubCardsSection
  | HubBulletsSection
  | HubComparisonTableSection
  | HubFaqSection
  | HubLinkGroupSection
  | HubCtaSection
  | HubPublishedChartsSection
  | HubPublishedDashboardsSection
  | HubVideoCarouselSection
  | HubKalshiLiveDemoSection
  | HubKalshiLiveBonusFeaturesSection;

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
  /** Display / schema / breadcrumb name */
  title: string;
  /**
   * Hero H1 override. When set, enrichHubConfig applies this to the hero section;
   * otherwise the hero keeps taxonomy label / section title.
   */
  heroTitle?: string;
  /** Document `<title>`; falls back to `title` */
  seoTitle?: string;
  description: string;
  /** Open Graph + Twitter title; falls back to seoTitle / title */
  socialTitle?: string;
  /** Open Graph + Twitter description; falls back to description */
  socialDescription?: string;
  keywords?: string[];
  canonical?: string;
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
  topics?: string[];
  integration?: string[];
  coverImage?: string;
  ogImage?: string;
  /** Alt text for OG/Twitter preview image */
  ogImageAlt?: string;
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
