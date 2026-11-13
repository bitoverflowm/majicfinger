import {
  getLookalikeMarkets,
  getPolymarketHolders,
  getPolymarketTrader,
  getPolymarketWalletMarketActivity,
} from "@/lib/mcp/data/providers";
import { getLycheeSkillScore } from "@/lib/mcp/data/traderScoreMcp";
import { searchNewsHeadlines } from "@/lib/mcp/data/news";

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const DAY = 24 * 60 * 60;

/** Card page that unfurls as a Holder Terminal image on X, then opens the terminal on the wallet. */
export function holderTerminalUrl(wallet, conditionId = "") {
  return `https://lycheedata.com/jarvis/holder/${wallet}${conditionId ? `?market=${conditionId}` : ""}`;
}

const GENERIC_WORDS = new Set(["deal", "war", "price", "election", "win", "will", "market", "before", "after", "year", "end"]);

function themeRegex(keywords) {
  const words = (keywords || [])
    .map((k) => String(k || "").trim())
    .filter((k) => k.length >= 3 && !GENERIC_WORDS.has(k.toLowerCase()))
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return words.length ? new RegExp(`\\b(${words.join("|")})`, "i") : null;
}

function epochSeconds(value) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n > 1e12 ? Math.round(n / 1000) : n;
  const t = Date.parse(String(value || ""));
  return Number.isFinite(t) ? Math.round(t / 1000) : null;
}

function isoDay(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString().slice(0, 10) : null;
}

/**
 * The `rank`-th largest holder on `side` of a Polymarket market.
 * @returns {{ wallet, name, side, rank, shares, share_of_side, holders_on_side }}
 */
export async function findHolder(conditionId, { side = "NO", rank = 1 } = {}) {
  const pulled = await getPolymarketHolders(conditionId, { limit: 500 });
  const want = String(side || "NO").toUpperCase() === "YES" ? "YES" : "NO";
  const onSide = pulled.rows
    .filter((r) => r.outcome === want || r.outcome_index === (want === "YES" ? 0 : 1))
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
  const pick = onSide[Math.max(0, (Number(rank) || 1) - 1)];
  if (!pick?.proxy_wallet) return null;
  const total = onSide.reduce((s, r) => s + Number(r.amount || 0), 0);
  return {
    wallet: pick.proxy_wallet,
    name: pick.name || pick.pseudonym || null,
    side: want,
    rank: Number(rank) || 1,
    shares: Number(pick.amount) || 0,
    share_of_side: total ? Number(pick.amount) / total : null,
    holders_on_side: onSide.length,
  };
}

/** Each of the wallet's biggest trades in a market, matched to the nearest headline Lychee found (±48h). */
function tradesVsNews(trades, headlines) {
  const dated = headlines
    .map((h) => ({ title: h.title, source: h.source, at: epochSeconds(h.published_at) }))
    .filter((h) => h.at && h.title);
  return trades.map((t) => {
    let nearest = null;
    for (const h of dated) {
      const gap = (t.timestamp - h.at) / 3600;
      if (Math.abs(gap) <= 48 && (!nearest || Math.abs(gap) < Math.abs(nearest.hours_after_headline))) {
        nearest = { headline: h.title, source: h.source || null, hours_after_headline: Math.round(gap) };
      }
    }
    return {
      date: isoDay(t.timestamp),
      side: t.side,
      outcome: t.outcome,
      usdc: Math.round(Number(t.usdc_size) || 0),
      price: t.price,
      nearest_headline: nearest,
    };
  });
}

function categoryRecord(positions, re) {
  if (!re) return null;
  const inTheme = positions.filter((p) => re.test(`${p.title || ""} ${p.event_slug || ""}`));
  if (!inTheme.length) return { markets: 0 };
  const closed = inTheme.filter((p) => String(p.status || "").toUpperCase() !== "OPEN");
  const won = closed.filter((p) => Number(p.realized_pnl) > 0).length;
  const lost = closed.filter((p) => Number(p.realized_pnl) < 0).length;
  const pnl = inTheme.reduce((s, p) => s + (Number(p.total_pnl ?? p.realized_pnl) || 0), 0);
  return {
    markets: inTheme.length,
    open: inTheme.length - closed.length,
    closed: closed.length,
    closed_won: won,
    closed_lost: lost,
    win_rate: won + lost ? won / (won + lost) : null,
    total_pnl: Math.round(pnl),
  };
}

/**
 * Everything Lychee can say about one wallet, framed around a market it holds:
 * the position, track record (overall and in the market's category), Skill Score,
 * whether this is a one-off, trade timing vs headlines, and exposure across lookalike markets.
 */
