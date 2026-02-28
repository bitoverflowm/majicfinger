// Config for landing page v2 (MagicUI template)
export const landingPageV2Config = {
  name: "Lychee",
  description: "Your Quant in a Box. Built for Polymarket • Powerful for anyone who works with data. No CSVs, No Python, No copy-pasting. Just raw data to analysis and actionable insights. Real quantitative edge. 0 lines of code.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  keywords: ["PolyMarket", "quant", "Data Analysis", "Prediction Markets", "No-Code API", "Charts", "Data Visualization"],
  links: {
    email: "support@bitoverflow.org",
    twitter: "https://x.com/misterrpink1",
    discord: "#",
    github: "https://github.com",
    instagram: "#",
  },
  header: [
    { href: "/landingpage_v2#blog", label: "Blog" },
  ],
  pricing: [
    {
      name: "FREE",
      href: "https://buy.stripe.com/3csbL2c8K2iye6QcNg",
      price: "Free",
      period: "trial",
      yearlyPrice: "Free",
      features: ["2 day Trial then $19.99/month", "Access to all stable and some experimental features", "Easy Charts, Scraper, AI, website builder", "Integrations (Twitter, Instagram, CoinGecko, etc)"],
      description: "Get started with Lychee",
      buttonText: "Go",
      isPopular: false,
    },
    {
      name: "LIFETIME",
      href: "https://buy.stripe.com/bIY7uM4Gi7CS7IsaF4",
      price: "$39.99",
      period: "one-time",
      yearlyPrice: "$39.99",
      features: ["Everything in free tier", "All experimental features", "All future features", "Unlimited website launches", "Unlimited custom domains", "Almost unlimited API and AI usage", "No add-on fees ever"],
      description: "Pay once, get full access for life. 99% cheaper than subscriptions.",
      buttonText: "$39.99",
      isPopular: true,
    },
  ],
  faqs: [
    { question: "What is Lychee?", answer: "Lychee is your quant in a box. Built for Polymarket, powerful for anyone who works with data. No CSVs, no Python, no copy-pasting. Just raw data to analysis, charts and actionable insights in seconds. Real quantitative edge. 0 lines of code." },
    { question: "How can I get started?", answer: "Sign up for a free account. You get instant access to Easy Charts, Scraper, AI, website builder, and integrations. No credit card required for the trial." },
    { question: "What data sources can I connect to?", answer: "Lychee connects directly to Polymarket, Twitter, Instagram, CoinGecko, and more. Not a single line of code required on your end." },
    { question: "What's the lifetime deal?", answer: "Pay $39.99 once and get full access for life. Everything in the free tier plus all experimental features, unlimited website launches, unlimited custom domains, and almost unlimited API and AI usage. No add-on fees ever." },
  ],
  footer: [
    {
      title: "Product",
      links: [
        { href: "#features", text: "Features", icon: null },
        { href: "#pricing", text: "Pricing", icon: null },
        { href: "/dashboard", text: "Dashboard", icon: null },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "#", text: "About", icon: null },
        { href: "/landingpage_v2#blog", text: "Blog", icon: null },
        { href: "/help", text: "Help", icon: null },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "#", text: "Documentation", icon: null },
        { href: "#", text: "Contact", icon: null },
      ],
    },
  ],
};
