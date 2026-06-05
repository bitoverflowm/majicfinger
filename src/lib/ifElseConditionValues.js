/**
 * Parse a condition right-hand value. Supports JSON array strings like
 * '["Rain", "Wind", "Storm"]' or a single scalar.
 */
export function normalizeConditionRightValues(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "").trim()).filter((v) => v.length > 0);
  }
  const text = String(value ?? "").trim();
  if (!text) return [];
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const items = parsed.map((v) => String(v ?? "").trim()).filter((v) => v.length > 0);
        if (items.length) return items;
      }
    } catch {
      // fall through to single value
    }
  }
  return [text];
}

export function conditionRightValueIsValid(operator, rightKind, rightColumn, rightValue) {
  if (rightKind === "column") return Boolean(String(rightColumn || "").trim());
  if (["is_empty", "is_not_empty"].includes(String(operator || ""))) return true;
  return normalizeConditionRightValues(rightValue).length > 0;
}

/**
 * Compare a cell value against one or more condition values (case-insensitive for = and contains).
 */
export function compareConditionValues(left, operator, rightInput) {
  const op = String(operator || "=");
  if (op === "is_empty") return left == null || left === "";
  if (op === "is_not_empty") return left != null && left !== "";

  const values = normalizeConditionRightValues(rightInput);
  if (!values.length) return false;

  if (op === "contains") {
    const leftStr = String(left ?? "").toLowerCase();
    return values.some((v) => leftStr.includes(String(v).toLowerCase()));
  }
  if (op === "not_contains") {
    const leftStr = String(left ?? "").toLowerCase();
    return !values.some((v) => leftStr.includes(String(v).toLowerCase()));
  }
  if (op === "=" || op === "eq") {
    const leftStr = String(left ?? "").toLowerCase();
    return values.some((v) => leftStr === String(v).toLowerCase());
  }
  if (op === "!=" || op === "ne") {
    const leftStr = String(left ?? "").toLowerCase();
    return !values.some((v) => leftStr === String(v).toLowerCase());
  }

  const right = values[0];
  const leftNum = Number(left);
  const rightNum = Number(right);
  const numeric = Number.isFinite(leftNum) && Number.isFinite(rightNum);
  const a = numeric ? leftNum : String(left ?? "").toLowerCase();
  const b = numeric ? rightNum : String(right).toLowerCase();
  if (op === ">" || op === "gt") return numeric ? a > b : String(a).localeCompare(String(b)) > 0;
  if (op === ">=" || op === "gte") return numeric ? a >= b : String(a).localeCompare(String(b)) >= 0;
  if (op === "<" || op === "lt") return numeric ? a < b : String(a).localeCompare(String(b)) < 0;
  if (op === "<=" || op === "lte") return numeric ? a <= b : String(a).localeCompare(String(b)) <= 0;
  return false;
}

function defaultIfElseClause(tabId, idx = 0) {
  return {
    id: `if-${tabId}-${idx}`,
    condition: { leftColumn: "", operator: "=", rightKind: "raw", rightColumn: "", rightValue: "" },
    then: { kind: "raw", value: "" },
  };
}

/** @typedef {{ id: string; operationId: string | null; savedColumn: string; column: string; clauses: object[]; elseResult: object }} IfElseTab */

/** @returns {IfElseTab} */
export function createEmptyIfElseTab(columnName = "") {
  const id = `ifelse-tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    operationId: null,
    savedColumn: "",
    column: String(columnName || "").trim(),
    clauses: [defaultIfElseClause(id, 0)],
    elseResult: { kind: "raw", value: "" },
  };
}

/** @returns {IfElseTab | null} */
export function ifElseTabFromOperation(op) {
  if (!op || op.type !== "computed.column" || op.expression?.kind !== "if-else") return null;
  const tabId = String(op.id || `ifelse-tab-${Date.now()}`);
  const expr = op.expression;
  return {
    id: tabId,
    operationId: op.id || null,
    savedColumn: String(op.column || "").trim(),
    column: String(op.column || "").trim(),
    clauses: (Array.isArray(expr.clauses) ? expr.clauses : []).map((clause, idx) => ({
      id: `if-${tabId}-${idx}`,
      condition: {
        leftColumn: clause?.condition?.leftColumn || "",
        operator: clause?.condition?.operator || "=",
        rightKind: clause?.condition?.rightKind || "raw",
        rightColumn: clause?.condition?.rightColumn || "",
        rightValue: clause?.condition?.rightValue ?? "",
      },
      then: clause?.then || { kind: "raw", value: "" },
    })),
    elseResult: expr?.else || { kind: "raw", value: "" },
  };
}

/** @param {IfElseTab} tab */
export function normalizeIfElseExpressionFromTab(tab) {
  return {
    kind: "if-else",
    clauses: (Array.isArray(tab?.clauses) ? tab.clauses : []).map((clause) => ({
      condition: {
        leftColumn: clause?.condition?.leftColumn || "",
        operator: clause?.condition?.operator || "=",
        rightKind: clause?.condition?.rightKind || "raw",
        rightColumn: clause?.condition?.rightColumn || "",
        rightValue: clause?.condition?.rightValue ?? "",
      },
      then: clause?.then || { kind: "raw", value: "" },
    })),
    else: tab?.elseResult || { kind: "raw", value: "" },
  };
}

/** @param {IfElseTab | null | undefined} tab */
export function ifElseTabCanSubmit(tab) {
  const clauses = Array.isArray(tab?.clauses) ? tab.clauses : [];
  return clauses.some((clause) => {
    const condition = clause?.condition || {};
    return (
      String(condition.leftColumn || "").trim() &&
      conditionRightValueIsValid(
        condition.operator,
        condition.rightKind,
        condition.rightColumn,
        condition.rightValue,
      )
    );
  });
}
