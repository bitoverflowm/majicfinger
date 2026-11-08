import { polymarketGet } from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";

/**
 * @typedef {{
 *   key: string;
 *   rank: number | null;
 *   address: string;
 *   name: string;
 *   image: string;
 *   xHandle: string;
 *   verified: boolean;
 *   pnl: number | null;
 *   volume: number | null;
 *   kind?: string;
 *   eventTitle?: string;
 *   eventSlug?: string;
 *   conditionId?: string;
 *   cost?: number | null;
 *   payout?: number | null;
 *   resolvedAt?: number | null;
 * }} BrowseHolder
 */

export const HOLDER_FEEDS = [
  { id: "pnl", label: "By PnL", short: "PnL", board: "leaderboard", sortBy: "PNL" },
  { id: "volume", label: "By volume", short: "Volume", board: "leaderboard", sortBy: "VOLUME" },
  { id: "winners", label: "Biggest winners", board: "winners" },
];

export const HOLDER_PERIODS = [
  { id: "day", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

/** The categories both boards rank. Other Gamma categories come back empty there. */
export const HOLDER_CATEGORIES = [
  { id: "politics", label: "Politics" },
  { id: "sports", label: "Sports" },
  { id: "crypto", label: "Crypto" },
  { id: "economics", label: "Economics" },
  { id: "finance", label: "Finance" },
  { id: "tech", label: "Tech" },
  { id: "culture", label: "Culture" },
  { id: "weather", label: "Weather" },
  { id: "mentions", label: "Mentions" },
  { id: "esports", label: "Esports" },
  { id: "combos", label: "Combos" },
];

const PAGE = 1000;
/** The leaderboard runs to tens of thousands of wallets; this many load up front, more as the list is scrolled. */
export const HOLDER_PRELOAD = 5000;
const TTL_MS = 2 * 60_000;

/** Profiles without a chosen name come back as `0x…-<timestamp>`. */
const GENERATED_NAME = /^0x[a-f0-9]{40}(-\d+)?$/i;

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function displayName(raw) {
  const name = String(raw || "").trim();
  return !name || GENERATED_NAME.test(name) ? "" : name;
}

/** @returns {BrowseHolder} */
function fromLeaderboard(raw) {
  const address = String(raw?.user_id || raw?.proxyWallet || "").trim().toLowerCase();
  return {
    key: address,
    rank: num(raw?.rank),
    address,
    name: displayName(raw?.user_name ?? raw?.userName),
    image: String(raw?.profile_image || raw?.profileImage || "").trim(),
    xHandle: String(raw?.x_username || raw?.xUsername || "").trim(),
    verified: !!(raw?.verified ?? raw?.verifiedBadge),
    pnl: num(raw?.pnl),
    volume: num(raw?.volume ?? raw?.vol),
  };
}

/** @returns {BrowseHolder} */
function fromWinner(raw) {
  const address = String(raw?.user_id || "").trim().toLowerCase();
  const kind = String(raw?.kind || "market").trim().toLowerCase();
  return {
    key: `${address}:${raw?.position_id || raw?.condition_id || raw?.win_rank}`,
    rank: num(raw?.win_rank),
    address,
    name: displayName(raw?.user_name),
    image: String(raw?.profile_image || "").trim(),
    xHandle: "",
    verified: false,
    pnl: num(raw?.pnl),
    volume: null,
    kind,
    eventTitle: String(raw?.event_title || "").trim(),
    eventSlug: kind === "market" ? String(raw?.event_slug || "").trim() : "",
    conditionId: kind === "market" ? String(raw?.condition_id || "").trim() : "",
    cost: num(raw?.initial_value),
    payout: num(raw?.final_value),
    resolvedAt: num(raw?.resolved_at) != null ? num(raw.resolved_at) * 1000 : null,
  };
}

function boardPage(body) {
  const root = Array.isArray(body) && body.length === 1 ? body[0] : body;
  const data = Array.isArray(root?.data) ? root.data : [];
  const cursor = root?.pagination?.has_more ? String(root.pagination.next_cursor || "").trim() : "";
  return { data, cursor };
}

export function holderBoardKey({ feed, period, category }) {
  return `${feed}|${period}|${category || "overall"}`;
}

/** Loaded boards by key: rows so far, the cursor for the next page, and whether the board is done. */
const boards = new Map();

export function cachedBoard(key) {
  const hit = boards.get(key);
  return hit && Date.now() - hit.at < TTL_MS ? hit : null;
}

/**
 * Next page of a board, appended to what's loaded (stale or not, so a long scroll never restarts).
 * Resolves with the whole board so far.
 * @param {{ feed: string, period: string, category: string, signal?: AbortSignal }} query
 */
export async function loadBoardPage(query, signal) {
  const key = holderBoardKey(query);
  const feed = HOLDER_FEEDS.find((item) => item.id === query.feed) || HOLDER_FEEDS[0];
  const prev = boards.get(key);
  if (prev?.done) return prev;
  const winners = feed.board === "winners";
  const params = {
    time_period: query.period,
    category: query.category || "overall",
    limit: String(PAGE),
    ...(winners ? {} : { sort_by: feed.sortBy }),
    ...(prev?.cursor ? { cursor: prev.cursor } : {}),
  };
  const body = await polymarketGet(winners ? "getBiggestWinners" : "getTraderLeaderboard", params, signal, { retries: 2 });
  const { data, cursor } = boardPage(body);
  const seen = new Set((prev?.rows || []).map((row) => row.key));
  const added = data.map(winners ? fromWinner : fromLeaderboard).filter((row) => row.address && !seen.has(row.key));
  const next = { at: prev?.at || Date.now(), rows: [...(prev?.rows || []), ...added], cursor, done: !cursor || !added.length };
  boards.set(key, next);
  return next;
}

/** What's loaded for a board, however old. */
export function loadedBoard(key) {
  return boards.get(key) || null;
}

export function forgetBoard(key) {
  boards.delete(key);
}
