import {
  getClobPriceHistory,
  getPolymarketActivitySince,
  getPolymarketHolders,
  getPolymarketLeaderboardEntry,
  getPolymarketMarketByCondition,
  getPolymarketPositionsByPnl,
  getPolymarketTradesPreview,
  walkPolymarketPositions,
} from "@/lib/mcp/data/providers";
import { searchNewsHeadlines } from "@/lib/mcp/data/news";
import { compactSearchQuery, relevanceScore } from "./relevance.js";

const DAY = 86400;
const HOUR = 3600;

/** Layer 3 trader insights: what a leaderboard can't tell you. `ask` is how people request each one. */
export const INSIGHTS = [
  { id: "news_timing", cluster: "edge", label: "Before or after the news", ask: "before/after the news, information edge, trades around headlines" },
  { id: "post_entry_drift", cluster: "edge", label: "Does price move his way after he buys", ask: "does the market move his way, drift after entry" },
  { id: "entry_earliness", cluster: "edge", label: "How early he gets in", ask: "how early, entry timing vs launch and resolution" },
  { id: "price_buckets", cluster: "style", label: "Longshots vs favorites", ask: "longshots vs favorites, entry price buckets, risk profile" },
  { id: "concentration", cluster: "style", label: "Profit concentration", ask: "how concentrated is the profit, a few big hits or steady" },
  { id: "hold_style", cluster: "style", label: "Holds to resolution or flips", ask: "holder or flipper, hold time" },
  { id: "current_form", cluster: "style", label: "Current form and drawdowns", ask: "current form, recent PnL, hot or cold streak, worst drawdown" },
  { id: "category_pnl", cluster: "category", label: "Where he wins vs bleeds", ask: "PnL by category, where he wins and loses" },
  { id: "country_edge", cluster: "category", label: "Country-level edge in elections", ask: "which countries/elections he's good at" },
  { id: "category_ranks", cluster: "category", label: "Leaderboard rank by category", ask: "category rankings, where he ranks" },
  { id: "buying_now", cluster: "book", label: "What he's buying now", ask: "current trades, what he's buying this week" },
  { id: "disagreements", cluster: "book", label: "Biggest disagreements with the market", ask: "contrarian bets, where he disagrees with the market" },
  { id: "copy_check", cluster: "book", label: "Copy-trade check", ask: "if I copied him, copy trading results" },
  { id: "co_holders", cluster: "crowd", label: "Who else is in his trades", ask: "similar traders, who else holds his positions" },
  { id: "whale_alignment", cluster: "crowd", label: "With or against the whales", ask: "is he with or against the whales" },
  { id: "followers", cluster: "crowd", label: "Who follows him in", ask: "who follows/copies him, followers" },
];

export const INSIGHT_IDS = INSIGHTS.map((i) => i.id);
export const CLUSTER_LABELS = {
  edge: "Edge & timing",
  style: "Style",
  category: "Category edge",
  book: "Current book",
  crowd: "Crowd",
};

/** Cheap enough to run on every trader profile; the writer picks the 2-3 most surprising. */
const DEFAULT_IDS = ["category_pnl", "category_ranks", "price_buckets", "concentration", "current_form", "buying_now", "disagreements", "copy_check"];

/** Ultra deep runs everything; a focused ask runs its insights plus the rest of their clusters. */
export function insightsToRun({ depth = "standard", focus = [] } = {}) {
  if (depth === "ultra") return [...INSIGHT_IDS];
  const wanted = focus.filter((id) => INSIGHT_IDS.includes(id));
  if (!wanted.length) return DEFAULT_IDS;
  const clusters = new Set(wanted.map((id) => INSIGHTS.find((i) => i.id === id).cluster));
  return INSIGHTS.filter((i) => clusters.has(i.cluster)).map((i) => i.id);
}

const LEADERBOARD_CATEGORIES = ["politics", "sports", "crypto", "economics", "finance", "tech", "culture", "weather", "mentions", "esports"];

const ELECTION_RE = /\b(election|elections|president|presidential|prime minister|parliament|parliamentary|mayor|mayoral|seats|nominee|nomination|governor|senate|chancellor|referendum|vote|primary|legislative)\b/i;

