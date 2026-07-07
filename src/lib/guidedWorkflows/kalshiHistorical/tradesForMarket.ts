import { KALSHI_GUIDED_TARGETS } from "../targets";
import type { GuidedWorkflowDefinition } from "../types";

/** Proof-of-concept steps — more steps added iteratively with product owner. */
export const tradesForMarketWorkflow: GuidedWorkflowDefinition = {
  id: "trades-for-market",
  title: "Get trades for a market",
  description: "Pull all trades for a specific market.",
  steps: [
    {
      id: "pick-trades-source",
      target: KALSHI_GUIDED_TARGETS.sourceTrades,
      title: "Choose Trades",
      body: "Start by selecting the Trades dataset under Browse raw historical data.",
      placement: "right",
      completeWhen: { type: "click" },
      assert: { sampleId: "athena-kal-trades" },
      waitForTarget: true,
    },
    {
      id: "select-ticker-column",
      target: KALSHI_GUIDED_TARGETS.column("ticker"),
      title: "Select the ticker column",
      body: "Check the ticker column so each row identifies the market contract.",
      placement: "top",
      completeWhen: {
        type: "state",
        match: { selectedColumns: { includes: ["ticker"] } },
      },
      waitForTarget: true,
    },
    {
      id: "select-yes-price-column",
      target: KALSHI_GUIDED_TARGETS.column("yes_price"),
      title: "Select yes_price",
      body: "Add yes_price to capture trade prices in your pull.",
      placement: "top",
      completeWhen: {
        type: "state",
        match: { selectedColumns: { includes: ["yes_price"] } },
      },
      waitForTarget: true,
    },
    {
      id: "open-where-op",
      target: KALSHI_GUIDED_TARGETS.composeOp("where"),
      title: "Open Where filters",
      body: "Click Where to filter trades to a specific market ticker.",
      placement: "bottom",
      completeWhen: { type: "click" },
      assert: { activeComposeOps: { includes: "where" } },
      waitForTarget: true,
    },
    {
      id: "run-query",
      target: KALSHI_GUIDED_TARGETS.runQuery,
      title: "Run your query",
      body: "When your columns and filters look right, run the query to pull data into Lychee.",
      placement: "top",
      completeWhen: { type: "click" },
      waitForTarget: true,
    },
  ],
};
