import { defaultDateFormatForBucket } from "@/lib/composeDateDisplay";

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

/**
 * Row is a GROUP BY dimension when summarizing (bucket, unique values, CASE column).
 * @param {object} row
 */
export function isComposeGroupByKeyRow(row) {
  if (!row || row.aggregate != null) return false;
  if (hasColumnGrouping(row)) return true;
  if (row.sumCase?.enabled) return true;
  return false;
}

/** Any column uses an explicit bucket / unique-value grouping. */
export function hasExplicitComposeGrouping(items) {
  return (items || []).some(isComposeGroupByKeyRow);
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
    return rows.filter((r) => r.aggregate == null).map(composeRowAlias);
  }
  return [];
}

/**
 * When any column uses an explicit bucket, only group-key + aggregate columns go to SELECT.
 * @param {object[]} items
 */
export function selectRowsForAggregatedCompose(items) {
  const rows = items || [];
  if (!hasExplicitComposeGrouping(rows)) {
    return rows;
  }
  return rows.filter((r) => r.aggregate != null || isComposeGroupByKeyRow(r));
}

/** True when the pull will GROUP BY (bucket and/or summarize). */
export function composePullCollapsesRows(items) {
  const rows = items || [];
  return rows.some((r) => r.aggregate != null) || hasExplicitComposeGrouping(rows);
}
