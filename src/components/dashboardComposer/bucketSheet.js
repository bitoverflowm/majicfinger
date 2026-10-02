import { aggregateBucketRows } from "@/lib/sheetOperations/aggregateBucketRows";
import { niceBucketSize } from "@/lib/sheetOperations/niceBucketSize";

export const BUCKET_METRICS = [
  { id: "count", title: "Count" },
  { id: "sum", title: "Sum" },
  { id: "average", title: "Average" },
  { id: "min", title: "Min" },
  { id: "max", title: "Max" },
];

export function bucketModesForColumn(column) {
  if (column?.type === "date") return ["time", "category"];
  if (column?.type === "number") return ["number", "category"];
  return ["category"];
}

export function defaultBucketMode(column) {
  return bucketModesForColumn(column)[0] || "category";
}

export function suggestedNumericBucketSize(rows, columnId) {
  const values = [];
  for (const row of rows || []) {
    const n = Number(row?.[columnId]);
    if (Number.isFinite(n)) values.push(n);
  }
  if (values.length < 2) return 1;
  const span = Math.max(...values) - Math.min(...values);
  if (span <= 0) return 1;
  return niceBucketSize(span / 8);
}

const METRIC_TITLE = {
  count: "Count",
  sum: "Sum",
  average: "Average",
  min: "Min",
  max: "Max",
};

/**
 * Collapse rows into a bucket sheet. Column ids match the source row keys.
 * Category keeps each distinct value. Number uses a fixed range width.
 * Time rolls dates into an interval.
 */
export function buildBucketGrid({
  columns,
  rows,
  bucketColumnId,
  mode,
  timeInterval,
  numericBucketSize,
  groupByIds,
  metric,
  valueColumnId,
}) {
  const byId = new Map((columns || []).map((column) => [column.id, column]));
  const bucketColumn = byId.get(bucketColumnId);
  if (!bucketColumn) return { columns: [], rows: [], ready: false };
  const metricType = METRIC_TITLE[metric] ? metric : "count";
  const needsValue = metricType !== "count";
  const valueColumn = needsValue ? byId.get(valueColumnId) : null;
  if (needsValue && !valueColumn) return { columns: [], rows: [], ready: false };

  const bucketMode = bucketModesForColumn(bucketColumn).includes(mode) ? mode : defaultBucketMode(bucketColumn);
  const groupCols = (groupByIds || []).filter((id) => id && id !== bucketColumnId && byId.has(id));
  const metricId = metricType === "count" ? "count" : "metric";
  const size = Number(numericBucketSize);
  const aggregated = aggregateBucketRows(rows || [], {
    bucketColumn: bucketColumnId,
    bucketOutputColumn: "bucket",
    bucketMode,
    timeInterval: timeInterval || "day",
    numericBucketSize: Number.isFinite(size) && size > 0 ? size : 1,
    groupByColumns: groupCols,
    aggregations: [
      {
        type: metricType,
        valueColumn: valueColumn?.id || "",
        outputColumn: metricId,
      },
    ],
  });

  const gridColumns = [
    {
      id: "bucket",
      title: bucketColumn.title,
      type: bucketMode === "category" ? bucketColumn.type : "text",
      ...(bucketMode === "category" && bucketColumn.scale ? { scale: bucketColumn.scale } : {}),
    },
    ...groupCols.map((id) => byId.get(id)),
    {
      id: metricId,
      title: metricType === "count" ? "Count" : `${METRIC_TITLE[metricType]} of ${valueColumn.title}`,
      type: "number",
      ...(valueColumn?.scale ? { scale: valueColumn.scale } : {}),
    },
  ];
  return { columns: gridColumns, rows: aggregated, ready: true, metricId };
}
