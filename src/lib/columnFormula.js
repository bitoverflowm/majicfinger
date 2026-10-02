/**
 * Row formulas addressed by column title.
 * Glide only draws cells, and HyperFormula is GPL unless we buy a license,
 * so this evaluates the preview rows directly. A licensed engine can replace
 * `evaluateColumnFormula` later without changing the sheet UI.
 */

export const FORMULA_FUNCTIONS = [
  { name: "SUM", format: "SUM(value1, value2, ...)", description: "Adds every value you list." },
  { name: "AVERAGE", format: "AVERAGE(value1, value2, ...)", description: "Average of the values you list." },
  { name: "MIN", format: "MIN(value1, value2, ...)", description: "The smallest value." },
  { name: "MAX", format: "MAX(value1, value2, ...)", description: "The largest value." },
  { name: "ROUND", format: "ROUND(value, digits)", description: "Rounds a value. Digits is optional and defaults to 0." },
  { name: "ABS", format: "ABS(value)", description: "Turns a negative value positive." },
  { name: "IF", format: "IF(condition, when true, when false)", description: "Returns one result when the condition is true, and the other when it is false." },
  { name: "AND", format: "AND(condition1, condition2, ...)", description: "True only when every condition is true." },
  { name: "OR", format: "OR(condition1, condition2, ...)", description: "True when any condition is true." },
  { name: "NOT", format: "NOT(condition)", description: "Flips true and false." },
  { name: "CONCAT", format: "CONCAT(value1, value2, ...)", description: "Joins text into one value." },
];

const FUNCTIONS = new Set(FORMULA_FUNCTIONS.map((item) => item.name));

export const FORMULA_REFERENCE_NOTES = [
  { format: "Yes price + No price", description: "Uses the named column on this row. Names match the sheet, not A1 or B1." },
  { format: "Yes price[2]", description: "One cell. The number is the row on the left of the sheet." },
  { format: "'Other sheet'!Yes price", description: "A column on another sheet in this preview, or a sheet already on the dashboard." },
  { format: "'Other sheet'!Yes price[2]", description: "One cell on another sheet." },
];

