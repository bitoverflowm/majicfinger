import { z } from "zod";
import { llmJson } from "./llm.js";

const Picks = z.object({
  picks: z.array(
    z.object({
      id: z.number().int(),
      verdict: z.enum(["match", "related", "unrelated"]),
      outcome: z.string().max(120).nullable().optional(),
      reason: z.string().max(200),
    }),
  ),
});

const SYSTEM = `You check prediction-market search results for Lychee.
Given what the user is asking about and a numbered list of candidate markets, judge each candidate.
Multi-outcome markets list their open outcomes with YES prices; judge the market by its best-fitting outcome.
- match: this market (or one of its outcomes) directly answers the question: same event, entity, and threshold,
  with a deadline that matches in substance. Dates that mean the same moment are the same deadline:
  "by end of this year" = "by December 31" = "before January 1 next year".
- related: same entity and topic but a different threshold, deadline, or angle; useful context, not the answer
  (e.g. "Bitcoin above $130k by mid-next-year" when asked about $150k by year end).
- unrelated: a different person, asset, or event, or markets that only share a word.
outcome: for a multi-outcome match or related market, the exact label of the outcome closest to the question
  (copied from its outcomes list, without the price); otherwise null.
reason: one short line on why.

Respond with JSON only: {"picks": [{"id": 0, "verdict": "match", "outcome": null, "reason": "..."}]} covering every candidate.`;

/** Point a multi-outcome row at the outcome the model chose. */
function focusOutcome(m, label) {
  const o = label && m.outcomes?.find((x) => x.label.trim().toLowerCase() === label.trim().toLowerCase());
  if (!o) return m;
  return {
    ...m,
    title: `${m.event_title || m.title} — ${o.label}`,
    yes_price: o.yes_price,
    condition_id: o.condition_id || m.condition_id,
    ticker: o.ticker || m.ticker,
  };
}

/**
 * Splits candidate markets into matches and related ones, best first.
 * `candidates` are research-pack market rows (venue, title, yes_price, volume_24h…).
 */
export async function pickMarkets({ understanding, request, candidates }) {
  if (!candidates.length) return { matches: [], related: [], picks: [] };
  const { picks } = await llmJson({
    system: SYSTEM,
    input: {
      asking_about: understanding?.subject || request,
      claim: understanding?.claim || null,
      request,
      candidates: candidates.map((m, id) => ({
        id,
        venue: m.venue,
        title: m.outcomes ? m.event_title || m.title : m.title,
        yes_price_cents: m.outcomes || m.yes_price == null ? undefined : Math.round(m.yes_price > 1.5 ? m.yes_price : m.yes_price * 100),
        outcomes: m.outcomes?.map((o) => `${o.label}: ${Math.round(o.yes_price * 100)}¢`),
      })),
    },
    schema: Picks,
    temperature: 0,
  });

  const byVolume = (a, b) =>
    (b.yes_price != null) - (a.yes_price != null) || (Number(b.volume_24h) || 0) - (Number(a.volume_24h) || 0);
  const tagged = picks
    .filter((p) => candidates[p.id])
    .map((p) => ({ ...focusOutcome(candidates[p.id], p.outcome), match: p.verdict, match_reason: p.reason }));
  return {
    matches: tagged.filter((m) => m.match === "match").sort(byVolume).map((m) => ({ ...m, relevance: 1 })),
    related: tagged.filter((m) => m.match === "related").sort(byVolume).map((m) => ({ ...m, relevance: 0.5 })),
    picks,
  };
}
