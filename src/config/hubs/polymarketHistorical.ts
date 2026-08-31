import type { HubPageConfig } from "@/types/hub";
import { polymarketHistoricalComparisonTable } from "./polymarketHistoricalComparisonTable";
import { polymarketHistoricalResearchGuides } from "./polymarketHistoricalResearchGuides";

/** Shared copy for the hub explore block and guide `<PolymarketHistoricalDataQuery />` embeds. */
export const POLYMARKET_HISTORICAL_EXPLORE_SECTION = {
  anchorId: "explore-data",
  title: "Explore Polymarket Historical Data Without Writing Code",
  description:
    "Choose a historical table, apply filters, select the fields you need, and preview real rows. Start with one market or build a multi-market query, then continue in the full workspace when you are ready to join, transform, chart, backtest, or export. Public demo preview · up to 10 rows per query.",
} as const;

const EXPLORE_HISTORICAL = {
  label: "Explore Historical Data",
  href: "#explore-data",
  ariaLabel: "Explore Polymarket Historical Data",
  eventLabel: "polymarket_historical_hero_explore",
  tracking: {
    page: "/polymarket-historical-data",
    destination: "explore-data",
  },
  requiresAuth: false,
} as const;

export const polymarketHistoricalHub: HubPageConfig = {
  id: "polymarket-historical",
  slug: "polymarket-historical-data",
  title: "Polymarket Historical Data",
  heroTitle: "Polymarket Historical Data",
  seoTitle: "Polymarket Historical Data: Prices, Trades & Markets | Lychee",
  description:
    "Every Polymarket market since launch: 404M+ historical trade records, price history, events and resolutions. Query, chart, backtest and export without code.",
  socialTitle: "Polymarket Historical Data: Prices, Trades & Markets",
  socialDescription:
    "Every Polymarket market since launch—404M+ historical trade records, prices, events and resolutions in one no-code research workspace.",
  publishedAt: "2026-06-20",
  updatedAt: "2026-08-24",
  author: "misterrpink",
  topics: [
    "polymarket",
    "prediction markets",
    "historical data",
    "historical trades",
    "price history",
    "backtesting",
  ],
  integration: ["Polymarket", "Lychee"],
  ogImage: "https://lycheedata.com/ogImage2.png",
  ogImageAlt: "Polymarket Historical Data — 404M+ trades · every market since launch",
  featured: true,
  readingTime: "10 min",
  twitterCard: "summary_large_image",
  canonical: "https://lycheedata.com/polymarket-historical-data",
  keywords: [
    "polymarket historical data",
    "polymarket dataset",
    "polymarket historical dataset",
    "polymarket historical prices",
    "polymarket price history",
    "polymarket historical trades",
    "polymarket historical trade data",
    "polymarket data download",
    "polymarket historical data download",
    "polymarket archive",
    "polymarket backtesting data",
  ],
  datasetSchema: {
    name: "Polymarket Historical Data",
    alternateName: "Polymarket Historical Dataset",
    description:
      "An indexed Polymarket historical dataset covering every market from platform launch through December 2025, including 404M+ executed trade records, markets, events, historical price observations, resolutions, and Polygon block timestamps. Current data is available through Lychee’s Polymarket Live integration.",
    keywords: [
      "Polymarket historical data",
      "Polymarket dataset",
      "historical prices",
      "historical trades",
      "resolved markets",
      "backtesting",
    ],
    variableMeasured: [
      "Markets",
      "Events",
      "Executed trades",
      "Historical price observations",
      "Resolutions",
      "Polygon blocks and timestamps",
    ],
  },
  assetFilter: {
    username: "misterrpink",
    chartSearchAllUsers: true,
    dashboardSearchAllUsers: true,
    dashboardTags: ["polymarket", "historical"],
    chartKeywords: ["polymarket"],
    chartLake: "polymarket",
    maxCharts: 8,
    maxDashboards: 8,
  },
  sections: [
    {
      type: "hero",
      variant: "premium",
      badge: "Need current prices, live trades, order books, holders, or positions? Explore Polymarket Live Data →",
      badgeHref: "/polymarket-live-data",
      badgeIcon: "dot",
      eyebrow: "THE COMPLETE POLYMARKET MARKET-AND-TRADE ARCHIVE",
      title: "Polymarket Historical Data",
      subtitle:
        "Explore every Polymarket market from launch to today, with 404M+ historical trade records, price history, events, resolutions, and timestamped Polygon blocks—ready to query, join, chart, export, and backtest without code.",
      supportingText:
        "The dedicated historical archive runs from Polymarket’s launch through December 2025. Polymarket Live carries the same research workflow forward to current markets and activity.",
      microtext:
        "Built for traders, quants, researchers, and analysts who want to study Polymarket without building and maintaining a historical data pipeline.",
      capabilityPills: [
        "Every market since launch",
        "404M+ historical trade records",
        "Historical prices and resolutions",
        "CSV, XLSX, and JSON exports",
        "No-code querying and backtesting",
      ],
      primaryCTAs: [EXPLORE_HISTORICAL],
      secondaryCTAs: [
        {
          label: "See What’s Included",
          href: "#dataset-contents",
          ariaLabel: "See what is included in Polymarket Historical Data",
          eventLabel: "polymarket_historical_hero_dataset",
          tracking: {
            page: "/polymarket-historical-data",
            destination: "dataset-contents",
          },
          requiresAuth: false,
        },
      ],
    },

    {
      type: "proof_metrics",
      heading: "10,000+ researchers, traders, quants, and analysts use Lychee.",
      subheading:
        "43,400,000+ historical data requests were served from the archive in June 2026 alone.",
      primaryMetrics: [
        {
          value: "404M+",
          label: "Historical trade records",
          static: true,
        },
        {
          value: "36GB+",
          label: "Indexed archive",
          static: true,
        },
        {
          value: "Launch → Today",
          label: "Historical plus Live continuity",
          static: true,
        },
        {
          value: "0 Lines",
          label: "Of code required",
          static: true,
        },
      ],
      trustMetrics: [],
    },

    {
      type: "cards",
      anchorId: "dataset-contents",
      eyebrow: "WHAT’S INSIDE",
      title: "Every Historical Layer Needed to Reconstruct a Polymarket Market",
      intro:
        "Start with the market question, follow its price and executed trades through time, connect it to the parent event, and check the final resolution. Lychee keeps those layers indexed and connected so you can move from an individual market to cross-market analysis without preparing the archive yourself.",
      cards: [
        {
          title: "Markets",
          description:
            "Every archived Polymarket market, with the identifiers, question, timing, status, outcomes, and available market metadata needed for filtering and analysis.",
        },
        {
          title: "Events",
          description:
            "Group related markets under the real-world event they belong to. Use the available event and market relationships to compare the contracts attached to the same question.",
        },
        {
          title: "Historical Trades",
          description:
            "404M+ executed trade records connected to their markets for time-series analysis, activity studies, market comparison, and strategy research.",
        },
        {
          title: "Price History",
          description:
            "Historical price observations that show how market-implied probabilities changed before resolution. Filter by market and time, then chart the resulting path.",
        },
        {
          title: "Resolutions",
          description:
            "Final outcomes for calibration studies, forecasting-accuracy research, resolved-market analysis, and repeatable backtests.",
        },
        {
          title: "Blocks",
          description:
            "Polygon block numbers mapped to ISO 8601 timestamps, making it easier to connect on-chain sequence with ordinary time-series analysis.",
        },
      ],
      note:
        "The same market identifiers can be carried into Polymarket Live when you need current metadata, prices, trades, order books, holders, or positions.",
      noteCta: {
        label: "Explore Polymarket Live →",
        href: "/polymarket-live-data",
      },
      cta: {
        label: "Try the Archive",
        href: "#explore-data",
        ariaLabel: "Open the Polymarket Historical Data explorer",
        requiresAuth: false,
      },
    },

    {
      type: "text_block",
      anchorId: "from-raw-data",
      eyebrow: "FROM RAW DATA TO RESEARCH",
      title: "Polymarket History Should Not Begin With a Data-Engineering Project",
      content:
        "Polymarket’s official APIs can retrieve individual markets, price history, and activity. On-chain sources expose contract events. Public archives give you downloadable files. Each can be useful—but answering a research question still requires finding the right identifiers, managing time ranges, storing results, understanding schemas, connecting markets to events, trades, prices, and resolutions, and building an analysis layer. Lychee handles that preparation upfront. Find the markets you care about, query indexed historical tables, apply joins and transformations visually, and turn the result into a chart, dashboard, export, or backtest from the same workspace.",
      contentParts: [
        {
          type: "text",
          value:
            "Polymarket’s ",
        },
        {
          type: "link",
          label: "official APIs",
          href: "https://docs.polymarket.com/api-reference/markets/get-prices-history",
        },
        {
          type: "text",
          value:
            " can retrieve individual markets, price history, and activity. ",
        },
        {
          type: "link",
          label: "On-chain sources",
          href: "https://docs.polymarket.com/resources/blockchain-data",
        },
        {
          type: "text",
          value:
            " expose contract events. Public archives give you downloadable files. Each can be useful—but answering a research question still requires finding the right identifiers, managing time ranges, storing results, understanding schemas, connecting markets to events, trades, prices, and resolutions, and building an analysis layer.",
        },
      ],
      supportingText:
        "Lychee handles that preparation upfront. Find the markets you care about, query indexed historical tables, apply joins and transformations visually, and turn the result into a chart, dashboard, export, or backtest from the same workspace. You assemble the analysis—not the data infrastructure.",
      bullets: [
        "No archive collector to maintain",
        "No SQL required for joins or transformations",
        "No separate notebook needed to preview and chart the result",
        "No manual ID matching before the first market search",
      ],
      footerLink: {
        label: "Open the historical explorer →",
        href: "#explore-data",
      },
    },

    {
      type: "cards",
      anchorId: "find-markets",
      eyebrow: "START WITH THE QUESTION",
      title: "Find the Market First. Then Open Its Entire History.",
      intro:
        "You should not need to know a condition ID, token ID, market slug, or exact title before you can begin. Describe the topic, event, candidate, asset, date, or outcome you want to research. Search broadly, select one market or a group of related markets, and carry their identifiers into the historical workflow.",
      cards: [
        {
          title: "Find markets about the next Federal Reserve decision",
          description: "Example prompt — search by topic and event, then open matching historical tables.",
        },
        {
          title: "Show me Bitcoin markets tied to a specific date",
          description: "Example prompt — narrow by asset and date window before querying trades or prices.",
        },
        {
          title: "Find every market in a presidential election event",
          description: "Example prompt — start from an event, then expand to related contracts.",
        },
        {
          title: "Search for weather markets about New York",
          description: "Example prompt — discover topic-specific markets without memorizing IDs.",
        },
      ],
      note:
        "Natural-language Polymarket market search lives in the full Lychee workspace and on Polymarket Live. On this page, open the explorer below to query indexed Markets, Trades, and Blocks.",
      noteCta: {
        label: "Analyze Historical Data →",
        href: "#explore-data",
      },
    },

    {
      type: "query",
      anchorId: POLYMARKET_HISTORICAL_EXPLORE_SECTION.anchorId,
      title: POLYMARKET_HISTORICAL_EXPLORE_SECTION.title,
      headerBranding: "polymarket_historical",
      description: POLYMARKET_HISTORICAL_EXPLORE_SECTION.description,
      examplesTitle: "Continue in the full workspace",
      examples: [
        "Join markets with executed trades",
        "Filter by date and market identifiers",
        "Chart, export, or backtest the result",
      ],
      cta: {
        label: "Upgrade Now to Get Full Access",
        href: "#pricing",
        ariaLabel: "Upgrade now to get full access — view pricing",
        requiresAuth: false,
        eventLabel: "polymarket_historical_upgrade_full_access",
        tracking: {
          page: "/polymarket-historical-data",
          destination: "pricing",
        },
      },
    },

    {
      type: "text_block",
      content:
        "Learn how to track Polymarket odds over time — a guided walkthrough for turning historical price observations into an interpretable chart.",
      title: "Track Polymarket odds over time",
      contentParts: [
        {
          type: "text",
          value: "Learn how to ",
        },
        {
          type: "link",
          label: "track Polymarket odds over time",
          href: "/guides/polymarket-odds-over-time",
        },
        {
          type: "text",
          value:
            " — a guided walkthrough for turning historical price observations into an interpretable chart.",
        },
      ],
    },

    {
      type: "cards",
      anchorId: "analysis-tools",
      eyebrow: "BUILD THE ANALYSIS",
      title: "The Data Is Prepared. The Research Question Is Yours.",
      intro:
        "Lychee is intentionally unopinionated. Once you identify the markets you want to study, use the same visual workspace to choose columns, filter rows, sort observations, join connected tables, bucket time, aggregate results, and compare multiple markets at once. You decide the hypothesis and method; Lychee supplies the indexed archive and quantitative tools.",
      cards: [
        {
          title: "Select, Filter, and Sort",
          description:
            "Choose the fields that matter, narrow the archive to the markets and dates you need, and order the resulting rows without writing a query.",
        },
        {
          title: "Join Historical Layers",
          description:
            "Connect markets, events, executed trades, price history, resolutions, and block timestamps using their available identifiers.",
        },
        {
          title: "Bucket and Aggregate",
          description:
            "Group observations into useful time intervals or categories, then calculate summaries for comparison and charting.",
        },
        {
          title: "Build Multi-Market Tables",
          description:
            "Bring one event, a group of related contracts, or a broader market cohort into the same analysis table.",
        },
        {
          title: "Chart and Dashboard",
          description:
            "Turn the prepared result into an interactive chart or combine multiple views in a dashboard.",
        },
        {
          title: "Export and Backtest",
          description:
            "Download CSV, XLSX, or JSON within your plan limits, or carry the prepared dataset into a repeatable historical strategy test.",
          cta: {
            label: "CSV, XLSX, or JSON exports",
            href: "/csv-exports",
            requiresAuth: false,
          },
        },
      ],
      note: "Historical strategy tests use Lychee’s quantitative analysis tools.",
      cta: {
        label: "Upgrade Now to Get Full Access",
        href: "#pricing",
        ariaLabel: "Upgrade now to get full access — view pricing",
        requiresAuth: false,
        eventLabel: "polymarket_historical_analysis_upgrade",
        tracking: {
          page: "/polymarket-historical-data",
          destination: "pricing",
        },
      },
    },

    {
      type: "cards",
      anchorId: "use-cases",
      eyebrow: "ASK BETTER HISTORICAL QUESTIONS",
      title: "What Can You Do With Polymarket Historical Data?",
      intro:
        "A complete archive is most useful when it can move from one market to a repeatable cohort. Start with an individual probability path, then expand the same workflow across events, categories, time periods, or resolved outcomes.",
      cards: [
        {
          title: "Reconstruct a Market’s Price History",
          description:
            "Chart how the implied probability moved from opening activity through resolution, then inspect the periods where expectations changed most.",
        },
        {
          title: "Compare Markets Within One Event",
          description:
            "Place related outcomes or contracts beside one another to see whether new information moved a single market or the entire event.",
        },
        {
          title: "Study Executed Trade Activity",
          description:
            "Measure when and where trading activity concentrated, compare markets, and place executed trades beside the available historical price path.",
        },
        {
          title: "Measure Calibration and Forecast Accuracy",
          description:
            "Group resolved markets by prior probability and compare those probabilities with observed outcomes to study calibration.",
        },
        {
          title: "Backtest Across Resolved Markets",
          description:
            "Define repeatable entry, exit, time, price, or outcome rules and evaluate them on a historical cohort instead of one anecdotal market.",
        },
        {
          title: "Analyze Activity Across Categories and Time",
          description:
            "Compare market creation, trading activity, prices, and resolutions across topics or periods to study how Polymarket’s market mix changed.",
        },
      ],
      note:
        "Historical results do not guarantee future performance. Market prices are market-implied probabilities, not certain forecasts, and the quality of a backtest depends on its assumptions, filters, timing, and treatment of unavailable information.",
    },

    {
      type: "cards",
      anchorId: "live-vs-historical",
      eyebrow: "CHOOSE THE RIGHT TIME HORIZON",
      title: "Polymarket Historical for What Happened. Polymarket Live for What Is Happening.",
      intro:
        "Use the historical archive when your question requires past markets, longer price paths, resolutions, downloadable cohorts, or backtesting. Move into Polymarket Live when you need the current market state and the layers changing around it.",
      cards: [
        {
          title: "Polymarket Historical Data — You’re here",
          description:
            "Best for every archived market since launch, historical trades, price history, events, resolutions, block timestamps, exports, calibration research, and backtesting. Current page.",
        },
        {
          title: "Polymarket Live Data",
          description:
            "Best for active markets, current prices, spreads, order books, recent trades, candlesticks, holders, positions, and dashboards that keep updating.",
          cta: {
            label: "Explore Polymarket Live",
            href: "/polymarket-live-data",
            requiresAuth: false,
            eventLabel: "polymarket_historical_to_live",
            tracking: {
              page: "/polymarket-historical-data",
              destination: "/polymarket-live-data",
            },
          },
        },
      ],
      note:
        "The dedicated historical archive covers launch through December 2025. Polymarket Live continues the workflow into current data, so researchers can move from an archived market cycle to today’s activity without changing platforms.",
    },

    {
      type: "cross_platform_research",
      anchorId: "prediction-market-data",
      eyebrow: "EXPAND YOUR RESEARCH",
      title: "One Workspace Across Four Prediction-Market Data Layers",
      intro:
        "Start with Polymarket history, add the current market state, compare related questions across exchanges, or carry the same analysis method into Kalshi.",
      cards: [
        {
          id: "polymarket-historical",
          title: "Polymarket Historical",
          description:
            "Study every Polymarket market from launch, with historical trades, prices, events, resolutions, exports, and backtesting workflows.",
          href: "/polymarket-historical-data",
          youAreHere: true,
        },
        {
          id: "polymarket-live",
          title: "Polymarket Live",
          description:
            "Follow active Polymarket prices, trades, spreads, order books, candlesticks, holders, and positions.",
          href: "/polymarket-live-data",
        },
        {
          id: "kalshi-historical",
          title: "Kalshi Historical",
          description:
            "Explore Kalshi markets, trades, outcomes, historical order books, and long-range research from launch.",
          href: "/kalshi-historical-data",
        },
        {
          id: "kalshi-live",
          title: "Kalshi Live",
          description:
            "Monitor current Kalshi markets, prices, trades, order books, candlesticks, volume, and open interest.",
          href: "/kalshi-live-data",
        },
      ],
      compareEyebrow: "COMPARE PREDICTION MARKETS",
      compareTitle: "Compare the Same Event Across Exchanges",
      compareIntro:
        "Move from one exchange to the other without rebuilding the workflow. Compare related probabilities, price paths, volume, and market behavior across Polymarket and Kalshi.",
      signalsTitle: "Add the Signals Behind the Market",
      signalsBody:
        "Bring available Lychee reference and market datasets beside prediction-market probabilities to investigate the information, prices, and real-world signals behind a move.",
      signalLinks: [
        { label: "Browse integrations", href: "/#demo" },
        { label: "CSV exports", href: "/csv-exports" },
        { label: "Quant analysis", href: "/quant-analysis" },
      ],
      cta: {
        label: "Upgrade Now to Get Full Access",
        href: "#pricing",
        ariaLabel: "Upgrade now to get full access — view pricing",
        requiresAuth: false,
        eventLabel: "polymarket_historical_cross_platform_upgrade",
        tracking: {
          page: "/polymarket-historical-data",
          destination: "pricing",
        },
      },
      secondaryCta: {
        label: "Explore Polymarket Live",
        href: "/polymarket-live-data",
        requiresAuth: false,
      },
    },

    polymarketHistoricalComparisonTable,

    polymarketHistoricalResearchGuides,

    {
      type: "pricing",
      anchorId: "polymarket-historical-pricing",
      eyebrow: "START WITH THE WORKFLOW YOU NEED",
      title: "Choose the Scale of Historical Research You Need",
      description:
        "Explore Polymarket historical data in Lychee, then choose the plan that fits the size of your pulls, exports, saved workspaces, dashboards, and backtesting workflows.",
    },

    {
      type: "faq",
      anchorId: "faq",
      title: "Polymarket Historical Data FAQ",
      items: [
        {
          question: "What is Polymarket historical data?",
          answer:
            "Polymarket historical data is the record of past markets and market activity, including market and event information, executed trades, historical price observations, resolutions, and related blockchain timing data. Researchers use it to reconstruct probability changes, compare markets, analyze activity, study forecasting accuracy, and backtest historical rules.",
        },
        {
          question: "How far back does Lychee’s Polymarket historical data go?",
          answer:
            "Lychee’s dedicated Polymarket historical archive begins at Polymarket’s launch and runs through December 2025. Polymarket Live supplies current and newer market data, giving researchers a launch-to-present workflow across the two integrations.",
        },
        {
          question: "How much Polymarket historical data is available?",
          answer:
            "The indexed historical archive contains 36GB+ of data and 404M+ executed trade records. It covers every Polymarket market in the supported archive period. The exact number of markets changes as Polymarket creates new ones, so Lychee describes the coverage as every market rather than publishing a stale market count.",
        },
        {
          question: "What tables are included?",
          answer:
            "The historical workspace includes Markets, Events, Trades, Price History, Resolutions, and Blocks. The Blocks table maps Polygon block numbers to ISO 8601 timestamps. Available columns are shown directly in the explorer and workspace.",
        },
        {
          question: "Can I get Polymarket historical price data?",
          answer:
            "Yes. Use the Price History table to query historical price observations for selected markets and time ranges, then filter, chart, compare, or export the result. For a guided explanation, see the Polymarket odds-over-time guide.",
          answerParts: [
            {
              type: "text",
              value:
                "Yes. Use the Price History table to query historical price observations for selected markets and time ranges, then filter, chart, compare, or export the result. For a guided explanation, see the ",
            },
            {
              type: "link",
              label: "Polymarket odds-over-time guide",
              href: "/guides/polymarket-odds-over-time",
            },
            { type: "text", value: "." },
          ],
        },
        {
          question: "Does the dataset include historical Polymarket trades?",
          answer:
            "Yes. Lychee’s archive includes 404M+ executed trade records connected to their markets. You can filter historical trade data, join it with market or event context, compare activity across markets, aggregate it over time, and use it in research or backtesting workflows.",
        },
        {
          question: "Can I download Polymarket historical data?",
          answer:
            "Yes. Lychee supports CSV, XLSX, and JSON exports within current plan limits. You can first narrow the archive to the relevant markets, fields, and time range instead of downloading an unfiltered raw dump.",
          answerParts: [
            {
              type: "text",
              value: "Yes. Lychee supports ",
            },
            {
              type: "link",
              label: "CSV, XLSX, and JSON exports",
              href: "/csv-exports",
            },
            {
              type: "text",
              value:
                " within current plan limits. You can first narrow the archive to the relevant markets, fields, and time range instead of downloading an unfiltered raw dump.",
            },
          ],
        },
        {
          question: "Do I need the Polymarket API or SQL?",
          answer:
            "No. Lychee provides a visual workflow for finding markets, querying historical tables, selecting fields, filtering rows, joining related data, bucketing time, aggregating results, and creating charts or exports. Developers can still use Polymarket’s official endpoints for custom applications, but coding is not required to use Lychee.",
        },
        {
          question: "Can I backtest a Polymarket strategy without code?",
          answer:
            "Yes. Select a historical market cohort, connect the required price, trade, and resolution data, define the relevant transformations or rules, and run the analysis through Lychee’s quantitative workflow. Backtest quality depends on the assumptions and information available at each historical point, and past performance does not guarantee future results.",
          answerParts: [
            {
              type: "text",
              value:
                "Yes. Select a historical market cohort, connect the required price, trade, and resolution data, define the relevant transformations or rules, and run the analysis through Lychee’s ",
            },
            {
              type: "link",
              label: "quantitative workflow",
              href: "/quant-analysis",
            },
            {
              type: "text",
              value:
                ". Backtest quality depends on the assumptions and information available at each historical point, and past performance does not guarantee future results.",
            },
          ],
        },
        {
          question: "Can I analyze more than one Polymarket market at a time?",
          answer:
            "Yes. Build a multi-market table for related contracts, every market in an event, a topic-specific cohort, or a broader period. You can then compare price paths, activity, and outcomes in one chart, dashboard, export, or backtest.",
        },
        {
          question: "What is the difference between Polymarket Historical and Polymarket Live?",
          answer:
            "Polymarket Historical is designed for archived and resolved markets, longer price paths, historical trades, resolutions, downloads, and backtesting. Polymarket Live is designed for current prices, spreads, order books, recent trades, live candlesticks, holders, positions, and continuously updating dashboards.",
          answerParts: [
            {
              type: "text",
              value:
                "Polymarket Historical is designed for archived and resolved markets, longer price paths, historical trades, resolutions, downloads, and backtesting. ",
            },
            {
              type: "link",
              label: "Polymarket Live",
              href: "/polymarket-live-data",
            },
            {
              type: "text",
              value:
                " is designed for current prices, spreads, order books, recent trades, live candlesticks, holders, positions, and continuously updating dashboards.",
            },
          ],
        },
        {
          question: "Can I compare Polymarket and Kalshi data?",
          answer:
            "Yes. Lychee includes historical and live integrations for both Polymarket and Kalshi. You can use the shared workspace to investigate related markets, compare probability paths and activity, and apply similar research methods across exchanges.",
          answerParts: [
            {
              type: "text",
              value:
                "Yes. Lychee includes historical and live integrations for both Polymarket and Kalshi — see ",
            },
            {
              type: "link",
              label: "Kalshi Historical",
              href: "/kalshi-historical-data",
            },
            { type: "text", value: ", " },
            {
              type: "link",
              label: "Kalshi Live",
              href: "/kalshi-live-data",
            },
            { type: "text", value: ", and " },
            {
              type: "link",
              label: "Polymarket Live",
              href: "/polymarket-live-data",
            },
            {
              type: "text",
              value:
                ". You can use the shared workspace to investigate related markets, compare probability paths and activity, and apply similar research methods across exchanges.",
            },
          ],
        },
        {
          question: "Is Polymarket historical data suitable for academic or quantitative research?",
          answer:
            "It can support academic, market-structure, forecasting, and quantitative research because the archive connects markets, events, prices, trades, resolutions, and block timestamps. Researchers remain responsible for documenting filters, transformations, assumptions, exclusions, and the version or retrieval date of any exported dataset.",
        },
      ],
    },

    {
      type: "cta",
      eyebrow: "FROM MARKET QUESTION TO HISTORICAL EVIDENCE",
      title: "Start Exploring Polymarket Historical Data",
      description:
        "Find a market, inspect its historical rows, follow its probability through time, and turn the result into a chart, export, or backtest—without building a pipeline first.",
      supportLine: "Start with a 10-row demo query. No code required.",
      cta: {
        label: "Explore Historical Data",
        href: "#explore-data",
        ariaLabel: "Explore Polymarket Historical Data",
        requiresAuth: false,
        eventLabel: "polymarket_historical_final_explore",
        tracking: {
          page: "/polymarket-historical-data",
          destination: "explore-data",
        },
      },
      secondaryCta: {
        label: "View Pricing",
        href: "#pricing",
        ariaLabel: "View Polymarket Historical Data pricing",
        requiresAuth: false,
        eventLabel: "polymarket_historical_final_pricing",
        tracking: {
          page: "/polymarket-historical-data",
          destination: "pricing",
        },
      },
    },
  ],
};
