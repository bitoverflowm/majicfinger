import type { HubPageConfig } from "@/types/hub";

const GET_FULL_ACCESS = {
  label: "Get Full Access Now",
  href: "#polymarket-live-pricing",
  requiresAuth: false,
  ariaLabel: "Get full access now — view Polymarket Live pricing",
} as const;

const EXPLORE_LIVE = {
  label: "Explore Polymarket Live",
  href: "/#demo",
  requiresAuth: false,
  eventLabel: "polymarket_live_explore",
  tracking: {
    page: "/polymarket-live-data",
    destination: "homepage demo / polymarket live",
  },
} as const;

export const polymarketLiveHub: HubPageConfig = {
  id: "polymarket-live",
  slug: "polymarket-live-data",
  title: "Polymarket Live Data",
  heroTitle: "Live Polymarket Data You Can Actually Work With",
  seoTitle: "Polymarket Data: Live Prices, Trades & Order Books | Lychee",
  description:
    "Explore live Polymarket data including prices, trades, spreads, order books, candlesticks, holders and positions. Build charts and dashboards without code.",
  socialTitle: "Live Polymarket Data, Charts and Dashboards | Lychee",
  socialDescription:
    "Find any Polymarket market, follow live prices and market activity, and turn the data into interactive charts and dashboards without code.",
  publishedAt: "2026-06-20",
  updatedAt: "2026-08-19",
  author: "misterrpink",
  topics: [
    "polymarket",
    "prediction markets",
    "live data",
    "real-time",
    "market data",
    "order books",
    "trades",
  ],
  integration: ["Polymarket", "Lychee"],
  ogImage: "https://lycheedata.com/ogImage2.png",
  ogImageAlt:
    "Live Polymarket data dashboard showing YES and NO prices, trades, and charts in Lychee",
  featured: true,
  readingTime: "6 min",
  twitterCard: "summary_large_image",
  canonical: "https://lycheedata.com/polymarket-live-data",
  assetFilter: {
    username: "misterrpink",
    chartSearchAllUsers: true,
    dashboardSearchAllUsers: true,
    dashboardTags: ["polymarket", "live"],
    chartKeywords: ["polymarket"],
    maxCharts: 8,
    maxDashboards: 8,
  },
  sections: [
    {
      type: "hero",
      variant: "premium",
      title: "Polymarket Live Data",
      eyebrow: "Polymarket Live Data",
      badge: "Looking for Polymarket Historical Data?",
      badgeHref: "/polymarket-historical-data",
      badgeIcon: "dot",
      subtitle: "Find the markets you care about. Work with every live layer behind the odds.",
      heroBody: {
        parts: [
          {
            type: "text",
            value:
              "Find the Polymarket markets you care about in plain English. Follow live prices, spreads, order books, trades, candlesticks, holders, and positions—then bring the complete view together in interactive charts and multi-market dashboards. ",
          },
          { type: "metric", value: "No code." },
          { type: "text", value: " " },
          { type: "metric", value: "No data pipeline." },
        ],
      },
      heroLiveChart: {
        source: "polymarket",
        eyebrow: "Live YES / NO · high-volume Polymarket market",
        caption:
          "YES and NO prices updating from live Polymarket market activity in Lychee.",
        captionLink: {
          label: "See how it works",
          href: "#find-polymarket-markets",
        },
        freezeOnAnchorId: "find-polymarket-markets",
      },
      primaryCTAs: [
        {
          label: "Get Access Now",
          href: "#polymarket-live-pricing",
          requiresAuth: false,
          ariaLabel: "Get access now — view Polymarket Live pricing",
        },
      ],
      secondaryCTAs: [
        {
          label: "See How It Works",
          href: "#find-polymarket-markets",
          requiresAuth: false,
        },
      ],
      capabilityPills: [
        "Live prices",
        "Spreads and liquidity",
        "Order books",
        "Trades",
        "Candlesticks",
        "Holders and positions",
        "Live dashboards",
      ],
    },
    {
      type: "proof_metrics",
      title: "One workspace for live Polymarket research",
      heading: "10,000+ researchers, traders, quants, and analysts using Lychee",
      subheading: "75,400,000+ data requests served through Lychee since June 2026.",
      primaryMetrics: [
        {
          value: "0 Lines",
          label: "Of code required",
          tickerValue: 0,
          decimalPlaces: 0,
          suffix: " Lines",
        },
        {
          value: "100% coverage",
          label: "Every market, event, series, and trader across Polymarket",
          tickerValue: 100,
          decimalPlaces: 0,
          suffix: "% coverage",
        },
        {
          value: "One Workspace",
          label: "From live market data to published dashboard",
          static: true,
        },
        {
          value: "Real Time",
          label: "Directly from Polymarket",
          static: true,
        },
      ],
      trustMetrics: [],
    },
    {
      type: "text_block",
      eyebrow: "From Market Question to Live Analysis",
      title: "See More Than the Headline Odds",
      content:
        "A Polymarket price tells you what the market implies right now. It does not tell you whether the move came with real trading, whether the spread widened, how much liquidity sits behind the quote, or which positions are concentrated on either outcome.\n\nLychee brings those layers together. Search for a market, inspect the live activity behind its price, compare related outcomes, and turn the result into a chart or dashboard you can keep watching.",
      bullets: [
        "Find markets, events, and series with natural-language search",
        "Track prices as the implied odds change",
        "Inspect spreads, liquidity, and order-book depth",
        "Follow executed trades and recent price history",
        "Build live candlesticks from incoming market activity",
        "Explore holders, positions, and leaderboards",
        "Compare multiple markets in one dashboard",
      ],
      footerLink: {
        label:
          "Start now with a market search for free (no sign up or card required)",
        href: "#find-polymarket-markets",
      },
      connectBelow: true,
    },
    {
      type: "demo_module",
      anchorId: "find-polymarket-markets",
      eyebrow: "Find the Right Market",
      title: "Find Any Live Polymarket Market in Plain English",
      content:
        "You should not need an exact market title, slug, or identifier to begin your research. Describe what you want to follow, and Lychee searches the available Polymarket markets, events, and series for the closest matches.\n\nSearch broadly—such as “Fed decision markets”—or ask for a more specific event, date, candidate, asset, or outcome. Choose a result once, then use the same market across the live-price, spread, order-book, trade, candlestick, and holder views below.",
      examplesTitle: "Example prompts",
      examples: [
        "Show me the active markets for the next Fed decision",
        "Find Bitcoin markets resolving this week",
        "Show every market in the presidential election event",
        "Find active markets about inflation",
      ],
      inlineHeading: "Try a Polymarket Search",
      inlineHelper:
        "Describe a topic, event, or outcome. Select a result to update the live examples on this page.",
      placeholder: "Search live Polymarket markets, events, and tags…",
      demoSlot: "polymarket-live-search",
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Watch Live Prices for This Market",
        href: "#live-polymarket-prices",
        requiresAuth: false,
        ariaLabel: "Continue to live prices for the selected market",
      },
    },
    {
      type: "demo_module",
      anchorId: "live-polymarket-prices",
      eyebrow: "Follow the Probability",
      title: "Track Live Polymarket Prices as the Odds Change",
      content:
        "Watch the current price for each outcome update as new market activity arrives. Compare YES and NO, follow related outcomes, and see when the market’s implied probability moves instead of working from a static screenshot.\n\nPrice is the starting point, not the whole story. Lychee keeps the market context close so you can check the quote against the spread, available depth, executed trades, and recent price path before drawing a conclusion.",
      callout:
        "A price of 63¢ is commonly read as roughly a 63% market-implied probability. The spread and order book show whether that headline price is readily tradable.",
      inlineHeading: "Watch a Live Price",
      inlineHelper: "Choose a market and outcome to see its latest price and recent movement.",
      placeholder: "Search for a Polymarket market to load this view.",
      demoSlot: "polymarket-live-prices",
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Check the Live Spread",
        href: "#polymarket-spread-liquidity",
        requiresAuth: false,
        ariaLabel: "Continue to the live spread for the selected market",
      },
      internalLink: {
        prefix: "Learn more in the",
        label: "Polymarket live-prices guide",
        href: "/guides/polymarket-live-prices",
      },
    },
    {
      type: "demo_module",
      anchorId: "polymarket-spread-liquidity",
      eyebrow: "Check the Cost of the Quote",
      title: "See the Spread Behind the Headline Odds",
      content:
        "The spread is the gap between the best available bid and ask. A tight spread can indicate that buyers and sellers are quoting near the same price. A wide spread can mean more trading friction—and that the displayed probability is less actionable than it first appears.\n\nLychee puts the best bid, best ask, spread, and available market context in one live view. Use it to compare liquidity across outcomes, identify markets where the quote has become thin, and see whether a price move arrived with a changing spread.",
      definitions: [
        { term: "Best bid", definition: "The highest current price a buyer is offering" },
        { term: "Best ask", definition: "The lowest current price a seller is offering" },
        { term: "Spread", definition: "The difference between the best ask and best bid" },
        {
          term: "Liquidity",
          definition: "The amount available to trade at and beyond those prices",
        },
      ],
      inlineHeading: "Check the Live Spread",
      inlineHelper:
        "The selected market’s best bid, best ask, spread, and top-of-book size stream live. Open the snapshot tab for the full CLOB book.",
      placeholder: "Search for a Polymarket market to load this view.",
      demoSlot: "polymarket-live-spread",
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Inspect the Live Order Book",
        href: "#polymarket-order-book",
        requiresAuth: false,
        ariaLabel: "Continue to the live order book for the selected market",
      },
      note: "Quotes and available size can change or be cancelled. The view describes current market conditions; it does not guarantee an execution price.",
    },
    {
      type: "demo_module",
      anchorId: "polymarket-order-book",
      eyebrow: "Look Beneath the Best Price",
      title: "Read the Polymarket Order Book Without Losing the Market",
      content:
        "The best price only shows the top of the book. The full order book shows the bids and asks waiting at multiple price levels, along with the size available at each level.\n\nUse Lychee to see where liquidity is concentrated, how quickly available depth falls away, and whether a larger order could move through several levels. Keep the outcome, price, spread, and recent trades beside the book so the numbers remain connected to the market question.",
      bullets: [
        "Best bid and best ask",
        "Bid and ask depth by price level",
        "Available size at each level",
        "Order-book imbalance or depth summaries, when calculated",
        "Updates as the visible book changes",
      ],
      inlineHeading: "Inspect a Live Order Book",
      inlineHelper:
        "Watch the selected market’s bids, asks, and depth update live, or pull a REST snapshot of the same book.",
      placeholder: "Search for a Polymarket market to load this view.",
      demoSlot: "polymarket-live-orderbook",
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Follow Live Trades",
        href: "#live-polymarket-trades",
        requiresAuth: false,
        ariaLabel: "Continue to live trades for the selected market",
      },
    },
    {
      type: "demo_module",
      anchorId: "live-polymarket-trades",
      eyebrow: "Follow What Actually Traded",
      title: "Follow Live Polymarket Trades, Not Just Resting Quotes",
      content:
        "The order book shows what participants are offering. The trade feed shows executed market activity. Follow recent trades by time, price, size, market, and outcome where available, then compare them with the quote that was visible around the same period.\n\nThis makes it easier to separate a moving headline price from a sequence of real transactions—and to investigate whether the market moved gradually, jumped after new information, or traded through thin liquidity.",
      inlineHeading: "Watch Recent Trades",
      inlineHelper:
        "Full Yes and No price history on one chart, with live trades printing onto the same lines.",
      placeholder: "Search for a Polymarket market to load this view.",
      demoSlot: "polymarket-live-trades",
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Chart Live Candlesticks",
        href: "#polymarket-candlestick-charts",
        requiresAuth: false,
        ariaLabel: "Continue to live candlesticks for the selected market",
      },
    },
    {
      type: "demo_module",
      anchorId: "polymarket-candlestick-charts",
      eyebrow: "Turn Updates Into Structure",
      title: "Turn Live Polymarket Activity Into Candlestick Charts",
      content:
        "Individual price updates are useful in the moment but difficult to compare over time. Lychee turns incoming market activity into live candlesticks so you can see each interval’s open, high, low, and close in one view.\n\nChange the interval, zoom into a fast move, compare related outcomes, or place multiple markets on the same chart. The result is a clearer view of how the market reached its current probability—not only where it is now.",
      inlineHeading: "Build a Live Candlestick Chart",
      inlineHelper:
        "Executed trades become open, high, low, and close bars. Live prints and top-of-book updates keep the active candle moving.",
      placeholder: "Search for a Polymarket market to load this view.",
      demoSlot: "polymarket-live-candlesticks",
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Explore Holders and Positions",
        href: "#polymarket-holders-positions",
        requiresAuth: false,
        ariaLabel: "Continue to holders and positions for the selected market",
      },
      internalLink: {
        prefix: "For longer-range context, see the",
        label: "Polymarket odds-over-time guide",
        href: "/guides/polymarket-odds-over-time",
      },
    },
    {
      type: "demo_module",
      anchorId: "polymarket-holders-positions",
      eyebrow: "See Who Is Positioned",
      title: "Explore Polymarket Holders and Positions in Market Context",
      content:
        "Price shows the market consensus. Holder and position data helps you examine how that exposure is distributed. See the wallets holding an outcome, compare position sizes, review available trading history, and move from an individual market to broader leaderboard research.\n\nThe useful question is not simply “What did a whale buy?” It is whether the position fits that wallet’s history, when it was built, how concentrated it is, and what the market’s liquidity looked like around the activity. Lychee gives you the underlying views to investigate those questions without treating any wallet as automatically informed.",
      bullets: [
        "Largest visible holders for a market or outcome",
        "Current position sizes and changes",
        "Available wallet trading and position history",
        "P&L and leaderboard context where available",
        "The markets and outcomes a wallet is currently holding",
      ],
      inlineHeading: "Explore Market Holders",
      inlineHelper:
        "Top holders with avatars, market P&L, overall leaderboard rank, and whale tags for outsized positions. Click a name to open their other markets.",
      placeholder: "Search for a Polymarket market to load this view.",
      demoSlot: "polymarket-live-holders",
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Build a Live Dashboard",
        href: "#polymarket-live-dashboard",
        requiresAuth: false,
        ariaLabel: "Continue to a live dashboard for the selected market",
      },
      note: "Large positions are evidence of exposure, not proof of superior information. Use wallet, market, timing, and liquidity context together.",
    },
    {
      type: "demo_module",
      anchorId: "polymarket-live-dashboard",
      eyebrow: "Bring the Whole Event Together",
      title: "Build a Live Polymarket Dashboard Across Multiple Markets",
      content:
        "A single market rarely tells the whole story. Add related markets and outcomes to one live dashboard, then arrange prices, spreads, order books, trades, candlesticks, holders, and position views around the question you are researching.\n\nCompare every market in an event. Overlay competing outcomes. Watch a macro theme across multiple contracts. Keep the dashboard for yourself, share it with a team, or publish the finished view when the story is ready.",
      examplesTitle: "Dashboard examples",
      examples: [
        "Every market in one election or economic event",
        "Related rate, inflation, and recession probabilities",
        "Multiple crypto outcomes and expiration windows",
        "Price, spread, order-book, and trade views for one active market",
        "Holder activity beside price and liquidity over time",
      ],
      inlineHeading: "Create a Live Dashboard",
      inlineHelper:
        "Generate one dashboard from the live analytics on this page — single view or separate tabs.",
      placeholder: "Search for a Polymarket market to load this view.",
      demoSlot: "polymarket-live-dashboard",
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Ask Better Market Questions",
        href: "#analyze-polymarket-live-data",
        requiresAuth: false,
        ariaLabel: "Continue to live analysis examples",
      },
    },
    {
      type: "cards",
      anchorId: "analyze-polymarket-live-data",
      eyebrow: "Go Beyond the Default View",
      title: "Use the Live Data to Ask Better Market Questions",
      intro:
        "Lychee does not stop at a fixed dashboard. Filter and transform the underlying data, combine live views, and build the analysis your question requires.\n\nMeasure short-term volatility. Compare price movement with spread or order-book depth. Place holder purchases beside liquidity over time. Study whether the most profitable wallets in a market are concentrated on YES or NO. Examine how related outcomes react to the same news.\n\nLychee supplies the live data and analysis tools. The hypothesis, method, and interpretation remain yours.",
      cards: [
        {
          title: "Price vs. Liquidity",
          description:
            "Compare a probability move with the spread and available depth to see whether the market strengthened or simply became thinner.",
        },
        {
          title: "Holder Activity Over Time",
          description:
            "Place position changes or purchases beside price and liquidity to study how exposure was built.",
        },
        {
          title: "Cross-Market Reactions",
          description:
            "Overlay related markets to see whether new information moved one outcome, an entire event, or a broader theme.",
        },
        {
          title: "Live Microstructure",
          description:
            "Combine trades, spread, depth, and short-interval candlesticks to examine fast changes in an active market.",
        },
      ],
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Choose Live vs Historical",
        href: "#live-vs-historical-polymarket-data",
        requiresAuth: false,
        ariaLabel: "Continue to live vs historical Polymarket data",
      },
    },
    {
      type: "cards",
      anchorId: "live-vs-historical-polymarket-data",
      eyebrow: "Choose the Right Time Horizon",
      title: "Polymarket Live Data for Now. Historical Data for What Came Before.",
      intro:
        "Live and historical data answer different questions. Use Polymarket Live when the market is active and you need to see what is changing now. Use Polymarket Historical Data when you need resolved markets, longer time horizons, repeatable datasets, or backtesting.",
      cards: [
        {
          title: "Polymarket Live Data",
          description:
            "Best for active-market monitoring, current prices, spreads, order books, recent trades, live candlesticks, holders, positions, and dashboards that keep updating.",
          cta: { ...EXPLORE_LIVE },
        },
        {
          title: "Polymarket Historical Data",
          description:
            "Best for resolved-market research, archived outcomes, long-range price history, downloadable datasets, strategy testing, and analysis across market cycles.",
          cta: {
            label: "Explore Polymarket Historical Data",
            href: "/polymarket-historical-data",
            requiresAuth: false,
          },
        },
      ],
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Expand Your Research",
        href: "#expand-polymarket-research",
        requiresAuth: false,
        ariaLabel: "Continue to cross-platform research integrations",
      },
    },
    {
      type: "cross_platform_research",
      anchorId: "expand-polymarket-research",
      eyebrow: "EXPAND YOUR RESEARCH",
      title: "One Workspace Across Prediction Markets and the Signals That Move Them",
      intro:
        "Start with live Polymarket activity, add historical context, compare probabilities across exchanges, or bring external signals into the same research workflow.",
      cards: [
        {
          id: "polymarket-live",
          title: "Polymarket Live",
          description:
            "Follow active markets, prices, trades, spreads, order books, holders and positions as conditions change.",
          href: "/polymarket-live-data",
          youAreHere: true,
        },
        {
          id: "polymarket-historical",
          title: "Polymarket Historical",
          description:
            "Study resolved markets, longer price histories and past market behavior for research and backtesting.",
          href: "/polymarket-historical-data",
        },
        {
          id: "kalshi-live",
          title: "Kalshi Live",
          description:
            "Compare current probabilities, prices, volume and market activity across prediction-market platforms.",
          href: "/kalshi-live-data",
        },
        {
          id: "kalshi-historical",
          title: "Kalshi Historical",
          description:
            "Explore Kalshi markets and trades across the platform’s complete historical lifecycle.",
          href: "/kalshi-historical-data",
        },
      ],
      compareEyebrow: "COMPARE PREDICTION MARKETS",
      compareTitle: "See How the Same Event Is Trading on Polymarket and Kalshi",
      compareIntro:
        "Search once, find matching markets across both platforms, and compare their live probabilities, price movement and trading activity in one view.",
      signalsTitle: "Add the Signals Behind the Market",
      signalsBody:
        "Bring X, news, Chainlink, weather and other real-world data beside prediction-market prices to investigate what may be moving the odds.",
      signalLinks: [
        { label: "X", href: "/integrations/twitter" },
        { label: "Chainlink", href: "/integrations/chainlink" },
      ],
      cta: {
        label: "Explore All Lychee Integrations",
        href: "/data-sheet",
        requiresAuth: false,
        ariaLabel: "Explore all Lychee data integrations in the data sheet",
      },
      secondaryCta: {
        label: "Next: Browse Live Data Guides",
        href: "#guides",
        requiresAuth: false,
        ariaLabel: "Continue to Polymarket live data guides",
      },
    },
    {
      type: "link_group",
      anchorId: "guides",
      eyebrow: "Learn the Data",
      title: "Polymarket Live Data Guides and Research",
      description:
        "Start with the live workspace, then go deeper into the market mechanics, data definitions, and research methods behind each view.",
      groups: [
        {
          label: "Live research",
          links: [
            {
              title: "Live Polymarket Prices",
              href: "/guides/polymarket-live-prices",
              description:
                "Find an active market, read its current outcome prices, and follow changes without building a data connection.",
            },
            {
              title: "Polymarket Odds Over Time",
              href: "/guides/polymarket-odds-over-time",
              description:
                "Understand the path behind the current probability and chart how market expectations changed.",
            },
            {
              title: "Find a Polymarket Market ID",
              href: "/guides/polymarket-market-id",
              description:
                "Match a market, event, or outcome with the identifiers used in more technical workflows.",
            },
          ],
        },
        {
          label: "Technical reference",
          links: [
            {
              title: "Polymarket Live Market Channel",
              href: "/guides/polymarket-clob-websocket-market-channel",
              description:
                "A technical guide to streaming market updates for developers who need direct integration details.",
            },
            {
              title: "Find Polymarket Events by Slug",
              href: "/guides/polymarket-gamma-api-events-slug",
              description:
                "Retrieve event metadata and related markets from a known event slug.",
            },
            {
              title: "Explore Polymarket Events Without Code",
              href: "/guides/polymarket-events-endpoint-no-code",
              description:
                "Find event metadata and connected markets through a visual workflow.",
            },
          ],
        },
      ],
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Next: Choose a Plan",
        href: "#polymarket-live-pricing",
        requiresAuth: false,
        ariaLabel: "Continue to Polymarket Live pricing",
      },
    },
    {
      type: "pricing",
      anchorId: "polymarket-live-pricing",
      eyebrow: "Start With the Workflow You Need",
      title: "Choose the Scale of Live Market Research You Need",
      description:
        "Explore Polymarket data in Lychee, then choose the plan that fits how often you research, how much data you work with, and how many live dashboards you want to build.",
    },
    {
      type: "faq",
      anchorId: "polymarket-live-data-faq",
      title: "Polymarket Live Data FAQ",
      items: [
        {
          question: "What is Polymarket live data?",
          answer:
            "Polymarket live data is the changing market information available while a market is active, including outcome prices, bids and asks, spreads, order-book depth, executed trades, and related holder or position data. Lychee brings those views into a searchable visual workspace.",
        },
        {
          question: "Is Polymarket data real time in Lychee?",
          answer:
            "Lychee updates live views continuously as new Polymarket market activity arrives. Update frequency can vary by market activity and data type.",
        },
        {
          question: "Can I see live Polymarket prices, trades, and order books?",
          answer:
            "Yes. You can follow current outcome prices, recent executed trades, the best bid and ask, spreads, and available order-book depth for supported active markets.",
        },
        {
          question: "Can I create Polymarket candlestick charts?",
          answer:
            "Yes. Lychee can turn incoming price activity into live open, high, low, and close candlesticks, making it easier to study how a market moved within each interval.",
        },
        {
          question: "Can I monitor more than one Polymarket market at a time?",
          answer:
            "Yes. Add multiple markets and outcomes to one dashboard, then combine prices, spreads, order books, trades, candlesticks, holders, and position views in the layout that fits your research.",
        },
        {
          question: "Can I explore Polymarket holders, wallets, and positions?",
          answer:
            "Yes. Lychee lets you inspect available holder, position, trading-history, P&L, and leaderboard data. A large or profitable wallet is not automatically informed, so use its history, timing, category performance, and market-liquidity context together.",
        },
        {
          question: "Does Lychee automatically identify smart money?",
          answer:
            "No. “Smart money” is an interpretation, not a raw data field. Lychee gives you the holder, position, trade, price, and liquidity information needed to test that interpretation for yourself.",
        },
        {
          question: "Do I need to code to use Polymarket Live in Lychee?",
          answer:
            "No. You can search for markets, inspect live data, create charts, and build dashboards through Lychee’s visual workflow.",
        },
        {
          question: "Can I export Polymarket data from Lychee?",
          answer:
            "Yes. Available Lychee export options include CSV, XLSX, and JSON. The amount of data and available workflow may depend on the current plan.",
          answerParts: [
            {
              type: "text",
              value: "Yes. Available Lychee export options include ",
            },
            { type: "link", label: "CSV, XLSX, and JSON", href: "/csv-exports" },
            {
              type: "text",
              value:
                ". The amount of data and available workflow may depend on the current plan.",
            },
          ],
        },
        {
          question: "What is the difference between Polymarket live data and historical data?",
          answer:
            "Live data is designed for active markets and current conditions. Historical data is designed for longer time ranges, resolved markets, downloads, backtesting, and research across past market cycles. Lychee provides a separate Polymarket Historical Data workspace for that use case.",
          answerParts: [
            {
              type: "text",
              value:
                "Live data is designed for active markets and current conditions. Historical data is designed for longer time ranges, resolved markets, downloads, backtesting, and research across past market cycles. Lychee provides a separate ",
            },
            {
              type: "link",
              label: "Polymarket Historical Data",
              href: "/polymarket-historical-data",
            },
            { type: "text", value: " workspace for that use case." },
          ],
        },
        {
          question: "Can I search Polymarket markets without knowing an exact title or ID?",
          answer:
            "Yes. Use natural-language search to describe a topic, event, date, asset, candidate, or outcome, then select the closest matching market, event, or series.",
        },
        {
          question: "Is the displayed price the price I am guaranteed to trade at?",
          answer:
            "No. Prices, available size, and orders can change. Check the current spread and order-book depth when evaluating how much liquidity is available near the displayed price.",
        },
      ],
    },
    {
      type: "cta",
      eyebrow: "One Market Question. The Complete Live View.",
      title: "Start Exploring Live Polymarket Data",
      description:
        "Find a market in plain English, see what is happening behind the price, and turn the live data into a chart or dashboard built for your research.",
      supportLine: "No code required.",
      cta: { ...GET_FULL_ACCESS },
      secondaryCta: {
        label: "Start with a Market Search",
        href: "#find-polymarket-markets",
        requiresAuth: false,
        ariaLabel: "Go back to the live market search",
      },
    },
  ],
};
