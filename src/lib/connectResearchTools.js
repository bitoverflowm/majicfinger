/**
 * Research tools shown under “Refine your query” for Kalshi Historical (V1)
 * and Polymarket Historical. Random Sample is wired; other tools may follow.
 */

/** @typedef {{ id: string; title: string; description?: string }} ConnectResearchTool */

/** @type {ConnectResearchTool[]} */
export const CONNECT_RESEARCH_TOOLS = [
  {
    id: "random_sample",
    title: "Random Sample",
  },
];

/**
 * @param {string | null | undefined} workspaceId
 * @returns {boolean}
 */
export function workspaceSupportsResearchTools(workspaceId) {
  return workspaceId === "kalshiHistorical" || workspaceId === "polymarketHistorical";
}
