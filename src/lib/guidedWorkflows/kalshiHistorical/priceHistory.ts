import { KALSHI_GUIDED_TARGETS } from "../targets";
import type { GuidedWorkflowDefinition } from "../types";

export const priceHistoryWorkflow: GuidedWorkflowDefinition = {
  id: "price-history",
  title: "Build a price history chart",
  description: "Visualize price history over time.",
  steps: [
    {
      id: "pick-trades-source",
      target: KALSHI_GUIDED_TARGETS.sourceTrades,
      title: "Choose Trades",
      body: "Select Trades for execution-level price history.",
      completeWhen: { type: "click" },
      assert: { sampleId: "athena-kal-trades" },
      waitForTarget: true,
    },
  ],
};