/** Title words -> country, for elections. First match wins, so specific names come before broad ones. */
const COUNTRY_WORDS = [
  ["United States", /\b(US|U\.S\.|USA|American|NYC|New York|California|Texas|Florida|Senate|Congress|House|Democratic|Republican|Trump|Newsom|Vance|Harris|Biden)\b/],
  ["Canada", /\b(Canada|Canadian|Carney|Poilievre)\b/i],
  ["United Kingdom", /\b(UK|U\.K\.|Britain|British|England|Scotland|Labour|Tory|Reform UK)\b/],
  ["Germany", /\b(German|Germany|AfD|CDU|SPD|Bundestag)\b/i],
  ["France", /\b(France|French|Macron|Le Pen)\b/i],
  ["Poland", /\b(Poland|Polish|Nawrocki|Trzaskowski)\b/i],
  ["Romania", /\b(Romania|Romanian|Simion)\b/i],
  ["Russia", /\b(Russia|Russian|United Russia|Duma)\b/i],
  ["Ukraine", /\b(Ukraine|Ukrainian|Zelensky)\b/i],
  ["Thailand", /\b(Thailand|Thai|Bhumjaithai)\b/i],
  ["Japan", /\b(Japan|Japanese|LDP)\b/i],
  ["South Korea", /\b(South Korea|Korean)\b/i],
  ["India", /\b(India|Indian|BJP|Modi)\b/i],
  ["Australia", /\b(Australia|Australian)\b/i],
  ["Brazil", /\b(Brazil|Brazilian|Lula|Bolsonaro)\b/i],
  ["Argentina", /\b(Argentina|Argentine|Milei)\b/i],
  ["Mexico", /\b(Mexico|Mexican)\b/i],
  ["Chile", /\b(Chile|Chilean)\b/i],
  ["Colombia", /\b(Colombia|Colombian)\b/i],
  ["Peru", /\b(Peru|Peruvian)\b/i],
  ["Ecuador", /\b(Ecuador|Ecuadorian)\b/i],
  ["Venezuela", /\b(Venezuela|Venezuelan|Maduro)\b/i],
  ["Israel", /\b(Israel|Israeli|Netanyahu|Knesset)\b/i],
  ["Iran", /\b(Iran|Iranian)\b/i],
  ["Turkey", /\b(Turkey|Turkish|Erdogan)\b/i],
  ["Italy", /\b(Italy|Italian|Meloni)\b/i],
  ["Spain", /\b(Spain|Spanish)\b/i],
  ["Portugal", /\b(Portugal|Portuguese)\b/i],
  ["Netherlands", /\b(Netherlands|Dutch)\b/i],
  ["Austria", /\b(Austria|Austrian)\b/i],
  ["Czech Republic", /\b(Czech)\b/i],
  ["Hungary", /\b(Hungary|Hungarian|Orban|Orbán)\b/i],
  ["Ireland", /\b(Ireland|Irish)\b/i],
  ["Sweden", /\b(Sweden|Swedish)\b/i],
  ["Norway", /\b(Norway|Norwegian)\b/i],
  ["Denmark", /\b(Denmark|Danish)\b/i],
  ["Finland", /\b(Finland|Finnish)\b/i],
  ["Greece", /\b(Greece|Greek)\b/i],
  ["Taiwan", /\b(Taiwan|Taiwanese)\b/i],
  ["Philippines", /\b(Philippines|Philippine)\b/i],
  ["South Africa", /\b(South Africa|ANC)\b/i],
  ["Nigeria", /\b(Nigeria|Nigerian)\b/i],
  ["New Zealand", /\b(New Zealand)\b/i],
  ["Bolivia", /\b(Bolivia|Bolivian)\b/i],
  ["Honduras", /\b(Honduras)\b/i],
];

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const pnlOf = (row) => n(row.total_pnl) ?? n(row.realized_pnl) ?? 0;
/** Money put in: average entry × shares bought (closed rows' total_cost can reflect only what's left). */
const costOf = (row) => {
  const bought = (n(row.avg_price) ?? 0) * (n(row.total_size) ?? 0);
  return bought > 0 ? bought : n(row.total_cost_usdc) ?? 0;
};
const isRedeemable = (row) => String(row.status || "").toUpperCase() === "REDEEMABLE";
const isOpen = (row) => String(row.status || "").toUpperCase() === "OPEN";
const iso = (sec) => (sec ? new Date(sec * 1000).toISOString().slice(0, 10) : null);

