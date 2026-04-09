// Config for landing page v2 (MagicUI template)
export const landingPageV2Config = {
  name: "Lychee",
  description: "Your Quant in a Box. Built for Polymarket • Powerful for anyone who works with data. No CSVs, No Python, No copy-pasting. Just raw data to analysis and actionable insights. Real quantitative edge. 0 lines of code.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  keywords: ["PolyMarket", "quant", "Data Analysis", "Prediction Markets", "No-Code API", "Charts", "Data Visualization"],
  links: {
    email: "",
    twitter: "https://x.com/misterrpink1",
    discord: "#",
    github: "https://github.com",
    instagram: "#",
  },
  header: [
    { href: "/#guides", label: "Guides" },
  ],
  pricing: [
    {
      name: "Basic Tier",
      hrefMonthly: "https://buy.stripe.com/14A9AUcQx0Lc3licrm2ZO0x",
      hrefYearly: "https://buy.stripe.com/4gMbJ2g2J8dE9JG2QM2ZO0y",
      price: "$19.99",
      period: "month",
      yearlyPrice: "$15.99",
      yearlyPeriod: "month",
      yearlyNote: "charged annually",
      trial: "Free 7-day trial then",
      features: [
        "Access all stable and experimental features",
        "Charts, API integrations, Data Analysis, Quant tools, dashboards and presentation",
        "3 API integrations (Polymarket, CoinGecko, Twitter, Reddit, etc)",
        "Limited Live data feeds",
        "Unlimited presentations and dashboards",
        "No custom domain for dashboards and presentation",
        "Unlimited advanced analytics",
      ],
      description: "Get started with Lychee",
      buttonText: "Go",
      isPopular: false,
    },
    {
      name: "Lifetime",
      href: "https://buy.stripe.com/cNieVe3fX1PgcVSdvq2ZO0B",
      price: "$199.99",
      period: "one-time",
      yearlyPrice: "$199.99",
      features: [
        "Access everything in Premium and Basic for life",
        "One time payment, never pay again",
      ],
      description: "Pay once, get full access for life.",
      buttonText: "$199.99",
      isPopular: true,
      badgeLabel: "Available for limited time",
    },
    {
      name: "Premium",
      hrefMonthly: "https://buy.stripe.com/fZu28s3fXfG63libni2ZO0z",
      hrefYearly: "https://buy.stripe.com/aFa7sM7wdeC24pm62Y2ZO0A",
      price: "$39.99",
      period: "month",
      yearlyPrice: "$31.99",
      yearlyPeriod: "month",
      yearlyNote: "charged annually",
      trial: "Free 7 days then",
      features: [
        "Everything in Basic tier",
        "Unlimited API integrations",
        "Live data feeds",
        "Unlimited custom domains for dashboards and presentations",
        "Remove Lychee branding from dashboards, charts and presentations",
        "Advanced analytics",
      ],
      description: "For power users who need more.",
      buttonText: "Go",
      isPopular: false,
    },
  ],
  faqs: [
    {
      question: "What is Lychee?",
      answer:
        "Lychee is a no-code data analysis platform built for prediction markets, traders, and researchers. Connect live and historical data from sources like Polymarket, Kalshi, and on-chain feeds, then visualize trends and build dashboards in seconds. No Python, no CSV wrangling — just fast insights from real data.",
    },
    {
      question: "Who is Lychee for?",
      answer:
        "Lychee is designed for traders, analysts, researchers, and data enthusiasts who want to explore prediction market and financial data quickly. Whether you're backtesting strategies, tracking market sentiment, or building dashboards, Lychee helps you work with data without writing code.",
    },
    {
      question: "How do I get started?",
      answer:
        "Try the free demo we have above, no credit card required no sign up required. Remember this is a demo so it has nowhere near the capabilities of the full platform. Then sign up and start exploring immediately. Choose a data source, create a chart, and build your first dashboard in minutes. No installation, no setup.",
    },
    {
      question: "What data sources does Lychee support?",
      answer:
        "Lychee provides access to prediction market, crypto, financial, and social data sources. This includes Polymarket, Kalshi, Chainlink feeds, CoinGecko, Twitter, Reddit, Product Hunt, SEC Edgar and additional APIs. You can also upload CSV or Excel files to combine your own data with live feeds.",
    },
    {
      question: "Do I need to know how to code?",
      answer:
        "No. Lychee is fully no-code. You can connect data, create charts, and analyze trends using a visual interface — no SQL, Python, or manual data processing required.",
    },
    {
      question: "What makes Lychee different from other data tools?",
      answer:
        "Lychee focuses on prediction market and alternative data in one place. Instead of stitching together APIs, spreadsheets, and scripts, you can explore real-time and historical datasets, visualize trends, and export insights from a single workspace.",
    },
    {
      question: "Can I use Lychee for backtesting and research?",
      answer:
        "Yes. Lychee includes historical datasets and visual exploration tools that make it easy to analyze trends, compare markets, and test ideas without building custom pipelines.",
    },
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
        { href: "/#guides", text: "Guides", icon: null },
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
