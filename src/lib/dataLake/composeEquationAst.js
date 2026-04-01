/**
 * Structured expression AST for compose "equation" SUM(...) — no raw SQL from clients.
 *
 * Node shapes:
 * - { type: "col", name: string }
 * - { type: "num", value: number }
 * - { type: "bin", op: "+" | "-" | "*" | "/", left: ExprNode, right: ExprNode }
 * - { type: "grp", inner: ExprNode }
 * - { type: "case", branches: Array<{ when: { column, op, value }, then: ExprNode }>, elseNode: ExprNode }
 */

import { columnHiveTypeForLakeTable, isDateLikeColumnName } from "./lakeTableColumns";

export const MAX_EQUATION_DEPTH = 32;

export const BINARY_OPS = /** @type {const} */ (["*", "/", "+", "-"]);

function isNumericHiveType(hiveType) {
  const t = String(hiveType || "").toLowerCase();
  return t === "bigint" || t === "int" || t === "double";
}

/**
 * @param {unknown} eq
 * @returns {any}
 */
export function migrateLegacyEquation(eq) {
  if (!eq || typeof eq !== "object" || Array.isArray(eq)) return eq;
  if (eq.root && typeof eq.root === "object" && eq.root.type) return eq;
  if (
    eq.enabled === true &&
    eq.mulColumn &&
    eq.when &&
    eq.thenColumn &&
    eq.elseColumn != null &&
    eq.divisor != null
  ) {
    return {
      enabled: true,
      agg: "sum",
      root: {
        type: "bin",
        op: "/",
        left: {
          type: "bin",
          op: "*",
          left: { type: "col", name: String(eq.mulColumn) },
          right: {
            type: "case",
            branches: [
              {
                when: {
                  column: String(eq.when.column || ""),
                  op: String(eq.when.op || "eq").toLowerCase().trim() === "neq" ? "neq" : "eq",
                  value: eq.when.value,
                },
                then: { type: "col", name: String(eq.thenColumn) },
              },
            ],
            elseNode: { type: "col", name: String(eq.elseColumn) },
          },
        },
        right: { type: "num", value: Number(eq.divisor) },
      },
    };
  }
  return eq;
}

/**
 * @param {any} when
 * @param {Set<string>} allowed
 * @param {string} lake
 * @param {string} table
 */
function validateWhenBranch(when, allowed, lake, table) {
  if (!when || typeof when !== "object" || Array.isArray(when)) {
    throw new Error("CASE WHEN must be an object");
  }
  const whenColumn = String(when.column || "").trim();
  if (!whenColumn || !allowed.has(whenColumn)) {
    throw new Error("CASE WHEN column must be a valid column");
  }
  const whenType = columnHiveTypeForLakeTable(lake, table, whenColumn);
  if (!whenType) {
    throw new Error(`Unknown column type: ${whenColumn}`);
  }
  const whenTypeNorm = String(whenType).toLowerCase();
  const whenIsString = whenTypeNorm === "string";
  const whenIsNumeric = isNumericHiveType(whenType);

  const opRaw = String(when.op || "").toLowerCase().trim();
  const opAllowed = whenIsString ? ["eq", "neq"] : whenIsNumeric ? ["gt", "lt", "eq", "neq"] : ["eq", "neq"];
  if (!opAllowed.includes(opRaw)) {
    throw new Error("CASE WHEN operator is not valid for this column type");
  }

  let whenValue;
  if (whenIsString) {
    whenValue = String(when.value ?? "");
    if (!whenValue.trim()) {
      throw new Error("CASE WHEN value is required");
    }
  } else if (whenIsNumeric) {
    const n = Number(when.value);
    if (!Number.isFinite(n)) {
      throw new Error("CASE numeric WHEN value must be a number");
    }
    whenValue = n;
  } else {
    whenValue = String(when.value ?? "");
    if (!String(whenValue).trim()) {
      throw new Error("CASE WHEN value is required");
    }
  }

  return { column: whenColumn, op: opRaw, value: whenValue };
}

/**
 * @param {any} expr
 * @param {number} depth
 * @param {{ allowed: Set<string>; lake: string; table: string }} ctx
 */
export function validateExprNode(expr, depth, ctx) {
  if (depth > MAX_EQUATION_DEPTH) {
    throw new Error(`Expression exceeds max depth (${MAX_EQUATION_DEPTH})`);
  }
  if (!expr || typeof expr !== "object" || Array.isArray(expr)) {
    throw new Error("Invalid expression node");
  }
  const { allowed, lake, table } = ctx;

  switch (expr.type) {
    case "col": {
      const name = String(expr.name || "").trim();
      if (!name || !allowed.has(name)) {
        throw new Error("Invalid column reference in expression");
      }
      const t = columnHiveTypeForLakeTable(lake, table, name);
      if (!isNumericHiveType(t)) {
        throw new Error("Expression columns must be numeric");
      }
      if (isDateLikeColumnName(name) && isNumericHiveType(t)) {
        /* epoch-ish numeric columns are allowed; date bucket uses treatAsDate elsewhere */
      }
      return { type: "col", name };
    }
    case "num": {
      const value = Number(expr.value);
      if (!Number.isFinite(value)) {
        throw new Error("Literal must be a finite number");
      }
      return { type: "num", value };
    }
    case "bin": {
      const op = String(expr.op || "").trim();
      if (!BINARY_OPS.includes(op)) {
        throw new Error("Invalid binary operator");
      }
      const left = validateExprNode(expr.left, depth + 1, ctx);
      const right = validateExprNode(expr.right, depth + 1, ctx);
      if (op === "/" && right.type === "num" && Number(right.value) === 0) {
        throw new Error("Division by zero is not allowed");
      }
      return { type: "bin", op, left, right };
    }
    case "grp": {
      const inner = validateExprNode(expr.inner, depth + 1, ctx);
      return { type: "grp", inner };
    }
    case "case": {
      const branchesIn = Array.isArray(expr.branches) ? expr.branches : [];
      if (branchesIn.length === 0) {
        throw new Error("CASE requires at least one branch");
      }
      const branches = [];
      for (const b of branchesIn) {
        if (!b || typeof b !== "object") {
          throw new Error("Invalid CASE branch");
        }
        const when = validateWhenBranch(b.when, allowed, lake, table);
        const then = validateExprNode(b.then, depth + 1, ctx);
        branches.push({ when, then });
      }
      const elseNode = validateExprNode(expr.elseNode, depth + 1, ctx);
      return { type: "case", branches, elseNode };
    }
    default:
      throw new Error("Unknown expression node type");
  }
}

/**
 * @param {any} equationIn
 * @param {{ allowed: Set<string>; lake: string; table: string }} ctx
 * @returns {{ enabled: true; agg: "sum"; root: any } | null}
 */
export function validateAndNormalizeEquation(equationIn, ctx) {
  if (!equationIn || typeof equationIn !== "object" || Array.isArray(equationIn)) {
    throw new Error("compose.select.equation must be an object");
  }
  const migrated = migrateLegacyEquation(equationIn);
  const enabled = migrated.enabled === true;
  if (!enabled) {
    return null;
  }
  const agg = String(migrated.agg || "sum").toLowerCase().trim();
  if (agg !== "sum") {
    throw new Error('Equation aggregate must be "sum"');
  }
  if (!migrated.root) {
    throw new Error("Equation requires a root expression");
  }
  const root = validateExprNode(migrated.root, 0, ctx);
  return { enabled: true, agg: "sum", root };
}