/** Seconds from epoch seconds, epoch ms, or a date string. */
function epochSeconds(value) {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) return Math.round(num > 1e12 ? num / 1000 : num);
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? Math.round(parsed / 1000) : null;
}

function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

/** Lazily loaded, shared inputs: each is fetched at most once per run. */
function sources(wallet, given) {
  const memo = new Map();
  const once = (key, load) => {
    if (!memo.has(key)) memo.set(key, load());
    return memo.get(key);
  };
  const api = {
    open: () => once("open", () => walkPolymarketPositions(wallet, { status: "open", maxRows: 1000 })),
    finished: () =>
      once("finished", async () => {
        const [open, closed] = await Promise.all([api.open(), walkPolymarketPositions(wallet, { status: "closed", maxRows: 2000 })]);
        return { rows: [...closed.rows, ...open.rows.filter(isRedeemable)], truncated: closed.truncated };
      }),
    topWins: () => once("topWins", () => getPolymarketPositionsByPnl(wallet, { status: "closed", limit: 10, direction: "DESC" })),
    leaderboard: () =>
      once("leaderboard", async () => {
        const settled = await Promise.allSettled(
          ["overall", ...LEADERBOARD_CATEGORIES].map((category) => getPolymarketLeaderboardEntry(wallet, { category })),
        );
        return settled.map((s) => (s.status === "fulfilled" ? s.value : null)).filter(Boolean);
      }),
    holders: () =>
      once("holders", async () => {
        const open = (await api.open()).rows.filter((r) => isOpen(r) && n(r.current_price) > 0.01 && n(r.current_price) < 0.99);
        const top = [...open].sort((a, b) => n(b.current_value) - n(a.current_value)).slice(0, 5);
        const pulled = await Promise.allSettled(top.map((p) => getPolymarketHolders(p.condition_id, { limit: 200 })));
        return top.map((p, i) => ({ position: p, holders: pulled[i].status === "fulfilled" ? pulled[i].value.rows : [] }));
      }),
    spotlight: () =>
      once("spotlight", async () => {
        const [wins, open] = await Promise.all([api.topWins(), api.open()]);
        const biggestOpen = open.rows.filter(isOpen).sort((a, b) => costOf(b) - costOf(a)).slice(0, 3);
        return [...wins.slice(0, 5), ...biggestOpen].filter((r) => n(r.first_entry_at));
      }),
    pnlSeries: given.pnlSeries || [],
    lifetimePnl: given.lifetimePnl,
  };
  return api;
}

