import { flushSync } from "react-dom";

import { prepareConnectHomePullSheet } from "@/lib/connectHomePullDestination";
import { getKalshiConnectColumnsForSample } from "@/lib/kalshiConnectColumns";

/**
 * @typedef {import("@/lib/dataLake/kalshiSearchSuggestions").KalshiSearchSuggestion} KalshiSearchSuggestion
 */

/**
 * Configure compose state and trigger a single Athena pull from a Power Tools suggestion.
 * @param {Record<string, unknown>} ctx
 * @param {KalshiSearchSuggestion} suggestion
 */
export function applyKalshiPowerSearchSelection(ctx, suggestion) {
  const sampleId = suggestion.entity === "markets" ? "athena-kal-markets" : "athena-kal-trades";
  const columns = getKalshiConnectColumnsForSample(sampleId).map((c) => c.name);
  const filterId = `w-power-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  flushSync(() => {
    ctx.setConnectDataLakeSampleId?.(sampleId);
    ctx.setConnectDataLakeColumnSelections?.((prev) => ({
      ...(prev || {}),
      [sampleId]: columns,
    }));
    ctx.setDataLakeComposeWhereFilters?.([
      {
        id: filterId,
        column: "ticker",
        kind: "string",
        op: "eq",
        value: suggestion.ticker,
      },
    ]);
    ctx.setDataLakeComposeJoins?.([]);
    ctx.setDataLakeComposeHavingFilters?.([]);
    ctx.setDataLakeComposeOrderBy?.([]);
    ctx.setConnectActiveComposeOps?.([]);
  });

  prepareConnectHomePullSheet(ctx);
  ctx.requestConnectDataLakePull?.();
}
