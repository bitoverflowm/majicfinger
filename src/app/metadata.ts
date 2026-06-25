import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

/** Primary SEO title (also used as `openGraph.title` / `twitter.title` unless a route overrides). */
export const defaultTitle = `Prediction Market Data Platform for Kalshi & Polymarket | Lychee`;

/** Long-form marketing description for search + social cards. */
export const defaultDescription = "Analyze live and historical prediction market data from Kalshi and Polymarket. Build charts, dashboards, exports, and backtests without code or setup."

const ogImagePath = "/ogImage2.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/logo.png",
  },
  title: {
    default: defaultTitle,
    template: `%s - ${siteConfig.name}`,
  },
  description: defaultDescription,
  keywords: [
    "Lychee",
    "Polymarket",
    "prediction markets",
    "Kalshi",
    "quant",
    "dashboards",
    "data analysis",
    "charts",
    "no-code",
    "analytics",
    "trading data",
    "market data",
    "Next.js",
    "React",
  ],
  authors: [
    {
      name: siteConfig.name,
      url: siteConfig.url,
    },
    {
      name: "misterrpink1",
      url: siteConfig.links.github,
    },
  ],
  creator: "misterrpink1",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: defaultTitle,
    description: defaultDescription,
    siteName: siteConfig.name,
    images: [
      {
        url: ogImagePath,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — OG image`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    creator: "@misterrpink1",
    site: "@misterrpink1",
    images: [ogImagePath],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION && {
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
  }),
};
