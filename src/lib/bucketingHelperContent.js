/**
 * Content configuration for the Bucketing FeatureHelper.
 * Mirrors sheet workspace Stats → Bucket behavior (client-side after data loads).
 */

export const BUCKETING_HELPER_CONTENT = {
  label: "Helper",
  title: "Bucketing",
  introduction: [
    "Bucketing groups rows from your query result into buckets and aggregates metrics within each bucket. It uses the same engine as Stats → Bucket in the data sheet workspace.",
    "Lychee first runs your query (filters, joins, summarize, random sample, and other criteria). After rows land in a sheet, bucketing groups those rows and writes a new bucketed sheet.",
    "Choose a column to bucket (exact values, numeric ranges, or time intervals), optional extra group-by columns, and one or more aggregations such as count, sum, or mean.",
  ],
  sections: [
    {
      type: "heading",
      content: "How Bucketing works in Lychee",
    },
    {
      type: "paragraph",
      content:
        "Bucketing is a sheet operation applied to the completed query result. It does not change your SQL SELECT list the way Summarize does.",
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
        "Bucketing creates a new sheet; the original query result sheet is left unchanged.",
        "Configure Bucketing here before you run; application after pull will be adapted to match this research-tool flow.",
        "Prefer Summarize in Refine your query when you want grouping and aggregates pushed into Athena SQL.",
      ],
    },
  ],
  guideLinks: [],
};
