import { money, pct, signedMoney } from "./format.js";
import { holderDeepDive } from "./holder.js";
import { INSIGHT_IDS } from "./traderInsights.js";

const WALLET_RE = /^0x[a-f0-9]{40}$/;
/** A saved report younger than this is served as is; older ones are rebuilt on the next page view. */
const FRESH_MS = 6 * 60 * 60 * 1000;

/** The parts of an ultra deep dive the dashboard shows. */
export function reportFromDeepDive(deep) {
  return {
    wallet: String(deep.wallet).toLowerCase(),
    name: deep.name || null,
    overall: deep.overall,
    biggest_wins: deep.biggest_wins,
    biggest_losses: deep.biggest_losses,
    notable_open: deep.notable_open,
    insights: deep.insights,
    generated_at: new Date().toISOString(),
  };
}

const cap = (s) => String(s || "").replace(/^./, (c) => c.toUpperCase());

/**
 * The few reads that headline the dashboard and its share card, most surprising kinds first.
 * `tone` is good / bad / neutral for colouring.
 */
export function reportHeadlines(report) {
  const i = report?.insights || {};
  const out = [];
  const ranks = i.category_ranks?.ranks || [];
  if (ranks.length) {
    out.push({ label: "Leaderboard rank", value: ranks.slice(0, 2).map((r) => `#${r.rank_pnl} ${cap(r.category)}`).join(" · "), tone: "good" });
  }
  const worstCategory = (i.category_pnl?.categories || []).at(-1);
  if (worstCategory?.pnl < 0) {
    out.push({ label: `Leaks money in ${cap(worstCategory.category)}`, value: signedMoney(worstCategory.pnl), tone: "bad" });
  }
  const longshots = (i.price_buckets?.buckets || []).find((b) => b.bucket === "under 20¢");
  if (longshots?.bets >= 10) {
    out.push({
      label: "Longshots under 20¢",
      value: `${signedMoney(longshots.pnl)} · ${pct(longshots.win_rate)} won`,
      tone: longshots.pnl >= 0 ? "good" : "bad",
    });
  }
  if (i.concentration?.top5_share != null) {
    out.push({ label: "Profit from top 5 bets", value: pct(i.concentration.top5_share), tone: "neutral" });
  }
  if (i.copy_check?.entries) {
    const c = i.copy_check;
    out.push({
      label: `Copying his last ${c.entries} bets`,
      value: `$${c.invested.toLocaleString("en-US")} → $${c.value_now.toLocaleString("en-US")}`,
      tone: c.value_now >= c.invested ? "good" : "bad",
    });
  }
  if (i.whale_alignment?.markets?.length) {
    const w = i.whale_alignment;
    out.push({ label: "Biggest whale vs him", value: `against on ${w.against_him} of ${w.markets.length}`, tone: w.against_him > w.with_him ? "bad" : "neutral" });
  }
  if (i.news_timing?.bets?.length) {
    const t = i.news_timing;
    out.push({ label: "Big bets vs the news", value: `${t.ahead} ahead · ${t.reacting} reacting`, tone: t.ahead > t.reacting ? "good" : "neutral" });
  }
  if (i.current_form?.change_30d != null) {
    out.push({ label: "Last 30 days", value: signedMoney(i.current_form.change_30d), tone: i.current_form.change_30d >= 0 ? "good" : "bad" });
  }
  return out;
}

export function reportSummary(report) {
  const o = report?.overall || {};
  return [
    o.lifetime_pnl_usdc != null ? `${signedMoney(o.lifetime_pnl_usdc)} lifetime` : null,
    o.volume_usdc ? `${money(o.volume_usdc)} volume` : null,
    ...reportHeadlines(report)
      .slice(0, 3)
      .map((h) => `${h.label}: ${h.value}`),
  ]
    .filter(Boolean)
    .join(" · ");
}

async function reports() {
  const [{ default: dbConnect }, { default: JarvisTraderReport }] = await Promise.all([
    import("@/lib/dbConnect"),
    import("@/models/JarvisTraderReport"),
  ]);
  await dbConnect();
  return JarvisTraderReport;
}

export async function saveTraderReport(report) {
  const Model = await reports();
  await Model.updateOne(
    { wallet: report.wallet },
    { $set: { report, generated_at: new Date(report.generated_at) } },
    { upsert: true },
  );
}

/** Saved report for `wallet`, or null if none (or older than `maxAgeMs`). */
export async function loadTraderReport(wallet, { maxAgeMs = Infinity } = {}) {
  const Model = await reports();
  const doc = await Model.findOne({ wallet: String(wallet).toLowerCase() }).lean();
  if (!doc || Date.now() - new Date(doc.generated_at).getTime() > maxAgeMs) return null;
  return doc.report;
}

export async function buildTraderReport(wallet) {
  const deep = await holderDeepDive({ wallet, insightIds: INSIGHT_IDS });
  return reportFromDeepDive(deep);
}

/** Saved report when fresh, otherwise rebuilt and saved. Storage failures never block the report itself. */
export async function traderReport(wallet) {
  const w = String(wallet || "").toLowerCase();
  if (!WALLET_RE.test(w)) throw new Error("wallet must be a 0x… proxy wallet");
  const saved = await loadTraderReport(w, { maxAgeMs: FRESH_MS }).catch(() => null);
  if (saved) return saved;
  const report = await buildTraderReport(w);
  await saveTraderReport(report).catch(() => {});
  return report;
}
