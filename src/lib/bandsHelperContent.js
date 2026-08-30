/**
 * FeatureHelper content for Bucketing → Bands (custom mutually exclusive ranges).
 */

export const BANDS_HELPER_CONTENT = {
  label: "Helper",
  title: "Bands",
  introduction: [
    "Bands let you define exact, mutually exclusive custom ranges on a column — more control than interval Buckets. Each band is its own predicate (=, <, >, or a bounded range), and Lychee aggregates metrics inside each band.",
    "Your overall query filters from Refine your query (WHERE, joins) still run in Athena. On Historical lakes, Bands that use count/sum-style aggregations compile to a CASE + GROUP BY query so Athena returns one row per band — not the full raw result.",
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
        "On Polymarket/Kalshi Historical, supported Bands (band labels + count/sum/min/max/…, no transfer columns or extra group-by) become Athena SQL: CASE WHEN … THEN 'label' … END grouped with your aggregations. Empty bands are zero-filled locally on the small result.",
    },
    {
      type: "paragraph",
      content:
        "If a config cannot compile (passthrough columns, conditional aggregations, extra group-by, etc.), Lychee falls back to a post-pull pass over the query result — same engine as sheet Bucketing.",
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
        "Additional group-by / transfer columns — same ideas as Buckets (currently use the post-pull path).",
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
        "Order bands thoughtfully when predicates could overlap; first match wins (CASE WHEN order).",
        "Use Buckets when equal-width or time intervals are enough; use Bands when ranges must be custom.",
      ],
    },
  ],
  guideLinks: [],
};
