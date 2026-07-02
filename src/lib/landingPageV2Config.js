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
      name: "Basic",
      hrefWeekly: "https://buy.stripe.com/14A28s9El79A1da8b62ZO0C",
      hrefMonthly: "https://buy.stripe.com/5kQ4gAeYF0LcdZW7722ZO0G",
      hrefYearly: "https://buy.stripe.com/28E00kcQx2Tk096dvq2ZO0J",
      priceWeekly: "$4.99",
      priceMonthly: "$19.99",
      priceAnnual: "$199.99",
      period: "tier",
      features: [
        "All Kalshi and Polymarket data sources",
        "12,500 rows per historical pull",
        "CSV/XLSX/JSON exports within plan limits",
        "No-code charts and data sheets",
        "Unlimited saved projects",
        "Fork published research workflows",
        "1 dashboard",
        "1 custom alert",
      ],
      description: "For solo researchers exploring prediction market data.",
      buttonText: "Choose Basic",
      isPopular: false,
    },
    {
      name: "Pro",
      hrefWeekly: "https://buy.stripe.com/fZu28s03L65wbROcrm2ZO0D",
      hrefMonthly: "https://buy.stripe.com/00w4gAcQxgKabROezu2ZO0H",
      hrefYearly: "https://buy.stripe.com/dRmfZi4k165w8FCdvq2ZO0I",
      priceWeekly: "$9.99",
      priceMonthly: "$39.99",
      priceAnnual: "$399.99",
      period: "tier",
      features: [
        "Everything in Basic",
        "Up to 500k rows per historical pull",
        "Large CSV/XLSX/JSON exports",
        "Advanced backtesting workflows",
        "Live Kalshi and Polymarket dashboards",
        "10 live data streams",
        "10 custom alerts",
        "100 dashboards and presentations",
        "Remove Lychee branding from public charts and dashboards",
        "Request new integrations, features, and APIs",
        "4 GB saved workspace storage",
      ],
      description:
        "For serious traders and researchers running larger pulls, live dashboards, exports, and backtests.",
      buttonText: "Choose Pro",
      isPopular: true,
      badgeLabel: "Most popular",
    },
    {
      name: "Elite",
      hrefWeekly: "https://buy.stripe.com/00waEY03L8dEg841MI2ZO0E",
      hrefMonthly: "https://buy.stripe.com/7sY5kEcQxdxYdZW7722ZO0F",
      hrefYearly: "https://buy.stripe.com/14A9AU2bT65w096gHC2ZO0K",
      priceWeekly: "$19.99",
      priceMonthly: "$79.99",
      priceAnnual: "$799.99",
      period: "tier",
      features: [
        "Everything in Pro",
        "Highest historical pull limits",
        "Bulk exports for large datasets",
        "Large saved research workspaces",
        "100 live data streams",
        "500 custom alerts",
        "Unlimited dashboards",
        "10 GB saved workspace storage",
        "Priority support",
        "Early access to new integrations and features",
        "Support for very large data workflows",
      ],
      description:
        "For heavy traders, quants, and high-volume researchers running large datasets and live monitoring workflows.",
      buttonText: "Choose Elite",
      isPopular: false,
    },
  ],
  /** One-time Stripe Payment Link; amount must match webhook PLAN_MAP (19999 cents = $199.99). */
  lifetimeAccess: {
    href: "https://buy.stripe.com/cNieVe3fX1PgcVSdvq2ZO0B",
    title: "Lifetime access",
    badge: "Pay once",
    price: "$199.99",
    priceNote: "one-time",
    headline: "Support the project: pay once and never pay again for life",
    description:
      "Unlock Elite-level access to Lychee with a single payment. No subscriptions, no surprise renewals. (Very large or dedicated datasets may still be billed separately.)",
    buttonText: "Get lifetime access",
    features: [
      "Everything in Elite: integrations, dashboards, alerts, and priority-style access",
      "lifetimeMember status in your account for as long as Lychee exists",
      "Directly supports ongoing development",
    ],
  },
  faqs: [
    {
      question: "What is Lychee?",
      answer:
        "Lychee is a no-code prediction market data platform for analyzing live and historical market data. You can query Kalshi, Polymarket, Chainlink, crypto, social, and uploaded datasets, then turn them into charts, dashboards, exports, alerts, and research workflows without writing Python or stitching APIs together.",
    },
    {
      question: "What data sources does Lychee include?",
      answer:
        "Lychee supports Kalshi Historical, Kalshi Live, Polymarket Historical, Polymarket Live, Chainlink, Binance, CSV/XLSX uploads, and additional API sources. Every paid plan includes Kalshi and Polymarket historical and live data. Plans differ by row limits, live streams, alerts, storage, and research scale.",
    },
    {
      question: "Does Lychee include Kalshi and Polymarket historical data?",
      answer:
        "Yes. Lychee includes historical Kalshi and Polymarket market data so you can analyze past markets, trades, price movement, volume, outcomes, and category-level behavior. Historical data is useful for research, backtesting, calibration analysis, volatility studies, and finding patterns across resolved markets.",
    },
    {
      question: "Does Lychee support live Kalshi and Polymarket data?",
      answer:
        "Yes. Lychee supports live Kalshi and Polymarket data for current market analysis, live dashboards, alerts, and monitoring workflows. You can combine live data with historical data to compare current odds against past market behavior.",
    },
    {
      question: "Can I download or export Kalshi and Polymarket data?",
      answer:
        "Yes. Lychee supports CSV, XLSX, and JSON exports. Export access depends on your plan limits, so Basic is useful for smaller pulls, Pro supports larger research exports, and Elite is designed for high-volume workflows and bulk datasets.",
    },
    {
      question: "Do I need to know how to code?",
      answer:
        "No. Lychee is built for no-code analysis. You can connect data sources, filter markets, build charts, create dashboards, run pulls, fork published workflows, and export results through a visual interface — no SQL, Python, or API setup required.",
    },
    {
      question: "Can I use Lychee for backtesting and research?",
      answer:
        "Yes. Lychee includes historical Kalshi and Polymarket datasets so you can test ideas against past markets, compare live and historical behavior, analyze volume, price movement, calibration, volatility, and other research signals. Advanced backtesting workflows scale with your plan.",
    },
    {
      question: "What is included in the free demo?",
      answer:
        "The free demo lets you try Lychee on the homepage before subscribing. You can run sample Kalshi and Polymarket pulls, explore charts and data sheets, fork one published workflow, and test limited historical requests without a credit card.",
    },
    {
      question: "Why use Lychee instead of APIs, CSVs, or Python scripts?",
      answer:
        "Lychee saves you from stitching together prediction market APIs, downloading messy CSVs, maintaining scripts, and rebuilding the same charts over and over. You get live and historical data, no-code analysis, dashboards, exports, and reusable workflows in one workspace.",
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
