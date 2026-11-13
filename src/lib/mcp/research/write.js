import { z } from "zod";
import { llmJson } from "./llm.js";

const MAX_BODY_CHARS = 330;
const CTA = "lycheedata.com/jarvis";

const Reply = z.object({ reply: z.string().min(1).max(600) });

const SYSTEM = `You are Jarvis, Lychee's prediction-market research assistant, replying to someone who tagged you about a post.
You get their post, their request, and the facts Lychee pulled. Write the reply they will read.

Rules:
- Answer their actual question in the first line. Be direct, like a sharp analyst, not a press release.
- Use only the facts given. Every number you write must appear in the facts. Never invent prices, volumes, wallets, or dates.
- A YES price in cents is the market-implied probability (64¢ ≈ 64%).
- Name markets by venue and title, e.g. "Kalshi: Fed cuts in December? 78¢". If a market has no yes_price, don't quote a price for it.
- If no market matches, say so plainly. Mention a related market only if one is given, and say how it differs.
- For a claim check, give a clear verdict (backed, contradicted, or no market to judge it) and the number behind it.
- Plain text. Line breaks are fine. No hashtags, no emojis, no links, no internal tool names, never "fact check".
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

function marketFact(m) {
  return {
    venue: m.venue === "kalshi" ? "Kalshi" : "Polymarket",
    title: m.title,
    yes_price: cents(m.yes_price) == null ? null : `${cents(m.yes_price)}¢`,
    volume_24h: money(m.volume_24h),
    outcomes: m.outcomes?.map((o) => `${o.label}: ${cents(o.yes_price) ?? "?"}¢`),
    note: m.match_reason || undefined,
  };
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
      .slice(0, 3)
      .map(marketFact),
    holders: ["holders", "research"].includes(pack.intent?.mode) ? pack.whale_line || null : null,
    venue_gap: pack.intent?.mode === "gap" ? pack.take || null : null,
    news: (pack.news || []).slice(0, 2).map((n) => n.title),
    pulse: (pack.pulse_alerts || []).map((a) => [a.headline, a.detail].filter(Boolean).join(" — ")),
  };
}

/** Numbers in `reply` that appear nowhere in the facts or the user's own words. */
export function unsupportedNumbers(reply, sources) {
  const known = new Set((sources.join(" ").replace(/,/g, "").match(/\d+(?:\.\d+)?/g) || []).map(Number));
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
  return { reply: issues.length ? null : `${body}\n${CTA}`, draft: body, issues };
}
