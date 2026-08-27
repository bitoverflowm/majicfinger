/**
 * Data-lake compose operations shown on Connect home after column selection.
 * Mirrors capabilities in DataLakeParquetPanel (join, sort, where, limit, etc.).
 */

/** @typedef {{ id: string; title: string; description: string }} ConnectComposeOperation */

const WHERE_DESCRIPTION_DEFAULT =
  "Filter your data before pulling. (eg: category = Weather; volume > 10000).";

/** Polymarket historical lakes have no Category column — use a real market field in the example. */
const WHERE_DESCRIPTION_POLYMARKET =
  "Filter your data before pulling. (eg: closed = true; volume > 10000).";

/** @type {ConnectComposeOperation[]} */
export const CONNECT_COMPOSE_OPERATIONS = [
  {
    id: "where",
    title: "Where",
    description: WHERE_DESCRIPTION_DEFAULT,
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

/**
 * Compose op copy for a Connect workspace. Polymarket Historical uses a closed-market example
 * instead of Kalshi’s category = Weather.
 * @param {string | null | undefined} workspaceId
 * @returns {ConnectComposeOperation[]}
 */
export function getConnectComposeOperationsForWorkspace(workspaceId) {
  if (workspaceId !== "polymarketHistorical") return CONNECT_COMPOSE_OPERATIONS;
  return CONNECT_COMPOSE_OPERATIONS.map((op) =>
    op.id === "where" ? { ...op, description: WHERE_DESCRIPTION_POLYMARKET } : op,
  );
}
