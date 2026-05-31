export type HubLink = {
  title: string;
  href: string;
  description?: string;
};

export type HubCta = {
  label: string;
  href: string;
  requiresAuth?: boolean;
};

export type HubLinkGroup = {
  label: string;
  links: HubLink[];
};

export type HubStat = {
  label: string;
  value: string;
};

export type HubHeroSection = {
  type: "hero";
  title: string;
  subtitle: string;
  microtext?: string;
  primaryCTAs: HubCta[];
  secondaryCTAs?: HubCta[];
};

export type HubStatsSection = {
  type: "stats";
  title: string;
  stats: HubStat[];
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

export type HubSection =
  | HubHeroSection
  | HubStatsSection
  | HubQuerySection
  | HubTextBlockSection
  | HubLinkGroupSection
  | HubCtaSection
  | HubPublishedChartsSection;

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
  /** Include public charts whose dataset sheets pull from this data lake (e.g. "kalshi"). */
  chartLake?: string;
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
