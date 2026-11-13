import { z } from "zod";
import { llmJson } from "./llm.js";

const MAX_BODY_CHARS = 1100;
const MAX_HOLDER_BODY_CHARS = 1500;
const maxBody = (pack) => (pack.holder ? MAX_HOLDER_BODY_CHARS : MAX_BODY_CHARS);
const CTA = "lycheedata.com/jarvis";

const Reply = z.object({ reply: z.string().min(1).max(2000) });

const INTRO = `You are Jarvis, Lychee's prediction-market research assistant, replying on X to someone who tagged you about a post.
You get their post, their request, and the facts Lychee pulled from Kalshi and Polymarket. Write the reply they will read.
They asked on purpose, so give real detail, laid out so it scans fast.`;

const HOLDER_SHAPE = `This is a deep dive on one wallet (facts.holder). Shape:
1. One line naming the trader (as given in facts.holder.trader) and their position, then a short verdict on whether
   this looks like a one-off bet or part of a pattern, based on their trades here and in the category.
2. "Breakdown:" then "- " lines: the position (shares, avg price vs now, value, PnL); their overall record (lifetime PnL,
   portfolio value, closed win rate, Skill Score and tier, active since); this category (markets, closed wins/losses,
   PnL); how they built the position (trade count, buys vs sells, date span).
3. "Timing vs news:" then 1-3 "- " lines on their biggest trades and the nearest headline Lychee found, with the hour
   gap and before/after exactly as given. If none had a headline nearby, say so. Timing can only "line up" or not:
   never suggest insider knowledge, and never say news caused a trade.
4. "Related exposure:" one line on their positions in lookalike markets, only if the facts list any.
Stop there. Do not write a closing line or sign-off; Lychee appends the follow-up offer and the wallet link.`;

const MARKETS_SHAPE = `Shape:
1. One line that answers their actual question (for a claim: a clear verdict, backed / contradicted / no market to judge it).
2. A short lead-in such as "Markets this could move:" (or "Markets on this:"), then the markets as a list, one per line,
   most important first: "- Venue · market — outcome price (24h move if given)". Show Kalshi and Polymarket both when both
   have markets; if a venue has nothing relevant, say so in one short line ("Nothing on Polymarket yet.").
3. "Quick reads:" then 1-3 lines, each starting with "- ", only from the facts: the biggest 24h mover, a whale/holder
   read, a price gap between Kalshi and Polymarket on the same event, or a related headline. Skip it if the facts have none.
Stop there. Do not write a closing line or sign-off; Lychee appends the follow-up offer.`;

const RULES = `Rules:
- Use only the facts given. Every number must come from the facts (a difference between two given prices is fine).
  Never invent prices, volumes, wallets, dates, or news.
- Never say news "is moving", "pushed", or "drove" a market. Frame impact as possibility: "this could impact…",
  "markets this could move". A 24h move is reported as a fact on its own, not as caused by the post.
- Only call something a Kalshi/Polymarket price gap when both prices are for the same outcome of the same event
  (same candidate, same threshold or band, same date). Different bands or thresholds are not a gap.
- A YES price in cents is the market-implied probability (64¢ ≈ 64%). Skip a market's price if it has none.
- Pick outcomes that tell the reader something; never lead with a near-certain floor like "at least 34% · 99¢".
- Plain text, short lines. No hashtags, no emojis, no links, no internal tool names, never "fact check".
- At most {MAX} characters.

Respond with JSON only: {"reply": "..."}`;

const systemFor = (pack) =>
  [INTRO, pack.holder ? HOLDER_SHAPE : MARKETS_SHAPE, RULES.replace("{MAX}", String(maxBody(pack)))].join("\n\n");

function cents(price) {
  if (price == null || !Number.isFinite(Number(price))) return null;
  const n = Number(price);
  const p = n > 1.5 ? n : n * 100;
  if (p > 0 && p < 0.5) return "<1";
  if (p < 100 && p > 99.5) return ">99";
  return Math.round(p);
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

function move(change) {
  const c = Number(change);
  if (!Number.isFinite(c) || Math.abs(c * 100) < 1) return null;
  const v = Math.round(c * 100);
  return `${v > 0 ? "+" : ""}${v}¢ 24h`;
}

function outcomeFact(o) {
  return [`${o.label}: ${cents(o.yes_price) ?? "?"}¢`, move(o.price_change_24h)].filter(Boolean).join(" ");
}

function marketFact(m) {
  return {
    venue: m.venue === "kalshi" ? "Kalshi" : "Polymarket",
    title: m.title,
    yes_price: cents(m.yes_price) == null ? null : `${cents(m.yes_price)}¢`,
    move_24h: move(m.price_change_24h) || undefined,
    volume_24h: money(m.volume_24h),
    outcomes: m.outcomes?.slice(0, 6).map(outcomeFact),
    importance: m.importance,
    note: m.match_reason || undefined,
  };
}

const VENUE_NAMES = { kalshi: "Kalshi", polymarket: "Polymarket" };

function signedMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || Math.abs(v) < 1) return "$0";
  return `${v < 0 ? "-" : "+"}${money(Math.abs(v))}`;
}

