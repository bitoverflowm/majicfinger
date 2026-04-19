import { siteConfig as coreSiteConfig } from "@/lib/site";
import { bentoSection } from "@/lib/bento-section";
import { growthSection } from "@/lib/growth-section";
import { landingPageV2Config } from "@/lib/landingPageV2Config";
import { socialProofTestimonials } from "@/lib/testimonials-scroll-data";

export const siteConfig = {
  ...coreSiteConfig,
  nav: {
    links: [
      { id: "hero", name: "Home", href: "/#hero" },
      { id: "pricing", name: "Pricing", href: "/#pricing" },
      { id: "guides", name: "Guides", href: "/#guides" },
    ],
  },
  companyShowcase: {
    companyLogos: [
      { id: "jpm", src: "/jpm.svg", alt: "jpm", href: "#" },
      { id: "goldman", src: "/goldman.svg", alt: "goldman", href: "#" },
      { id: "meta", src: "/meta.svg", alt: "meta", href: "#" },
      { id: "google", src: "/google.svg", alt: "google", href: "#" },
      { id: "apple", src: "/apple.svg", alt: "apple", href: "#" },
      { id: "mit", src: "/mit.svg", alt: "mit", href: "#" },
      { id: "jump", src: "/jump.webp", alt: "jump", href: "#" },
      { id: "coinbase", src: "/coinbase.svg", alt: "coinbase", href: "#" }
    ],
  },
  bentoSection,
  pricingSection: {
    title: "Pricing that scales with you",
    description:
      "Start weekly, switch anytime. Pay annually when you’re ready to commit.",
    pricingItems: (landingPageV2Config.pricing as any[]).map((plan: any) => ({
      name: plan.name,
      description: plan.description,
      features: plan.features,
      isPopular: Boolean(plan.isPopular),
      badgeLabel: plan.badgeLabel ?? null,
      buttonText: plan.buttonText,
      hrefWeekly:
        plan.period === "one-time"
          ? plan.href
          : ("hrefWeekly" in plan && plan.hrefWeekly ? plan.hrefWeekly : plan.hrefMonthly),
      hrefMonthly: plan.period === "one-time" ? plan.href : plan.hrefMonthly,
      hrefAnnual: plan.period === "one-time" ? plan.href : plan.hrefYearly,
      period: plan.period,
      priceWeekly: plan.priceWeekly ?? null,
      priceMonthly: plan.priceMonthly ?? null,
      priceAnnual: plan.priceAnnual ?? null,
      yearlyNote: plan.yearlyNote ?? null,
      trial: plan.trial ?? null,
    })),
  },
  featureSection: {
    title: "Everything You Need to Move Fast",
    description:
      "Connect data sources, explore trends visually, and export insights — all from a single workspace.",
    items: [
      {
        id: 1,
        title: "Visual Exploration",
        content:
          "Create charts and tables from prediction-market and on-chain data instantly — no queries required.",
        liveMedia: "chainlinkBtc",
      },
      {
        id: 2,
        title: "Live Market Feeds",
        content:
          "Access Polymarket and Kalshi endpoints for real-time prices, events, and historical data — curated for speed.",
        liveMedia: "explorationTable",
      },
      {
        id: 3,
        title: "Reference Data & Signals",
        content:
          "Layer in Chainlink feeds, social signals, and other contextual data to see the full picture quickly.",
        liveMedia: "signalsTerminal",
      },
    ],
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
      "Answers to common questions about Lychee and its features. If you have any other questions, please don't hesitate to contact us.",
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
    badgeIcon: "dot",
    badge: "36GB of every Kalshi & Polymarket trade ever",
    /** Guides / blog post (MDX slug) */
    badgeHref: "/guides/kalshi-historical-data",
    title: `Analyze real-time prediction market data.
In <0.69 seconds. No coding. No setup.`,
    description:
      "500+ endpoints including Polymarket, Kalshi, Chainlink, and Twitter – all in one visual tool, built for traders, analysts, and data enthusiasts.",
    cta: {
      primary: {
        href: "#demo",
        text: "Try For Free",
      },
      secondary: {
        href: "/#pricing",
        text: "View pricing",
      },
    },
  },
  ctaSection: {
    title: "Go from raw markets to charts in seconds—no code, no CSVs.",
    subtext: "Free to explore here · Polymarket, Kalshi, Chainlink & more",
    button: {
      href: "/#pricing",
      text: "Get Lychee",
    },
  },
  footerLinks: [
    {
      title: "Product",
      links: [
        { id: 1, title: "Features", url: "#features" },
        { id: 2, title: "Pricing", url: "#pricing" },
        { id: 3, title: "Dashboard", url: "/dashboard" },
        { id: 4, title: "Charts", url: "/charts" },
      ],
    },
    {
      title: "Company",
      links: [
        { id: 5, title: "Guides", url: "/guides" },
        { id: 6, title: "Affiliates", url: "/affiliates" },
        { id: 7, title: "GitHub", url: "https://github.com/misterrpink1" },
        { id: 8, title: "Twitter / X", url: "https://x.com/misterrpink1" },
      ],
    },
    {
      title: "Resources",
      links: [
        { id: 9, title: "Search", url: "/search" },
        { id: 10, title: "Help", url: "/help" },
        { id: 11, title: "Privacy", url: "/privacy" },
        { id: 12, title: "Terms", url: "/terms" },
        { id: 13, title: "Data use", url: "/dataUse" },
      ],
    },
    {
      title: "Our tools",
      links: [{ id: 14, title: "Polymarket metadata", url: "/polymarket-metadata" }],
    },
  ],
} as const;
