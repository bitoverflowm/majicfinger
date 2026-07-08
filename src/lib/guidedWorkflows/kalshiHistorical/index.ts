import { backtestOutcomesWorkflow } from "./backtestOutcomes";
import { priceHistoryWorkflow } from "./priceHistory";
import { resolvedWeatherWorkflow } from "./resolvedWeather";
import { top10WeatherMarketsSince2021Workflow } from "./top10WeatherMarketsSince2021";
import { tradesForMarketWorkflow } from "./tradesForMarket";
import type { GuidedWorkflowDefinition } from "../types";

export const KALSHI_HISTORICAL_GUIDED_WORKFLOWS: GuidedWorkflowDefinition[] = [
  top10WeatherMarketsSince2021Workflow,
  tradesForMarketWorkflow,
  resolvedWeatherWorkflow,
  priceHistoryWorkflow,
  backtestOutcomesWorkflow,
];

const byId = Object.fromEntries(
  KALSHI_HISTORICAL_GUIDED_WORKFLOWS.map((w) => [w.id, w]),
) as Record<string, GuidedWorkflowDefinition>;

export function getKalshiHistoricalGuidedWorkflow(id: string): GuidedWorkflowDefinition | null {
  return byId[id] ?? null;
}

/** Lucide icon names for workflow cards — mapped in the hub UI. */
export const KALSHI_WORKFLOW_ICONS: Record<string, string> = {
  "top-10-weather-markets-since-2021": "CloudSun",
  "trades-for-market": "RefreshCw",
  "resolved-weather": "CloudSun",
  "price-history": "LineChart",
  "backtest-outcomes": "Target",
};
