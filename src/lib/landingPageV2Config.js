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
  /**
   * Plans on the pricing page. Dollar amounts must match CHECKOUT_PLANS in
   * src/lib/stripe/catalog.js and PLAN_MAP in the Stripe webhook.
   * `icon` keys map to icons in src/components/sections/pricing-section.tsx.
   */
  plans: [
    {
      tier: "free",
      name: "Free",
      description: "Explore Lychee before committing. No account or credit card required to try.",
      price: 0,
      note: "Free for everyone",
      buttonText: "Try for free",
      href: "/#demo",
      venuesLabel: "All your venues",
      features: [
        { icon: "rows", text: "Pull up to **100 rows per data sheet**" },
        { icon: "chart", text: "Try the full filtering, analysis, and charting workflow" },
        { icon: "dashboard", text: "**1 dashboard, 1 tab, and up to 12 data sheets**" },
      ],
    },
    {
      tier: "researcher",
      name: "Researcher",
      description: "A complete workspace for traders, analysts, journalists, and researchers.",
      priceAnnual: 199,
      note: "Annual billing only",
      buttonText: "Get Researcher",
      isPopular: true,
      includesLabel: "All features in Free +",
      features: [
        { icon: "plug", text: "All available integrations, including historical and live data" },
        { icon: "rows", text: "Pull up to **500,000 rows per data sheet**" },
        { icon: "download", text: "Unlimited **CSV, Excel, and JSON exports** within your data limits" },
        {
          icon: "sigma",
          text: "Full no-code analysis: formulas, related datasets, summaries, bucketing, and seeded random sampling",
        },
        { icon: "dashboard", text: "**Unlimited charts, dashboards, tabs, and presentations**" },
        { icon: "fork", text: "Save, fork, and rerun research workflows" },
        { icon: "live", text: "**10 simultaneous live feeds**" },
        { icon: "alert", text: "**500 custom alerts**" },
        { icon: "storage", text: "**10 GB saved workspace storage**" },
        { icon: "publish", text: "Publish charts and dashboards without Lychee branding" },
        { icon: "mail", text: "Email support" },
      ],
    },
    {
      tier: "quant",
      name: "Quant",
      description: "Everything in Researcher, with more capacity and flexible billing.",
      priceMonthly: 99,
      priceAnnual: 999,
      buttonText: "Get Quant",
      includesLabel: "All features in Researcher +",
      features: [
        { icon: "rows", text: "Pull **1 million+ rows per data sheet**" },
        { icon: "bulk", text: "**Bulk exports** for larger datasets" },
        { icon: "live", text: "**100 simultaneous live feeds**" },
        { icon: "alert", text: "**1,000 custom alerts**" },
        { icon: "storage", text: "**25 GB saved workspace storage**" },
        { icon: "support", text: "**Priority support**" },
      ],
    },
  ],
  enterprisePlan: {
    name: "Enterprise",
    description:
      "For companies and teams that need custom limits, teams, roles, permissions, comments and Slack notifications, collaborative dashboards, priority support, and an enterprise-grade security review.",
    buttonText: "Request trial",
    href: "mailto:kash@lycheedata.com?subject=Lychee%20Enterprise%20trial",
  },
  /**
   * Data sources shown on the Free plan: a logo (`src`) or a letter `mark` on a brand-colored tile.
   * Hovering a tile shows `description`, the integrations it `includes`, and `links` (hub pages first).
   */
  pricingVenues: [
    {
      name: "Kalshi",
      mark: "K",
      tileClass: "bg-[#28CC95] text-white",
      description: "The CFTC-regulated US prediction market exchange.",
      includes: [
        { name: "Kalshi Historical", detail: "Every market and trade since the July 2021 launch" },
        { name: "Kalshi Historical v2", detail: "Recent history up to the live cutoff" },
        { name: "Kalshi Live", detail: "Real-time prices, orderbooks, trades, and candlesticks" },
      ],
      links: [
        { label: "Kalshi Historical hub", href: "/kalshi-historical-data" },
        { label: "Kalshi Live hub", href: "/kalshi-live-data" },
      ],
    },
    {
      name: "Polymarket",
      src: "/polymarket.png",
      tileClass: "bg-[#2E5CFF]",
      description: "The crypto-native prediction market.",
      includes: [
        { name: "Polymarket Historical", detail: "Markets, prices, and trades for backtesting" },
        { name: "Polymarket Live", detail: "Real-time events, markets, and price streams" },
      ],
      links: [
        { label: "Polymarket Historical hub", href: "/polymarket-historical-data" },
        { label: "Polymarket Live hub", href: "/polymarket-live-data" },
      ],
    },
    {
      name: "Chainlink",
      src: "/chainlink.png",
      tileClass: "bg-[#375BD2] p-[3px]",
      description: "The oracle prices Polymarket uses to set and settle its crypto Up/Down markets.",
      includes: [
        { name: "60-second TWAP", detail: "The settlement price, streamed through Polymarket" },
        { name: "Spot + legacy 30-second TWAP", detail: "BTC, ETH, SOL, XRP, DOGE, HYPE, BNB, ZEC" },
      ],
      links: [
        { label: "Live prices guide", href: "/guides/polymarket-live-prices" },
        { label: "Try it in the demo", href: "/#demo" },
      ],
    },
    {
      name: "Binance",
      src: "/binance.jpeg",
      tileClass: "bg-black",
      badge: "Beta",
      description: "Live Binance spot prices, about one tick a second, streamed through Polymarket.",
      includes: [{ name: "Spot prices in USDT", detail: "BTC, ETH, SOL, XRP, BNB, and DOGE, one sheet per pair" }],
      links: [{ label: "Try it in the demo", href: "/#demo" }],
    },
    {
      name: "X",
      src: "/x.png",
      tileClass: "bg-white p-[3px] ring-1 ring-inset ring-border",
      badge: "Coming soon",
      description: "Social signals from X to line up against market moves.",
      includes: [{ name: "Posts and accounts", detail: "Mentions, hashtags, trends, and engagement" }],
      links: [],
    },
    {
      name: "Reddit",
      src: "/reddit.png",
      tileClass: "bg-[#FF4500] p-[2px]",
      badge: "Coming soon",
      description: "Crowd sentiment from trading communities like r/wallstreetbets.",
      includes: [{ name: "Posts and comments", detail: "Mentions, discussions, and sentiment" }],
      links: [],
    },
  ],
  /**
   * Previous Basic / Pro / Elite plans. No longer on the pricing page, but
   * existing subscribers are still billed on them.
   */
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
