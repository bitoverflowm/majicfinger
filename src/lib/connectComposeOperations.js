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
    description: "Filter rows before pulling — status, volume, dates, tickers, and more.",
  },
  {
    id: "join",
    title: "Join",
    description: "Combine this source with another lake table or an existing sheet.",
  },
  {
    id: "sort",
    title: "Sort",
    description: "Order results by one or more columns (ascending or descending).",
  },
  {
    id: "row_limit",
    title: "Row limit",
    description: "Cap how many rows Athena returns (great for quick previews).",
  },
  {
    id: "summarize",
    title: "Summarize",
    description: "Sum or count values while grouping by dimensions (SQL-style GROUP BY).",
  },
  {
    id: "having",
    title: "Having",
    description: "Filter after summarizing — e.g. only groups where total volume exceeds a threshold.",
  },
];
