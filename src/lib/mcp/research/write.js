import { z } from "zod";
import { llmJson } from "./llm.js";

const MAX_BODY_CHARS = 1100;
const CTA = "lycheedata.com/jarvis";

const Reply = z.object({ reply: z.string().min(1).max(1600) });

const SYSTEM = `You are Jarvis, Lychee's prediction-market research assistant, replying on X to someone who tagged you about a post.
You get their post, their request, and the facts Lychee pulled from Kalshi and Polymarket. Write the reply they will read.
They asked on purpose, so give real detail, laid out so it scans fast.

Shape:
1. One line that answers their actual question (for a claim: a clear verdict, backed / contradicted / no market to judge it).
2. A short lead-in such as "Markets this could move:" (or "Markets on this:"), then the markets as a list, one per line,
   most important first: "- Venue · market — outcome price (24h move if given)". Show Kalshi and Polymarket both when both
   have markets; if a venue has nothing relevant, say so in one short line ("Nothing on Polymarket yet.").
3. "Quick reads:" then 1-3 lines, each starting with "- ", only from the facts: the biggest 24h mover, a whale/holder
   read, a price gap between Kalshi and Polymarket on the same event, or a related headline. Skip it if the facts have none.
Stop there. Do not write a closing line or sign-off; Lychee appends the follow-up offer.

Rules:
- Use only the facts given. Every number must come from the facts (a difference between two given prices is fine).
  Never invent prices, volumes, wallets, dates, or news.
- Never say news "is moving", "pushed", or "drove" a market. Frame impact as possibility: "this could impact…",
  "markets this could move". A 24h move is reported as a fact on its own, not as caused by the post.
- Only call something a Kalshi/Polymarket price gap when both prices are for the same outcome of the same event
  (same candidate, same threshold or band, same date). Different bands or thresholds are not a gap.
- A YES price in cents is the market-implied probability (64¢ ≈ 64%). Skip a market's price if it has none.
- Pick outcomes that tell the reader something; never lead with a near-certain floor like "at least 34% · 99¢".
- Plain text, short lines. No hashtags, no emojis, no links, no internal tool names, never "fact check".
- At most ${MAX_BODY_CHARS} characters.

Respond with JSON only: {"reply": "..."}`;

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
  };
}

/** Follow-up offer under every model reply. Registered askers can continue in DMs (we know who they are). */
export function followUpLine(pack) {
  const ask = (pack.markets || []).length || (pack.pulse_alerts || []).length
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
  const small = [...new Set(given.filter((n) => n <= 100))];
  for (const a of small) for (const b of small) known.add(Math.abs(a - b));
  const used = reply.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) || [];
  return used.filter((n) => !known.has(Number(n)));
}

/** Model-written reply plus the CTA, or null when the draft breaks a rule (caller falls back to the template). */
export async function writeReply({ pack, text, parent_text }) {
  const facts = replyFacts(pack);
  const { reply } = await llmJson({
    system: SYSTEM,
    input: { post: parent_text || "", request: text.replace(/@lychee_data\b/gi, "").trim(), facts },
    schema: Reply,
    temperature: 0.3,
  });
  const body = reply.trim();
  const issues = [];
  const invented = unsupportedNumbers(body, [JSON.stringify(facts), text, parent_text]);
  if (invented.length) issues.push(`numbers not in facts: ${invented.join(", ")}`);
  if (body.length > MAX_BODY_CHARS + 40) issues.push(`too long (${body.length} chars)`);
  if (/\b(null|undefined|NaN)\b/.test(body)) issues.push("placeholder value in reply");
  return { reply: issues.length ? null : `${body}\n\n${followUpLine(pack)}\n${CTA}`, draft: body, issues };
}