function pct(rate) {
  return rate == null || !Number.isFinite(Number(rate)) ? null : `${Math.round(Number(rate) * 100)}%`;
}

function shares(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(Math.round(v));
}

function tradeFact(b) {
  const head = `${b.date} ${b.side} ${b.outcome} ${money(b.usdc) || "$0"} at ${cents(b.price)}¢`;
  const h = b.nearest_headline;
  if (!h) return `${head}: no headline within 48h in what Lychee found`;
  const when = h.hours_after_headline >= 0 ? `${h.hours_after_headline}h after` : `${-h.hours_after_headline}h before`;
  return `${head}: ${when} the headline "${h.headline}"${h.source ? ` (${h.source})` : ""}`;
}

/** One wallet, pre-formatted so the writer quotes numbers rather than computing them. */
export function holderFacts(h) {
  const short = `${h.wallet.slice(0, 6)}…${h.wallet.slice(-4)}`;
  const p = h.position;
  const t = h.trades_in_market;
  const o = h.overall;
  const c = h.category;
  return {
    trader: h.name ? `${h.name} (${short})` : short,
    found_as: h.rank
      ? `#${h.rank.rank} ${h.rank.side} holder, ${pct(h.rank.share_of_side)} of ${h.rank.side} shares across ${h.rank.holders_on_side} holders`
      : null,
    market: h.market ? `Polymarket · ${h.market.title} (YES ${cents(h.market.price)}¢)` : null,
    position: p
      ? `${shares(p.shares)} ${p.outcome} shares, avg ${cents(p.avg_price)}¢, now ${cents(p.current_price)}¢, worth ${money(p.value_usdc)}, PnL ${signedMoney(p.pnl_usdc)}, first bought ${p.first_entry}`
      : "no open position in this market",
    built_position: t.count
      ? `${t.count} trades from ${t.first} to ${t.last}: bought ${money(t.bought_usdc) || "$0"}, sold ${money(t.sold_usdc) || "$0"}`
      : null,
    biggest_trades: t.biggest.map(tradeFact),
    headlines_checked: t.headlines_checked,
    overall: {
      lifetime_pnl: o.lifetime_pnl_usdc != null ? signedMoney(o.lifetime_pnl_usdc) : null,
      portfolio_value: money(o.portfolio_value_usdc),
      open_positions: o.open_positions,
      closed_win_rate: o.closed_win_rate != null ? `${pct(o.closed_win_rate)} of their last ${o.closed_positions_seen} closed positions` : null,
      active_since: o.active_since,
      skill_score:
        o.skill_score != null
          ? `${Math.round(o.skill_score)} on Lychee's -100 to 100 Skill Score${o.skill_tier ? ` (${o.skill_tier})` : ""}`
          : null,
    },
    category: c?.markets
      ? `${c.markets} markets matching ${h.category_keywords.join("/")}: ${c.open} open, ${c.closed} closed (${c.closed_won} won, ${c.closed_lost} lost${c.win_rate != null ? `, ${pct(c.win_rate)} win rate` : ""}), total PnL ${signedMoney(c.total_pnl)}`
      : "no other markets in this category among their recent positions",
    lookalike_exposure: h.lookalike_exposure.map(
      (x) => `${x.title} — ${x.outcome}, worth ${money(x.value_usdc) || "$0"}, PnL ${signedMoney(x.pnl_usdc)}`,
    ),
  };
}

/** Deterministic holder reply for when the model is off or its draft fails a check. */
export function holderTemplate(pack) {
  const f = holderFacts(pack.holder);
  const lines = [
    `${f.trader}${f.found_as ? `, ${f.found_as}` : ""}.`,
    f.market,
    `- Position: ${f.position}`,
    f.built_position ? `- Built: ${f.built_position}` : null,
    f.overall.lifetime_pnl ? `- Lifetime PnL ${f.overall.lifetime_pnl}${f.overall.portfolio_value ? `, portfolio ${f.overall.portfolio_value}` : ""}` : null,
    f.overall.skill_score ? `- Lychee Skill Score ${f.overall.skill_score}` : null,
    `- Category: ${f.category}`,
  ].filter(Boolean);
  return `${lines.join("\n")}\n\n${followUpLine(pack)}\n${pack.holder.terminal_url}`;
}

