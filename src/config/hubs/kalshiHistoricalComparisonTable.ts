import type { HubComparisonTableSection } from "@/types/hub";

export const kalshiHistoricalComparisonTable: HubComparisonTableSection = {
  type: "comparison_table",
  title: "Compare Kalshi historical data sources",
  intro:
    "Most Kalshi data options give you raw endpoints, partial history, or developer infrastructure. Lychee gives you the complete Kalshi historical archive, live Kalshi data, cleaned analysis tables, exports, charts, dashboards, and quant workflows — all no-code.",
  featuredColumnId: "lychee",
  columns: [
    { id: "lychee", label: "Lychee", badge: "Most complete no-code workspace" },
    { id: "kalshi_api", label: "Kalshi API" },
    { id: "dome", label: "Dome" },
    { id: "predexon", label: "Predexon" },
    { id: "allium", label: "Allium" },
    { id: "kalshi_website", label: "Kalshi website" },
    { id: "diy", label: "DIY scripts / notebooks" },
  ],
  rows: [
    {
      feature: "Historical Kalshi coverage",
      cells: {
        lychee:
          "Complete launch-to-present archive: markets, trades, prices, categories, outcomes, and orderbook history where available.",
        kalshi_api:
          "Official raw API with live/historical split. You query, paginate, store, clean, and join data yourself.",
        dome:
          "Developer API for live and historical data. Not a no-code workspace or full launch-to-present Kalshi archive.",
        predexon:
          "Endpoint-specific access. Kalshi orderbook history documented from Jan 7, 2026 — narrower than Lychee’s archive.",
        allium:
          "Warehouse/SQL access including Kalshi orderbook tables. Strong for data teams, not no-code research.",
        kalshi_website: "Manual browsing of current/recent markets. Not a historical archive.",
        diy: "Only as complete as what you collect, backfill, store, and maintain.",
      },
    },
    {
      feature: "Live Kalshi data",
      cells: {
        lychee: "Yes — Kalshi Live included alongside Kalshi Historical.",
        kalshi_api: "Yes — official live market endpoints.",
        dome: "Yes — API/websocket live prediction market infrastructure.",
        predexon: "Depends on endpoint and provider coverage.",
        allium: "Primarily warehouse access, not a point-and-click live workspace.",
        kalshi_website: "Yes — live market interface for trading and browsing.",
        diy: "Possible, but you build and maintain collectors.",
      },
    },
    {
      feature: "Other data sources / integrations",
      cells: {
        lychee:
          "Kalshi Historical + Live, Polymarket Historical + Live, Chainlink, Binance, CoinGecko, GeckoTerminal, Twitter/social signals, and more — all no-code in one workspace.",
        kalshi_api:
          "Kalshi only. Official exchange API for Kalshi markets, trades, orders, fills, and historical/live Kalshi data.",
        dome:
          "Prediction-market API coverage across Kalshi, Polymarket, and other markets. Developer/API-first, not a no-code research workspace.",
        predexon:
          "Infrastructure across Polymarket, Kalshi, Limitless, Opinion, Predict.fun, Hyperliquid, Binance reference data, and Chainlink streams. Developer/API-first.",
        allium:
          "Warehouse-style access across Polymarket, Hyperliquid prediction markets, and broad on-chain ecosystems. Strong for SQL/data teams, not no-code workflows.",
        kalshi_website:
          "Kalshi only. Good for browsing and trading Kalshi markets, not combining external data sources.",
        diy:
          "Anything you build manually — every integration, schema, refresh, join, chart, and export maintained by you.",
      },
    },
    {
      feature: "No-code access",
      cells: {
        lychee: "Yes — point, click, filter, query, chart, export, and analyze in the browser.",
        kalshi_api: "No — requires code and API work.",
        dome: "No — developer/API-first.",
        predexon: "No — developer/API-first.",
        allium: "No — SQL/data-team oriented.",
        kalshi_website: "Yes for browsing/trading, not bulk historical analysis.",
        diy: "No.",
      },
    },
    {
      feature: "Data cleaning, joins, and normalization",
      cells: {
        lychee:
          "Already handled. Markets, trades, outcomes, categories, prices, and live/historical data connected for analysis.",
        kalshi_api: "You handle schemas, pagination, storage, joins, retries, cleanup, and normalization.",
        dome: "Simplifies developer access; you still work through API responses and build downstream analysis.",
        predexon: "Endpoint-specific access; you build research logic and downstream analysis.",
        allium: "Structured access, but you write SQL/queries and build analysis workflows.",
        kalshi_website: "Not available for research workflows.",
        diy: "You build everything.",
      },
    },
    {
      feature: "Exports",
      cells: {
        lychee: "CSV, XLSX, and JSON exports depending on plan limits.",
        kalshi_api: "Raw API responses; you build the export flow.",
        dome: "API responses; you build the export flow.",
        predexon: "API responses; you build the export flow.",
        allium: "Warehouse query outputs; technical export workflow.",
        kalshi_website: "No bulk analyst-ready export workflow.",
        diy: "Possible, but user-built.",
      },
    },
    {
      feature: "Built-in analysis",
      cells: {
        lychee:
          "Volatility, Brier scores, calibration, lifecycle analysis, backtesting, category analysis, volume analysis, and quant workflows.",
        kalshi_api: "None built in.",
        dome: "Developer infrastructure, not no-code quant analysis.",
        predexon: "Data endpoints, not a full analysis workspace.",
        allium: "Powerful if you write queries, but not packaged no-code workflows.",
        kalshi_website: "Basic market views only.",
        diy: "Only what you implement.",
      },
    },
    {
      feature: "Charts and dashboards",
      cells: {
        lychee: "Built-in charts, dashboards, embeds, saved workflows, and reusable research outputs.",
        kalshi_api: "No; build UI and charts separately.",
        dome: "Not a no-code dashboard product; you build the UI layer.",
        predexon: "Not a no-code dashboard product.",
        allium: "Data infrastructure, not a no-code chart/dashboard builder.",
        kalshi_website: "Basic single-market charts.",
        diy: "Possible, but user-built.",
      },
    },
    {
      feature: "Best for",
      cells: {
        lychee:
          "Traders, analysts, researchers, quants, creators, and teams wanting complete Kalshi analysis without building infrastructure.",
        kalshi_api: "Developers who want official raw endpoints and full control.",
        dome: "Developers building apps, bots, agents, or infrastructure across prediction markets.",
        predexon: "Developers needing specific Kalshi endpoints or orderbook snapshots.",
        allium: "Technical teams that prefer warehouse/SQL access.",
        kalshi_website: "Traders checking individual live markets.",
        diy: "Technical users with time to build and maintain their own pipeline.",
      },
    },
  ],
  punchline:
    "With raw APIs and third-party feeds, you still have to collect, store, clean, join, export, chart, and analyze the data yourself. With Lychee, that work is already done — so you can go straight from question to answer.",
  cta: {
    label: "Run a free Kalshi query",
    href: "#explore-data",
    ariaLabel: "Run a free Kalshi historical data query",
    eventLabel: "kalshi_historical_comparison_query",
    tracking: {
      page: "/kalshi-historical-data",
      destination: "free demo / templates (#explore-data)",
    },
  },
};
