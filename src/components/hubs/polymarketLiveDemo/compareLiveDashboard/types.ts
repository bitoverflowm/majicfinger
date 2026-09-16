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
  | "heatmap";

export type DashboardWidget = {
  id: DashboardWidgetId;
  title: string;
  description: string;
  span: 1 | 2;
  height: number;
};

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: "liveline",
    title: "Live YES overlay",
    description: "Kalshi and Polymarket prints on one tape.",
    span: 2,
    height: 280,
  },
  {
    id: "market-candles",
    title: "Market chart",
    description: "OHLC candles with volume.",
    span: 2,
    height: 340,
  },
  {
    id: "area",
    title: "Price summary",
    description: "Both venues as a shared area series.",
    span: 1,
    height: 260,
  },
  {
    id: "indicators",
    title: "Indicators",
    description: "Close, RSI, and MACD on one axis.",
    span: 1,
    height: 260,
  },
  {
    id: "depth",
    title: "Depth",
    description: "Cumulative bid and ask liquidity.",
    span: 1,
    height: 280,
  },
  {
    id: "orderbook",
    title: "Order books",
    description: "Resting bids and asks, venue by venue.",
    span: 1,
    height: 280,
  },
  {
    id: "trades",
    title: "Recent trades",
    description: "Merged execution tape.",
    span: 1,
    height: 280,
  },
  {
    id: "holders",
    title: "Holders",
    description: "Polymarket top holders for this market.",
    span: 1,
    height: 280,
  },
  {
    id: "watchlist",
    title: "Venue watchlist",
    description: "Last, spread, and 24h volume.",
    span: 1,
    height: 240,
  },
  {
    id: "heatmap",
    title: "Liquidity map",
    description: "Where size and movement concentrate.",
    span: 1,
    height: 240,
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
