import type { Metadata, Viewport } from "next";
import Link from "next/link";
import GuidesSection from "@/components/sections/guides-section";
import { FooterSection } from "@/components/sections/footer-section";
import { getAllContent } from "@/lib/content";
import type { ContentItem } from "@/lib/content/types";
import { MetadataLookupClient } from "./metadata-lookup-client";
import { PolymarketMetadataFAQSection } from "./polymarket-metadata-faq-section";

const CANONICAL = "https://lycheedata.com/polymarket-metadata";
const OG_IMAGE = "https://lycheedata.com/og-polymarket-metadata.png";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://lycheedata.com"),
  applicationName: "Lychee Polymarket Metadata Lookup",
  category: "Developer Tools",
  title: {
    absolute: "Polymarket Metadata Lookup Tool – Find Market ID, Event ID & Slugs Instantly",
  },
  description:
    "Search any Polymarket prediction and instantly find the market ID, event ID, slug, and structured metadata. No API, no GraphQL, no coding required.",
  keywords: [
    "polymarket metadata",
    "polymarket market id",
    "polymarket event id",
    "polymarket slug",
    "polymarket api",
    "polymarket data",
    "polymarket lookup",
    "prediction market metadata",
    "polymarket gamma api",
    "polymarket graphql",
  ],
  authors: [{ name: "LycheeData" }],
  alternates: {
    canonical: CANONICAL,
    languages: {
      en: CANONICAL,
    },
  },
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
    title: "Polymarket Metadata Lookup Tool",
    description:
      "Find Polymarket market IDs, event IDs, and slugs instantly. Search prediction markets without using APIs or GraphQL.",
    type: "website",
    url: CANONICAL,
    siteName: "Lychee",
    locale: "en",
    images: [{ 
      url: OG_IMAGE, 
      alt: "Polymarket Metadata Lookup Tool showing market ID, event ID, and slug search",

    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Polymarket Metadata Lookup Tool",
    description: "Search Polymarket predictions and instantly get market IDs, event IDs, and metadata.",
    images: [
      {
        url: OG_IMAGE,
        alt: "Polymarket Metadata Lookup Tool for finding market IDs and event IDs",
      },
    ],
  },
  other: {
    "content-language": "en",
  },
};

const softwareApplicationLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Polymarket Metadata Lookup Tool",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Search any Polymarket prediction and instantly find market ID, event ID, slug, and structured metadata.",
  featureList: [
    "Find Polymarket market ID",
    "Find Polymarket event ID",
    "Extract Polymarket slug",
    "Search prediction markets",
    "No API required",
  ],
  url: "https://lycheedata.com/polymarket-metadata",
  publisher: {
    "@type": "Organization",
    name: "LycheeData",
    url: "https://lycheedata.com",
  },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Polymarket metadata?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Polymarket metadata refers to structured information including market IDs, event IDs, outcome tokens, and slugs used to identify prediction markets.",
      },
    },
    {
      "@type": "Question",
      name: "How do I find a Polymarket event ID?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Search the market question in the lookup tool to instantly retrieve the event ID and related market identifiers.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need the Polymarket API?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. This tool allows you to access Polymarket metadata without using APIs or GraphQL.",
      },
    },
  ],
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://lycheedata.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Tools",
      item: "https://lycheedata.com/tools",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Polymarket Metadata",
      item: "https://lycheedata.com/polymarket-metadata",
    },
  ],
};

