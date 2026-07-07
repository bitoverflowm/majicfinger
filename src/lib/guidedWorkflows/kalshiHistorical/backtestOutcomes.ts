import { KALSHI_GUIDED_TARGETS } from "../targets";
import type { GuidedWorkflowDefinition } from "../types";

export const backtestOutcomesWorkflow: GuidedWorkflowDefinition = {
  id: "backtest-outcomes",
  title: "Backtest final outcomes",
  description: "Evaluate strategies using final market outcomes.",
  steps: [
    {
      id: "pick-markets-source",
      target: KALSHI_GUIDED_TARGETS.sourceMarkets,
      title: "Choose Markets",
      body: "Select Markets to analyze final outcomes.",
      completeWhen: { type: "click" },
      assert: { sampleId: "athena-kal-markets" },
      waitForTarget: true,
    },
  ],
};
