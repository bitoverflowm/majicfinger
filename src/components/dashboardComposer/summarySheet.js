import { evaluateCellFormula } from "@/lib/columnFormula";

export const SUMMARY_COLUMNS = [
  { id: "label", title: "Label", type: "text" },
  { id: "value", title: "Value", type: "text" },
];

export const SUMMARY_ROW_COUNT = 8;

export function summaryCellKey(columnId, row) {
  return `${columnId}:${row}`;
}

/** Turn `= SUM(Size)` into "Sum of Size". Incomplete equations still get a name. */
export function describeSummaryFormula(formula) {
  const body = String(formula || "")
    .trim()
    .replace(/^=\s*/, "")
    .trim();
  if (!body) return "";
  const call = body.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*?)\)?\s*$/);
  if (!call) return "";
  const name = call[1].toLowerCase();
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  const args = call[2]
    .replace(/\)\s*$/, "")
    .split(",")
    .map((part) => {
      const text = part.trim().replace(/\[(\d+)\]/g, " row $1").replace(/\s+/g, " ").trim();
      const cross = text.match(/^(?:'([^']+)'|([^!]+))!(.+)$/);
      if (!cross) return text;
      const sheet = (cross[1] || cross[2] || "").trim();
      const column = cross[3].trim();
      return column && sheet ? `${column} on ${sheet}` : text;
    })
    .filter(Boolean);
  return args.length ? `${title} of ${args.join(", ")}` : title;
}

export function summaryLabelIsAutomatic(label, formula) {
  const text = String(label || "").trim();
  if (!text || text.startsWith("=")) return true;
  return text === describeSummaryFormula(formula);
}

/**
 * Labels stay text. An equation typed in either column is stored on Value,
 * and Label gets a descriptor when the user has not written their own.
 * @returns {{ cells: object, columnId: "label" | "value" }}
 */
export function assignSummaryInput(cells, row, columnId, input) {
  const current = cells || {};
  const labelKey = summaryCellKey("label", row);
  const valueKey = summaryCellKey("value", row);
  const label = current[labelKey] || "";
  const value = current[valueKey] || "";
  const text = String(input ?? "");
  const equation = text.trim().startsWith("=");
  if (columnId === "label" && !equation) {
    return { cells: { ...current, [labelKey]: text }, columnId: "label" };
  }
  const formula = columnId === "label" ? text : text;
  const automatic = summaryLabelIsAutomatic(label, value);
  let nextLabel = label;
  if (automatic) {
    if (!formula.trim()) nextLabel = "";
    else if (equation || columnId === "value") {
      const described = describeSummaryFormula(formula);
      if (described) nextLabel = described;
      else if (!equation) nextLabel = "";
    }
  }
  if (columnId === "label" && String(label).trim().startsWith("=")) nextLabel = describeSummaryFormula(formula) || nextLabel;
  return {
    cells: { ...current, [valueKey]: formula, [labelKey]: nextLabel },
    columnId: "value",
  };
}

/** Move an equation that was stored in Label over to Value. */
export function settleSummaryCells(cells) {
  const source = cells || {};
  let next = source;
  for (let row = 0; row < SUMMARY_ROW_COUNT; row += 1) {
    const label = source[summaryCellKey("label", row)] || "";
    if (!String(label).trim().startsWith("=")) continue;
    const assigned = assignSummaryInput(next, row, "label", label);
    next = assigned.cells;
  }
  return next;
}

export function formatSummaryValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (Math.abs(value) >= 1000) {
      return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    }
    return String(Math.round(value * 10000) / 10000);
  }
  return String(value);
}

export function buildSummaryGrid({ cells, columns, rows, sheets, focus }) {
  const settled = settleSummaryCells(cells);
  const focusKey = focus ? summaryCellKey(focus.columnId, focus.row) : "";
  let error = "";
  let references = [];
  const gridRows = Array.from({ length: SUMMARY_ROW_COUNT }, (_, rowIndex) => {
    const record = {};
    for (const column of SUMMARY_COLUMNS) {
      const key = summaryCellKey(column.id, rowIndex);
      const formula = settled?.[key] || "";
      if (column.id === "label") {
        record[column.id] = formula.trim().startsWith("=") ? describeSummaryFormula(formula) : formula;
      } else {
        const result = evaluateCellFormula(formula, { columns, rows, sheets, sheetId: "markets" });
        record[column.id] = formula.trim().startsWith("=") ? formatSummaryValue(result.value) : formula;
        if (key === focusKey) {
          error = result.error || "";
          references = result.references || [];
        }
      }
      if (column.id === "label" && key === focusKey) {
        error = "";
        references = [];
      }
    }
    return record;
  });
  return { columns: SUMMARY_COLUMNS, rows: gridRows, error, references };
}

export function summaryExamples(columns, preferred) {
  const titles = new Set((columns || []).map((column) => column.title));
  const measure =
    (preferred && titles.has(preferred) ? preferred : "") ||
    (columns || []).find((column) => column.type === "number" && column.id !== "__function")?.title ||
    preferred ||
    "Size";
  return [`= SUM(${measure})`, `= AVERAGE(${measure})`, `= MIN(${measure})`, `= MAX(${measure})`];
}
