import type { HubPolymarketLiveDemoMarket } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";

export const KALSHI_GREEN = "#28CC95";
export const POLYMARKET_BLUE = "#2E5CFF";

export type DashboardChildSide = "yes" | "no";

export type DashboardPair = {
  kalshiTicker: string;
  kalshiTitle: string;
  polyMarket: HubPolymarketLiveDemoMarket;
  polyTitle: string;
  childSide: DashboardChildSide;
  matchFromKalshi: boolean;
};

export type LandingComparison = {
  pair: DashboardPair | null;
};

export type BookLevel = {
  price: number;
  size: number;
};

export type CandlePoint = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type PricePoint = {
  t: number;
  v: number;
};

export type TradeRow = {
  id: string;
  venue: "kalshi" | "polymarket";
  time: string;
  ts: number;
  side: string;
  price: number;
  size: number | null;
};

export type HolderRow = {
  proxyWallet: string;
  name: string;
  pseudonym: string;
  profileImage: string;
  amount: number;
  outcome: string;
  verified: boolean;
};

export type AgentStepStatus = "queued" | "running" | "done" | "error";

export type AgentStep = {
  id: string;
  tool: string;
  label: string;
  args: Record<string, unknown>;
  status: AgentStepStatus;
  startedAt: number | null;
  endedAt: number | null;
  result: string;
};

export type DashboardWidgetId =
  | "liveline"
  | "market-candles"
  | "area"
  | "indicators"
  | "depth"
  | "orderbook"
  | "trades"
  | "holders"
  | "watchlist"
  | "heatmap"
  | "stats"
  | "summary";

export type DashboardIntervalId = "15m" | "1h" | "6h" | "1d" | "all";

export type DashboardWidgetLayout = "full" | "half" | "custom";

export type DashboardWidgetVenue = "kalshi" | "poly" | "both";

export type DashboardWidget = {
  id: string;
  type: DashboardWidgetId;
  title: string;
  description: string;
  layout: DashboardWidgetLayout;
  width: number;
  height: number;
  venue?: DashboardWidgetVenue;
};

export const DASHBOARD_INTERVALS: {
  id: DashboardIntervalId;
  label: "15m" | "1h" | "6h" | "1d" | "All";
  ms: number | null;
}[] = [
  { id: "15m", label: "15m", ms: 15 * 60 * 1000 },
  { id: "1h", label: "1h", ms: 60 * 60 * 1000 },
  { id: "6h", label: "6h", ms: 6 * 60 * 60 * 1000 },
  { id: "1d", label: "1d", ms: 24 * 60 * 60 * 1000 },
  { id: "all", label: "All", ms: null },
];

export const MERGED_LIVELINE_HEIGHT = 500;
export const SPLIT_LIVELINE_HEIGHT = 320;

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: "liveline",
    type: "liveline",
    title: "Live YES overlay",
    description: "Kalshi and Polymarket prints on one tape.",
    layout: "full",
    width: 0,
    height: MERGED_LIVELINE_HEIGHT,
    venue: "both",
  },
  {
    id: "stats",
    type: "stats",
    title: "Market stats",
    description: "Live KPIs for the two contracts in this comparison.",
    layout: "full",
    width: 0,
    height: 360,
  },
  {
    id: "summary",
    type: "summary",
    title: "Comparison summary",
    description: "The same side-by-side snapshot from the compare view.",
    layout: "full",
    width: 0,
    height: 380,
  },
  {
    id: "market-candles",
    type: "market-candles",
    title: "Market chart",
    description: "OHLC candles with volume.",
    layout: "full",
    width: 0,
    height: 340,
  },
  {
    id: "area",
    type: "area",
    title: "Price summary",
    description: "Both venues as a shared area series.",
    layout: "half",
    width: 0,
    height: 260,
  },
  {
    id: "indicators",
    type: "indicators",
    title: "Indicators",
    description: "Close, RSI, and MACD on one axis.",
    layout: "half",
    width: 0,
    height: 260,
  },
  {
    id: "depth",
    type: "depth",
    title: "Depth",
    description: "Cumulative bid and ask liquidity.",
    layout: "half",
    width: 0,
    height: 280,
  },
  {
    id: "orderbook",
    type: "orderbook",
    title: "Order books",
    description: "Resting bids and asks, venue by venue.",
    layout: "half",
    width: 0,
    height: 280,
  },
  {
    id: "trades",
    type: "trades",
    title: "Recent trades",
    description: "Merged execution tape.",
    layout: "half",
    width: 0,
    height: 280,
  },
  {
    id: "holders",
    type: "holders",
    title: "Holders",
    description: "Polymarket top holders for this market.",
    layout: "half",
    width: 0,
    height: 280,
  },
  {
    id: "watchlist",
    type: "watchlist",
    title: "Venue watchlist",
    description: "Last, spread, and 24h volume.",
    layout: "half",
    width: 0,
    height: 240,
  },
  {
    id: "heatmap",
    type: "heatmap",
    title: "Liquidity map",
    description: "Tile size is resting bid/ask size. Color is that venue’s YES last vs 50¢.",
    layout: "half",
    width: 0,
    height: 360,
  },
];

export type DashboardSliceStatus = "idle" | "loading" | "ready" | "error";

export type DashboardLiveState = {
  kalshiMarket: Record<string, unknown> | null;
  polyHistory: PricePoint[];
  kalshiTrades: Record<string, unknown>[];
  polyTrades: Record<string, unknown>[];
  kalshiBook: { bids: BookLevel[]; asks: BookLevel[] };
  polyBook: { bids: BookLevel[]; asks: BookLevel[] };
  kalshiCandles: CandlePoint[];
  polyCandles: CandlePoint[];
  trades: TradeRow[];
  holders: HolderRow[];
  kalshiLastPct: number | null;
  polyLastPct: number | null;
  kalshiVolume24h: number | null;
  kalshiVolumeTotal: number | null;
  polyVolume24h: number | null;
  polyVolumeTotal: number | null;
  kalshiSpread: number | null;
  polySpread: number | null;
  slices: Record<string, DashboardSliceStatus>;
  steps: AgentStep[];
};
