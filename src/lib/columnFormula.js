/**
 * Row formulas addressed by column title.
 * Glide only draws cells, and HyperFormula is GPL unless we buy a license,
 * so this evaluates the preview rows directly. A licensed engine can replace
 * `evaluateColumnFormula` later without changing the sheet UI.
 */

const FUNCTIONS = new Set(["ROUND", "ABS", "MIN", "MAX", "IF", "SUM", "AVERAGE", "AND", "OR", "NOT", "CONCAT"]);

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

function substituteColumns(input, columns) {
  const sorted = columns
    .filter((column) => column?.title)
    .slice()
    .sort((a, b) => b.title.length - a.title.length);
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
    const rest = input.slice(i);
    let matched = null;
    for (const column of sorted) {
      if (rest.length < column.title.length) continue;
      if (rest.slice(0, column.title.length).toLowerCase() !== column.title.toLowerCase()) continue;
      const prev = i > 0 ? input[i - 1] : "";
      const next = input[i + column.title.length] || "";
      if (/[A-Za-z0-9_]/.test(prev) || /[A-Za-z0-9_]/.test(next)) continue;
      matched = column;
      break;
    }
    if (matched) {
      out += ` #${refs.length} `;
      refs.push(matched);
      i += matched.title.length;
      continue;
    }
    out += input[i];
    i += 1;
  }
  return { expr: out, refs };
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

function evalCall(node, scope) {
  const values = node.args.map((arg) => evalNode(arg, scope));
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

export function evaluateColumnFormula(formula, columns, rows) {
  const raw = String(formula || "").trim();
  const body = raw.startsWith("=") ? raw.slice(1).trim() : raw;
  const blank = { values: rows.map(() => null), error: "", type: "number" };
  if (!body) return blank;
  try {
    const { expr, refs } = substituteColumns(body, columns);
    const ast = parseExpression(tokenize(expr));
    const values = rows.map((row) => {
      const scope = refs.map((column) => formulaValue(column, row?.[column.id]));
      try {
        const value = evalNode(ast, scope);
        if (typeof value === "number" && !Number.isFinite(value)) return null;
        return value == null ? null : value;
      } catch {
        return null;
      }
    });
    const type = values.some((value) => typeof value === "string") ? "text" : "number";
    return { values, error: "", type };
  } catch (err) {
    return { values: rows.map(() => null), error: err?.message || "Can't read that equation.", type: "number" };
  }
}