export default function PolymarketMetadataPage() {
  let articles: ContentItem[] = [];
  try {
    const guides = getAllContent("guides") || [];
    const blog = getAllContent("blog") || [];
    articles = [...guides, ...blog];
    articles.sort((a, b) =>
      (b.frontmatter?.publishedAt || "").localeCompare(a.frontmatter?.publishedAt || ""),
    );
  } catch (e) {
    console.warn("Content could not be loaded:", e);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationLd) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <main className="flex min-h-screen w-full flex-col items-center divide-y divide-border bg-background font-sans antialiased theme-landing scroll-smooth">
        <section className="relative w-full">
          <div className="relative isolate flex w-full flex-col items-center px-6 pb-16 pt-28 md:pt-32">
            <div className="absolute inset-0">
              <div className="hero-aura-gradient absolute inset-0 z-0 h-[520px] md:h-[600px] w-full rounded-b-xl" />
            </div>
            <div className="relative z-10 mx-auto flex w-full max-w-[65rem] flex-col items-center gap-8 text-center">
              <h1 className="max-w-4xl text-3xl font-medium tracking-tighter text-primary md:text-4xl lg:text-5xl xl:text-6xl">
                Polymarket Metadata Lookup Tool
              </h1>
              <p className="max-w-2xl text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg text-balance">
                Search any Polymarket question and instantly find the correct market ID, event ID, slug, and structured
                metadata, without using APIs, GraphQL, or code.
              </p>
              <p className="max-w-2xl text-sm font-normal leading-relaxed tracking-tight text-muted-foreground/85 md:text-base text-pretty">
                This Polymarket metadata lookup tool helps you find Polymarket market IDs, event IDs, slugs, and
                structured prediction market data. Instead of using the <Link href="/guides/polymarket-events-endpoint-no-code">Polymarket API guide</Link>, GraphQL, or manual scraping, you
                can search any prediction and instantly resolve the correct identifiers.
              </p>
              <MetadataLookupClient />
            </div>
          </div>
        </section>

        <section className="w-full px-6 py-16 sm:px-6">
          <div className="mx-auto w-full max-w-2xl space-y-10 text-left">
            <p className="text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg text-pretty">
              Polymarket data is powerful, but fragmented. If you&apos;ve ever tried to find a market ID, locate an
              event ID, extract a slug, or query Polymarket via API, you&apos;ve likely ended up digging through GraphQL
              endpoints, Gamma API docs, Reddit threads, GitHub scrapers, or outdated scripts. This tool removes all of
              that. Just search what you&apos;re looking for and get structured Polymarket metadata instantly.
            </p>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">What This Tool Does</h2>
              <ul className="list-inside list-disc space-y-2 text-base font-medium leading-relaxed text-muted-foreground">
                <li>Find market IDs instantly</li>
                <li>Resolve event IDs from natural language</li>
                <li>Extract Polymarket slugs</li>
                <li>Map queries to structured market data</li>
                <li>Eliminate API complexity</li>
                <li>Replace manual scraping workflows</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Why This Exists</h2>
              <p className="text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg text-pretty">
                Polymarket data is split across markets, events, tokens, condition IDs, and slugs. None of this is easy
                to search. Developers and traders repeatedly ask how to find the Polymarket market ID, what the event ID
                is, or why Polymarket data is difficult to access. This tool acts as a translation layer between natural
                language and structured metadata.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                How to Find a Polymarket Market ID
              </h2>
              <p className="text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg text-pretty">
                To find a Polymarket market ID, search for the prediction question using the lookup tool above. The tool
                resolves the correct market ID, event ID, and slug instantly without requiring API access.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Common Use Cases</h2>
              <ul className="list-none space-y-2 text-base font-medium leading-relaxed text-muted-foreground">
                <li>Traders: find exact markets faster than browsing</li>
                <li>Bot builders: resolve IDs for automation</li>
                <li>Analysts: map real-world events to structured prediction data</li>
                <li>Researchers: access metadata without scraping</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Problem This Solves</h2>
              <p className="text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg text-pretty">
                Most users struggle with Polymarket API complexity, confusion between event ID and market ID, lack of
                search interface, fragmented documentation, and difficulty exporting data. This tool provides a
                natural-language to structured-data bridge.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">How It Works</h2>
              <ol className="list-inside list-decimal space-y-2 text-base font-medium leading-relaxed text-muted-foreground">
                <li>Type a prediction or event</li>
                <li>We query indexed Polymarket data</li>
                <li>We match the closest market</li>
                <li>We return structured metadata instantly</li>
              </ol>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Key Concepts</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">What is a Polymarket Market ID</h3>
                  <p className="text-base font-medium leading-relaxed text-muted-foreground">
                    A unique identifier used to reference a specific tradable prediction outcome.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">What is a Polymarket Event ID</h3>
                  <p className="text-base font-medium leading-relaxed text-muted-foreground">
                    A higher-level grouping of markets representing a real-world event.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">Market ID vs Event ID</h3>
                  <p className="text-base font-medium leading-relaxed text-muted-foreground">
                    Market ID refers to an individual tradable outcome. Event ID groups related markets.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Learn More and Dive Deeper to Get Your Edge
              </h2>
            </div>
          </div>

          <PolymarketMetadataFAQSection />

          <div className="mx-auto w-full max-w-2xl pb-8 pt-4 text-left">
            <p className="text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg text-pretty">
              Stop digging through APIs and documentation. Search any Polymarket prediction and instantly get the market
              ID, event ID, slug, and structured metadata.
            </p>
          </div>

          <GuidesSection articles={articles} />
        </section>

        <FooterSection />
      </main>
    </>
  );
}
