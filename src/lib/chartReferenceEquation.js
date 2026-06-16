export const REFERENCE_EQUATION_PRESETS = [
  { label: "y = x", equation: "y = x" },
  { label: "y = x²", equation: "y = x^2" },
  { label: "y = √x", equation: "y = sqrt(x)" },
  { label: "y = 1 − x", equation: "y = 1 - x" },
];

const ALLOWED_UNARY_FUNCS = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  log: Math.log,
  ln: Math.log,
  exp: Math.exp,
};

/**
 * @param {string} raw
 * @returns {{ expression?: string; error?: string }}
 */
export function parseReferenceEquationInput(raw) {
  let s = String(raw || "").trim();
  if (!s) return { error: "Enter an equation." };

  const yEquals = /^y\s*=\s*(.+)$/i.exec(s);
  if (yEquals) return { expression: yEquals[1].trim() };

  if (/^x\s*=\s*y$/i.test(s)) return { expression: "x" };

  if (/[=<>]/.test(s)) {
    return { error: "Use y = … (for example y = x or y = x^2)." };
  }

  return { expression: s };
}

function tokenize(expression) {
  const tokens = [];
  let i = 0;
  const s = String(expression || "");
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j += 1;
      const value = Number(s.slice(i, j));
      if (!Number.isFinite(value)) throw new Error("Invalid number");
      tokens.push({ type: "number", value });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j += 1;
      const name = s.slice(i, j).toLowerCase();
      if (name === "x") tokens.push({ type: "x" });
      else tokens.push({ type: "ident", name });
      i = j;
      continue;
    }
    if ("+-*/^(),".includes(ch)) {
      tokens.push({ type: "punct", value: ch });
      i += 1;
      continue;
    }
    throw new Error(`Invalid character "${ch}"`);
  }
  return tokens;
}

/**
 * @param {string} expression
 * @param {number} x
 * @returns {number | null}
 */
export function evaluateReferenceExpression(expression, x) {
  if (!Number.isFinite(x)) return null;
  const tokens = tokenize(expression);
  let i = 0;

  const peek = () => tokens[i];
  const consume = () => tokens[i++];

  const parseExpression = () => {
    let left = parseTerm();
    while (peek()?.value === "+" || peek()?.value === "-") {
      const op = consume().value;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = () => {
    let left = parsePower();
    while (peek()?.value === "*" || peek()?.value === "/") {
      const op = consume().value;
      const right = parsePower();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  };

  const parsePower = () => {
    let left = parseUnary();
    if (peek()?.value === "^") {
      consume();
      const right = parsePower();
      left = Math.pow(left, right);
    }
    return left;
  };

  const parseUnary = () => {
    if (peek()?.value === "-") {
      consume();
      return -parseUnary();
    }
    if (peek()?.value === "+") {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  };

  const parsePrimary = () => {
    const t = peek();
    if (!t) throw new Error("Incomplete expression");
    if (t.type === "number") {
      consume();
      return t.value;
    }
    if (t.type === "x") {
      consume();
      return x;
    }
    if (t.type === "ident") {
      const name = consume().name;
      if (peek()?.value === "(") {
        consume();
        const args = [];
        if (peek()?.value !== ")") {
          args.push(parseExpression());
          while (peek()?.value === ",") {
            consume();
            args.push(parseExpression());
          }
        }
        if (consume()?.value !== ")") throw new Error("Expected )");
        if (name === "pow" && args.length === 2) return Math.pow(args[0], args[1]);
        if ((name === "min" || name === "max") && args.length >= 2) return Math[name](...args);
        const fn = ALLOWED_UNARY_FUNCS[name];
        if (fn && args.length === 1) {
          const out = fn(args[0]);
          return Number.isFinite(out) ? out : NaN;
        }
        throw new Error(`Unknown function "${name}"`);
      }
      throw new Error(`Unknown value "${name}"`);
    }
    if (t.value === "(") {
      consume();
      const val = parseExpression();
      if (consume()?.value !== ")") throw new Error("Expected )");
      return val;
    }
    throw new Error("Unexpected token");
  };

  if (!tokens.length) throw new Error("Empty expression");
  const result = parseExpression();
  if (i < tokens.length) throw new Error("Unexpected trailing input");
  if (!Number.isFinite(result)) return null;
  return result;
}

/**
 * @param {string} equation
 * @returns {{ ok: boolean; expression?: string; error?: string }}
 */
export function validateReferenceEquation(equation) {
  try {
    const parsed = parseReferenceEquationInput(equation);
    if (parsed.error) return { ok: false, error: parsed.error };
    evaluateReferenceExpression(parsed.expression, 0.5);
    evaluateReferenceExpression(parsed.expression, 0);
    return { ok: true, expression: parsed.expression };
  } catch (err) {
    return { ok: false, error: err?.message || "Invalid equation" };
  }
}

/**
 * @param {{
 *   equation: string;
 *   xMin: number;
 *   xMax: number;
 *   xKey: string;
 *   yKey: string;
 *   pointCount?: number;
 * }} opts
 * @returns {Record<string, number | string>[]}
 */
export function sampleReferenceEquationCurve({ equation, xMin, xMax, xKey, yKey, pointCount = 96 }) {
  const parsed = parseReferenceEquationInput(equation);
  if (parsed.error || !parsed.expression) return [];
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) return [];
  const min = Math.min(xMin, xMax);
  const max = Math.max(xMin, xMax);
  if (min === max) return [];

  const steps = Math.max(8, Math.min(256, Math.floor(pointCount)));
  const out = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = min + ((max - min) * i) / steps;
    let y;
    try {
      y = evaluateReferenceExpression(parsed.expression, x);
    } catch {
      y = null;
    }
    if (y == null || !Number.isFinite(y)) continue;
    out.push({ [xKey]: x, [yKey]: y });
  }
  return out;
}

/**
 * @param {object[]} rows
 * @param {string} xKey
 */
export function numericXExtents(rows, xKey) {
  const list = Array.isArray(rows) ? rows : [];
  let min = Infinity;
  let max = -Infinity;
  for (const row of list) {
    const raw = row?.[xKey];
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    min = Math.min(min, n);
    max = Math.max(max, n);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}
