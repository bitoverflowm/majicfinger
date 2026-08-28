import { genComposeRowId } from "@/lib/dataLakeComposeHelpers";

/**
 * Column bucket (GROUP BY dimension) and format (display) options for compose pulls.
 */

/** @typedef {"hour" | "day" | "week" | "month" | "quarter" | "year"} DateTimeBucketUnit */
/** @typedef {"raw" | "iso" | "dmy" | "ym" | "dm" | "hm"} DateTimeFormat */

export const DATETIME_BUCKET_UNITS = ["hour", "day", "week", "month", "quarter", "year"];

export const DATETIME_FORMATS = ["raw", "iso", "dmy", "ym", "dm", "hm"];

/** Preset widths for numeric binning (GROUP BY floor(col/width)*width). */
export const NUMBER_BUCKET_WIDTHS = [0.01, 0.1, 1, 10, 100, 1000, 10000];

const DATETIME_BUCKET_LABELS = {
  hour: "By hour",
  day: "By day",
  week: "By week",
  month: "By month",
  quarter: "By quarter",
  year: "By year",
};

const DATETIME_FORMAT_LABELS = {
  raw: "As stored (epoch)",
  iso: "ISO date-time",
  dmy: "Day-month-year",
  ym: "Year-month",
  dm: "Day-month",
  hm: "Hour:minute",
};

const STRING_BUCKET_LABELS = {
  none: "No grouping",
  distinct: "Unique values",
};

const NUMBER_BUCKET_LABELS = {
  none: "No grouping",
};

export function datetimeBucketLabel(unit) {
  return DATETIME_BUCKET_LABELS[unit] || unit;
}

export function datetimeFormatLabel(fmt) {
  return DATETIME_FORMAT_LABELS[fmt] || fmt;
}

export function numberBucketLabel(width) {
  if (width == null) return "No grouping";
  return `Bins of ${width}`;
}

/** @param {object} item compose row */
export function composeBucketSelectValue(item, kind) {
  if (kind === "date" || item.treatAsDate) {
    return item.dateBucket ? `dt:${item.dateBucket}` : "none";
  }
  if (kind === "number") {
    const w = item.numberBucket;
    return w != null && w !== "" ? `num:${w}` : "none";
  }
  if (kind === "string" || kind === "boolean") {
    return item.stringBucket === "distinct" ? "str:distinct" : "none";
  }
  return "none";
}

/** @param {object} item compose row */
export function composeFormatSelectValue(item) {
  if (item.dateFormat) return `fmt:${item.dateFormat}`;
  if (item.treatAsDate && !item.dateBucket) return "fmt:raw";
  if (item.treatAsDate && item.dateBucket) {
    const autoFmt = defaultDateFormatForBucket(item.dateBucket);
    return autoFmt ? `fmt:${autoFmt}` : "fmt:auto";
  }
  return "fmt:none";
}

/** @param {string} value bucket select value */
export function patchesForBucket(value, kind) {
  if (value === "none" || !value) {
    return { dateBucket: null, dateFormat: null, stringBucket: null, numberBucket: null };
  }
  if (value.startsWith("dt:")) {
    const unit = value.slice(3);
    return {
      dateBucket: unit,
      stringBucket: null,
      numberBucket: null,
      treatAsDate: true,
    };
  }
  if (value.startsWith("num:")) {
    const width = Number(value.slice(4));
    return {
      dateBucket: null,
      stringBucket: null,
      numberBucket: Number.isFinite(width) && width > 0 ? width : null,
    };
  }
  if (value === "str:distinct") {
    return { dateBucket: null, stringBucket: "distinct", numberBucket: null };
  }
  return {};
}

/** @param {string} value format select value */
export function patchesForFormat(value) {
  if (!value || value === "fmt:none") {
    return { dateFormat: null };
  }
  if (value === "fmt:auto") {
    return { dateFormat: null };
  }
  if (value === "fmt:raw") {
    return { dateFormat: "raw" };
  }
  if (value.startsWith("fmt:")) {
    return { dateFormat: value.slice(4) };
  }
  return { dateFormat: null };
}

/**
 * @param {"number" | "string" | "date" | "boolean" | string} kind
 * @param {{ compact?: boolean }} [opts]
 */
