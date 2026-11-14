import { cents, entryCents, money, pct, signedMoney } from "./format.js";
import { CLUSTER_LABELS, INSIGHTS } from "./traderInsights.js";

const cap = (s) => String(s || "").replace(/^./, (c) => c.toUpperCase());
const clip = (s, n = 70) => {
  const t = String(s || "").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const signedCents = (d) => (d == null ? null : `${d >= 0 ? "+" : "-"}${Math.abs(Math.round(d * 100))}¢`);

/** Each insight as short lines the writer can quote. Returns null when there's nothing worth saying. */
const LINES = {
  category_pnl(v) {
    const rows = v.categories || [];
    if (!rows.length) return null;
    return [`PnL by category (all time): ${rows.map((r) => `${cap(r.category)} ${signedMoney(r.pnl)}`).join(", ")}`];
  },
  category_ranks(v) {
    const rows = (v.ranks || []).slice(0, 6);
    if (!rows.length) return null;
    return [`All-time PnL rank on Polymarket's leaderboards: ${rows.map((r) => `#${r.rank_pnl} ${cap(r.category)}`).join(", ")}`];
  },
  price_buckets(v) {
    const rows = (v.buckets || []).filter((b) => b.bets);
    if (!rows.length) return null;
    return [
      ...rows.map((b) => `Bought at ${b.bucket}: ${b.bets} settled bets, ${pct(b.win_rate)} won, ${signedMoney(b.pnl)}`),
      `(from his ${v.sample} most recent settled bets)`,
    ];
  },
  concentration(v) {
    if (v.top5_share == null) return null;
    return [
      `His top 5 bets made ${pct(v.top5_share)} of his lifetime PnL (${money(v.top5_pnl)} of ${money(v.lifetime_pnl)}); top 10 made ${pct(v.top10_share)}`,
    ];
  },
  hold_style(v) {
    if (v.held_share == null) return null;
    return [
      `Holds ${pct(v.held_share)} of bets to resolution (${v.held_to_resolution} held, ${v.exited_early} exited early); median hold ${v.median_hold_days} days`,
    ];
  },
  current_form(v) {
    if (v.pnl_now == null) return null;
    const lines = [`Last 7 days ${signedMoney(v.change_7d)}, 30 days ${signedMoney(v.change_30d)}, 90 days ${signedMoney(v.change_90d)}`];
    lines.push(
      v.below_high > 0
        ? `${money(v.below_high)} below his all-time PnL high from ${v.all_time_high_at}`
        : `At his all-time PnL high (${v.all_time_high_at})`,
    );
    if (v.worst_drawdown) {
      const d = v.worst_drawdown;
      lines.push(`Worst drawdown: -${money(d.drop)} from ${d.from} to ${d.to}${d.recovered ? ", since recovered" : ", not yet recovered"}`);
    }
    return lines;
  },
  buying_now(v) {
    if (!v.trades) return [`No trades in the last ${v.window_days} days`];
    return [
      `Last ${v.window_days} days: ${v.trades} trades, bought ${money(v.bought) || "$0"}, sold ${money(v.sold) || "$0"}`,
      ...v.top.slice(0, 4).map((t) => `Buying: ${clip(t.title)} — ${t.outcome}, ${money(t.bought)} at ~${cents(t.avg_price)}¢`),
    ];
  },
  disagreements(v) {
    if (!v.bets?.length) return null;
    return v.bets
      .slice(0, 4)
      .map((b) => `Against the market: ${clip(b.title)} — ${b.outcome} at ${cents(b.current_price)}¢ now (paid ${entryCents(b.avg_price)}¢), ${money(b.cost)} in, ${signedMoney(b.pnl)}`);
  },
  copy_check(v) {
    if (!v.entries) return null;
    return [
      `$100 in each of his last ${v.entries} entries (since ${v.since}) would be worth $${v.value_now.toLocaleString("en-US")} now (${v.winners} of ${v.entries} winners)`,
      v.best ? `Best: ${clip(v.best.title, 50)} ${pct(v.best.roi)}; worst: ${clip(v.worst.title, 50)} ${pct(v.worst.roi)}` : null,
    ].filter(Boolean);
  },
  country_edge(v) {
    if (!v.countries?.length) return null;
    const fmt = (c) => `${c.country} ${signedMoney(c.pnl)} (${c.bets} bets)`;
    return [
      `Best election countries: ${v.best.map(fmt).join(", ")}`,
      v.worst.length ? `Worst: ${v.worst.map(fmt).join(", ")}` : null,
    ].filter(Boolean);
  },
  news_timing(v) {
    const bets = v.bets || [];
    if (!bets.length) return null;
    const lines = [
      `Of his ${bets.length} biggest bets: ${v.ahead} bought before any headline Lychee found, ${v.reacting} within 24h after a headline, ${v.mixed} mixed, ${v.no_coverage} with no coverage found`,
    ];
    for (const b of bets.filter((x) => x.verdict === "ahead" || x.verdict === "reacting").slice(0, 3)) {
      lines.push(
        b.verdict === "ahead"
          ? `${clip(b.title, 60)} (${b.entered}): bought ${b.first_after.hours_after}h before "${clip(b.first_after.title, 80)}" (${b.first_after.source})`
          : `${clip(b.title, 60)} (${b.entered}): bought ${b.nearest_before.hours_before}h after "${clip(b.nearest_before.title, 80)}" (${b.nearest_before.source})`,
      );
    }
    return lines;
  },
  post_entry_drift(v) {
    const bets = v.bets || [];
    if (!bets.length) return null;
    return [
      `${v.moved_his_way_7d} of ${v.checked_7d} big entries moved his way within a week (average ${signedCents(v.avg_move_7d)} in 7 days, ${signedCents(v.avg_move_24h)} in 24h)`,
      ...bets
        .filter((b) => b.after_7d != null)
        .slice(0, 3)
        .map((b) => `${clip(b.title, 60)}: ${entryCents(b.price_at_entry)}¢ when he bought, ${entryCents(b.after_7d)}¢ a week later`),
    ];
  },
  entry_earliness(v) {
    if (!v.bets?.length) return null;
    return [
      `Typical entry: ${Math.round(v.median_days_after_open)} days after a market opens, ${Math.round(v.median_days_before_close)} days before it closes`,
      ...v.bets
        .filter((b) => b.days_after_open != null && b.days_before_close != null)
        .slice(0, 3)
        .map((b) => `${clip(b.title, 60)}: in ${b.days_after_open} days after launch, ${b.days_before_close} days before close, at ${entryCents(b.avg_price)}¢`),
    ];
  },
  co_holders(v) {
    if (!v.wallets?.length) return [`No wallet shares 2+ of his top ${v.markets_checked} open positions`];
    return v.wallets
      .slice(0, 3)
      .map(
        (w) =>
          `${w.name || `${w.wallet.slice(0, 6)}…${w.wallet.slice(-4)}`} holds the same side in ${w.shared_markets} of his top ${v.markets_checked} open markets${w.lifetime_pnl != null ? ` (lifetime ${signedMoney(w.lifetime_pnl)}${w.rank_pnl && w.rank_pnl < 100000 ? `, #${w.rank_pnl}` : ""})` : ""}`,
      );
  },
  whale_alignment(v) {
    if (!v.markets?.length) return null;
    const against = v.markets.find((m) => m.largest_other && !m.largest_other.with_him);
    return [
      `The largest other holder is with him on ${v.with_him} and against him on ${v.against_him} of his ${v.markets.length} biggest open bets`,
      against
        ? `e.g. ${clip(against.title, 60)}: he holds ${money(against.his_value)} ${against.outcome}; ${against.largest_other.name || "the top wallet"} holds ${money(against.largest_other.value)} ${against.largest_other.outcome}`
        : null,
    ].filter(Boolean);
  },
  followers(v) {
    if (v.note) return [`Followers: ${v.note}`];
    return [
      v.repeat_followers
        ? `${v.repeat_followers} wallets bought the same side within 6h after him in 2+ of his ${v.tested} recent big entries`
        : `No wallet repeatedly bought right after him across his ${v.tested} recent big entries`,
    ];
  },
};

/** Insights grouped by cluster label -> insight label -> lines, skipping errors and empties. */
export function insightFacts(insights = {}) {
  const out = {};
  for (const meta of INSIGHTS) {
    const value = insights[meta.id];
    if (!value || value.error) continue;
    const lines = LINES[meta.id](value);
    if (!lines?.length) continue;
    const group = CLUSTER_LABELS[meta.cluster];
    out[group] = { ...(out[group] || {}), [meta.label]: lines };
  }
  return out;
}

/**
 * Insight id -> its lines, for pages that lay insights out themselves.
 * @returns {Record<string, string[]>}
 */
export function insightLinesById(insights = {}) {
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const meta of INSIGHTS) {
    const value = insights[meta.id];
    if (value && !value.error) out[meta.id] = LINES[meta.id](value) || [];
  }
  return out;
}

export function insightLabels(ids = []) {
  return ids.map((id) => INSIGHTS.find((i) => i.id === id)?.label).filter(Boolean);
}
