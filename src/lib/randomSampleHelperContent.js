/**
 * Content configuration for the Random Sample FeatureHelper.
 * Keep layout-agnostic; FeatureHelper renders from this structure.
 */

export const RANDOM_SAMPLE_HELPER_CONTENT = {
  label: "Helper",
  title: "Random Sample",
  introduction: [
    "A random sample is a subset of a larger eligible population in which every row has an equal chance of being selected. Lychee samples without replacement, meaning the same underlying row cannot be selected twice.",
    "Lychee first applies your filters, joins, grouping, aggregations, HAVING conditions, and other compatible query criteria. It then randomly selects up to n rows from the completed eligible result.",
    "n represents your requested sample size. If 100,000 rows qualify and n is 100, Lychee returns 100 randomly selected rows. If only 63 rows qualify, Lychee returns all 63.",
  ],
  sections: [
    {
      type: "heading",
      content: "Seeded vs unseeded samples",
    },
    {
      type: "paragraph",
      content:
        "Seeded (recommended for analysis): Lychee generates a unique seed for you automatically — you never type a seed number. Every future pull of that saved query returns the same sample, so charts and summaries stay consistent across project reloads.",
    },
    {
      type: "paragraph",
      content:
        "Unseeded: each pull and each project reload draws a new random sample. Use this when you want fresh exploratory draws rather than a fixed analysis set.",
    },
    {
      type: "paragraph",
      content:
        "Replaying a seeded query into a new sheet generates a new seed for that sheet, so each sheet can hold an independent but still reproducible sample.",
    },
    {
      type: "heading",
      content: "How Random Sample works in Lychee",
    },
    {
      type: "paragraph",
      content: "Lychee treats Random Sample as a separate operation applied to the completed eligible result.",
    },
    {
      type: "paragraph",
      content: "Example criteria:",
    },
    {
      type: "unordered_list",
      items: [
        "Polymarket markets",
        "Resolved markets only",
        "Volume greater than $10,000",
        "Sample size: 100",
        "Mode: Seeded",
      ],
    },
    {
      type: "code",
      language: "sql",
      caption:
        "Unseeded sampling is equivalent to ordering by random(). Seeded sampling ranks rows with a stable hash of your seed plus row values, then takes the first n.",
      content: `WITH eligible_rows AS (
    SELECT
        id,
        question,
        category,
        volume,
        created_at,
        resolved_at
    FROM polymarket_markets
    WHERE resolved_at IS NOT NULL
      AND volume > 10000
)
-- Unseeded:
SELECT * FROM eligible_rows ORDER BY random() LIMIT 100;
-- Seeded (conceptual):
SELECT * FROM eligible_rows
ORDER BY hash(seed || row_key)
LIMIT 100;`,
    },
    {
      type: "paragraph",
      content:
        "Every eligible row receives a ranking value. Selecting the n rows with the lowest values produces a uniform random sample without replacement.",
    },
    {
      type: "heading",
      content: "Queries containing GROUP BY or HAVING",
    },
    {
      type: "paragraph",
      content:
        "Random sampling operates on the final eligible result rows. If the query groups or aggregates the data, Lychee samples the resulting groups rather than the underlying raw rows.",
    },
    {
      type: "heading",
      content: "Sorting a random sample",
    },
    {
      type: "paragraph",
      content: "When Sort is selected, Lychee first chooses the random sample and then sorts only the sampled rows.",
    },
    {
      type: "paragraph",
      content: "If you request 100 random markets and sort by volume from highest to lowest, Lychee will:",
    },
    {
      type: "ordered_list",
      items: [
        "Uniformly select 100 eligible markets.",
        "Sort those 100 markets by volume.",
      ],
    },
    {
      type: "heading",
      content: "Important notes",
    },
    {
      type: "unordered_list",
      items: [
        "Ordinary Limit and Offset are unavailable while Random Sample is enabled.",
        "Seeded samples stay consistent across reloads; unseeded samples change on every pull.",
        "Random Sample reduces the number of rows returned to the data sheet, analysis, and charts.",
        "Lychee may still need to process the full set of rows required to apply the selected query criteria before choosing the sample.",
        "Separate underlying rows with identical values may still look like duplicates in the result.",
      ],
    },
  ],
  /** Empty until real guides exist — FeatureHelper hides the section when empty. */
  guideLinks: [],
};
