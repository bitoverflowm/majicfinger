import { siteConfig as coreSiteConfig } from "@/lib/site";
import { bentoSection } from "@/lib/bento-section";
import { growthSection } from "@/lib/growth-section";
import { landingPageV2Config } from "@/lib/landingPageV2Config";
import { socialProofTestimonials } from "@/lib/testimonials-scroll-data";

export const siteConfig = {
  ...coreSiteConfig,
  nav: {
    links: [
      { id: "hero", name: "Home", href: "#hero" },
      { id: "pricing", name: "Pricing", href: "#pricing" },
      { id: "guides", name: "Guides", href: "#guides" },
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
    pricingItems: landingPageV2Config.pricing.map((plan) => ({
      name: plan.name,
      description: plan.description,
      features: plan.features,
      isPopular: Boolean(plan.isPopular),
      badgeLabel: plan.badgeLabel ?? null,
      buttonText: plan.buttonText,
      hrefWeekly: plan.period === "one-time" ? plan.href : plan.hrefMonthly,
      hrefMonthly: plan.period === "one-time" ? plan.href : plan.hrefMonthly,
      hrefAnnual: plan.period === "one-time" ? plan.href : plan.hrefYearly,
      period: plan.period,
      priceMonthly: plan.price,
      priceYearlyEffectiveMonthly: plan.yearlyPrice ?? plan.price,
      yearlyNote: plan.yearlyNote ?? null,
      trial: plan.trial ?? null,
    })),
  },
  featureSection: {
    title: "Everything you need to move faster",
    description:
      "Connect sources, explore visually, and export—without leaving one workspace.",
    items: [
      {
        id: 1,
        title: "Visual exploration",
        content:
          "Build charts from prediction-market and on-chain data without writing queries.",
        image: "/landing_dashboard.png",
      },
      {
        id: 2,
        title: "Polymarket & Kalshi",
        content:
          "Tap curated endpoints for live prices, events, and historical series in one place.",
        image: "/polymarket.png",
      },
      {
        id: 3,
        title: "Chainlink & more",
        content:
          "Layer in reference feeds and social signals when you need broader context.",
        image: "/chainlink.png",
      },
    ],
  },
  growthSection,
  testimonials: socialProofTestimonials,
  testimonialSection: {
    title: "Empower Your Workflow with AI",
    description:
      "Ask your AI Agent for real-time collaboration, seamless integrations, and actionable insights to streamline your operations.",
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
    title: "Analyze real-time prediction market data in <0.69 seconds— no coding, no setup",
    description:
      "500+ endpoints including Polymarket, Kalshi, Chainlink, and Twitter – all in one visual tool, built for traders, analysts, and data enthusiasts.",
    cta: {
      primary: {
        href: "/dashboard",
        text: "Get started",
      },
      secondary: {
        href: "/#pricing",
        text: "View pricing",
      },
    },
  },
  ctaSection: {
    backgroundImage: "/landing_dashboard.png",
    title: "Go from raw markets to charts in seconds—no code, no CSVs.",
    subtext: "Free to explore · Polymarket, Kalshi, Chainlink & more",
    button: {
      href: "/dashboard",
      text: "Open Lychee",
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
        { id: 5, title: "Guides", url: "/#guides" },
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
  ],
} as const;