const COMPUTE = {
  async category_pnl(s) {
    const rows = (await s.leaderboard()).filter((r) => r.category !== "overall" && (r.volume > 0 || r.pnl !== 0));
    return { categories: rows.sort((a, b) => b.pnl - a.pnl).map((r) => ({ category: r.category, pnl: Math.round(r.pnl), volume: Math.round(r.volume) })) };
  },

  async category_ranks(s) {
    const rows = await s.leaderboard();
    return {
      ranks: rows
        .filter((r) => r.pnl > 0 && r.rank_pnl)
        .sort((a, b) => a.rank_pnl - b.rank_pnl)
        .map((r) => ({ category: r.category, rank_pnl: r.rank_pnl, pnl: Math.round(r.pnl), rank_volume: r.rank_volume })),
    };
  },

  async price_buckets(s) {
    const { rows, truncated } = await s.finished();
    const buckets = [
      { label: "under 20¢", min: 0, max: 0.2 },
      { label: "20-50¢", min: 0.2, max: 0.5 },
      { label: "50-80¢", min: 0.5, max: 0.8 },
      { label: "80¢+", min: 0.8, max: 1.01 },
    ].map((b) => {
      const inB = rows.filter((r) => n(r.avg_price) >= b.min && n(r.avg_price) < b.max && pnlOf(r) !== 0);
      const won = inB.filter((r) => pnlOf(r) > 0).length;
      return { bucket: b.label, bets: inB.length, win_rate: inB.length ? won / inB.length : null, pnl: Math.round(inB.reduce((a, r) => a + pnlOf(r), 0)) };
    });
    return { buckets, sample: rows.length, truncated };
  },

  async concentration(s) {
    const wins = await s.topWins();
    const lifetime = n(s.lifetimePnl);
    const top5 = wins.slice(0, 5).reduce((a, r) => a + pnlOf(r), 0);
    const top10 = wins.slice(0, 10).reduce((a, r) => a + pnlOf(r), 0);
    return {
      top5_pnl: Math.round(top5),
      top10_pnl: Math.round(top10),
      lifetime_pnl: lifetime != null ? Math.round(lifetime) : null,
      top5_share: lifetime > 0 ? top5 / lifetime : null,
      top10_share: lifetime > 0 ? top10 / lifetime : null,
      top5: wins.slice(0, 5).map((r) => ({ title: r.title, pnl: Math.round(pnlOf(r)) })),
    };
  },

  async hold_style(s) {
    const { rows } = await s.finished();
    let held = 0;
    let flipped = 0;
    const holdDays = [];
    for (const r of rows) {
      const size = n(r.total_size);
      const settle = n(r.current_price);
      const entry = n(r.avg_price);
      if (n(r.first_entry_at) && n(r.last_event_at)) holdDays.push((r.last_event_at - r.first_entry_at) / DAY);
      if (isRedeemable(r)) {
        held += 1;
        continue;
      }
      if (!size || settle == null || entry == null || (settle > 0.02 && settle < 0.98)) continue;
      const ifHeld = size * (settle - entry);
      const gap = Math.abs(pnlOf(r) - ifHeld);
      if (gap <= Math.max(25, Math.abs(ifHeld) * 0.15)) held += 1;
      else flipped += 1;
    }
    return {
      held_to_resolution: held,
      exited_early: flipped,
      held_share: held + flipped ? held / (held + flipped) : null,
      median_hold_days: median(holdDays) != null ? Math.round(median(holdDays) * 10) / 10 : null,
      sample: rows.length,
    };
  },

  async current_form(s) {
    const series = [...s.pnlSeries]
      .map((p) => ({ t: n(p.timestamp), v: n(p.economic_pnl) }))
      .filter((p) => p.t && p.v != null)
      .sort((a, b) => a.t - b.t);
    if (series.length < 2) return { points: series.length };
    const last = series[series.length - 1];
    const at = (days) => {
      const cut = last.t - days * DAY;
      let pick = series[0];
      for (const p of series) if (p.t <= cut) pick = p;
      return pick;
    };
    let peak = series[0];
    let worst = { drop: 0, peak: null, trough: null };
    let ath = series[0];
    for (const p of series) {
      if (p.v > peak.v) peak = p;
      if (p.v > ath.v) ath = p;
      const drop = peak.v - p.v;
      if (drop > worst.drop) worst = { drop, peak, trough: p };
    }
    const recovered = worst.peak ? series.some((p) => p.t > worst.trough.t && p.v >= worst.peak.v) : null;
    return {
      pnl_now: Math.round(last.v),
      change_7d: Math.round(last.v - at(7).v),
      change_30d: Math.round(last.v - at(30).v),
      change_90d: Math.round(last.v - at(90).v),
      all_time_high: Math.round(ath.v),
      all_time_high_at: iso(ath.t),
      below_high: Math.round(ath.v - last.v),
      worst_drawdown: worst.peak
        ? { drop: Math.round(worst.drop), from: iso(worst.peak.t), to: iso(worst.trough.t), recovered }
        : null,
      series: series.map((p) => ({ t: p.t, v: Math.round(p.v) })),
    };
  },

  async buying_now(s, wallet) {
    const now = Date.now() / 1000;
    let window = 7;
    let rows = await getPolymarketActivitySince(wallet, now - 7 * DAY, { limit: 500 });
    if (rows.filter((r) => r.type === "TRADE").length < 5) {
      window = 30;
      rows = await getPolymarketActivitySince(wallet, now - 30 * DAY, { limit: 500 });
    }
    const trades = rows.filter((r) => r.type === "TRADE");
    const byMarket = new Map();
    for (const t of trades) {
      const key = `${t.condition_id}:${t.outcome}`;
      const prev = byMarket.get(key) || { title: t.title, outcome: t.outcome, bought: 0, sold: 0, trades: 0, cost: 0, shares: 0 };
      const usdc = n(t.usdc_size) || 0;
      if (t.side === "SELL") prev.sold += usdc;
      else {
        prev.bought += usdc;
        prev.cost += usdc;
        prev.shares += n(t.size) || 0;
      }
      prev.trades += 1;
      byMarket.set(key, prev);
    }
    const top = [...byMarket.values()]
      .filter((m) => m.bought > 0)
      .sort((a, b) => b.bought - a.bought)
      .slice(0, 5)
      .map((m) => ({ title: m.title, outcome: m.outcome, bought: Math.round(m.bought), avg_price: m.shares ? m.cost / m.shares : null, trades: m.trades }));
    return {
      window_days: window,
      trades: trades.length,
      bought: Math.round(trades.filter((t) => t.side !== "SELL").reduce((a, t) => a + (n(t.usdc_size) || 0), 0)),
      sold: Math.round(trades.filter((t) => t.side === "SELL").reduce((a, t) => a + (n(t.usdc_size) || 0), 0)),
      top,
    };
  },

  async disagreements(s) {
    const { rows } = await s.open();
    const picks = rows
      .filter((r) => isOpen(r) && n(r.current_price) > 0.01 && n(r.current_price) <= 0.3 && costOf(r) >= 500)
      .sort((a, b) => costOf(b) - costOf(a))
      .slice(0, 5)
      .map((r) => ({
        title: r.title,
        outcome: r.outcome,
        avg_price: n(r.avg_price),
        current_price: n(r.current_price),
        cost: Math.round(costOf(r)),
        value: Math.round(n(r.current_value) || 0),
        pnl: Math.round(pnlOf(r)),
      }));
    return { bets: picks };
  },

  async copy_check(s) {
    const [{ rows: finished }, { rows: open }] = await Promise.all([s.finished(), s.open()]);
    const recent = [...finished, ...open.filter(isOpen)]
      .filter((r) => n(r.first_entry_at) && costOf(r) >= 100)
      .sort((a, b) => b.first_entry_at - a.first_entry_at)
      .slice(0, 20);
    if (!recent.length) return { entries: 0 };
    const results = recent.map((r) => ({ title: r.title, outcome: r.outcome, roi: Math.max(-1, pnlOf(r) / costOf(r)), entered: iso(r.first_entry_at), open: isOpen(r) }));
    const value = results.reduce((a, r) => a + 100 * (1 + r.roi), 0);
    const sorted = [...results].sort((a, b) => b.roi - a.roi);
    return {
      entries: results.length,
      invested: results.length * 100,
      value_now: Math.round(value),
      winners: results.filter((r) => r.roi > 0).length,
      since: results[results.length - 1].entered,
      best: sorted[0],
      worst: sorted[sorted.length - 1],
    };
  },

  async country_edge(s) {
    const [{ rows: finished }, { rows: open }] = await Promise.all([s.finished(), s.open()]);
    const byCountry = new Map();
    for (const r of [...finished, ...open.filter(isOpen)]) {
      const title = String(r.title || "");
      if (!ELECTION_RE.test(title)) continue;
      const country = COUNTRY_WORDS.find(([, re]) => re.test(title))?.[0];
      if (!country) continue;
      const prev = byCountry.get(country) || { country, bets: 0, pnl: 0, won: 0, lost: 0 };
      prev.bets += 1;
      prev.pnl += pnlOf(r);
      if (!isOpen(r)) {
        if (pnlOf(r) > 0) prev.won += 1;
        else if (pnlOf(r) < 0) prev.lost += 1;
      }
      byCountry.set(country, prev);
    }
    const all = [...byCountry.values()].map((c) => ({ ...c, pnl: Math.round(c.pnl) })).sort((a, b) => b.pnl - a.pnl);
    return { countries: all, best: all.slice(0, 4), worst: all.filter((c) => c.pnl < 0).slice(-3).reverse() };
  },

  async news_timing(s) {
    const spot = await s.spotlight();
    const checked = await Promise.all(
      spot.slice(0, 6).map(async (r) => {
        const entry = n(r.first_entry_at);
        const query = compactSearchQuery(r.title, 6);
        let headlines = [];
        try {
          const found = await searchNewsHeadlines({ query, startMs: (entry - 7 * DAY) * 1000, endMs: (entry + 7 * DAY) * 1000, limit: 60 });
          headlines = (found.articles || [])
            .map((a) => ({ title: a.title, source: a.source, at: epochSeconds(a.published_at) }))
            .filter((a) => a.at && relevanceScore(query, a.title) >= 0.3);
        } catch {
          headlines = [];
        }
        const before = headlines.filter((h) => h.at <= entry && entry - h.at <= 72 * HOUR).sort((a, b) => b.at - a.at);
        const after = headlines.filter((h) => h.at > entry).sort((a, b) => a.at - b.at);
        const reacting = before.find((h) => entry - h.at <= 24 * HOUR);
        const verdict = reacting ? "reacting" : !before.length && after.length ? "ahead" : headlines.length ? "mixed" : "no_coverage";
        return {
          title: r.title,
          outcome: r.outcome,
          entered: iso(entry),
          pnl: Math.round(pnlOf(r)),
          verdict,
          nearest_before: before[0] ? { title: before[0].title, source: before[0].source, hours_before: Math.round((entry - before[0].at) / HOUR) } : null,
          first_after: after[0] ? { title: after[0].title, source: after[0].source, hours_after: Math.round((after[0].at - entry) / HOUR) } : null,
        };
      }),
    );
    const count = (v) => checked.filter((c) => c.verdict === v).length;
    return { bets: checked, ahead: count("ahead"), reacting: count("reacting"), mixed: count("mixed"), no_coverage: count("no_coverage") };
  },

  async post_entry_drift(s) {
    const spot = await s.spotlight();
    const checked = await Promise.all(
      spot.slice(0, 6).map(async (r) => {
        const entry = n(r.first_entry_at);
        if (!r.token_id) return null;
        try {
          const hist = await getClobPriceHistory(r.token_id, { startTs: entry - HOUR, endTs: entry + 7 * DAY + HOUR, fidelity: 60 });
          if (!hist.length) return null;
          const priceAt = (t) => {
            let pick = null;
            for (const h of hist) if (h.t <= t) pick = h;
            return pick?.p ?? null;
          };
          const atEntry = priceAt(entry) ?? hist[0].p;
          const day = priceAt(entry + DAY);
          const week = priceAt(entry + 7 * DAY);
          return { title: r.title, outcome: r.outcome, entered: iso(entry), price_at_entry: atEntry, after_24h: day, after_7d: week };
        } catch {
          return null;
        }
      }),
    );
    const rows = checked.filter(Boolean);
    const d24 = rows.filter((r) => r.after_24h != null).map((r) => r.after_24h - r.price_at_entry);
    const d7 = rows.filter((r) => r.after_7d != null).map((r) => r.after_7d - r.price_at_entry);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    return { bets: rows, avg_move_24h: avg(d24), avg_move_7d: avg(d7), moved_his_way_7d: d7.filter((d) => d > 0).length, checked_7d: d7.length };
  },

  async entry_earliness(s) {
    const spot = await s.spotlight();
    const checked = await Promise.all(
      spot.slice(0, 6).map(async (r) => {
        try {
          const m = await getPolymarketMarketByCondition(r.condition_id);
          const opened = Math.round(Date.parse(m.start_date) / 1000);
          const closedAt = Math.round(Date.parse(m.closed_time || m.end_date) / 1000);
          const entry = n(r.first_entry_at);
          return {
            title: r.title,
            outcome: r.outcome,
            entered: iso(entry),
            days_after_open: Number.isFinite(opened) ? Math.round((entry - opened) / DAY) : null,
            days_before_close: Number.isFinite(closedAt) && closedAt > entry ? Math.round((closedAt - entry) / DAY) : null,
            avg_price: n(r.avg_price),
          };
        } catch {
          return null;
        }
      }),
    );
    const rows = checked.filter(Boolean);
    return {
      bets: rows,
      median_days_after_open: median(rows.map((r) => r.days_after_open)),
      median_days_before_close: median(rows.map((r) => r.days_before_close)),
    };
  },

  async co_holders(s, wallet) {
    const markets = await s.holders();
    const counts = new Map();
    for (const { position, holders } of markets) {
      for (const h of holders) {
        if (!h.proxy_wallet || h.proxy_wallet.toLowerCase() === wallet) continue;
        if (h.outcome_index !== position.outcome_index) continue;
        const prev = counts.get(h.proxy_wallet) || { wallet: h.proxy_wallet, name: h.name || h.pseudonym || null, markets: [], shares: 0 };
        prev.markets.push(position.title);
        prev.shares += n(h.amount) || 0;
        counts.set(h.proxy_wallet, prev);
      }
    }
    const shared = [...counts.values()].filter((c) => c.markets.length >= 2).sort((a, b) => b.markets.length - a.markets.length || b.shares - a.shares);
    const top = shared.slice(0, 5);
    const records = await Promise.allSettled(top.slice(0, 3).map((c) => getPolymarketLeaderboardEntry(c.wallet, { category: "overall" })));
    return {
      markets_checked: markets.length,
      wallets: top.map((c, i) => ({
        wallet: c.wallet,
        name: c.name,
        shared_markets: c.markets.length,
        lifetime_pnl: records[i]?.status === "fulfilled" && records[i].value ? Math.round(records[i].value.pnl) : null,
        rank_pnl: records[i]?.status === "fulfilled" && records[i].value ? records[i].value.rank_pnl : null,
      })),
    };
  },

  async whale_alignment(s, wallet) {
    const markets = await s.holders();
    const rows = markets
      .filter((m) => m.holders.length)
      .map(({ position, holders }) => {
        const yourSide = n(position.current_price) ?? 0.5;
        const value = (h) => (n(h.amount) || 0) * (h.outcome_index === position.outcome_index ? yourSide : 1 - yourSide);
        const sorted = [...holders].sort((a, b) => value(b) - value(a));
        const whale = sorted.find((h) => h.proxy_wallet?.toLowerCase() !== wallet) || null;
        const himself = sorted[0]?.proxy_wallet?.toLowerCase() === wallet;
        return {
          title: position.title,
          outcome: position.outcome,
          he_is_largest: himself,
          largest_other: whale
            ? { name: whale.name || whale.pseudonym || null, outcome: whale.outcome, value: Math.round(value(whale)), with_him: whale.outcome_index === position.outcome_index }
            : null,
          his_value: Math.round(n(position.current_value) || 0),
        };
      });
    return {
      markets: rows,
      with_him: rows.filter((r) => r.largest_other?.with_him).length,
      against_him: rows.filter((r) => r.largest_other && !r.largest_other.with_him).length,
      he_is_largest: rows.filter((r) => r.he_is_largest).length,
    };
  },

  async followers(s, wallet) {
    const [{ rows: finished }, { rows: open }] = await Promise.all([s.finished(), s.open()]);
    const since = Date.now() / 1000 - 30 * DAY;
    const entries = [...open.filter(isOpen), ...finished]
      .filter((r) => n(r.first_entry_at) >= since && costOf(r) >= 500)
      .sort((a, b) => costOf(b) - costOf(a))
      .slice(0, 4);
    if (entries.length < 2) return { tested: entries.length, note: "not enough recent entries to test" };
    const seen = new Map();
    await Promise.all(
      entries.map(async (r) => {
        try {
          const pulled = await getPolymarketTradesPreview(r.condition_id, { limit: 1000, start: r.first_entry_at, end: r.first_entry_at + 6 * HOUR });
          const buyers = new Set(
            pulled.rows
              .filter((t) => t.side === "BUY" && t.outcome === r.outcome && t.proxy_wallet && t.proxy_wallet.toLowerCase() !== wallet)
              .filter((t) => n(t.timestamp) >= r.first_entry_at && n(t.timestamp) <= r.first_entry_at + 6 * HOUR)
              .map((t) => t.proxy_wallet.toLowerCase()),
          );
          for (const b of buyers) seen.set(b, (seen.get(b) || 0) + 1);
        } catch {
          /* market without trades in the window */
        }
      }),
    );
    const repeat = [...seen.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
    return { tested: entries.length, repeat_followers: repeat.length, top: repeat.slice(0, 5).map(([w, c]) => ({ wallet: w, markets: c })) };
  },
};

/**
 * Compute the requested insights for one wallet. Each runs independently; a failure leaves
 * `{ error }` for that id only. `pnlSeries`/`lifetimePnl` come from the trader pull already made.
 */
export async function traderInsights(wallet, { ids = DEFAULT_IDS, pnlSeries = [], lifetimePnl = null } = {}) {
  const w = String(wallet || "").toLowerCase();
  const s = sources(w, { pnlSeries, lifetimePnl });
  const settled = await Promise.allSettled(ids.map((id) => withTimeout(COMPUTE[id](s, w), 45000, id)));
  const out = {};
  ids.forEach((id, i) => {
    out[id] = settled[i].status === "fulfilled" ? settled[i].value : { error: String(settled[i].reason?.message || settled[i].reason) };
  });
  return out;
}
