import { getLakeBigintColumnNameSet } from "@/lib/dataLake/lakeTableColumns";

/**
 * Expand scientific-notation strings that denote whole integers into a plain
 * decimal digit string (no exponent). Returns null if `str` is not that shape.
 *
 * @param {string} str
 * @returns {string | null}
 */
export function expandScientificNotationIntegerString(str) {
  const s = String(str).trim();
  if (!s || !/[eE]/.test(s)) return null;
  const neg = s.startsWith("-");
  const u = neg ? s.slice(1) : s;
  const m = u.match(/^(\d+)(?:\.(\d*))?[eE]([+-]?\d+)$/);
  if (!m) return null;
  const intPart = m[1];
  const fracPart = m[2] ?? "";
  const exp = Number(m[3]);
  if (!Number.isFinite(exp)) return null;

  let mant = intPart + fracPart;
  mant = mant.replace(/^0+(?=\d)/, "");
  if (!mant) mant = "0";

  const shift = exp - fracPart.length;
  if (!Number.isFinite(shift)) return null;

  if (shift < 0) {
    const abs = -shift;
    if (mant.length <= abs) return null;
    const tail = mant.slice(-abs);
    if (!/^0+$/.test(tail)) return null;
    const head = mant.slice(0, mant.length - abs);
    return (neg ? "-" : "") + (head || "0");
  }

  return (neg ? "-" : "") + mant + "0".repeat(shift);
}

/**
 * "92.0" / "-3.000" -> "-3" / "92" when fractional part is all zeros.
 *
 * @param {string} s
 */
function stripTrailingZeroFractionalPart(s) {
  const m = String(s).trim().match(/^(-?)(\d+)\.(\d+)$/);
  if (!m) return s;
  const frac = m[3].replace(/0+$/, "");
  if (frac) return s;
  return m[1] + m[2];
}

/**
 * Normalize a single cell for columns known to be lake `bigint` values:
 * - never uses `Number()` on digit strings that can exceed MAX_SAFE_INTEGER
 * - expands scientific-notation **strings** to full decimal digit strings
 * - returns a JS number when the integer is within Number.isSafeInteger range
 *
 * @param {unknown} value
 * @returns {number | string | null}
 */
export function normalizeLakeBigintCellValue(value) {
  if (value == null) return null;
  if (value === "") return null;

  if (typeof value === "bigint") {
    const dec = value.toString();
    try {
      const bi = BigInt(dec);
      if (bi <= BigInt(Number.MAX_SAFE_INTEGER) && bi >= BigInt(Number.MIN_SAFE_INTEGER)) return Number(bi);
      return dec;
    } catch {
      return null;
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const intv = Number.isInteger(value) ? value : Math.trunc(value);
    if (!Number.isFinite(intv)) return null;
    if (Number.isSafeInteger(intv)) return intv;
    const raw = String(intv);
    if (/[eE]/.test(raw)) {
      const dec = expandScientificNotationIntegerString(raw);
      return dec != null ? dec : raw;
    }
    return intv;
  }

  let s = typeof value === "string" ? value.trim() : String(value).trim();
  if (!s) return null;

  const expanded = expandScientificNotationIntegerString(s);
  if (expanded != null) s = expanded;
  s = stripTrailingZeroFractionalPart(s);

  if (!/^-?\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  try {
    const bi = BigInt(s);
    if (bi <= BigInt(Number.MAX_SAFE_INTEGER) && bi >= BigInt(Number.MIN_SAFE_INTEGER)) return Number(bi);
    return bi.toString();
  } catch {
    return null;
  }
}

/**
 * @param {unknown[]} rows
 * @returns {unknown[]}
 */
export function normalizeLakeBigintFieldsInRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const names = getLakeBigintColumnNameSet();
  if (!list.length || !names.size) return list;

  return list.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    let out = null;
    for (const k of Object.keys(row)) {
      if (!names.has(k)) continue;
      const nextVal = normalizeLakeBigintCellValue(row[k]);
      if (nextVal !== row[k]) {
        if (!out) out = { ...row };
        out[k] = nextVal;
      }
    }
    return out || row;
  });
}
