import { KALSHI_GUIDED_TARGETS } from "../targets";
import type { GuidedWorkflowDefinition } from "../types";

export const resolvedWeatherWorkflow: GuidedWorkflowDefinition = {
  id: "resolved-weather",
  title: "Find resolved weather markets",
  description: "Discover weather markets that have resolved.",
  steps: [
    {
      id: "pick-markets-source",
      target: KALSHI_GUIDED_TARGETS.sourceMarkets,
      title: "Choose Markets",
      body: "Select Markets to browse contract-level historical data.",
      completeWhen: { type: "click" },
      assert: { sampleId: "athena-kal-markets" },
      waitForTarget: true,
    },
  ],
};
