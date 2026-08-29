/**
 * Research tools shown under “Refine your query” for Kalshi Historical (V1)
 * and Polymarket Historical. Random Sample and Bucketing are wired.
 */

import { BUCKETING_HELPER_CONTENT } from "@/lib/bucketingHelperContent";
import { RANDOM_SAMPLE_HELPER_CONTENT } from "@/lib/randomSampleHelperContent";

/** @typedef {{ id: string; title: string; description?: string; helper?: boolean }} ConnectResearchTool */

/** @type {ConnectResearchTool[]} */
export const CONNECT_RESEARCH_TOOLS = [
  {
    id: "random_sample",
    title: "Random Sample",
    helper: true,
  },
  {
    id: "bucketing",
    title: "Bucketing",
    helper: true,
  },
];

/** @type {Record<string, typeof RANDOM_SAMPLE_HELPER_CONTENT>} */
export const RESEARCH_TOOL_HELPER_CONTENT = {
  random_sample: RANDOM_SAMPLE_HELPER_CONTENT,
  bucketing: BUCKETING_HELPER_CONTENT,
};

/**
 * @param {string | null | undefined} toolId
 */
export function getResearchToolHelperContent(toolId) {
  const id = String(toolId || "").trim();
  return id ? RESEARCH_TOOL_HELPER_CONTENT[id] : undefined;
}

/**
 * @param {string | null | undefined} workspaceId
 * @returns {boolean}
 */
export function workspaceSupportsResearchTools(workspaceId) {
  return workspaceId === "kalshiHistorical" || workspaceId === "polymarketHistorical";
}
