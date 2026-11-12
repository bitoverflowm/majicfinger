import { getPolymarketMarketByCondition, getPolymarketTrader } from "@/lib/mcp/data/providers";

const DEFAULT_THEME = /\b(fed|fomc|rate|rates|hike|cut|bps|basis\s*point|interest|powell|federal\s*reserve)\b/i;

/**
 * Score a trader's past activity on a theme (e.g. Fed markets): hit rate on settled
 * contracts + open exposure + timing summary. Uses Lychee trader + market pulls only.
 */
export async function analyzeTraderTheme(
  proxyWallet,
  {
    theme = "fed",
    themePattern = null,
    limit = 120,
    maxMarkets = 12,
  } = {},
) {
  const wallet = String(proxyWallet || "").trim();
  const trader = await getPolymarketTrader(wallet, { limit });
  const re =
    themePattern instanceof RegExp
      ? themePattern
      : theme && String(theme).trim()
        ? new RegExp(String(theme).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        : DEFAULT_THEME;

  const activity = (trader.activity || []).filter((row) => {
    const hay = `${row.title || ""} ${row.slug || ""} ${row.event_slug || ""}`;
    return re.test(hay);
  });
  const positions = (trader.positions || []).filter((row) => {
    const hay = `${row.title || ""} ${row.slug || ""} ${row.event_slug || ""}`;
    return re.test(hay);
  });

  const byCondition = new Map();
  for (const row of activity) {
    const id = String(row.condition_id || "").trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(id)) continue;
    const prev = byCondition.get(id) || {
      condition_id: id,
      title: row.title || null,
      trades: 0,
      buy_usdc: 0,
      sell_usdc: 0,
      outcomes: new Set(),
      first_ts: null,
      last_ts: null,
    };
    prev.trades += 1;
    const usdc = Number(row.usdc_size);
    if (Number.isFinite(usdc)) {
      if (String(row.side || "").toUpperCase() === "SELL") prev.sell_usdc += usdc;
      else prev.buy_usdc += usdc;
    }
    if (row.outcome != null) prev.outcomes.add(String(row.outcome));
    const ts = Number(row.timestamp);
    if (Number.isFinite(ts)) {
      prev.first_ts = prev.first_ts == null ? ts : Math.min(prev.first_ts, ts);
      prev.last_ts = prev.last_ts == null ? ts : Math.max(prev.last_ts, ts);
    }
    byCondition.set(id, prev);
  }

  const ids = [...byCondition.keys()].slice(0, Math.min(24, Math.max(1, maxMarkets)));
  const markets = [];
  for (const id of ids) {
    try {
      const market = await getPolymarketMarketByCondition(id);
      markets.push(market);
    } catch {
      /* skip unresolved */
    }
  }

  const settled = [];
  const openTheme = [];
  for (const market of markets) {
    const agg = byCondition.get(String(market.condition_id || "").trim());
    if (!agg) continue;
    const row = {
      condition_id: market.condition_id,
      title: market.title || agg.title,
      closed: !!market.closed,
      winner: market.winner || null,
      yes_won: market.yes_won,
      trades: agg.trades,
      buy_usdc: Math.round(agg.buy_usdc * 100) / 100,
      sell_usdc: Math.round(agg.sell_usdc * 100) / 100,
      outcomes_traded: [...agg.outcomes],
      first_ts: agg.first_ts,
      last_ts: agg.last_ts,
    };
    if (market.closed && market.winner != null) {
      const heldYes = row.outcomes_traded.some((o) => /yes/i.test(o));
      const heldNo = row.outcomes_traded.some((o) => /no/i.test(o));
      let result = "mixed_or_unclear";
      if (heldYes && !heldNo) result = market.yes_won ? "won" : "lost";
      else if (heldNo && !heldYes) result = market.yes_won === false ? "won" : "lost";
      settled.push({ ...row, result });
    } else {
      openTheme.push(row);
    }
  }

  const wins = settled.filter((r) => r.result === "won").length;
  const losses = settled.filter((r) => r.result === "lost").length;
  const decided = wins + losses;

  for (const pos of positions) {
    if (pos.status && String(pos.status).toUpperCase() !== "OPEN") continue;
    openTheme.push({
      condition_id: pos.condition_id,
      title: pos.title,
      closed: false,
      current_size: pos.current_size,
      current_value: pos.current_value,
      unrealized_pnl: pos.unrealized_pnl,
      outcome: pos.outcome,
      source: "open_position",
    });
  }

  return {
    proxy_wallet: wallet,
    theme: theme || "custom",
    source: "lychee:trader-theme-analysis",
    pnl_summary: trader.pnl_summary,
    matched_activity: activity.length,
    matched_positions: positions.length,
    markets_scored: markets.length,
    settled_hit_rate: decided ? wins / decided : null,
    settled_wins: wins,
    settled_losses: losses,
    settled_mixed: settled.filter((r) => r.result === "mixed_or_unclear").length,
    settled,
    open_theme: openTheme.slice(0, 20),
    caveats: [
      "Hit rate uses outcome labels on activity vs market winner — both-sides / partial exits can look mixed.",
      "This is not full realized P&L per market; use polymarket.trader_pnl for portfolio equity curve.",
      "Protocol/contract holder addresses cannot be scored — pick a real proxy_wallet.",
    ],
    next: {
      compose: "pull_trader_bundle",
      news: "search_news with the same theme terms to overlay headlines vs first_ts/last_ts",
    },
  };
}
