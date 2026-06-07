import type { Metadata } from "next";
import Link from "next/link";
import { DashboardsSection } from "@/components/sections/dashboards-section";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { absolute: "Published Dashboards Gallery · Lychee Data" },
  description:
    "Browse live, shareable data dashboards built with Lychee — Kalshi volume, prediction markets, weather analysis, and more. Interactive charts and narratives, no code required.",
  alternates: { canonical: `${SITE}/dashboards-gallery` },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Published Dashboards Gallery · Lychee Data",
    description:
      "Browse live, shareable data dashboards built with Lychee — Kalshi, Polymarket, weather, and volume analysis.",
    url: `${SITE}/dashboards-gallery`,
    siteName: "Lychee",
    type: "website",
    images: [{ url: `${SITE}/ogImage2.png`, width: 1200, height: 630, alt: "Lychee Dashboards Gallery" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Published Dashboards Gallery · Lychee Data",
    description: "Browse live, shareable data dashboards built with Lychee.",
    images: [`${SITE}/ogImage2.png`],
  },
  keywords: [
    "dashboards",
    "data dashboards",
    "Kalshi dashboards",
    "prediction market dashboards",
    "Lychee",
    "analytics",
    "data visualization",
  ],
};

function GalleryCta() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <div className="rounded-xl border border-border bg-background/80 p-6 text-center shadow-sm backdrop-blur-sm">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Published Dashboards Gallery
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live, indexable dashboards from Lychee creators — Kalshi, Polymarket, weather, volume, and more.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/#pricing"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View pricing
          </Link>
          <Link
            href="/guides"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Data guides
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardsGalleryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Published Dashboards Gallery",
    description:
      "Browse live, shareable data dashboards built with Lychee — Kalshi, prediction markets, weather analysis, and more.",
    url: `${SITE}/dashboards-gallery`,
    isPartOf: { "@type": "WebSite", name: "Lychee", url: SITE },
    publisher: { "@type": "Organization", name: "Lychee", url: SITE },
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pb-8 pt-10">
        <GalleryCta />
      </div>

      <DashboardsSection allUsers limit={120} showCta={false} />

      <div className="pb-16 pt-8">
        <GalleryCta />
      </div>
    </main>
  );
}
