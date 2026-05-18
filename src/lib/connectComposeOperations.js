/**
 * Data-lake compose operations shown on Connect home after column selection.
 * Mirrors capabilities in DataLakeParquetPanel (join, sort, where, limit, etc.).
 */

/** @typedef {{ id: string; title: string; description: string }} ConnectComposeOperation */

/** @type {ConnectComposeOperation[]} */
export const CONNECT_COMPOSE_OPERATIONS = [
  {
    id: "where",
    title: "Where",
    description: "Filter your data before pulling. (eg: category = Weather; volume > 10000).",
  },
  {
    id: "sort",
    title: "Sort",
    description: "Order results. Numerical: ascending or descending; text: alphabetical or reverse alphabetical",
  },
  {
    id: "row_limit",
    title: "limit",
    description: "Truncate how many rows of data do you want (e.g. 1000 rows).",
  },
  {
    id: "summarize",
    title: "Summarize",
    description: "Sum or count values. Use Bucket → Unique values on a column to group rows, or leave one metric for a grand total.",
  },
  {
    id: "if_else",
    title: "If / else",
    description: "Conditional values per row (CASE) or conditional SUM when grouping.",
  },
  {
    id: "having",
    title: "Having",
    description: "Filter after grouping (e.g. only group categories where volume > 10000.)",
  },
  {
    id: "join",
    title: "Join",
    description: "Combine data pull with another table using a pivot (join markets and trades on ticker: combines markets and trades wherre trades match tickers).",
  },
];
