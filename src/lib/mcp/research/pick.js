import { z } from "zod";
import { llmJson } from "./llm.js";

const Picks = z.object({
  picks: z.array(
    z.object({
      id: z.number().int(),
      verdict: z.enum(["match", "related", "unrelated"]),
      outcome: z.string().max(120).nullable().optional(),
      importance: z.number().int().min(1).max(3).nullable().optional(),
      reason: z.string().max(200),
    }),
  ),
  missing_searches: z.array(z.string().min(2).max(60)).max(2).nullable().optional(),
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
When mode is news_impact, judge by impact instead: match = markets this news directly moves (the race, office,
company, or policy of the people and things in it); related = plausible second-order effects; unrelated = no real link.

outcome: for a multi-outcome match or related market, the exact label (copied from its outcomes list, without the
  price) of the outcome that matters most for the question. For a race, the subject's own outcome. Never a
  near-certain floor or dead long shot (e.g. "at least 34%" at 99¢) unless that is literally what was asked.
importance: 1 = the headline market for this question (e.g. who wins the race), 2 = important context, 3 = minor.
reason: one short line on why.
missing_searches: if the obvious headline market is not among the candidates (e.g. only a vote-share market for a
  candidate, not the race winner), or only one venue has it, up to 2 short title-style searches that would find it
  (e.g. "Mississippi Senate"). Otherwise an empty list.

Respond with JSON only:
{"picks": [{"id": 0, "verdict": "match", "outcome": null, "importance": 1, "reason": "..."}], "missing_searches": []}
covering every candidate.`;

const informative = (o) => o.yes_price >= 0.03 && o.yes_price <= 0.97;

/**
 * Point a multi-outcome row at the outcome the model chose. A near-certain or dead outcome only wins when the
 * market has no informative one (the row's default headline is already the best informative outcome).
 */
function focusOutcome(m, label) {
  const o = label && m.outcomes?.find((x) => x.label.trim().toLowerCase() === label.trim().toLowerCase());
  if (!o || (!informative(o) && m.outcomes.some(informative))) return m;
  return {
    ...m,
    title: `${m.event_title || m.title} — ${o.label}`,
    yes_price: o.yes_price,
    price_change_24h: o.price_change_24h ?? null,
    condition_id: o.condition_id || m.condition_id,
    ticker: o.ticker || m.ticker,
  };
}

/**
 * Splits candidate markets into matches and related ones, best first.
 * `candidates` are research-pack market rows (venue, title, yes_price, volume_24h…).
 */
export async function pickMarkets({ understanding, request, candidates }) {
  if (!candidates.length) return { matches: [], related: [], picks: [], missing_searches: [] };
  const { picks, missing_searches } = await llmJson({
    system: SYSTEM,
    input: {
      mode: understanding?.mode || null,
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
      venues_in_candidates: [...new Set(candidates.map((m) => m.venue))],
    },
    schema: Picks,
    temperature: 0,
  });

  const best = (a, b) =>
    (a.importance || 3) - (b.importance || 3) ||
    (b.yes_price != null) - (a.yes_price != null) ||
    (Number(b.volume_24h) || 0) - (Number(a.volume_24h) || 0);
  const tagged = picks
    .filter((p) => candidates[p.id])
    .map((p) => ({
      ...focusOutcome(candidates[p.id], p.outcome),
      match: p.verdict,
      match_reason: p.reason,
      importance: p.importance || 3,
    }));
  return {
    matches: tagged.filter((m) => m.match === "match").sort(best).map((m) => ({ ...m, relevance: 1 })),
    related: tagged.filter((m) => m.match === "related").sort(best).map((m) => ({ ...m, relevance: 0.5 })),
    picks,
    missing_searches: missing_searches || [],
  };
}
