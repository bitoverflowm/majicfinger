import {
  resolveComposeGroupByAliases,
  selectRowsForAggregatedCompose,
} from "@/lib/composeColumnGrouping";

/**
 * Server compose payload for Athena lake pulls (shared by integrations panel + Connect home).
 * Connect home writes the same context state; pulls always go through DataLakeParquetPanel.handleLoad.
 */

/** @param {object} params */
export function buildDataLakeServerComposePayload({
  columnComposeItems,
  columnComposeOrderBy,
  composeHavingFilters,
  composeJoins,
  hasComposeAggregates,
  composeDimensionAliases: _composeDimensionAliases,
  dataset,
  selectedTable,
  kalshiTradesJoinPreset,
  kalshiTradesJoinPresets,
}) {
  const selectItems = selectRowsForAggregatedCompose(columnComposeItems);
  const selectAliasSet = new Set(
    selectItems.map((i) => String(i.alias || i.column).trim()).filter(Boolean),
  );
  const groupByAliases = resolveComposeGroupByAliases(columnComposeItems);
  const orderBy = (columnComposeOrderBy || [])
    .map((o) => ({
      alias: String(o?.alias || "").trim(),
      direction: String(o?.direction || "asc").toLowerCase().trim() === "desc" ? "desc" : "asc",
    }))
    .filter((o) => o.alias && selectAliasSet.has(o.alias));

  const payload = {
    select: selectItems.map((i) => ({
      column: i.column,
      alias: String(i.alias || i.column).trim(),
      aggregate: i.aggregate || null,
      dateBucket: i.dateBucket || null,
      dateFormat: i.dateFormat || null,
      stringBucket: i.stringBucket || null,
      numberBucket: i.numberBucket != null ? Number(i.numberBucket) : null,
      numberScale: i.numberScale || "none",
      decimals: i.decimals != null ? Number(i.decimals) : null,
      treatAsDate: i.treatAsDate === true,
      ...((i.aggregate === "sum" || i.aggregate == null) && i.sumCase && i.sumCase.enabled
        ? { sumCase: i.sumCase }
        : {}),
      ...(i.aggregate === "sum" && i.equation && i.equation.enabled ? { equation: i.equation } : {}),
    })),
    groupByAliases,
    orderBy,
  };

  if (composeHavingFilters.length > 0) {
    payload.having = {
      and: composeHavingFilters.map((f) => ({
        alias: f.havingAlias,
        op: f.op,
        value: Number(f.value),
      })),
    };
  }

  if (
    dataset === "kalshi" &&
    selectedTable === "trades" &&
    kalshiTradesJoinPresets?.has?.(kalshiTradesJoinPreset)
  ) {
    payload.join = { preset: kalshiTradesJoinPreset };
  }

  const tableJoins = (composeJoins || [])
    .filter((j) => j && j.targetKind === "table")
    .map((j) => ({
      joinType: j.joinType || "inner",
      table: String(j.targetTable || "").trim().toLowerCase(),
      on: {
        leftColumn: String(j.leftColumn || "").trim(),
        rightColumn: String(j.rightColumn || "").trim(),
      },
    }))
    .filter((j) => j.table && j.on.leftColumn && j.on.rightColumn);
  if (tableJoins.length) payload.joins = tableJoins;

  return payload;
}
