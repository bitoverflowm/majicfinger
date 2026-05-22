/**
 * Curated resources on the marketing homepage (above the live demo).
 * Guide entries resolve title / cover / description from MDX at build time.
 */

export type LandingFeaturedGuideRef = {
  kind: "guide";
  slug: string;
};

export type LandingFeaturedDashboardRef = {
  kind: "dashboard";
  href: string;
  title: string;
  description: string;
  image: string;
};

export type LandingFeaturedResourceRef =
  | LandingFeaturedGuideRef
  | LandingFeaturedDashboardRef;

export const LANDING_FEATURED_RESOURCE_LINKS: LandingFeaturedResourceRef[] = [
  {
    kind: "dashboard",
    href: "/misterrpink/dashboards/kalshi-volume-dashboard",
    title: "Kalshi Trading Volume Dashboard",
    description:
      "Quarterly volume trends, category activity, and shareable Kalshi market insights—built entirely in Lychee.",
    image: "/images/guides/kalshi-volume/main.png",
  },
  { kind: "guide", slug: "kalshi-weather-probability-convergence-chart" },
  { kind: "guide", slug: "kalshi-weather-prediction-markets-analysis" },
  { kind: "guide", slug: "kalshi-volume-chart-guide" },
  { kind: "guide", slug: "kalshi-volume" },
  { kind: "guide", slug: "kalshi-historical-data" },
];
