import { temporalToMs } from "@/lib/temporalParse";
import { BUCKET_TIME_INTERVALS } from "@/lib/sheetOperations/bucketTimeIntervals";

function parseCellFiniteForStat(row, colKey) {
  if (!row || typeof row !== "object") return null;
  const v = row[colKey];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? Number(String(v).trim()) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function bucketKeyForValue(value) {
  if (value == null || value === "") return "(empty)";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "(empty)" : value.toISOString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function formatBucketNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6)));
}

function timeBucketStartMs(ms, intervalValue) {
  const opt = BUCKET_TIME_INTERVALS.find((item) => item.value === intervalValue) || BUCKET_TIME_INTERVALS[4];
  if (!Number.isFinite(ms)) return NaN;
  if (opt.calendar === "year") return Date.UTC(new Date(ms).getUTCFullYear(), 0, 1);
  if (opt.calendar === "month") {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  }
  const step = Number(opt.ms);
  if (!Number.isFinite(step) || step <= 0) return NaN;
  if (opt.value === "week") {
    const dayStart = Math.floor(ms / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
    const dayOfWeek = new Date(dayStart).getUTCDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    return dayStart - daysSinceMonday * 24 * 60 * 60 * 1000;
  }
  return Math.floor(ms / step) * step;
}

function formatTimeBucketLabel(ms, intervalValue) {
  if (!Number.isFinite(ms)) return "(invalid time)";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "(invalid time)";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const sec = String(d.getUTCSeconds()).padStart(2, "0");
  if (intervalValue === "year") return String(yyyy);
  if (intervalValue === "month") return `${yyyy}-${mm}`;
  if (intervalValue === "day" || intervalValue === "week") return `${yyyy}-${mm}-${dd}`;
  if (intervalValue === "hour") return `${yyyy}-${mm}-${dd} ${hh}:00`;
  if (intervalValue === "minute" || intervalValue === "15_minutes") return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
}

function rawMathValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const n = Number(text);
  return Number.isFinite(n) ? n : text;
}

function compareMathValues(left, operator, right) {
  const op = String(operator || "=");
  if (op === "is_empty") return left == null || left === "";
  if (op === "is_not_empty") return left != null && left !== "";
  if (op === "contains" || op === "not_contains") {
    const hit = String(left ?? "").toLowerCase().includes(String(right ?? "").toLowerCase());
    return op === "not_contains" ? !hit : hit;
  }
  const leftNum = Number(left);
  const rightNum = Number(right);
  const numeric = Number.isFinite(leftNum) && Number.isFinite(rightNum);
  const a = numeric ? leftNum : String(left ?? "").toLowerCase();
  const b = numeric ? rightNum : String(right ?? "").toLowerCase();
  if (op === "=" || op === "eq") return a === b;
  if (op === "!=" || op === "ne") return a !== b;
  if (op === ">" || op === "gt") return numeric ? a > b : String(a).localeCompare(String(b)) > 0;
  if (op === ">=" || op === "gte") return numeric ? a >= b : String(a).localeCompare(String(b)) >= 0;
  if (op === "<" || op === "lt") return numeric ? a < b : String(a).localeCompare(String(b)) < 0;
  if (op === "<=" || op === "lte") return numeric ? a <= b : String(a).localeCompare(String(b)) <= 0;
  return false;
}

function getBucketForRow(row, config) {
  const bucketColumn = String(config?.bucketColumn || "").trim();
  const raw = row?.[bucketColumn];
  const mode = String(config?.bucketMode || "category");
  if (mode === "time") {
    const ms = temporalToMs(raw);
    const startMs = timeBucketStartMs(ms, config?.timeInterval || "day");
    const label = formatTimeBucketLabel(startMs, config?.timeInterval || "day");
    return { key: `time:${startMs}`, label, sortValue: Number.isFinite(startMs) ? startMs : Number.POSITIVE_INFINITY };
  }
  if (mode === "number") {
    const n = Number(raw);
    if (!Number.isFinite(n)) return { key: "number:(empty)", label: "(empty)", sortValue: Number.POSITIVE_INFINITY };
    const size = Number(config?.numericBucketSize);
    const step = Number.isFinite(size) && size > 0 ? size : 1;
    const start = Math.floor(n / step) * step;
    const end = start + step;
    return {
      key: `number:${start}`,
      label: `${formatBucketNumber(start)}-${formatBucketNumber(end)}`,
      sortValue: start,
    };
  }
  const key = bucketKeyForValue(raw);
  return { key: `category:${key}`, label: raw ?? "", sortValue: key };
}

function rowMatchesAggregationFilter(row, agg) {
  if (!agg?.filterEnabled) return true;
  const column = String(agg.filterColumn || "").trim();
  const operator = String(agg.filterOperator || "=");
  if (!column || !operator) return true;
  const valueNeeded = !["is_empty", "is_not_empty"].includes(operator);
  if (valueNeeded && String(agg.filterValue ?? "").trim() === "") return true;
  return compareMathValues(row?.[column], operator, rawMathValue(agg.filterValue));
}

/**
 * Aggregate rows into bucket groups (time, number, or category).
 * @param {object[]} rows
 * @param {object} config
 * @returns {object[]}
 */
