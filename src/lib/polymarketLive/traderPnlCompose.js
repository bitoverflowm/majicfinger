/**
 * Get trader's PnL series.
 * One /v2/user-pnl call per wallet. Points are cumulative through each
 * timestamp, oldest first. A null amount means that source is uncovered.
 */
import { isPolymarketWalletAddress } from "@/lib/polymarketLive/publicProfilesCompose";

export const TRADER_PNL_ENDPOINT_ID = "getTraderPnlSeries";

/** Shortest window first. Every pair with a fidelity below returns a series. */
export const TRADER_PNL_INTERVALS = [
  ["6h", "6 hours"],
  ["12h", "12 hours"],
  ["1d", "1 day"],
  ["1w", "1 week"],
  ["1m", "1 month"],
  ["all", "All"],
  ["max", "Max"],
];

/** Finest grid first. */
export const TRADER_PNL_FIDELITIES = [
  ["1h", "1 hour"],
  ["3h", "3 hours"],
  ["12h", "12 hours"],
  ["18h", "18 hours"],
  ["1d", "1 day"],
];

const INTERVAL_VALUES = new Set(TRADER_PNL_INTERVALS.map(([value]) => value));
const FIDELITY_VALUES = new Set(TRADER_PNL_FIDELITIES.map(([value]) => value));

const QUERY_IDS = new Set(["interval", "fidelity"]);

const AMOUNTS = [
  "realized_market_pnl",
  "realized_lp_pnl",
  "realized_combo_pnl",
  "realized_pnl",
  "volume",
  "volume_usdc",
  "cashflow_net",
  "deposits",
  "economic_pnl",
  "fees",
  "fees_paid",
  "fees_refunded",
  "maker_rebate",
  "position_pnl",
  "referral_income",
  "reward_income",
  "settled_pnl",
  "sponsored_income",
  "taker_rebate",
  "trade_pnl",
  "unrealized_pnl",
  "wallet_income",
  "withdrawals",
  "yield_income",
];

export const TRADER_PNL_DEFAULT_COLUMNS = [
  "timestamp",
  "realized_pnl",
  "unrealized_pnl",
  "position_pnl",
  "economic_pnl",
  "volume_usdc",
  "trade_count",
];

/** @type {Array<{ name: string, type: string, description: string, title?: string, dateEpoch?: "unix", exact?: boolean }>} */
export const TRADER_PNL_COLUMNS = [
  { name: "user", type: "text", description: "The wallet this series was requested for." },
  { name: "proxy_wallet", type: "text", description: "The wallet the series was computed for." },
  { name: "interval", type: "text", description: "The window served: max, all, 1 month, 1 week, 1 day, 12 hours, or 6 hours." },
  { name: "fidelity", type: "text", description: "The grid the points were placed on: 1 day, 18 hours, 12 hours, 3 hours, or 1 hour." },
  { name: "source_fidelity", type: "text", description: "How fine the stored observations are. Daily history is carried onto a finer grid." },
  { name: "timestamp", type: "date", dateEpoch: "unix", title: "Timestamp", description: "Point time. Every amount is cumulative through this instant, in USDC." },
  { name: "source_block", type: "number", exact: true, description: "Chain block the point was observed at." },
  { name: "trade_count", type: "number", exact: true, title: "Trades", description: "Cumulative maker-attributed fill count." },
  { name: "volume", type: "number", description: "Cumulative maker-attributed fill shares." },
  { name: "volume_usdc", type: "number", title: "Volume", description: "Cumulative maker-attributed fill cash, in USDC." },
  { name: "realized_market_pnl", type: "number", title: "Realized market PnL", description: "Realized PnL from market positions, in USDC." },
  { name: "realized_lp_pnl", type: "number", title: "Realized LP PnL", description: "Realized PnL from liquidity-provision activity, in USDC." },
  { name: "realized_combo_pnl", type: "number", title: "Realized combo PnL", description: "Realized PnL from combo positions, in USDC." },
  { name: "realized_pnl", type: "number", title: "Realized PnL", description: "Market, liquidity, and combo realized PnL added together, in USDC." },
  { name: "unrealized_pnl", type: "number", title: "Unrealized PnL", description: "Mark-to-market of open inventory, in USDC." },
  { name: "position_pnl", type: "number", title: "Position PnL", description: "Realized PnL plus unrealized PnL, in USDC." },
  { name: "economic_pnl", type: "number", title: "Economic PnL", description: "Position PnL plus wallet income, in USDC." },
  { name: "settled_pnl", type: "number", title: "Settled PnL", description: "Realized PnL plus wallet income, with no marks, in USDC." },
  { name: "trade_pnl", type: "number", title: "Trade PnL", description: "The compatibility chart series: position PnL without liquidity PnL, after fee charges and refunds." },
  { name: "fees", type: "number", title: "Fees", description: "Negative cumulative fee charges, in USDC." },
  { name: "fees_paid", type: "number", title: "Fees paid", description: "Refunds minus charges. A disclosure, not another PnL adjustment." },
  { name: "fees_refunded", type: "number", title: "Fees refunded", description: "Total fees refunded, in USDC." },
  { name: "maker_rebate", type: "number", title: "Maker rebate", description: "Maker-side fee rebates credited, in USDC." },
  { name: "taker_rebate", type: "number", title: "Taker rebate", description: "Taker-side fee rebates credited, in USDC." },
  { name: "wallet_income", type: "number", title: "Wallet income", description: "Rebates plus reward, yield, and referral income, in USDC." },
  { name: "reward_income", type: "number", title: "Reward income", description: "Reward-program income credited, in USDC." },
  { name: "yield_income", type: "number", title: "Yield income", description: "Yield income credited, in USDC." },
  { name: "referral_income", type: "number", title: "Referral income", description: "Referral income credited, in USDC." },
  { name: "sponsored_income", type: "number", title: "Sponsored income", description: "Reward, yield, and referral income added together, in USDC." },
  { name: "deposits", type: "number", title: "Deposits", description: "Collateral moved into the wallet, in USDC." },
  { name: "withdrawals", type: "number", title: "Withdrawals", description: "Collateral moved out of the wallet, in USDC." },
  { name: "cashflow_net", type: "number", title: "Net cashflow", description: "Deposits minus withdrawals, in USDC." },
];

