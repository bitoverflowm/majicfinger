/**
 * FeatureHelper content for Bucketing → Bands (custom mutually exclusive ranges).
 */

export const BANDS_HELPER_CONTENT = {
  label: "Helper",
  title: "Bands",
  introduction: [
    "Bands let you define exact, mutually exclusive custom ranges on a column — more control than interval Buckets. Each band is its own predicate (=, <, >, or a bounded range), and Lychee aggregates metrics inside each band.",
    "Your overall query filters from Refine your query (WHERE, joins, summarize, random sample, limit) run first. Bands are a secondary pass over that result: assign each row to at most one band, then aggregate.",
    "Example: seven volume bands from 0 through ≥ 100,000,000, with COUNT(id) → market_count and SUM(volume) → total_volume. Put closed = true or volume is not null in WHERE above — Bands inherit those filters.",
  ],
  sections: [
    {
      type: "heading",
      content: "Buckets vs Bands",
    },
    {
      type: "unordered_list",
      items: [
        "Buckets — automatic bins: exact values, fixed numeric step sizes, or time intervals.",
        "Bands — hand-authored predicates. Ranges can be unequal, open-ended, or mixed (= 0 next to 0 < x < 10k).",
      ],
    },
    {
      type: "heading",
      content: "How Bands run",
    },
    {
      type: "paragraph",
      content:
        "Lychee keeps parent query filters in Athena (or the live API). After rows arrive, middleware evaluates band predicates in order. Prefer mutually exclusive bands so each row lands in one band.",
    },
    {
      type: "paragraph",
      content:
        "Pushing many custom UNION ALL band aggregations into compose SQL gets brittle across Kalshi Historical, Polymarket Historical, and future Live sources. A post-pull pass reuses the same aggregation engine as sheet Bucketing and stays portable.",
    },
    {
      type: "heading",
      content: "What you configure",
    },
    {
      type: "unordered_list",
      items: [
        "Band column — the value each predicate tests (for example volume).",
        "Band list — =, <, >, ≤, ≥, or inclusive/exclusive ranges.",
        "Aggregations — count, sum, min, max, median, and the same family as Buckets.",
        "Additional group-by / transfer columns — same ideas as Buckets.",
      ],
    },
    {
      type: "heading",
      content: "Important notes",
    },
    {
      type: "unordered_list",
      items: [
        "Bands create a new sheet; the original query result is unchanged.",
        "Order bands thoughtfully when predicates could overlap; first match wins once the engine is wired.",
        "Use Buckets when equal-width or time intervals are enough; use Bands when ranges must be custom.",
      ],
    },
  ],
  guideLinks: [],
};
