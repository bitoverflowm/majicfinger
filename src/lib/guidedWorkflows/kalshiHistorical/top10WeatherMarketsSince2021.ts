import { KALSHI_GUIDED_TARGETS } from "../targets";
import type { GuidedWorkflowDefinition } from "../types";

export const top10WeatherMarketsSince2021Workflow: GuidedWorkflowDefinition = {
  id: "top-10-weather-markets-since-2021",
  title: "Get top 10 weather markets, all time by volume",
  description: "Find and rank the highest-volume weather markets since Kalshi launched in 2021",
  steps: [
    {
      id: "select-markets-source",
      target: KALSHI_GUIDED_TARGETS.sourceMarkets,
      title: "Select the Markets data source",
      body: "This is a Markets data pull, so we will first select the Markets data source.",
      placement: "right",
      completeWhen: { type: "click" },
      assert: { sampleId: "athena-kal-markets" },
      waitForTarget: true,
    },
    {
      id: "columns-fields-overview",
      kind: "info",
      target: KALSHI_GUIDED_TARGETS.columnsPanel,
      title: "Market fields",
      body: "These are all the fields you can include for each market in your pull. In the next steps, we'll show you exactly which ones to select.",
      placement: "bottom",
      completeWhen: { type: "continue" },
      waitForTarget: true,
      blockTargetInteraction: true,
    },
  ],
};