function formulaValue(column, raw) {
  if (raw == null || raw === "") return null;
  if (column?.type === "boolean") return raw === true || raw === "true" || raw === "True" ? 1 : 0;
  if (column?.type === "number" || column?.scale === "cents" || typeof raw === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  const text = String(raw);
  const n = Number(text);
  if (text.trim() !== "" && Number.isFinite(n) && column?.type !== "date") return n;
  return text;
}

function titlesMatch(input, index, title) {
  if (!title || input.length < index + title.length) return false;
  if (input.slice(index, index + title.length).toLowerCase() !== title.toLowerCase()) return false;
  const prev = index > 0 ? input[index - 1] : "";
  const next = input[index + title.length] || "";
  if (/[A-Za-z0-9_]/.test(prev)) return false;
  if (next && next !== "!" && next !== "[" && /[A-Za-z0-9_]/.test(next)) return false;
  return true;
}

function readCellRow(input, index) {
  if (input[index] !== "[") return { row: null, next: index };
  const end = input.indexOf("]", index + 1);
  if (end < 0) throw new Error("A cell reference is missing its closing bracket.");
  const row = Number(input.slice(index + 1, end).trim());
  if (!Number.isInteger(row) || row < 1) throw new Error("A cell reference needs a row number, like Yes price[2].");
  return { row, next: end + 1 };
}

function findSheet(input, index, sheets) {
  if (input[index] === "'") {
    const end = input.indexOf("'", index + 1);
    if (end < 0 || input[end + 1] !== "!") return null;
    const title = input.slice(index + 1, end);
    const sheet = sheets.find((item) => item.title.toLowerCase() === title.toLowerCase());
    if (!sheet) throw new Error(`Can't find a sheet named "${title}".`);
    return { sheet, next: end + 2 };
  }
  const sorted = sheets.slice().sort((a, b) => b.title.length - a.title.length);
  for (const sheet of sorted) {
    if (!titlesMatch(input, index, sheet.title)) continue;
    if (input[index + sheet.title.length] !== "!") continue;
    return { sheet, next: index + sheet.title.length + 1 };
  }
  return null;
}

function findColumn(input, index, columns) {
  const sorted = columns
    .filter((column) => column?.title)
    .slice()
    .sort((a, b) => b.title.length - a.title.length);
  for (const column of sorted) {
    if (titlesMatch(input, index, column.title)) return column;
  }
  return null;
}

function substituteColumns(input, columns, sheets, sheetId) {
  const knownSheets = (sheets || []).filter((sheet) => sheet?.title);
  const refs = [];
  let out = "";
  let i = 0;
  while (i < input.length) {
    if (input[i] === '"') {
      let j = i + 1;
      while (j < input.length && input[j] !== '"') j += input[j] === "\\" ? 2 : 1;
      out += input.slice(i, Math.min(input.length, j + 1));
      i = j + 1;
      continue;
    }
    const sheetHit = findSheet(input, i, knownSheets);
    const columnAt = sheetHit ? sheetHit.next : i;
    let cursor = columnAt;
    if (sheetHit) while (input[cursor] === " ") cursor += 1;
    const pool = sheetHit ? sheetHit.sheet.columns : columns;
    const column = findColumn(input, cursor, pool || []);
    if (sheetHit && !column) throw new Error(`Can't find that column on ${sheetHit.sheet.title}.`);
    if (column) {
      const cell = readCellRow(input, cursor + column.title.length);
      out += ` #${refs.length} `;
      refs.push({ column, sheetId: sheetHit?.sheet.id || sheetId, row: cell.row });
      i = cell.next;
      continue;
    }
    out += input[i];
    i += 1;
  }
  return { expr: out, refs };
}

function sheetRows(sheets, sheetId, fallbackRows) {
  const sheet = (sheets || []).find((item) => item.id === sheetId);
  return sheet?.rows || fallbackRows;
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const char = expr[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (char === '"') {
      let j = i + 1;
      let text = "";
      while (j < expr.length && expr[j] !== '"') {
        if (expr[j] === "\\" && j + 1 < expr.length) {
          text += expr[j + 1];
          j += 2;
          continue;
        }
        text += expr[j];
        j += 1;
      }
      if (expr[j] !== '"') throw new Error("A text value is missing its closing quote.");
      tokens.push({ type: "str", value: text });
      i = j + 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j += 1;
      const value = Number(expr.slice(i, j));
      if (!Number.isFinite(value)) throw new Error("That number isn't valid.");
      tokens.push({ type: "num", value });
      i = j;
      continue;
    }
    if (char === "#") {
      let j = i + 1;
      while (j < expr.length && /[0-9]/.test(expr[j])) j += 1;
      tokens.push({ type: "ref", index: Number(expr.slice(i + 1, j)) });
      i = j;
      continue;
    }
    const pair = expr.slice(i, i + 2);
    if (pair === ">=" || pair === "<=" || pair === "<>") {
      tokens.push({ type: "op", value: pair });
      i += 2;
      continue;
    }
    if ("+-*/^(),=><".includes(char)) {
      tokens.push({ type: "op", value: char });
      i += 1;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let j = i;
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j += 1;
      const value = expr.slice(i, j);
      tokens.push({ type: "id", value, name: value.toUpperCase() });
      i = j;
      continue;
    }
    throw new Error(`Can't read "${char}" in this equation.`);
  }
  tokens.push({ type: "eof" });
  return tokens;
}

function parseExpression(tokens) {
  let index = 0;
  const peek = () => tokens[index];
  const eat = () => tokens[index++];

  function parseComparison() {
    const left = parseAdditive();
    const op = peek();
    if (op?.type === "op" && [">", "<", ">=", "<=", "=", "<>"].includes(op.value)) {
      eat();
      return { type: "cmp", op: op.value, left, right: parseAdditive() };
    }
    return left;
  }

  function parseAdditive() {
    let left = parseTerm();
    while (peek()?.type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = eat().value;
      left = { type: "binary", op, left, right: parseTerm() };
    }
    return left;
  }

  function parseTerm() {
    let left = parsePower();
    while (peek()?.type === "op" && (peek().value === "*" || peek().value === "/")) {
      const op = eat().value;
      left = { type: "binary", op, left, right: parsePower() };
    }
    return left;
  }

  function parsePower() {
    const left = parseUnary();
    if (peek()?.type === "op" && peek().value === "^") {
      eat();
      return { type: "binary", op: "^", left, right: parsePower() };
    }
    return left;
  }

  function parseUnary() {
    const token = peek();
    if (token?.type === "op" && (token.value === "+" || token.value === "-")) {
      eat();
      return { type: "unary", op: token.value, value: parseUnary() };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token || token.type === "eof") throw new Error("The equation is incomplete.");
    if (token.type === "num" || token.type === "str" || token.type === "ref") {
      eat();
      return token.type === "ref" ? { type: "ref", index: token.index } : { type: token.type, value: token.value };
    }
    if (token.type === "op" && token.value === "(") {
      eat();
      const inner = parseComparison();
      if (peek()?.value !== ")") throw new Error("A parenthesis is missing.");
      eat();
      return inner;
    }
    if (token.type === "id") {
      let phrase = token.value;
      let name = token.name;
      eat();
      while (peek()?.type === "id") {
        const next = eat();
        phrase += ` ${next.value}`;
        name += ` ${next.name}`;
      }
      if (peek()?.value === "(" && FUNCTIONS.has(name)) {
        eat();
        const args = [];
        if (peek()?.value !== ")") {
          args.push(parseComparison());
          while (peek()?.value === ",") {
            eat();
            args.push(parseComparison());
          }
        }
        if (peek()?.value !== ")") throw new Error("A parenthesis is missing.");
        eat();
        return { type: "call", name, args };
      }
      if (peek()?.value === "(") throw new Error(`Function ${phrase} isn't available yet.`);
      throw new Error(`Can't find a column named "${phrase}" on this sheet.`);
    }
    throw new Error("Enter your equation, like = Yes Price + No Price.");
  }

  const ast = parseComparison();
  if (peek()?.type !== "eof") throw new Error("There's extra text after the equation.");
  return ast;
}

function isNumeric(value) {
  if (value == null || value === "") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));
}

