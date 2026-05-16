/**
 * Shared summarize / rollup helpers for DataLake compose (panel + Connect home).
 */

/** @param {{ aggregate: null | string; equation?: { enabled?: boolean }; sumCase?: { enabled?: boolean } }} item */
export function composeRollUpSelectValue(item) {
  if (item.aggregate === "sum" && item.equation?.enabled) return "equation";
  if (!item.aggregate && item.sumCase?.enabled) return "if_else_case";
  return item.aggregate || "none";
}

/** @param {{ dateBucket: null | string; dateFormat: null | string }} item */
export function composeDateShapeSelectValue(item) {
  if (item.dateBucket) return `bucket:${item.dateBucket}`;
  if (item.dateFormat === "dmy") return "fmt:dmy";
  if (item.dateFormat === "ym") return "fmt:ym";
  if (item.dateFormat === "dm") return "fmt:dm";
  return "raw";
}

/** @param {string} shape @deprecated use patchesForBucket / patchesForFormat */
export function patchesForDateShape(shape) {
  if (shape === "raw") return { dateBucket: null, dateFormat: "raw", stringBucket: null, numberBucket: null };
  if (shape.startsWith("bucket:")) {
    return {
      dateBucket: shape.slice(7),
      dateFormat: null,
      stringBucket: null,
      numberBucket: null,
      treatAsDate: true,
    };
  }
  if (shape.startsWith("fmt:")) {
    return {
      dateBucket: null,
      dateFormat: shape.slice(4),
      stringBucket: null,
      numberBucket: null,
      treatAsDate: true,
    };
  }
  return {};
}

/**
 * Rollup operations available for a column kind (Connect Where-style summarize rows).
 * @param {"number" | "string" | "date" | "boolean" | string} kind
 * @param {{ isDemo?: boolean }} [opts]
 */
export function getSummarizeRollupOptions(kind, { isDemo = false } = {}) {
  const isNumeric = kind === "number";
  const universal = [
    { value: "none", label: "Show values (no total)" },
    { value: "count", label: "Count (non-empty)" },
    { value: "count_distinct", label: "Count distinct" },
  ];
  const numericOnly = [
    { value: "sum", label: "Sum numbers" },
    { value: "avg", label: "Average" },
    { value: "min", label: "Min" },
    { value: "max", label: "Max" },
    { value: "median", label: "Median (approx)" },
    { value: "stddev", label: "Stddev (volatility)" },
    { value: "variance", label: "Variance" },
  ];
  const advanced = [{ value: "equation", label: "Equation (SUM of expression)", demoGated: true }];

  const opts = [...universal];
  if (isNumeric) opts.push(...numericOnly, ...advanced);

  return opts.map((o) => ({
    ...o,
    disabled: !!o.demoGated && isDemo,
  }));
}

/** Human-readable label for rollup select value. */
export function summarizeRollupLabel(value) {
  const found = getSummarizeRollupOptions("number").find((o) => o.value === value);
  if (found) return found.label;
  const universal = getSummarizeRollupOptions("string").find((o) => o.value === value);
  return universal?.label || value;
}

/**
 * @param {object} item compose row
 * @param {string} v rollup select value
 * @param {{ availableColumns: string[]; numericColumns: string[]; kindForColumn: (c: string) => string }} ctx
 */
export function buildSummarizeRollupPatch(item, v, { availableColumns, numericColumns, kindForColumn }) {
  if (v === "none") {
    return {
      aggregate: null,
      sumCase: { enabled: false, branches: [], elseColumn: "" },
      equation: { enabled: false },
      dateBucket: null,
      dateFormat: null,
      stringBucket: null,
      numberBucket: null,
    };
  }
  if (v === "equation") {
    const base = String(item.column || "").trim();
    return {
      aggregate: "sum",
      dateBucket: null,
      dateFormat: null,
      sumCase: { enabled: false, branches: [], elseColumn: "" },
      equation: {
        enabled: true,
        agg: "sum",
        root: { type: "col", name: base || numericColumns[0] || "" },
      },
    };
  }
  if (v === "if_else_case") {
    const firstStr = availableColumns.find((c) => kindForColumn(c) === "string") || availableColumns[0] || "";
    const n0 = numericColumns[0] || availableColumns[0] || "";
    const n1 = numericColumns[1] || n0;
    return {
      aggregate: null,
      dateBucket: null,
      dateFormat: null,
      equation: { enabled: false },
      sumCase: {
        enabled: true,
        branches: [{ when: { column: firstStr, op: "eq", value: "" }, thenColumn: n0 }],
        elseColumn: n1,
      },
    };
  }
  return {
    aggregate: v,
    dateBucket: null,
    dateFormat: null,
    stringBucket: null,
    numberBucket: null,
    ...(v !== "sum" ? { sumCase: { enabled: false, branches: [], elseColumn: "" } } : {}),
    equation: { enabled: false },
  };
}
