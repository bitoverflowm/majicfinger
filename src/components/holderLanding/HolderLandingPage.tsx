import type { Metadata } from "next";
import Link from "next/link";

import { FAQSection } from "@/components/sections/faq-section";
import { loadHolderLandingSubjects } from "@/lib/holderLanding/featuredSubjects";
import { HOLDER_LANDING_PAGES, HOLDER_PATHS } from "@/lib/holderLanding/pages";
import { getSiteUrl } from "@/lib/site";
import { HolderLandingExperience } from "./holderLandingExperience";

const SITE = getSiteUrl();

type PageKey = keyof typeof HOLDER_LANDING_PAGES;

type Step = { id: string; nav: string; title: string; body: string };
type Chapter = { id: string; label: string; summary: string; steps: Step[] };
type FaqItem = { question: string; answer: string; href?: string };
type Page = {
  key: string;
  path: string;
  navLabel: string;
  seo: { title: string; description: string; ogTitle: string; ogDescription: string; ogImage: string; ogImageAlt: string };
  hero: { title: string; description: string };
  chapters: Chapter[];
  faq: FaqItem[];
  related: { href: string; title: string; description: string }[];
};

function pageOf(key: PageKey) {
  return HOLDER_LANDING_PAGES[key] as unknown as Page;
}

export function holderLandingMetadata(key: PageKey): Metadata {
  const page = pageOf(key);
  const canonical = `${SITE}${page.path}`;
  return {
    metadataBase: new URL(SITE),
    title: { absolute: page.seo.title },
    description: page.seo.description,
    alternates: { canonical, languages: { en: canonical } },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      title: page.seo.ogTitle,
      description: page.seo.ogDescription,
      type: "website",
      url: canonical,
      siteName: "Lychee",
      locale: "en_US",
      images: [{ url: `${SITE}${page.seo.ogImage}`, width: 1200, height: 630, alt: page.seo.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@misterrpink1",
      creator: "@misterrpink1",
      title: page.seo.ogTitle,
      description: page.seo.ogDescription,
      images: [{ url: `${SITE}${page.seo.ogImage}`, alt: page.seo.ogImageAlt }],
    },
    other: { "content-language": "en" },
  };
}

function structuredData(page: Page) {
  const canonical = `${SITE}${page.path}`;
  const crumbs = [
    { name: "Home", item: SITE },
    ...(page.key !== "flagship" ? [{ name: "Holder Terminal", item: `${SITE}${HOLDER_PATHS.flagship}` }] : []),
    { name: page.navLabel, item: canonical },
  ];
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.seo.title,
      description: page.seo.description,
      url: canonical,
      inLanguage: "en",
      isPartOf: { "@type": "WebSite", name: "Lychee", url: SITE },
      primaryImageOfPage: { "@type": "ImageObject", url: `${SITE}${page.seo.ogImage}`, width: 1200, height: 630 },
      publisher: { "@type": "Organization", name: "LycheeData", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Lychee Holder Terminal",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description: page.seo.description,
      url: canonical,
      featureList: page.chapters.flatMap((chapter) => chapter.steps.map((step) => step.nav)),
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "LycheeData", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: crumb.item })),
    },
  ];
}

/** One Holder Terminal landing page: hero and guided walkthrough, FAQ, and links to its siblings. */
export async function HolderLandingPage({ pageKey }: { pageKey: PageKey }) {
  const page = pageOf(pageKey);
  const initial = await loadHolderLandingSubjects();

  return (
    <main className="flex min-h-screen w-full flex-col items-stretch divide-y divide-border bg-background font-sans antialiased theme-landing">
      {structuredData(page).map((data) => (
        <script key={data["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}

      <HolderLandingExperience pageKey={pageKey} initial={initial} />

      <FAQSection
        title="Frequently asked questions"
        description=""
        items={page.faq.map((item, index) => ({ id: index + 1, question: item.question, answer: item.answer }))}
      />

      <section className="w-full px-6 py-16 md:py-24">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          <h2 className="text-center text-2xl font-medium tracking-tighter text-foreground md:text-3xl">Keep exploring</h2>
          <ul className="mx-auto grid w-full max-w-3xl gap-3 sm:grid-cols-2">
            {page.related.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="flex h-full flex-col gap-1 rounded-xl bg-muted p-5 transition-colors hover:bg-muted/70">
                  <span className="font-medium text-primary">{link.title} →</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{link.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
