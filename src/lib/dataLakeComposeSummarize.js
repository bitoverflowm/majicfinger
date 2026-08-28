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

/** SQL/output alias must match Athena identifier rules. */
export function sanitizeComposeAlias(raw, fallback = "col") {
  let s = String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (!s) s = String(fallback || "col");
  if (!/^[a-zA-Z_]/.test(s)) s = `c_${s}`;
  return s.slice(0, 64);
}

/**
 * Default output alias for a summarize metric (unique among existing aliases).
 * @param {string} column
 * @param {string | null | undefined} aggregate rollup id (sum, max, …) or "equation"
 * @param {Iterable<string>} [existingAliases]
 */
export function suggestSummarizeAlias(column, aggregate, existingAliases = []) {
  const col = sanitizeComposeAlias(column, "col");
  const agg = String(aggregate || "").trim().toLowerCase();
  const suffix =
    !agg || agg === "none"
      ? ""
      : agg === "equation"
        ? "equation"
        : agg === "count_distinct"
          ? "count_distinct"
          : agg;
  const base = suffix ? `${col}_${suffix}` : col;
  const taken = new Set(
    [...existingAliases].map((a) => String(a || "").trim()).filter(Boolean),
  );
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

/**
 * Whether alias still looks like an auto-generated summarize name for this column/agg.
 * @param {string} alias
 * @param {string} column
 * @param {string | null | undefined} aggregate
 */
export function isAutoSummarizeAlias(alias, column, aggregate) {
  const a = String(alias || "").trim();
  if (!a) return true;
  const expected = suggestSummarizeAlias(column, aggregate, []);
  if (a === expected) return true;
  const re = new RegExp(`^${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_\\d+$`);
  return re.test(a);
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

/**
 * Default rollup when adding a summarize metric for a column kind.
 * @param {"number" | "string" | "date" | "boolean" | string} kind
 */
export function defaultSummarizeRollupForKind(kind) {
  return kind === "number" ? "sum" : "count";
}

/**
 * Merge selected pull columns into compose items while preserving extra aggregate
 * rows that share a source column (e.g. SUM(volume) + MAX(volume)).
 *
 * @param {object[]} prevRows
 * @param {string[]} selectedColumns
 * @param {(col: string) => object} createBaseRow
 */
export function syncComposeItemsWithSelectedColumns(prevRows, selectedColumns, createBaseRow) {
  const cols = Array.isArray(selectedColumns) ? selectedColumns.filter(Boolean) : [];
  const selected = new Set(cols);
  const prev = Array.isArray(prevRows) ? prevRows : [];

  const kept = prev.filter((row) => {
    const col = String(row?.column || "").trim();
    if (row?.pullExcluded) return true;
    return selected.has(col);
  });
  const next = [...kept];
  const hasAgg = next.some((r) => r?.aggregate != null);
  for (const col of cols) {
    if (next.some((row) => String(row?.column || "").trim() === col)) continue;
    const hadAnyRow = prev.some((row) => String(row?.column || "").trim() === col);
    // Summarize mode: do not resurrect plain dimension rows dropped for one summary row.
    if (hasAgg && hadAnyRow) continue;
    next.push(createBaseRow(col));
  }

  if (next.length === prev.length && next.every((row, i) => row === prev[i])) {
    return prev;
  }
  return next;
}
