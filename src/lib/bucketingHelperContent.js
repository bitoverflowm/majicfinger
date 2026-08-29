/**
 * Content configuration for the Bucketing → Buckets FeatureHelper.
 * Mirrors sheet workspace Stats → Bucket behavior (client-side after data loads).
 */

export const BUCKETING_HELPER_CONTENT = {
  label: "Helper",
  title: "Buckets",
  introduction: [
    "Buckets group rows from your query result using automatic binning — exact values, equal-width numeric ranges, or time intervals — then aggregate metrics within each bucket. This is the same engine as Stats → Bucket in the data sheet workspace.",
    "Lychee first runs your query (filters, joins, summarize, random sample, and other criteria). After rows land in a sheet, bucketing groups those rows and writes a new bucketed sheet.",
    "For hand-authored, unequal ranges (for example custom volume tiers), switch to the Bands tab.",
  ],
  sections: [
    {
      type: "heading",
      content: "How Buckets work in Lychee",
    },
    {
      type: "paragraph",
      content:
        "Buckets are a sheet operation applied to the completed query result. They do not change your SQL SELECT list the way Summarize does.",
    },
    {
      type: "unordered_list",
      items: [
        "Exact values — one output row per distinct value of the bucket column.",
        "Numeric ranges — bin continuous numbers into fixed-width ranges.",
        "Time intervals — roll timestamps into second, minute, hour, day, week, month, or year buckets.",
      ],
    },
    {
      type: "heading",
      content: "Aggregations and group by",
    },
    {
      type: "paragraph",
      content:
        "Each unique combination of bucket plus additional group-by columns becomes an output row. Aggregations compute metrics over the rows that fall into that group. Transfer columns copy a stable label from the first row in the group.",
    },
    {
      type: "heading",
      content: "Important notes",
    },
    {
      type: "unordered_list",
      items: [
        "Buckets create a new sheet; the original query result sheet is left unchanged.",
        "Configure here before you run; application after pull will be adapted to this research-tool flow.",
        "Prefer Summarize in Refine your query when you want grouping and aggregates pushed into Athena SQL.",
      ],
    },
  ],
  guideLinks: [],
};
