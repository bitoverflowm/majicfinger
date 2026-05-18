import { siteConfig } from "@/lib/config";

/** Server-rendered JSON-LD blocks (Organization, WebSite, FAQ, SoftwareApplication, Offers). */
export function LandingJsonLd() {
  const url = siteConfig.url;
  const name = siteConfig.name;
  const logoUrl = `${url}/logo.png`;

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo: logoUrl,
    sameAs: [siteConfig.links.twitter, siteConfig.links.github].filter(Boolean),
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const faqs = siteConfig.faqSection?.faQitems ?? [];
  const faqPage = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: q.answer,
          },
        })),
      }
    : null;

  /** Subscription tiers — schema-friendly Offer list under one SoftwareApplication entity. */
  const offers = (siteConfig.pricingSection?.pricingItems || [])
    .map((tier) => {
      const priceStr = tier.priceMonthly || tier.priceWeekly || tier.priceAnnual;
      if (!priceStr) return null;
      const numeric = Number(String(priceStr).replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(numeric)) return null;
      return {
        "@type": "Offer",
        name: tier.name,
        description: tier.description,
        price: numeric,
        priceCurrency: "USD",
        url: tier.hrefMonthly || tier.hrefWeekly || tier.hrefAnnual || url,
        category: "subscription",
      };
    })
    .filter(Boolean);

  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    description: siteConfig.hero.description,
    url,
    image: logoUrl,
    offers: offers.length ? offers : undefined,
  };

  const blocks = [organization, website, softwareApplication, faqPage].filter(Boolean);

  return (
    <>
      {blocks.map((block, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          // SSR-serialized; no client JS executes.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
