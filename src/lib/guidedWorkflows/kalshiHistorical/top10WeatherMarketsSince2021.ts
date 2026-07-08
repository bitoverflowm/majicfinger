import { KALSHI_GUIDED_TARGETS } from "../targets";
import type { GuidedStep, GuidedWorkflowDefinition } from "../types";

function columnSelectStep(
  column: string,
  title: string,
  body: string,
  placement: GuidedStep["placement"] = "bottom",
): GuidedStep {
  return {
    id: `select-column-${column}`,
    target: KALSHI_GUIDED_TARGETS.column(column),
    title,
    body,
    placement,
    completeWhen: {
      type: "state",
      match: { selectedColumns: { includes: [column] } },
    },
    waitForTarget: true,
  };
}

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
    columnSelectStep(
      "ticker",
      "Select ticker",
      "The unique market identifier set by Kalshi.",
    ),
    columnSelectStep(
      "kalshi_taxonomy_category",
      "Select Category",
      "The meta market category. Kalshi does not natively classify markets by category, but Lychee's AI has extrapolated this to make your life easier. Categories can be Sports, Weather, Politics, Crypto, and more.",
    ),
    columnSelectStep(
      "title",
      "Select title",
      "The human-readable title. This is useful to know exactly which market you are looking at.",
    ),
    columnSelectStep(
      "yes_sub_title",
      "Select yes_sub_title",
      "The proposed Yes outcome for this specific market.",
    ),
    columnSelectStep(
      "status",
      "Select status",
      "Whether the market is still open, has been closed, or has been finalized. A closed market has stopped accepting new trades because its event has concluded, but still awaits official confirmation. A finalized (settled) market is one where Kalshi has received official data from the pre-established source agency and distributed payouts to winning positions.",
      "top",
    ),
    columnSelectStep(
      "last_price",
      "Select last_price",
      "The last traded price before market close — a useful data point to include in a top-10 markets pull.",
    ),
    columnSelectStep(
      "volume",
      "Select volume",
      "Total contracts traded over the market's lifespan. You will need this field for the sort in this workflow.",
    ),
    columnSelectStep(
      "created_time",
      "Select created_time",
      "When the market was created.",
    ),
    columnSelectStep(
      "open_time",
      "Select open_time",
      "When trading on the market began.",
    ),
    columnSelectStep(
      "close_time",
      "Select close_time",
      "When trading for this market closed.",
    ),
    {
      id: "filters-overview",
      kind: "info",
      target: KALSHI_GUIDED_TARGETS.composePanel,
      title: "Filters",
      body: "These are filters. You can also run filters and operations after your data is pulled, directly in the Lychee data sheet. However, we recommend applying preliminary filters here to reduce query load — smaller queries execute faster and consume less memory.",
      placement: "top",
      completeWhen: { type: "continue" },
      waitForTarget: true,
      blockTargetInteraction: true,
    },
  ],
};
