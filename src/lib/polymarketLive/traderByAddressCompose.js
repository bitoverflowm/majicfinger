/**
 * Get trader's profile and stats.
 * One row per wallet: Gamma public profile, Data API /v2/user-stats, and
 * /v2/value, flattened onto the same row. None of them accept a list, so
 * each submitted address is its own set of calls.
 */
import { isPolymarketWalletAddress } from "@/lib/polymarketLive/publicProfilesCompose";

export const TRADER_BY_ADDRESS_ENDPOINT_ID = "getTraderByAddress";

export const TRADER_BY_ADDRESS_DEFAULT_COLUMNS = [
  "address",
  "name",
  "pseudonym",
  "proxyWallet",
  "xUsername",
  "verifiedBadge",
  "createdAt",
  "trades",
  "biggest_win",
  "views",
  "join_date",
  "realized_pnl",
  "volume_usdc",
  "portfolio_value",
];

/** @type {Array<{ name: string, type: string, description: string, title?: string, dateEpoch?: "iso" | "unix", exact?: boolean }>} */
export const TRADER_BY_ADDRESS_COLUMNS = [
  { name: "address", type: "text", description: "The wallet address this row was looked up with." },
  { name: "createdAt", type: "date", dateEpoch: "iso", description: "When the profile was created." },
  { name: "proxyWallet", type: "text", description: "The proxy wallet address on the public profile." },
  { name: "profileImage", type: "text", description: "URL of the profile image." },
  { name: "displayUsernamePublic", type: "boolean", description: "Whether the username is displayed publicly." },
  { name: "bio", type: "text", description: "Profile bio." },
  { name: "pseudonym", type: "text", description: "Auto-generated pseudonym." },
  { name: "name", type: "text", description: "User-chosen display name." },
  { name: "users", type: "text", description: "Associated user accounts, as JSON." },
  { name: "users_id", type: "text", title: "User ID", description: "IDs of the associated user accounts." },
  { name: "users_creator", type: "boolean", title: "Creator", description: "Whether an associated user is a creator." },
  { name: "users_mod", type: "boolean", title: "Moderator", description: "Whether an associated user is a moderator." },
  { name: "xUsername", type: "text", description: "X (Twitter) username." },
  { name: "verifiedBadge", type: "boolean", description: "Whether the profile has a verified badge." },
  { name: "biggest_win", type: "number", description: "Largest single resolved win, in USDC. Zero when the wallet has no win over $1." },
  { name: "proxy_wallet", type: "text", description: "The proxy wallet these lifetime statistics describe." },
  { name: "trades", type: "number", exact: true, description: "Distinct markets the wallet traded." },
  { name: "views", type: "number", exact: true, description: "Profile view count." },
  { name: "join_date", type: "date", dateEpoch: "unix", description: "When the account joined, or blank when unknown." },
  { name: "realized_combo_pnl", type: "number", description: "Realized PnL from combo positions." },
  { name: "realized_lp_pnl", type: "number", description: "Realized PnL from AMM liquidity-provision activity." },
  { name: "realized_market_pnl", type: "number", description: "Realized PnL from market positions." },
  { name: "realized_pnl", type: "number", description: "Realized market, LP, and combo PnL combined." },
  { name: "source_block", type: "number", exact: true, description: "Chain block the PnL point was observed at." },
  { name: "timestamp", type: "date", dateEpoch: "unix", title: "PnL timestamp", description: "When the cumulative PnL point was observed. Amounts are cumulative through this instant." },
  { name: "trade_count", type: "number", exact: true, description: "Cumulative maker-attributed exchange fill count." },
  { name: "volume", type: "number", description: "Cumulative maker-attributed exchange fill shares." },
  { name: "volume_usdc", type: "number", description: "Cumulative maker-attributed exchange fill cash, in USDC." },
  { name: "portfolio_value", type: "number", title: "Portfolio value", description: "Holdings marked to market plus unresolved combo positions at cost basis, in USDC. Zero when the wallet has no positions." },
  { name: "cashflow_net", type: "number", description: "Deposits minus withdrawals." },
  { name: "deposits", type: "number", description: "Collateral moved into the wallet." },
  { name: "economic_pnl", type: "number", description: "Position PnL plus wallet income." },
  { name: "fees", type: "number", description: "Negative cumulative fee charges." },
  { name: "fees_paid", type: "number", description: "Refunds minus charges." },
  { name: "fees_refunded", type: "number", description: "Total fees refunded." },
  { name: "maker_rebate", type: "number", description: "Maker-side fee rebates credited." },
  { name: "position_pnl", type: "number", description: "Realized plus unrealized PnL." },
  { name: "referral_income", type: "number", description: "Referral income credited." },
  { name: "reward_income", type: "number", description: "Reward-program income credited." },
  { name: "settled_pnl", type: "number", description: "Realized PnL plus wallet income, with no marks." },
  { name: "sponsored_income", type: "number", description: "Reward, yield, and referral income." },
  { name: "taker_rebate", type: "number", description: "Taker-side fee rebates credited." },
  { name: "trade_pnl", type: "number", description: "Position PnL without LP realized, after fee charges and refunds." },
  { name: "unrealized_pnl", type: "number", description: "Mark-to-market of open inventory." },
  { name: "wallet_income", type: "number", description: "Rebates plus reward, yield, and referral income." },
  { name: "withdrawals", type: "number", description: "Collateral moved out of the wallet." },
  { name: "yield_income", type: "number", description: "Yield income credited." },
];

