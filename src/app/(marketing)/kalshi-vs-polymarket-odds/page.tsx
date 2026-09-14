import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { KalshiVsPolymarketCompareTool } from "./compare-tool";
import { HubCtaButton } from "@/components/hubs/HubCtaButton";
import { HubHashScrollManager } from "@/components/hubs/HubHashScrollManager";
import { SafariBrowserFrame } from "@/components/hubs/kalshiLiveDemo/SafariBrowserFrame";
import { HubSectionRenderer } from "@/components/hubs/HubSections";
import { BentoSection } from "@/components/sections/bento-section";
import { DashboardDemoSectionLazy } from "@/components/sections/dashboard-demo-section-lazy";
import { FAQSection } from "@/components/sections/faq-section";
import { FooterSection } from "@/components/sections/footer-section";
import { EMPTY_HUB_ASSETS } from "@/lib/hubs/loadHubPage";
import { kalshiVsPolymarketBentoItems } from "@/lib/kalshiVsPolymarketBento";
import {
  KALSHI_VS_POLYMARKET_CANONICAL,
  kalshiVsPolymarketLanding as copy,
} from "@/lib/kalshiVsPolymarketLanding";
import { getSiteUrl } from "@/lib/site";
import type { HubSection } from "@/types/hub";

const SITE = getSiteUrl();

export const revalidate = 300;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { absolute: copy.seoTitle },
  description: copy.metaDescription,
  keywords: [...copy.keywords],
  alternates: {
    canonical: KALSHI_VS_POLYMARKET_CANONICAL,
    languages: { en: KALSHI_VS_POLYMARKET_CANONICAL },
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
    title: copy.ogTitle,
    description: copy.ogDescription,
    type: "website",
    url: KALSHI_VS_POLYMARKET_CANONICAL,
    siteName: "Lychee",
    locale: "en",
    images: [
      {
        url: copy.ogImage,
        width: 1200,
        height: 630,
        alt: copy.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: copy.ogTitle,
    description: copy.ogDescription,
    images: [{ url: copy.ogImage, alt: copy.ogImageAlt }],
  },
};

const webPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: copy.seoTitle,
  description: copy.metaDescription,
  url: KALSHI_VS_POLYMARKET_CANONICAL,
  isPartOf: { "@type": "WebSite", name: "Lychee", url: SITE },
  publisher: {
    "@type": "Organization",
    name: "LycheeData",
    url: SITE,
  },
};

const softwareApplicationLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kalshi vs Polymarket Odds Comparison",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: copy.metaDescription,
  url: KALSHI_VS_POLYMARKET_CANONICAL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  publisher: {
    "@type": "Organization",
    name: "LycheeData",
    url: SITE,
  },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: copy.faq.items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: copy.navLabel,
      item: KALSHI_VS_POLYMARKET_CANONICAL,
    },
  ],
};

function renderSection(section: HubSection) {
  return (
    <HubSectionRenderer section={section} assets={EMPTY_HUB_ASSETS} index={0} />
  );
}

function CompareHero() {
  return (
    <section id="compare" className="relative w-full scroll-mt-28 overflow-visible">
      <div className="relative z-10 mx-auto flex w-full max-w-[73rem] flex-col items-center gap-6 px-6 pb-4 pt-32 md:gap-8 md:pb-6 md:pt-32">
        <p className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-border bg-accent px-3 text-center text-sm text-foreground">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="leading-tight">{copy.hero.eyebrow}</span>
        </p>
        <div className="flex w-full flex-col items-center gap-4 pb-16 text-center">
          <h1 className="max-w-4xl text-balance text-3xl font-medium tracking-tighter text-primary md:text-4xl lg:text-5xl">
            {copy.hero.title}
          </h1>
          <p className="max-w-2xl text-balance text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg">
            {copy.hero.description}
          </p>
          <p className="text-sm font-medium text-foreground md:text-base">
            {copy.hero.trustLine}
          </p>
        </div>

        <div className="w-full max-w-[70rem]">
          <KalshiVsPolymarketCompareTool />
        </div>

        <div className="flex max-w-2xl flex-col items-center gap-3 pb-8 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base text-pretty">
            {copy.hero.belowTool}
          </p>
          <HubCtaButton cta={copy.hero.cta} variant="primary" />
          <p className="text-sm text-muted-foreground">{copy.hero.ctaHelper}</p>
        </div>
      </div>
    </section>
  );
}

