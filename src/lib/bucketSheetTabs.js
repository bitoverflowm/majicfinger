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

export function bucketTabCanSubmit(tab, opts = {}) {
  return getBucketTabValidationErrors(tab, opts).ok;
}

/** @returns {{ ok: boolean; message: string; fieldErrors: Record<string, string> }} */
export function getBucketTabValidationErrors(tab, { suggestedNumericSize } = {}) {
  const fieldErrors = {};
  let message = "";
  if (!tab) {
    return { ok: false, message: "Bucket configuration is missing.", fieldErrors };
  }
  if (!String(tab.bucketColumn || "").trim()) {
    fieldErrors.bucketColumn = "Choose a column to bucket.";
    message = fieldErrors.bucketColumn;
  }
  if (!String(tab.bucketOutputColumn || "").trim()) {
    fieldErrors.bucketOutputColumn = "Enter a bucket column name.";
    if (!message) message = fieldErrors.bucketOutputColumn;
  }
  if (!String(tab.sheetName || "").trim()) {
    fieldErrors.sheetName = "Enter a new sheet name.";
    if (!message) message = fieldErrors.sheetName;
  }
  if (tab.bucketMode === "number") {
    const size = Number(tab.numericBucketSize || suggestedNumericSize || 1);
    if (!Number.isFinite(size) || size <= 0) {
      fieldErrors.numericBucketSize = "Enter a valid range size.";
      if (!message) message = fieldErrors.numericBucketSize;
    }
  }
  if (tab.bucketMode === "time" && !tab.timeInterval) {
    fieldErrors.timeInterval = "Choose a time interval.";
    if (!message) message = fieldErrors.timeInterval;
  }
  const aggregations = normalizeAggregations(tab.aggregations);
  if (!aggregations.length) {
    message = message || "Add at least one aggregation.";
  }
  aggregations.forEach((agg, idx) => {
    const label = `Aggregation ${idx + 1}`;
    if (!agg.outputColumn) {
      fieldErrors[`agg.${agg.id}.outputColumn`] = "Enter a generated column name.";
      if (!message) message = `${label}: enter a generated column name.`;
    }
    if (agg.type === "subgroup_by" && !agg.valueColumn) {
      fieldErrors[`agg.${agg.id}.valueColumn`] = "Choose a sub-group column.";
      if (!message) message = `${label}: choose a sub-group column.`;
    }
    if (agg.filterEnabled) {
      const needsValue = !["is_empty", "is_not_empty"].includes(agg.filterOperator);
      if (!agg.filterColumn) {
        fieldErrors[`agg.${agg.id}.filterColumn`] = "Choose a filter column.";
        if (!message) message = `${label}: choose a where column.`;
      }
      if (needsValue && String(agg.filterValue ?? "").trim() === "") {
        fieldErrors[`agg.${agg.id}.filterValue`] = "Enter a filter value.";
        if (!message) message = `${label}: enter a where value.`;
      }
    }
    if (agg.type !== "subgroup_by" && agg.type !== "count" && !agg.valueColumn) {
      fieldErrors[`agg.${agg.id}.valueColumn`] = "Choose a value column.";
      if (!message) message = `${label}: choose a value column.`;
    }
    if (agg.type === "weighted_average" && !agg.weightColumn) {
      fieldErrors[`agg.${agg.id}.weightColumn`] = "Choose a weight column.";
      if (!message) message = `${label}: choose a weight column.`;
    }
    if (agg.type === "product_ratio") {
      if (!agg.weightColumn) {
        fieldErrors[`agg.${agg.id}.weightColumn`] = "Choose a multiplier column.";
        if (!message) message = `${label}: choose a multiplier column.`;
      }
      if (!agg.denominatorColumn) {
        fieldErrors[`agg.${agg.id}.denominatorColumn`] = "Choose a denominator aggregation.";
        if (!message) message = `${label}: choose a denominator aggregation.`;
      }
    }
  });
  const ok = Object.keys(fieldErrors).length === 0 && aggregations.length > 0;
  return { ok, message: ok ? "" : message || "Finish configuring each bucket aggregation.", fieldErrors };
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