/**
 * @param {Record<string, { value?: unknown }> | null | undefined} filters
 */
export function polymarketPnlQuery(filters) {
  const interval = String(filters?.interval?.value || "").trim();
  const fidelity = String(filters?.fidelity?.value || "").trim();
  return {
    interval: INTERVAL_VALUES.has(interval) ? interval : "1d",
    fidelity: FIDELITY_VALUES.has(fidelity) ? fidelity : "1h",
  };
}

export function defaultPolymarketPnlFilters() {
  return {
    interval: { value: "1d" },
    fidelity: { value: "1h" },
  };
}

/**
 * @param {Record<string, { value?: unknown }> | null | undefined} filters
 */
export function polymarketPnlRequestKey(filters) {
  const query = polymarketPnlQuery(filters);
  return `${query.interval}|${query.fidelity}`;
}

function amount(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function whole(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : "";
}

function seriesEnvelope(payload) {
  const root = Array.isArray(payload) ? payload[0] : payload;
  if (!root || typeof root !== "object") return null;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) return data;
  if (Array.isArray(root.points)) return root;
  return null;
}

/**
 * One sheet row per point. Null amounts stay blank. Zero stays zero.
 * @param {unknown} payload
 * @param {string} address
 */
export function pnlSheetRows(payload, address) {
  const data = seriesEnvelope(payload);
  const points = Array.isArray(data?.points) ? data.points : [];
  const asked = isPolymarketWalletAddress(address) ? String(address).trim() : "";
  const wallet = String(data?.proxy_wallet || asked).trim();
  const interval = String(data?.interval || "");
  const fidelity = String(data?.fidelity || "");
  const sourceFidelity = String(data?.source_fidelity || "");
  return points
    .filter((point) => point && typeof point === "object")
    .map((point) => {
      const row = {
        user: asked,
        proxy_wallet: wallet,
        interval,
        fidelity,
        source_fidelity: sourceFidelity,
        timestamp: whole(point.timestamp),
        source_block: whole(point.source_block),
        trade_count: whole(point.trade_count),
      };
      for (const key of AMOUNTS) row[key] = amount(point[key]);
      return row;
    });
}

/**
 * Window and grid dropdowns, then the series columns.
 * @param {Array<Record<string, unknown>>} columns
 */
export function polymarketPnlAttributeColumns(columns) {
  const data = (Array.isArray(columns) ? columns : []).filter((column) => !QUERY_IDS.has(column?.id));
  return [
    {
      id: "interval",
      title: "Interval",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Interval",
      enumOptions: TRADER_PNL_INTERVALS,
      description: "How far back the series reaches. Defaults to 1 day.",
    },
    {
      id: "fidelity",
      title: "Fidelity",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Fidelity",
      enumOptions: TRADER_PNL_FIDELITIES,
      description: "How far apart the points are. Defaults to 1 hour.",
    },
    ...data,
  ];
}