/** What the writer may say: only what Lychee actually pulled. */
export function replyFacts(pack) {
  const found = pack.market_verdict ?? pack.verdict;
  const isMatch = (m) => m.match === "match" || (m.match == null && found === "listed");
  return {
    mode: pack.intent?.mode,
    subject: pack.intent?.subject?.summary || pack.intent?.subject?.query || null,
    claim: pack.intent?.subject?.claim || null,
    market_search: found === "listed" ? "matching markets found" : found === "cousin" ? "only related markets" : "no market found",
    matching_markets: (pack.markets || []).filter(isMatch).map(marketFact),
    related_markets: [...(pack.markets || []).filter((m) => !isMatch(m)), ...(pack.lookalikes || [])]
      .slice(0, 5)
      .map(marketFact),
    holders: pack.whale_line && pack.whale_market ? { market: pack.whale_market, read: pack.whale_line } : null,
    venue_gap: pack.intent?.mode === "gap" ? pack.take || null : null,
    venues_searched: ["Kalshi", "Polymarket"],
    venues_with_markets: pack.venues_with_markets?.map((v) => VENUE_NAMES[v] || v),
    news: uniqueHeadlines(pack.news || []).slice(0, 3).map((n) => (n.source ? `${n.title} (${n.source})` : n.title)),
    pulse: (pack.pulse_alerts || []).map((a) => [a.headline, a.detail].filter(Boolean).join(" — ")),
    holder: pack.holder ? holderFacts(pack.holder) : undefined,
  };
}

/** Follow-up offer under every model reply. Registered askers can continue in DMs (we know who they are). */
export function followUpLine(pack) {
  const ask = pack.holder
    ? "Want their other categories, or every trade lined up against the news?"
    : (pack.markets || []).length || (pack.pulse_alerts || []).length
      ? "Want me to dig into any of these?"
      : "Got a market, wallet, or angle you want me to look at instead?";
  return pack.asker_registered === true
    ? `${ask} Reply here or DM me and I'll pick it up.`
    : `${ask} Reply here, go deeper with Jarvis in ChatGPT, Claude, or Cursor, or run the full analysis in Lychee.`;
}

function uniqueHeadlines(news) {
  const seen = new Set();
  return news.filter((n) => {
    const key = String(n.title || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").slice(0, 6).join(" ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Numbers in `reply` that appear nowhere in the facts or the user's own words (differences of two cent prices are allowed). */
export function unsupportedNumbers(reply, sources) {
  const given = (sources.join(" ").replace(/,/g, "").match(/\d+(?:\.\d+)?/g) || []).map(Number);
  const known = new Set(given);
  for (const n of given) {
    known.add(Math.round(n));
    known.add(Math.floor(n));
    if (n >= 1000) {
      known.add(Math.round(n / 1000));
      known.add(Math.floor(n / 1000));
    }
  }
  const small = [...new Set(given.filter((n) => n <= 100))];
  for (const a of small) for (const b of small) known.add(Math.abs(a - b));
  const used = reply.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) || [];
  return used.filter((n) => !known.has(Number(n)));
}

/** Model-written reply plus the CTA, or null when the draft breaks a rule (caller falls back to the template). */
export async function writeReply({ pack, text, parent_text }) {
  const facts = replyFacts(pack);
  const { reply } = await llmJson({
    system: systemFor(pack),
    input: { post: parent_text || "", request: text.replace(/@lychee_data\b/gi, "").trim(), facts },
    schema: Reply,
    temperature: 0.3,
  });
  const body = reply.trim();
  const issues = [];
  const invented = unsupportedNumbers(body, [JSON.stringify(facts), text, parent_text]);
  if (invented.length) issues.push(`numbers not in facts: ${invented.join(", ")}`);
  if (body.length > maxBody(pack) + 40) issues.push(`too long (${body.length} chars)`);
  if (/\b(null|undefined|NaN)\b/.test(body)) issues.push("placeholder value in reply");
  const link = pack.holder?.terminal_url || CTA;
  return { reply: issues.length ? null : `${body}\n\n${followUpLine(pack)}\n${link}`, draft: body, issues };
}
