import { siteConfig as coreSiteConfig } from "@/lib/site";
import { bentoSection } from "@/lib/bento-section";
import { growthSection } from "@/lib/growth-section";
import { landingPageV2Config } from "@/lib/landingPageV2Config";
import { socialProofTestimonials } from "@/lib/testimonials-scroll-data";
import type { Venue } from "@/components/sections/venue-mark";
import type { TermColor } from "@/components/sections/hero-description";

function pricingVenue(name: string): Venue {
  const venue = landingPageV2Config.pricingVenues.find((item: Venue) => item.name === name);
  if (!venue) throw new Error(`Unknown pricing venue: ${name}`);
  return venue;
}

export const siteConfig = {
  ...coreSiteConfig,
  nav: {
    links: [
      { id: "guides", name: "Research", href: "/#guides" },
      { id: "changelog", name: "What's New", href: "/changelog" },
      { id: "pricing", name: "Pricing", href: "/#pricing" },
    ],
  },
  companyShowcase: {
    companyLogos: [
      { id: "jpm", src: "/jpm.svg", alt: "jpm" },
      { id: "goldman", src: "/goldman.svg", alt: "goldman" },
      { id: "meta", src: "/meta.svg", alt: "meta" },
      { id: "google", src: "/google.svg", alt: "google" },
      { id: "apple", src: "/apple.svg", alt: "apple" },
      { id: "mit", src: "/mit.svg", alt: "mit" },
      { id: "jump", src: "/jump.webp", alt: "jump" },
      { id: "coinbase", src: "/coinbase.svg", alt: "coinbase" },
    ],
  },
  bentoSection,
  pricingSection: {
    title: "Choose your plan",
    description:
      "Every plan includes access to available data integrations, spreadsheet analysis, and charting. Choose the data capacity and workspace limits that fit your research.",
    plans: landingPageV2Config.plans,
    enterprise: landingPageV2Config.enterprisePlan,
    venues: landingPageV2Config.pricingVenues,
  },
  growthSection,
  testimonials: socialProofTestimonials,
  testimonialSection: {
    title: "Why People Are Switching to Lychee",
    description:
      "Faster insights, cleaner dashboards, and powerful prediction market data — all without the complexity of traditional tools.",
  },
  faqSection: {
    title: "Frequently Asked Questions",
    description:
      "Answers to the questions traders, researchers, and analysts usually ask before using Lychee.",
    faQitems: landingPageV2Config.faqs.map((faq, index) => ({
      id: index + 1,
      question: faq.question,
      answer: faq.answer,
    })),
  },
  quoteSection: {
    reviewUrl:
      "https://www.producthunt.com/products/lychee-3/reviews?review=744208",
    quote: {
      lead: "I really can't express in words how much I needed this.",
      highlight:
        "Changed my whole working game. My peers looked at this thing jaws dropped haha.",
      tail: "Looking forward to the future of Lychee!",
    },
    author: {
      name: "Amal Khan",
      role: "Product Hunt",
      image:
        "https://ph-avatars.imgix.net/6832524/original.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=40&h=40&fit=crop&dpr=1",
    },
  },
  hero: {
    title: "Analyze live and historical prediction market data.",
    subtitle: "No code. No setup.",
    description:
      "Research Kalshi and Polymarket, market data, and real-world signals. Explore trades, investigate wallets, build custom charts and live terminals—all in one workspace.",
    /** Phrases in `description` that show their data sources on hover. */
    descriptionTerms: [
      { text: "Kalshi and Polymarket", color: "orange", sources: [pricingVenue("Kalshi"), pricingVenue("Polymarket")] },
      {
        text: "market data",
        color: "blue",
        sources: [
          pricingVenue("Chainlink"),
          pricingVenue("Binance"),
          {
            name: "SEC EDGAR",
            src: "/sec.png",
            tileClass: "bg-white p-[2px] ring-1 ring-inset ring-border",
            badge: "Coming soon",
            description: "Company filings, financial statements, and disclosures.",
          },
        ],
      },
      {
        text: "real-world signals",
        color: "fuchsia",
        sources: [
          { ...pricingVenue("X"), name: "X (Twitter)" },
          {
            name: "Real-time News",
            icon: "news",
            tileClass: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
            badge: "Coming soon",
            description: "Breaking headlines to line up against market moves.",
          },
          pricingVenue("Reddit"),
          {
            name: "Product Hunt",
            mark: "P",
            tileClass: "bg-[#DA552F] text-white",
            badge: "Coming soon",
            description: "Product launches, upvotes, and trending startups.",
          },
        ],
      },
    ] satisfies { text: string; color: TermColor; sources: Venue[] }[],
    cta: {
      primary: {
        href: "#demo",
        text: "Try For Free",
      },
      secondary: {
        href: "/#pricing",
        text: "View Plans",
      },
    },
  },
  ctaSection: {
    title: "Go from raw markets to charts in seconds—no code, no CSVs.",
    guideTitle:
      "Go from raw markets to charts and dashboards in seconds—no code, no CSVs.",
    subtext: "Free to explore here · Polymarket, Kalshi, Chainlink & more",
    button: {
      href: "/#pricing",
      text: "Gain Your Edge Now",
    },
  },
  footerLinks: [
    {
      title: "Product",
      links: [
        { id: 1, title: "Features", url: "/#features" },
        { id: 2, title: "Pricing", url: "#pricing" },
        { id: 3, title: "Dashboard", url: "/dashboard" },
        { id: 4, title: "Charts", url: "/charts" },
        { id: 20, title: "Kalshi vs Polymarket", url: "/kalshi-vs-polymarket-odds" },
      ],
    },
    {
      title: "Company",
      links: [
        { id: 5, title: "Guides", url: "/guides" },
      ],
    },
    {
      title: "Resources",
      links: [
        { id: 10, title: "Help", url: "/help" },
        { id: 11, title: "Privacy", url: "/privacy" },
        { id: 12, title: "Terms", url: "/terms" },
        { id: 13, title: "Data use", url: "/dataUse" },
      ],
    },
    {
      title: "Our tools",
      links: [
        { id: 19, title: "Kalshi vs Polymarket", url: "/kalshi-vs-polymarket-odds" },
        { id: 14, title: "Polymarket metadata", url: "/polymarket-metadata" },
        { id: 15, title: "Kalshi Historical Data", url: "/kalshi-historical-data" },
        { id: 16, title: "Kalshi Live Data", url: "/kalshi-live-data" },
        { id: 17, title: "Polymarket Live Data", url: "/polymarket-live-data" },
        { id: 18, title: "Polymarket Historical Data", url: "/polymarket-historical-data" },
      ],
    },
  ],
} as const;