function DashboardConversionSection() {
  return (
    <section
      id="dashboard-preview"
      className="w-full scroll-mt-28 px-6 py-16 sm:px-8 md:px-10 md:py-24"
    >
      <div className="mx-auto w-full max-w-4xl space-y-10 px-2 sm:px-0">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-secondary">
            {copy.dashboard.eyebrow}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {copy.dashboard.title}
          </h2>
          {copy.dashboard.intro.split("\n\n").map((paragraph) => (
            <p
              key={paragraph.slice(0, 48)}
              className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[min(100%,84rem)]">
        <DashboardDemoSectionLazy />
      </div>

      <div className="mx-auto mt-10 w-full max-w-4xl space-y-8 px-2 sm:px-0">
        <ul className="grid gap-4 sm:grid-cols-2">
          {copy.dashboard.cards.map((card) => (
            <li
              key={card.title}
              className="flex flex-col rounded-xl border border-border bg-background p-5 shadow-sm"
            >
              <h3 className="font-semibold text-foreground">{card.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                {card.description}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <HubCtaButton cta={copy.dashboard.primaryCta} variant="primary" />
          <HubCtaButton cta={copy.dashboard.secondaryCta} variant="secondary" />
        </div>
        <p className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
          {copy.dashboard.helper}
        </p>
      </div>
    </section>
  );
}

function WorkspaceVisual() {
  return (
    <div className="w-full px-6 pb-16 sm:px-8 md:px-10 md:pb-24">
      <SafariBrowserFrame
        url="lycheedata.com/dashboard"
        className="mx-auto w-full max-w-5xl"
      >
        <Image
          src="/landing_dashboard.png"
          alt="Lychee workspace with prediction market charts and live data"
          width={1600}
          height={900}
          className="h-auto w-full"
        />
      </SafariBrowserFrame>
    </div>
  );
}

export default function KalshiVsPolymarketOddsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <HubHashScrollManager />

      <main className="flex min-h-screen w-full flex-col items-stretch divide-y divide-border bg-background font-sans antialiased theme-landing scroll-smooth">
        <CompareHero />

        <BentoSection
          id={copy.bento.id}
          eyebrow={copy.bento.eyebrow}
          title={copy.bento.title}
          description={copy.bento.description}
          items={kalshiVsPolymarketBentoItems}
          compact
        />

        {renderSection({
          type: "text_block",
          title: copy.whyItMatters.title,
          content: copy.whyItMatters.content,
        })}

        <DashboardConversionSection />

        <div>
          {renderSection({
            type: "cards",
            eyebrow: copy.platform.eyebrow,
            title: copy.platform.title,
            intro: copy.platform.intro,
            cards: [...copy.platform.cards],
          })}
          <WorkspaceVisual />
        </div>

        <div>
          {renderSection({
            type: "pricing",
            anchorId: "compare-pricing",
            eyebrow: copy.pricing.eyebrow,
            title: copy.pricing.title,
            description: copy.pricing.description,
          })}
          <p className="mx-auto max-w-2xl px-6 pb-12 text-center text-sm leading-relaxed text-muted-foreground md:text-base text-pretty">
            {copy.pricing.below}
          </p>
        </div>

        <FAQSection
          title={copy.faq.title}
          description=""
          items={copy.faq.items.map((item, index) => ({
            id: index + 1,
            question: item.question,
            answer: item.answer,
          }))}
        />

        <section className="w-full px-6 py-20 md:py-28">
          <div className="mx-auto w-full max-w-4xl space-y-12">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {copy.related.title}
            </h2>
            <ul className="mx-auto w-full max-w-xl space-y-2">
              {copy.related.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex flex-wrap gap-x-2 text-base leading-relaxed hover:underline underline-offset-2"
                    prefetch={false}
                  >
                    <span className="font-medium text-foreground group-hover:text-primary">
                      {link.title}:
                    </span>
                    <span className="text-muted-foreground">{link.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {renderSection({
          type: "cta",
          title: copy.closing.title,
          description: copy.closing.description,
          cta: copy.closing.cta,
          secondaryCta: copy.closing.secondaryCta,
          supportLine: copy.closing.supportLine,
        })}

        <FooterSection />
      </main>
    </>
  );
}