export function getBucketOptionsForKind(kind, opts = {}) {
  const isDate = kind === "date";
  const isNum = kind === "number";
  const isStr = kind === "string" || kind === "boolean";

  const options = [{ value: "none", label: "No grouping" }];

  if (isDate) {
    for (const unit of DATETIME_BUCKET_UNITS) {
      options.push({ value: `dt:${unit}`, label: datetimeBucketLabel(unit) });
    }
  }
  if (isNum) {
    for (const w of NUMBER_BUCKET_WIDTHS) {
      options.push({ value: `num:${w}`, label: numberBucketLabel(w) });
    }
  }
  if (isStr) {
    options.push({ value: "str:distinct", label: STRING_BUCKET_LABELS.distinct });
  }

  return options;
}

/** Format dropdown options (date/time columns only). */
export function getFormatOptionsForKind(kind) {
  if (kind !== "date") return [];
  return [
    { value: "fmt:raw", label: DATETIME_FORMAT_LABELS.raw },
    { value: "fmt:iso", label: DATETIME_FORMAT_LABELS.iso },
    { value: "fmt:hm", label: DATETIME_FORMAT_LABELS.hm },
    { value: "fmt:dmy", label: DATETIME_FORMAT_LABELS.dmy },
    { value: "fmt:ym", label: DATETIME_FORMAT_LABELS.ym },
    { value: "fmt:dm", label: DATETIME_FORMAT_LABELS.dm },
  ];
}

export function bucketShortLabel(value, kind) {
  const opt = getBucketOptionsForKind(kind).find((o) => o.value === value);
  return opt?.label?.replace(/^By /, "")?.replace(/^Bins of /, "÷") || "—";
}

export function formatShortLabel(value) {
  if (value === "fmt:none") return "—";
  if (value === "fmt:auto") return "Auto";
  const opt = getFormatOptionsForKind("date").find((o) => o.value === value);
  if (opt?.label?.includes("epoch")) return "Raw";
  if (opt?.label?.includes("ISO")) return "ISO";
  if (opt?.label?.includes("Hour")) return "H:M";
  if (opt?.label?.includes("Match bucket")) return "Auto";
  if (value === "fmt:dmy") return "D-M-Y";
  if (value === "fmt:ym") return "Y-M";
  if (value === "fmt:dm") return "D-M";
  return "Fmt";
}

/** Whether this compose row applies a GROUP BY dimension transform. */
export function hasColumnGrouping(item) {
  if (!item || item.aggregate) return false;
  if (item.dateBucket) return true;
  if (item.stringBucket === "distinct") return true;
  if (item.numberBucket != null && item.numberBucket !== "") return true;
  return false;
}

export function composeRowAlias(row) {
  return String(row?.alias || row?.column || "").trim();
}

/** Row kept for WHERE/HAVING/join refs only — not SELECT output or GROUP BY. */
export function isComposePullExcludedRow(row) {
  return row?.pullExcluded === true;
}

/**
 * Row is a GROUP BY dimension when summarizing (bucket, unique values, CASE column).
 * @param {object} row
 */
export function isComposeGroupByKeyRow(row) {
  if (!row || row.aggregate != null || isComposePullExcludedRow(row)) return false;
  if (hasColumnGrouping(row)) return true;
  if (row.sumCase?.enabled) return true;
  return false;
}

/** Any column uses an explicit bucket / unique-value grouping. */
export function hasExplicitComposeGrouping(items) {
  return (items || []).some(isComposeGroupByKeyRow);
}

/**
 * Pull columns that would silently become GROUP BY keys when summarizing
 * without an explicit Bucket / Unique values grouping.
 * @param {object[]} items
 * @returns {string[]}
 */
export function getUnsummarizedDimensionColumns(items) {
  const rows = items || [];
  const hasAgg = rows.some((r) => r.aggregate != null);
  if (!hasAgg) return [];
  if (hasExplicitComposeGrouping(rows)) return [];

  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (r?.aggregate != null) continue;
    if (isComposePullExcludedRow(r)) continue;
    if (isComposeGroupByKeyRow(r)) continue;
    const col = String(r?.column || "").trim();
    if (!col || seen.has(col)) continue;
    seen.add(col);
    out.push(col);
  }
  return out;
}

/**
 * @param {string[]} columns
 * @param {(col: string) => string} [labelFn]
 * @param {{ maxNamed?: number }} [opts]
 */