const PNL_FIELDS = [
  "realized_combo_pnl",
  "realized_lp_pnl",
  "realized_market_pnl",
  "realized_pnl",
  "source_block",
  "timestamp",
  "trade_count",
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

/**
 * Wallets the user added, in order, with duplicates dropped.
 * @param {Array<{ address?: string }> | null | undefined} picks
 */
export function traderAddressesFromPicks(picks) {
  const seen = new Set();
  const addresses = [];
  for (const pick of Array.isArray(picks) ? picks : []) {
    const address = String(pick?.address || "").trim();
    if (!isPolymarketWalletAddress(address)) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push(address);
  }
  return addresses;
}

function text(value) {
  if (value == null) return "";
  return String(value);
}

function flag(value) {
  if (value == null || value === "") return "";
  return value === true;
}

function numberOrBlank(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function associatedUsers(profile) {
  const users = profile && typeof profile === "object" ? profile.users : null;
  if (!Array.isArray(users)) return [];
  return users.filter((user) => user && typeof user === "object");
}

/**
 * Profile fields and lifetime stats for one submitted address.
 * A missing profile or `{ data: null }` stats still keeps the row.
 * Null amounts stay blank. Zero is a real observation.
 * @param {string} address
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {Record<string, unknown> | null | undefined} stats
 * @param {Record<string, unknown> | null | undefined} portfolio
 */
export function mergeTraderByAddress(address, profile, stats, portfolio) {
  const card = profile && typeof profile === "object" ? profile : null;
  const lifetime = stats && typeof stats === "object" ? stats : null;
  const pnl = lifetime?.all_time_pnl && typeof lifetime.all_time_pnl === "object" ? lifetime.all_time_pnl : null;
  const book = portfolio && typeof portfolio === "object" ? portfolio : null;
  const users = associatedUsers(card);
  /** @type {Record<string, unknown>} */
  const row = {
    address: String(address || "").trim(),
    createdAt: text(card?.createdAt),
    proxyWallet: text(card?.proxyWallet),
    profileImage: text(card?.profileImage),
    displayUsernamePublic: card ? flag(card.displayUsernamePublic) : "",
    bio: text(card?.bio),
    pseudonym: text(card?.pseudonym),
    name: text(card?.name),
    users: users.length ? JSON.stringify(users) : "",
    users_id: users.map((user) => String(user.id || "").trim()).filter(Boolean).join(", "),
    users_creator: users.length ? users.some((user) => user.creator === true) : "",
    users_mod: users.length ? users.some((user) => user.mod === true) : "",
    xUsername: text(card?.xUsername),
    verifiedBadge: card ? flag(card.verifiedBadge) : "",
    biggest_win: lifetime ? numberOrBlank(lifetime.biggest_win) : "",
    proxy_wallet: text(lifetime?.proxy_wallet),
    trades: lifetime ? numberOrBlank(lifetime.trades) : "",
    views: lifetime ? numberOrBlank(lifetime.views) : "",
    join_date: lifetime ? numberOrBlank(lifetime.join_date) : "",
    portfolio_value: book ? numberOrBlank(book.value) : "",
  };
  for (const field of PNL_FIELDS) {
    if (!pnl) {
      row[field] = "";
      continue;
    }
    row[field] = numberOrBlank(pnl[field]);
  }
  return row;
}