export async function holderDeepDive({ wallet, conditionId = "", themeKeywords = [], newsQuery = "" }) {
  if (!WALLET_RE.test(String(wallet || ""))) throw new Error("wallet must be a 0x… proxy wallet");
  const re = themeRegex(themeKeywords);
  const [traderRes, marketRes, skillRes, lookRes, newsRes] = await Promise.allSettled([
    getPolymarketTrader(wallet, { limit: 200, includeClosed: true }),
    conditionId ? getPolymarketWalletMarketActivity(wallet, conditionId, { limit: 500 }) : Promise.resolve(null),
    getLycheeSkillScore(wallet),
    conditionId ? getLookalikeMarkets({ conditionId, limit: 10 }) : Promise.resolve(null),
    newsQuery ? searchNewsHeadlines({ query: newsQuery, days: 90, limit: 40 }) : Promise.resolve(null),
  ]);
  if (traderRes.status !== "fulfilled") throw traderRes.reason;
  const trader = traderRes.value;
  const positions = [...(trader.positions || []), ...(trader.closed_positions || [])];

  const here = conditionId ? (trader.positions || []).find((p) => p.condition_id === conditionId) : null;
  const marketActivity = marketRes.status === "fulfilled" && marketRes.value ? marketRes.value : trader.activity || [];
  const marketTrades = marketActivity
    .filter((a) => a.type === "TRADE" && (!conditionId || a.condition_id === conditionId))
    .map((a) => ({ ...a, timestamp: epochSeconds(a.timestamp) }))
    .filter((a) => a.timestamp);
  const biggest = [...marketTrades].sort((a, b) => Number(b.usdc_size) - Number(a.usdc_size)).slice(0, 5);
  const headlines = newsRes.status === "fulfilled" ? newsRes.value?.articles || [] : [];

  const lookalikeIds = new Set(
    (lookRes.status === "fulfilled" ? lookRes.value?.lookalikes || [] : []).map((m) => m.condition_id).filter(Boolean),
  );
  const lookalikeExposure = (trader.positions || [])
    .filter((p) => lookalikeIds.has(p.condition_id) && p.condition_id !== conditionId)
    .slice(0, 5)
    .map((p) => ({
      title: p.title,
      outcome: p.outcome,
      value_usdc: Math.round(Number(p.current_value) || 0),
      pnl_usdc: Math.round(Number(p.total_pnl) || 0),
    }));

  const firstSeen = Math.min(
    ...positions.map((p) => epochSeconds(p.first_entry_at)).filter(Boolean),
    ...marketTrades.map((t) => t.timestamp),
  );
  const skill = skillRes.status === "fulfilled" ? skillRes.value : null;
  const closedAll = (trader.closed_positions || []).filter((p) => Number(p.realized_pnl) !== 0);
  const wonAll = closedAll.filter((p) => Number(p.realized_pnl) > 0).length;

  return {
    wallet,
    name: here?.name || trader.activity?.[0]?.name || trader.activity?.[0]?.pseudonym || null,
    terminal_url: holderTerminalUrl(wallet, here ? conditionId : ""),
    position: here
      ? {
          market: here.title,
          outcome: here.outcome,
          shares: Math.round(Number(here.current_size) || 0),
          avg_price: here.avg_price,
          current_price: here.current_price,
          value_usdc: Math.round(Number(here.current_value) || 0),
          cost_usdc: Math.round(Number(here.total_cost_usdc) || 0),
          pnl_usdc: Math.round(Number(here.total_pnl) || 0),
          first_entry: isoDay(epochSeconds(here.first_entry_at)),
          last_trade: isoDay(epochSeconds(here.last_event_at)),
        }
      : null,
    trades_in_market: {
      count: marketTrades.length,
      bought_usdc: Math.round(marketTrades.filter((t) => t.side === "BUY").reduce((s, t) => s + (Number(t.usdc_size) || 0), 0)),
      sold_usdc: Math.round(marketTrades.filter((t) => t.side === "SELL").reduce((s, t) => s + (Number(t.usdc_size) || 0), 0)),
      first: isoDay(marketTrades.length ? Math.min(...marketTrades.map((t) => t.timestamp)) : null),
      last: isoDay(marketTrades.length ? Math.max(...marketTrades.map((t) => t.timestamp)) : null),
      biggest: tradesVsNews(biggest, headlines),
      headlines_checked: headlines.length,
    },
    overall: {
      lifetime_pnl_usdc: Math.round(Number(trader.pnl_summary?.economic_pnl) || 0) || null,
      realized_pnl_usdc: Math.round(Number(trader.pnl_summary?.realized_pnl) || 0) || null,
      portfolio_value_usdc: Math.round(Number(trader.portfolio_value?.data?.value ?? trader.portfolio_value?.value) || 0) || null,
      open_positions: (trader.positions || []).length,
      closed_positions_seen: (trader.closed_positions || []).length,
      closed_win_rate: closedAll.length ? wonAll / closedAll.length : null,
      active_since: Number.isFinite(firstSeen) ? isoDay(firstSeen) : null,
      skill_score: skill?.score ?? skill?.skill_score ?? null,
      skill_tier: skill?.tier?.label || skill?.tier || null,
    },
    category: categoryRecord(positions, re),
    category_keywords: themeKeywords,
    lookalike_exposure: lookalikeExposure,
  };
}