export function formatAlsoSelectedColumnsLine(columns, labelFn, opts = {}) {
  const maxNamed = opts.maxNamed ?? 2;
  const labels = (columns || []).map((c) => (labelFn ? labelFn(c) : c)).filter(Boolean);
  if (!labels.length) return "";
  if (labels.length <= maxNamed) return `Also selected: ${labels.join(", ")}`;
  const head = labels.slice(0, maxNamed);
  const rest = labels.length - maxNamed;
  return `Also selected: ${head.join(", ")}, +${rest} more`;
}

/**
 * Keep only summarize metrics (and explicit group keys). Used by "Keep one summary row".
 * @param {object[]} items
 */
export function keepComposeItemsForOneSummaryRow(items) {
  return (items || []).filter(
    (r) => r?.aggregate != null || isComposeGroupByKeyRow(r) || isComposePullExcludedRow(r),
  );
}

/**
 * Columns referenced by compose ops other than plain SELECT output.
 * @param {{
 *   whereFilters?: object[];
 *   havingFilters?: object[];
 *   joins?: object[];
 *   orderBy?: object[];
 * }} refs
 */
export function collectReferencedComposeColumns(refs = {}) {
  const out = new Set();
  const add = (col) => {
    const c = String(col || "").trim();
    if (c) out.add(c);
  };
  for (const f of refs.whereFilters || []) add(f?.column);
  for (const f of refs.havingFilters || []) add(f?.havingAlias);
  for (const j of refs.joins || []) {
    add(j?.leftColumn);
    add(j?.rightColumn);
  }
  for (const o of refs.orderBy || []) add(o?.alias);
  return out;
}

/**
 * Compose row that keeps a column in the query (WHERE, etc.) without SELECT / GROUP BY.
 * @param {string} column
 * @param {{ treatAsDate?: boolean }} [opts]
 */
export function createPullExcludedComposeRow(column, opts = {}) {
  const col = String(column || "").trim();
  return {
    id: genComposeRowId(),
    column: col,
    alias: col,
    aggregate: null,
    pullExcluded: true,
    dateBucket: null,
    dateFormat: null,
    stringBucket: null,
    numberBucket: null,
    numberScale: "none",
    decimals: null,
    treatAsDate: opts.treatAsDate === true,
    sumCase: { enabled: false, branches: [], elseColumn: "" },
    equation: { enabled: false },
    displayName: null,
  };
}

/**
 * GROUP BY aliases for a compose pull.
 * When explicit grouping exists, only bucketed dimensions group — not every selected column.
 * @param {object[]} items
 */
export function resolveComposeGroupByAliases(items) {
  const rows = items || [];
  const hasAgg = rows.some((r) => r.aggregate != null);
  if (hasExplicitComposeGrouping(rows)) {
    return rows.filter(isComposeGroupByKeyRow).map(composeRowAlias);
  }
  if (hasAgg) {
    return rows
      .filter((r) => r.aggregate == null && !isComposePullExcludedRow(r))
      .map(composeRowAlias);
  }
  return [];
}

/**
 * When any column uses an explicit bucket, only group-key + aggregate columns go to SELECT.
 * @param {object[]} items
 */
export function selectRowsForAggregatedCompose(items) {
  const rows = items || [];
  const withoutRefs = rows.filter((r) => !isComposePullExcludedRow(r));
  if (!hasExplicitComposeGrouping(withoutRefs)) {
    return withoutRefs;
  }
  return withoutRefs.filter((r) => r.aggregate != null || isComposeGroupByKeyRow(r));
}

/** True when the pull will GROUP BY (bucket and/or summarize). */
export function composePullCollapsesRows(items) {
  const rows = items || [];
  return rows.some((r) => r.aggregate != null) || hasExplicitComposeGrouping(rows);
}

/**
 * Selected columns omitted from results when explicit GROUP BY is active (no bucket, no summarize).
 * @param {object[]} items
 * @returns {string[]} source column names
 */
export function composeColumnsDroppedByExplicitGrouping(items) {
  if (!hasExplicitComposeGrouping(items)) return [];
  return (items || [])
    .filter((r) => r.aggregate == null && !isComposeGroupByKeyRow(r))
    .map((r) => String(r.column || "").trim())
    .filter(Boolean);
}
