import { z } from "zod";
import { llmJson } from "./llm.js";
import { INSIGHTS, INSIGHT_IDS } from "./traderInsights.js";

export const MODES = [
  "market_for",
  "verify",
  "gap",
  "holders",
  "holder_profile",
  "lookalikes",
  "news_impact",
  "research",
  "pulse",
  "calibrate",
  "clarify",
];

// Over-long strings and lists are trimmed rather than rejected: one extra search query shouldn't throw away the whole read.
const str = (max) => z.string().transform((s) => s.slice(0, max));
const list = (item, max) => z.array(item).transform((a) => a.slice(0, max));

const Understanding = z.object({
  mode: z.enum(MODES),
  subject: str(200),
  claim: str(280).nullable().optional(),
  search_queries: list(str(80), 4).transform((a) => a.filter((q) => q.trim().length >= 2)),
  clarify_question: str(240).nullable().optional(),
  wallet: str(60).nullable().optional(),
  trader_name: str(60).nullable().optional(),
  post_bets: list(str(40), 8).nullable().optional(),
  holder_side: z.enum(["YES", "NO"]).nullable().optional(),
  holder_rank: z.number().int().min(1).max(20).nullable().optional(),
  category_keywords: list(str(40), 8).nullable().optional(),
  insight_focus: z
    .array(z.string())
    .transform((a) => a.filter((id) => INSIGHT_IDS.includes(id)))
    .nullable()
    .optional(),
});

const INSIGHT_MENU = INSIGHTS.map((i) => `  ${i.id}: ${i.ask}`).join("\n");

/** "go ultra deep" (any spacing/hyphen) asks for every insight plus the report dashboard. */
export function wantsUltraDeep(text) {
  return /\bultra[\s-]*deep/i.test(String(text || ""));
}

const SYSTEM = `You route research requests for Lychee, a prediction-market data platform covering Kalshi and Polymarket.
A user shares a post (may be empty) and asks something about it. Work out what they want.

Modes:
- market_for: is there a market for this / what markets cover this
- verify: does market data back (or contradict) a claim in the post
- gap: price differences / arbitrage between Kalshi and Polymarket on a topic
- holders: who is buying / whales / wallets / positioning in a market
- holder_profile: look into one specific trader, wallet, or whale: their track record, PnL, success rate, whether a bet
  is a one-off, whether their trades line up with news, or any trader insight below ("go ultra deep on this trader").
  Includes follow-ups like "that whale looks interesting" where
  the post (often our own earlier reply) names the market and side the holder is on, and posts about a trader named by
  their Polymarket username ("dig into this trader" under a post about "gopfan2").
- lookalikes: related markets, other deadlines or thresholds of the same event
- news_impact: which markets a news item or post could move ("what markets does this touch", "how does this affect…").
  Never look for a market about the news event itself; look for the markets it moves.
- research: a general dig into a topic's markets
- pulse: only when they explicitly ask what's hot / moving / trending right now, with no specific topic
- calibrate: how accurate markets were on settled events
- clarify: there is no identifiable subject in the post or the ask
  (a bare "thoughts?", "what do you think?", or "look at this" with an empty post is clarify, not pulse)

search_queries: 2-4 queries you would type into a market search box to find the relevant markets.
Search for the stakes, not the words in the post: the race, office, company, policy, or event each named person or
thing is tied to (a Senate candidate -> "Mississippi Senate"; a CEO -> the company; a bill -> the bill or policy).
Put the most important market first, usually the race or event the main subject is competing in.
Search matches market titles word for word, so use the words a market title would use, 1-4 words each.
Start with the broadest (e.g. "Fed decision", "Bitcoin price", "House control"), then narrower ones ("Fed rate December", "Bitcoin 150k").
Market titles say "Fed decision", not "rate cut"; "Bitcoin above", not "BTC moon". No filler words, no sentences. Empty for pulse and clarify.

subject: one plain line saying what this is about. claim: for verify, the exact claim to test, else null.
clarify_question: only for clarify, a short friendly question asking what market, wallet, or topic they mean.

For holder_profile only (null otherwise):
- wallet: a 0x address if one appears in the post or request.
- trader_name: the trader's Polymarket username when the post names one (e.g. "gopfan2"), not their X handle.
- post_bets: for each specific bet the post says this trader made, 1-2 distinctive words found in that market's title,
  to look the position up ("Carney", "United Russia", "Newsom", "hottest year"). Up to 8, most surprising claims first.
- holder_side / holder_rank: which holder they mean when there is no address or name ("largest NO holder" -> "NO", 1).
- search_queries: the market that holder is in, in market-title words (e.g. "US Iran nuclear deal").
  Empty when wallet or trader_name is given.
- category_keywords: 3-8 single words that appear in titles of markets in the same category, to score the trader's
  record there (Iran nuclear deal -> ["Iran", "Israel", "nuclear", "Khamenei", "Tehran", "Hezbollah"];
  an elections trader -> ["election", "President", "Prime Minister", "parliamentary", "mayor", "seats"]).
  Only words specific to the category; never generic ones like "deal", "war", "price", "win".
- insight_focus: ids of the specific trader insights the request asks about, from this menu (null when they just ask
  to look into the trader generally):
${INSIGHT_MENU}

Respond with JSON only:
{"mode": "...", "subject": "...", "claim": null, "search_queries": ["..."], "clarify_question": null,
 "wallet": null, "trader_name": null, "post_bets": null, "holder_side": null, "holder_rank": null, "category_keywords": null,
 "insight_focus": null}`;

/** The model's reading of a post + request: mode, subject, and search queries. */
export async function understandRequest({ text = "", parent_text = "" }) {
  return llmJson({
    system: SYSTEM,
    input: { post: parent_text || "", request: text.replace(/@lychee_data\b/gi, "").trim() },
    schema: Understanding,
    temperature: 0,
  });
}
