import { evaluateCellFormula } from "@/lib/columnFormula";

export const SUMMARY_COLUMNS = [
  { id: "label", title: "Label", type: "text" },
  { id: "value", title: "Value", type: "text" },
];

export const SUMMARY_ROW_COUNT = 8;

export function summaryCellKey(columnId, row) {
  return `${columnId}:${row}`;
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
  const focusKey = focus ? summaryCellKey(focus.columnId, focus.row) : "";
  let error = "";
  let references = [];
  const gridRows = Array.from({ length: SUMMARY_ROW_COUNT }, (_, rowIndex) => {
    const record = {};
    for (const column of SUMMARY_COLUMNS) {
      const key = summaryCellKey(column.id, rowIndex);
      const formula = cells?.[key] || "";
      const result = evaluateCellFormula(formula, { columns, rows, sheets, sheetId: "markets" });
      record[column.id] = formula.trim().startsWith("=") ? formatSummaryValue(result.value) : formula;
      if (key === focusKey) {
        error = result.error || "";
        references = result.references || [];
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
