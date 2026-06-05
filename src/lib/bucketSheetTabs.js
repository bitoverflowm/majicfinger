const DEFAULT_AGGREGATIONS = [
  {
    id: "bucket-agg-1",
    type: "count",
    valueColumn: "",
    weightColumn: "",
    denominatorColumn: "",
    outputColumn: "count",
    filterEnabled: false,
    filterColumn: "",
    filterOperator: "=",
    filterValue: "",
  },
];

function normalizeAggregations(aggregations) {
  return (Array.isArray(aggregations) ? aggregations : []).map((agg, idx) => ({
    id: agg?.id || `bucket-agg-${idx}`,
    type: agg?.type || "count",
    valueColumn: agg?.valueColumn || "",
    weightColumn: agg?.weightColumn || "",
    denominatorColumn: agg?.denominatorColumn || "",
    outputColumn: String(agg?.outputColumn || "").trim(),
    filterEnabled: !!agg?.filterEnabled,
    filterColumn: agg?.filterColumn || "",
    filterOperator: agg?.filterOperator || "=",
    filterValue: agg?.filterValue ?? "",
  }));
}

/** @typedef {ReturnType<typeof bucketTabFromOperation>} BucketSheetTab */

export function bucketTabFromOperation(op, targetSheetId, sheetName) {
  if (!op || op.type !== "bucket.sheet") return null;
  const tabId = String(op.id || `bucket-tab-${Date.now()}`);
  return {
    id: tabId,
    operationId: op.id || null,
    targetSheetId: targetSheetId || null,
    savedSheetName: String(op.outputSheetName || sheetName || "").trim(),
    sheetName: String(op.outputSheetName || sheetName || "").trim(),
    bucketColumn: String(op.bucketColumn || "").trim(),
    bucketOutputColumn: String(op.bucketOutputColumn || "bucket").trim(),
    bucketMode: op.bucketMode || "category",
    timeInterval: op.timeInterval || "day",
    numericBucketSize: op.numericBucketSize != null ? String(op.numericBucketSize) : "",
    passthroughColumns: Array.isArray(op.passthroughColumns) ? [...op.passthroughColumns] : [],
    aggregations: normalizeAggregations(op.aggregations).length
      ? normalizeAggregations(op.aggregations)
      : [...DEFAULT_AGGREGATIONS],
  };
}

export function createEmptyBucketTab(sheetName = "Bucketed sheet") {
  const id = `bucket-tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    operationId: null,
    targetSheetId: null,
    savedSheetName: "",
    sheetName: String(sheetName || "").trim(),
    bucketColumn: "",
    bucketOutputColumn: "bucket",
    bucketMode: "category",
    timeInterval: "day",
    numericBucketSize: "",
    passthroughColumns: [],
    aggregations: DEFAULT_AGGREGATIONS.map((agg) => ({ ...agg, id: `bucket-agg-${id}` })),
  };
}

export function collectBucketTabsForSourceSheet(dataSheets, sourceSheetId) {
  if (!sourceSheetId) return [];
  const tabs = [];
  for (const [targetSheetId, sheet] of Object.entries(dataSheets || {})) {
    const history = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
    for (const op of history) {
      if (op?.type === "bucket.sheet" && op?.sourceSheetId === sourceSheetId) {
        const tab = bucketTabFromOperation(op, targetSheetId, sheet?.name);
        if (tab) tabs.push(tab);
      }
    }
  }
  return tabs.sort((a, b) => String(a.sheetName).localeCompare(String(b.sheetName)));
}

export function bucketOperationPayloadFromTab(tab, sourceSheetId) {
  return {
    sourceSheetId: sourceSheetId || null,
    bucketColumn: tab.bucketColumn,
    bucketOutputColumn: tab.bucketOutputColumn,
    bucketMode: tab.bucketMode,
    timeInterval: tab.timeInterval,
    numericBucketSize: tab.numericBucketSize,
    passthroughColumns: Array.isArray(tab.passthroughColumns) ? tab.passthroughColumns : [],
    aggregations: normalizeAggregations(tab.aggregations),
    outputSheetName: tab.sheetName,
  };
}

export function bucketTabCanSubmit(tab, { suggestedNumericSize } = {}) {
  if (!tab) return false;
  if (!String(tab.bucketColumn || "").trim()) return false;
  if (!String(tab.bucketOutputColumn || "").trim()) return false;
  if (!String(tab.sheetName || "").trim()) return false;
  if (tab.bucketMode === "number") {
    const size = Number(tab.numericBucketSize || suggestedNumericSize || 1);
    if (!Number.isFinite(size) || size <= 0) return false;
  }
  if (tab.bucketMode === "time" && !tab.timeInterval) return false;
  const aggregations = normalizeAggregations(tab.aggregations);
  if (!aggregations.length) return false;
  return aggregations.every((agg) => {
    if (!agg.outputColumn) return false;
    if (agg.type === "subgroup_by") return Boolean(agg.valueColumn);
    if (agg.filterEnabled) {
      const needsValue = !["is_empty", "is_not_empty"].includes(agg.filterOperator);
      if (!agg.filterColumn) return false;
      if (needsValue && String(agg.filterValue ?? "").trim() === "") return false;
    }
    if (agg.type === "count") return true;
    if (!agg.valueColumn) return false;
    if (agg.type === "weighted_average") return Boolean(agg.weightColumn);
    if (agg.type === "product_ratio") return Boolean(agg.weightColumn && agg.denominatorColumn);
    return true;
  });
}

export function bucketRowsConfigFromTab(tab, suggestedNumericSize) {
  return {
    bucketColumn: tab.bucketColumn,
    bucketOutputColumn: tab.bucketOutputColumn,
    bucketMode: tab.bucketMode,
    timeInterval: tab.timeInterval,
    numericBucketSize: tab.numericBucketSize || suggestedNumericSize || 1,
    passthroughColumns: Array.isArray(tab.passthroughColumns) ? tab.passthroughColumns : [],
    aggregations: normalizeAggregations(tab.aggregations),
  };
}