export function aggregateBucketRows(rows, config) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const bucketColumn = String(config?.bucketColumn || "").trim();
  const bucketOutputColumn = String(config?.bucketOutputColumn || bucketColumn || "bucket").trim();
  const passthroughColumns = Array.isArray(config?.passthroughColumns)
    ? config.passthroughColumns.filter(Boolean)
    : [];
  const aggregations = Array.isArray(config?.aggregations)
    ? config.aggregations.filter((agg) => agg && typeof agg === "object")
    : [];
  if (!bucketColumn || !bucketOutputColumn) return [];

  const groups = new Map();
  for (const row of sourceRows) {
    if (!row || typeof row !== "object") continue;
    const bucket = getBucketForRow(row, config);
    if (!groups.has(bucket.key)) {
      groups.set(bucket.key, {
        key: bucket.key,
        rawBucket: bucket.label,
        sortValue: bucket.sortValue,
        firstRow: row,
        rows: [],
      });
    }
    groups.get(bucket.key).rows.push(row);
  }

  return Array.from(groups.values())
    .sort((a, b) => {
      const av = a.sortValue;
      const bv = b.sortValue;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av ?? "").localeCompare(String(bv ?? ""));
    })
    .flatMap((group) =>
      buildBucketOutputRows({
        bucketOutputColumn,
        bucketColumn,
        passthroughColumns,
        aggregations,
        rawBucket: group.rawBucket ?? "",
        rows: group.rows,
        firstRow: group.firstRow,
      }),
    );
}

function subgroupLabelForValue(raw) {
  if (raw == null || raw === "") return "(empty)";
  return raw;
}

function expandGroupsBySubgroup(leafGroups, agg) {
  const col = String(agg.valueColumn || "").trim();
  const outCol = String(agg.outputColumn || col).trim();
  if (!col || !outCol) return leafGroups;

  const next = [];
  for (const group of leafGroups) {
    const subMap = new Map();
    for (const row of group.rows) {
      const label = subgroupLabelForValue(row?.[col]);
      const key = bucketKeyForValue(row?.[col]);
      if (!subMap.has(key)) {
        subMap.set(key, {
          dimensions: { ...group.dimensions, [outCol]: label },
          rows: [],
        });
      }
      subMap.get(key).rows.push(row);
    }
    next.push(...Array.from(subMap.values()));
  }
  return next.length ? next : leafGroups;
}

function computeMetricValue(rowsForAgg, agg, dimensions) {
  const type = String(agg.type || "count");
  const valueColumn = String(agg.valueColumn || "").trim();
  const weightColumn = String(agg.weightColumn || "").trim();
  const denominatorColumn = String(agg.denominatorColumn || "").trim();

  if (type === "count") {
    return valueColumn
      ? rowsForAgg.reduce(
          (count, row) => (row?.[valueColumn] == null || row?.[valueColumn] === "" ? count : count + 1),
          0,
        )
      : rowsForAgg.length;
  }

  let sum = 0;
  let count = 0;
  let weightedSum = 0;
  let weightSum = 0;
  let productSum = 0;
  let productCount = 0;
  for (const row of rowsForAgg) {
    const value = parseCellFiniteForStat(row, valueColumn);
    if (value == null) continue;
    if (type === "sum" || type === "average") {
      sum += value;
      count += 1;
    } else if (type === "weighted_average") {
      const weight = parseCellFiniteForStat(row, weightColumn);
      if (weight == null) continue;
      weightedSum += value * weight;
      weightSum += weight;
    } else if (type === "product_ratio") {
      const weight = parseCellFiniteForStat(row, weightColumn);
      if (weight == null) continue;
      productSum += value * weight;
      productCount += 1;
    }
  }
  if (type === "sum") return count > 0 ? sum : null;
  if (type === "average") return count > 0 ? sum / count : null;
  if (type === "weighted_average") return weightSum !== 0 ? weightedSum / weightSum : null;
  if (type === "product_ratio") {
    const denom = Number(dimensions?.[denominatorColumn]);
    return productCount > 0 && Number.isFinite(denom) && denom !== 0 ? productSum / denom : null;
  }
  return null;
}

function buildBucketOutputRows({
  bucketOutputColumn,
  bucketColumn,
  passthroughColumns,
  aggregations,
  rawBucket,
  rows,
  firstRow,
}) {
  let leafGroups = [{
    dimensions: { [bucketOutputColumn]: rawBucket },
    rows,
  }];

  for (const col of passthroughColumns) {
    if (!col || col === bucketColumn || col === bucketOutputColumn || col === "_origIndex") continue;
    leafGroups[0].dimensions[col] = firstRow?.[col] ?? null;
  }

  for (const agg of aggregations) {
    const type = String(agg.type || "count");
    if (type === "subgroup_by") {
      leafGroups = expandGroupsBySubgroup(leafGroups, agg);
      continue;
    }

    const outputColumn = String(agg.outputColumn || "").trim();
    if (!outputColumn) continue;

    leafGroups = leafGroups.map((group) => {
      const rowsForAgg = group.rows.filter((row) => rowMatchesAggregationFilter(row, agg));
      return {
        ...group,
        dimensions: {
          ...group.dimensions,
          [outputColumn]: computeMetricValue(rowsForAgg, agg, group.dimensions),
        },
      };
    });
  }

  return leafGroups.map((group) => group.dimensions);
}
