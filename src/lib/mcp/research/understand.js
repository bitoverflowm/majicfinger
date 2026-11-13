import { z } from "zod";
import { llmJson } from "./llm.js";

export const MODES = [
  "market_for",
  "verify",
  "gap",
  "holders",
  "lookalikes",
  "news_impact",
  "research",
  "pulse",
  "calibrate",
  "clarify",
];

const Understanding = z.object({
  mode: z.enum(MODES),
  subject: z.string().max(200),
  claim: z.string().max(280).nullable().optional(),
  search_queries: z.array(z.string().min(2).max(80)).max(4),
  clarify_question: z.string().max(240).nullable().optional(),
});

const SYSTEM = `You route research requests for Lychee, a prediction-market data platform covering Kalshi and Polymarket.
A user shares a post (may be empty) and asks something about it. Work out what they want.

Modes:
- market_for: is there a market for this / what markets cover this
- verify: does market data back (or contradict) a claim in the post
- gap: price differences / arbitrage between Kalshi and Polymarket on a topic
- holders: who is buying / whales / wallets / positioning in a market
- lookalikes: related markets, other deadlines or thresholds of the same event
- news_impact: which markets a news item could move
- research: a general dig into a topic's markets
- pulse: what's hot / moving right now, no specific topic
- calibrate: how accurate markets were on settled events
- clarify: there is no identifiable subject in the post or the ask

search_queries: 2-4 queries you would type into a market search box to find the relevant markets.
Search matches market titles word for word, so use the words a market title would use, 1-4 words each.
Start with the broadest (e.g. "Fed decision", "Bitcoin price", "House control"), then narrower ones ("Fed rate December", "Bitcoin 150k").
Market titles say "Fed decision", not "rate cut"; "Bitcoin above", not "BTC moon". No filler words, no sentences. Empty for pulse and clarify.

subject: one plain line saying what this is about. claim: for verify, the exact claim to test, else null.
clarify_question: only for clarify, a short friendly question asking what market, wallet, or topic they mean.

Respond with JSON only:
{"mode": "...", "subject": "...", "claim": null, "search_queries": ["..."], "clarify_question": null}`;

/** The model's reading of a post + request: mode, subject, and search queries. */
export async function understandRequest({ text = "", parent_text = "" }) {
  return llmJson({
    system: SYSTEM,
    input: { post: parent_text || "", request: text.replace(/@lychee_data\b/gi, "").trim() },
    schema: Understanding,
    temperature: 0,
  });
}