function asNumber(value) {
  if (!isNumeric(value)) return 0;
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function compare(op, left, right) {
  const numeric = isNumeric(left) && isNumeric(right) && typeof left !== "string" && typeof right !== "string";
  const a = numeric ? asNumber(left) : String(left ?? "").toLowerCase();
  const b = numeric ? asNumber(right) : String(right ?? "").toLowerCase();
  if (op === ">") return a > b;
  if (op === "<") return a < b;
  if (op === ">=") return a >= b;
  if (op === "<=") return a <= b;
  if (op === "<>") return a !== b;
  return a === b;
}

function isTruthy(value) {
  if (typeof value === "number") return value !== 0 && Number.isFinite(value);
  if (typeof value === "string") return value !== "" && value.toUpperCase() !== "FALSE";
  return false;
}

function flattenCallValues(values) {
  const flat = [];
  for (const value of values) {
    if (Array.isArray(value)) flat.push(...value);
    else flat.push(value);
  }
  return flat;
}

function evalCall(node, scope) {
  const rawValues = node.args.map((arg) => evalNode(arg, scope));
  const values =
    node.name === "SUM" || node.name === "AVERAGE" || node.name === "MIN" || node.name === "MAX"
      ? flattenCallValues(rawValues)
      : rawValues;
  if (node.name === "ABS") {
    if (values.length !== 1) throw new Error("ABS needs one value.");
    return Math.abs(asNumber(values[0]));
  }
  if (node.name === "ROUND") {
    if (values.length < 1 || values.length > 2) throw new Error("ROUND needs a value, and optionally how many decimals.");
    const digits = values.length === 2 ? asNumber(values[1]) : 0;
    const factor = 10 ** digits;
    return Math.round(asNumber(values[0]) * factor) / factor;
  }
  if (node.name === "MIN" || node.name === "MAX") {
    if (!values.length) throw new Error(`${node.name} needs at least one value.`);
    const nums = values.map(asNumber);
    return node.name === "MIN" ? Math.min(...nums) : Math.max(...nums);
  }
  if (node.name === "SUM") return values.reduce((sum, value) => sum + asNumber(value), 0);
  if (node.name === "AVERAGE") {
    if (!values.length) throw new Error("AVERAGE needs at least one value.");
    return values.reduce((sum, value) => sum + asNumber(value), 0) / values.length;
  }
  if (node.name === "AND") return values.every(isTruthy) ? 1 : 0;
  if (node.name === "OR") return values.some(isTruthy) ? 1 : 0;
  if (node.name === "NOT") {
    if (values.length !== 1) throw new Error("NOT needs one value.");
    return isTruthy(values[0]) ? 0 : 1;
  }
  if (node.name === "CONCAT") return values.map((value) => (value == null ? "" : String(value))).join("");
  if (node.name === "IF") {
    if (values.length !== 3) throw new Error("IF needs a condition, a value when it's true, and a value when it's false.");
    return isTruthy(values[0]) ? values[1] : values[2];
  }
  throw new Error(`Function ${node.name} isn't available yet.`);
}

function evalNode(node, scope) {
  if (node.type === "num" || node.type === "str") return node.value;
  if (node.type === "ref") return scope[node.index] ?? null;
  if (node.type === "unary") {
    const value = asNumber(evalNode(node.value, scope));
    return node.op === "-" ? -value : value;
  }
  if (node.type === "binary") {
    const left = evalNode(node.left, scope);
    const right = evalNode(node.right, scope);
    if (node.op === "+") {
      const leftText = typeof left === "string" && !isNumeric(left);
      const rightText = typeof right === "string" && !isNumeric(right);
      if (leftText || rightText) return `${left ?? ""}${right ?? ""}`;
      return asNumber(left) + asNumber(right);
    }
    const a = asNumber(left);
    const b = asNumber(right);
    if (node.op === "-") return a - b;
    if (node.op === "*") return a * b;
    if (node.op === "/") return b === 0 ? null : a / b;
    if (node.op === "^") return a ** b;
  }
  if (node.type === "cmp") return compare(node.op, evalNode(node.left, scope), evalNode(node.right, scope)) ? 1 : 0;
  if (node.type === "call") return evalCall(node, scope);
  return null;
}

export function listFormulaReferences(formula, columns, rows, options = {}) {
  const raw = String(formula || "").trim();
  const body = raw.startsWith("=") ? raw.slice(1).trim() : raw;
  if (!body) return [];
  try {
    return substituteColumns(body, columns, options.sheets, options.sheetId).refs;
  } catch {
    return [];
  }
}

export function formulaSuggestions(formula, caret) {
  const source = String(formula || "");
  const at = Math.max(0, Math.min(source.length, caret ?? source.length));
  const word = source.slice(0, at).match(/[A-Za-z][A-Za-z0-9]*$/);
  if (!word) return [];
  const typed = word[0];
  return FORMULA_FUNCTIONS.filter((item) => item.name.toLowerCase().startsWith(typed.toLowerCase()))
    .slice(0, 6)
    .map((item) => ({ ...item, from: at - typed.length, to: at }));
}

/**
 * One summary cell. A column name with no row, like Size, is every value in that column
 * so SUM, AVERAGE, MIN, and MAX can total it. Size[2] is still one cell.
 * Plain text is kept as written. A leading = marks an equation.
 */
export function evaluateCellFormula(formula, options = {}) {
  const raw = String(formula ?? "");
  const trimmed = raw.trim();
  if (!trimmed) return { value: "", error: "", type: "text", references: [] };
  if (!trimmed.startsWith("=")) return { value: raw, error: "", type: "text", references: [] };
  const body = trimmed.slice(1).trim();
  if (!body) return { value: "", error: "", type: "text", references: [] };
  try {
    const columns = options.columns || [];
    const rows = options.rows || [];
    const { expr, refs } = substituteColumns(body, columns, options.sheets, options.sheetId);
    const ast = parseExpression(tokenize(expr));
    const scope = refs.map((ref) => {
      const sourceRows = sheetRows(options.sheets, ref.sheetId, rows);
      if (ref.row == null) {
        return sourceRows
          .map((row) => formulaValue(ref.column, row?.[ref.column.id]))
          .filter((value) => value != null && value !== "");
      }
      const sourceRow = sourceRows[ref.row - 1];
      return formulaValue(ref.column, sourceRow?.[ref.column.id]);
    });
    const value = evalNode(ast, scope);
    if (Array.isArray(value)) {
      return {
        value: "",
        error: "Use SUM, AVERAGE, MIN, or MAX around a whole column.",
        type: "number",
        references: refs,
      };
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      return { value: "", error: "", type: "number", references: refs };
    }
    return {
      value: value == null ? "" : value,
      error: "",
      type: typeof value === "string" ? "text" : "number",
      references: refs,
    };
  } catch (err) {
    return {
      value: "",
      error: err instanceof Error ? err.message : "That equation isn't valid.",
      type: "number",
      references: [],
    };
  }
}

export function evaluateColumnFormula(formula, columns, rows, options = {}) {
  const raw = String(formula || "").trim();
  const body = raw.startsWith("=") ? raw.slice(1).trim() : raw;
  const blank = { values: rows.map(() => null), error: "", type: "number", references: [] };
  if (!body) return blank;
  try {
    const { expr, refs } = substituteColumns(body, columns, options.sheets, options.sheetId);
    const ast = parseExpression(tokenize(expr));
    const values = rows.map((row, rowIndex) => {
      const scope = refs.map((ref) => {
        const sourceRows = sheetRows(options.sheets, ref.sheetId, rows);
        const sourceRow = ref.row == null ? sourceRows[rowIndex] : sourceRows[ref.row - 1];
        return formulaValue(ref.column, sourceRow?.[ref.column.id]);
      });
      try {
        const value = evalNode(ast, scope);
        if (typeof value === "number" && !Number.isFinite(value)) return null;
        return value == null ? null : value;
      } catch {
        return null;
      }
    });
    const type = values.some((value) => typeof value === "string") ? "text" : "number";
    return { values, error: "", type, references: refs };
  } catch (err) {
    return {
      values: rows.map(() => null),
      error: err?.message || "Can't read that equation.",
      type: "number",
      references: listFormulaReferences(formula, columns, rows, options),
    };
  }
}
