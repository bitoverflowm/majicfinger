import { polymarketGet } from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";

/**
 * Lychee Skill Score: how surprising a trader's results are if every price they paid was fair.
 *
 * Only finished positions count (closed, or resolved and waiting to be redeemed), and when scoring a
 * market's holders, never the market being looked at. For each position bought at average price p on n shares, fair odds give an
 * expected profit of zero with variance n²·p·(1 − p). Summing over positions,
 *
 *   z = Σ pnl / √(Σ n²·p·(1 − p))
 *
 * is a skill z-score that already accounts for the odds taken: winning a 95¢ favourite earns
 * little, hitting a 10¢ long shot earns a lot, and losing either costs the same way. A few big bets
 * can still produce a large z by luck, so z is shrunk by the effective number of independent bets
 * (Kish: (Σw)² / Σw², with w = n·√(p(1 − p))), and the result is put on a ±100 scale where an
 * average trader has a standard deviation of about 10, so ±20 is a two-sigma outlier.
 */

/** What the score is called everywhere in the product. */
export const SKILL_SCORE_NAME = "Lychee Skill Score";

export const SCORE_SHRINK = 4;
const PAGE = 1000;
/** The most recent 2,000 finished positions: plenty to score, and two requests for the busiest wallets. */
const MAX_CLOSED_PAGES = 2;
const PRICE_FLOOR = 0.01;

export const SCORE_TIERS = [
  { min: 20, max: 100, label: "Two-sigma outlier: consistently very good, or very lucky", tone: "text-emerald-500", fill: "#10b981" },
  { min: 10, max: 20, label: "Significantly positive performance", tone: "text-emerald-400", fill: "#34d399" },
  { min: 0, max: 10, label: "Moderately positive, or positive with a short history", tone: "text-lime-400", fill: "#a3e635" },
  { min: -10, max: 0, label: "Moderately negative, or negative with a short history", tone: "text-amber-400", fill: "#fbbf24" },
  { min: -20, max: -10, label: "Significantly negative performance", tone: "text-orange-500", fill: "#f97316" },
  { min: -100, max: -20, label: "Two-sigma outlier: consistently very bad, or very unlucky", tone: "text-rose-500", fill: "#f43f5e" },
];

export function scoreTier(score) {
  if (!Number.isFinite(score)) return null;
  return SCORE_TIERS.find((tier) => score >= tier.min) || SCORE_TIERS[SCORE_TIERS.length - 1];
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function rootOf(body) {
  return Array.isArray(body) ? body[0] : body;
}

function rowsOf(body) {
  const root = rootOf(body);
  let data = root?.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  return { rows: Array.isArray(data) ? data : [], next: nextCursor(root) };
}

function nextCursor(root) {
  const more = root?.pagination?.has_more ?? root?.pagination_has_more;
  const cursor = root?.pagination?.next_cursor ?? root?.pagination_next_cursor;
  return more && cursor ? String(cursor) : "";
}

/** One page of `getTraderPositions`, and the cursor for the next ("" at the end). */
export async function positionsPage(params, cursor, signal, pageSize = PAGE) {
  const body = await polymarketGet("getTraderPositions", { ...params, limit: String(pageSize), ...(cursor ? { cursor } : {}) }, signal, { retries: 2 });
  return rowsOf(body);
}

/** Reads `getTraderPositions` page by page, up to `maxPages`. */
export async function walkPositions(params, maxPages, signal, pageSize = PAGE) {
  const rows = [];
  let cursor = "";
  for (let page = 0; page < maxPages; page += 1) {
    const next = await positionsPage(params, cursor, signal, pageSize);
    rows.push(...next.rows);
    if (!next.next) return { rows, truncated: false };
    cursor = next.next;
  }
  return { rows, truncated: true };
}

function lastEvent(row) {
  const at = Number(row?.last_event_at);
  return Number.isFinite(at) ? at : null;
}

/**
 * A wallet's most recent finished positions, leaving out one market. Polymarket lists closed
 * positions best first by default, so they are read newest first instead: a sample that does not
 * depend on how the trades went. Resolved positions never redeemed (mostly losers) are added from
 * the same window.
 */
export async function finishedPositions(wallet, excludeCondition, signal) {
  const skip = String(excludeCondition || "").toLowerCase();
  const [closed, open] = await Promise.all([
    walkPositions({ user: wallet, status: "closed", sort_by: "TIMESTAMP", sort_direction: "DESC" }, MAX_CLOSED_PAGES, signal),
    walkPositions({ user: wallet, status: "open" }, MAX_CLOSED_PAGES, signal),
  ]);
  const since = closed.truncated ? Math.min(...closed.rows.map(lastEvent).filter((at) => at != null)) : -Infinity;
  const unredeemed = open.rows.filter((row) => String(row?.status || "").toUpperCase() === "REDEEMABLE" && (lastEvent(row) ?? Infinity) >= since);
  const rows = [...closed.rows, ...unredeemed].filter((row) => String(row?.condition_id || "").toLowerCase() !== skip);
  return { rows, recentOnly: closed.truncated };
}

/**
 * @returns {{ score: number, z: number, effectiveBets: number, positions: number, edge: number, winRate: number, pnl: number, recentOnly?: boolean } | null}
 */
export function traderScore(positions) {
  let pnl = 0;
  let variance = 0;
  let weight = 0;
  let weightSq = 0;
  let shares = 0;
  let wins = 0;
  let counted = 0;
  for (const position of positions || []) {
    const size = num(position?.total_size);
    const result = num(position?.total_pnl) ?? num(position?.realized_pnl);
    const price = num(position?.avg_price);
    if (!(size > 0) || result == null || price == null) continue;
    const p = Math.min(1 - PRICE_FLOOR, Math.max(PRICE_FLOOR, price));
    const spread = size * Math.sqrt(p * (1 - p));
    pnl += result;
    variance += spread * spread;
    weight += spread;
    weightSq += spread * spread;
    shares += size;
    counted += 1;
    if (result > 0) wins += 1;
  }
  if (!counted || variance <= 0) return null;
  const z = pnl / Math.sqrt(variance);
  const effectiveBets = weightSq > 0 ? (weight * weight) / weightSq : 0;
  const shrink = effectiveBets / (effectiveBets + SCORE_SHRINK);
  const score = Math.max(-100, Math.min(100, 10 * z * shrink));
  return {
    score: Math.round(score * 10) / 10,
    z,
    effectiveBets,
    positions: counted,
    edge: shares > 0 ? pnl / shares : 0,
    winRate: wins / counted,
    pnl,
  };
}

const cache = new Map();

/**
 * A wallet's score, leaving out one market (or none when `excludeCondition` is empty), cached for the
 * session. Null when it has no finished positions.
 */
export function loadTraderScore(wallet, excludeCondition, signal) {
  const key = `${wallet}|${String(excludeCondition || "").toLowerCase()}`;
  if (!cache.has(key)) {
    const pending = finishedPositions(wallet, excludeCondition, signal).then(({ rows, recentOnly }) => {
      const result = traderScore(rows);
      return result ? { ...result, recentOnly } : null;
    });
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  return cache.get(key);
}
