/**
 * Parsers for Sheet panel “Add Data” paste/upload flows.
 * Returns row objects: `{ [columnName]: value }[]`.
 */

const ALIGNMENT_ROW_RE = /^\|?[\s|:.-]+$/;
const LABELISH_HEADER_RE = /(_label|_name|_id|_slug|_title|_key)$/i;

/**
 * @param {unknown[]} rows
 * @returns {string[]}
 */
export function columnKeysFromRows(rows) {
  const keys = new Set();
  for (const row of rows || []) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    for (const k of Object.keys(row)) {
      if (k) keys.add(k);
    }
  }
  return [...keys];
}

/**
 * @param {string[]} keys
 * @returns {{ field: string; cellDataType: string }[]}
 */
export function colsFromKeys(keys) {
  return (keys || []).filter(Boolean).map((field) => ({ field, cellDataType: "text" }));
}

/**
 * @param {string} header
 * @returns {string}
 */
export function sanitizeImportHeader(header) {
  return String(header || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");
}

/**
 * @param {string} raw
 * @param {string} [header]
 * @returns {string|number|boolean}
 */
export function coerceImportCell(raw, header = "") {
  const s = String(raw ?? "").trim();
  if (s === "") return "";
  const lower = s.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  const labelish = LABELISH_HEADER_RE.test(String(header || ""));
  // Strip thousands separators for numeric coercion (1,000 → 1000).
  const numericCandidate = s.replace(/,/g, "");
  if (!labelish && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(numericCandidate)) {
    const n = Number(numericCandidate);
    if (Number.isFinite(n)) return n;
  }
  return s;
}

/**
 * @param {string} text
 * @returns {Record<string, unknown>[]}
 */
export function parseJsonRows(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Paste JSON first.");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON.");
  }
  if (Array.isArray(parsed)) {
    if (!parsed.length) return [];
    if (!parsed.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
      throw new Error("JSON array must contain objects (rows).");
    }
    return parsed;
  }
  if (parsed && typeof parsed === "object") return [parsed];
  throw new Error("JSON must be an object or an array of objects.");
}

/**
 * Parse GPT-style Markdown pipe tables into row objects.
 * @param {string} text
 * @returns {Record<string, unknown>[]}
 */
export function parseMarkdownTable(text) {
  let raw = String(text || "").trim();
  if (!raw) throw new Error("Paste a Markdown table first.");

  // Strip optional fenced code blocks.
  const fence = raw.match(/^```(?:markdown|md|table)?\s*([\s\S]*?)```$/i);
  if (fence) raw = fence[1].trim();

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.includes("|"));

  const tableLines = lines.filter((l) => {
    const t = l.replace(/^\|/, "").replace(/\|$/, "").trim();
    return t.length > 0;
  });

  const pipeLines = tableLines.filter((l) => l.startsWith("|") || l.includes("|"));
  if (pipeLines.length < 2) throw new Error("No Markdown table found.");

  const splitRow = (line) => {
    let s = String(line || "").trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|")) s = s.slice(0, -1);
    return s.split("|").map((c) => c.trim());
  };

  const headers = splitRow(pipeLines[0]).map(sanitizeImportHeader);
  if (!headers.length || headers.every((h) => !h)) {
    throw new Error("Markdown table is missing a header row.");
  }

  const dataLines = pipeLines.slice(1).filter((l) => !ALIGNMENT_ROW_RE.test(l.trim()));
  if (!dataLines.length) throw new Error("Markdown table has no data rows.");

  return dataLines.map((line) => {
    const cells = splitRow(line);
    /** @type {Record<string, unknown>} */
    const row = {};
    headers.forEach((h, i) => {
      if (!h) return;
      row[h] = coerceImportCell(cells[i] ?? "", h);
    });
    return row;
  });
}

/**
 * Parse pasted CSV text into row objects (via SheetJS).
 * @param {string} text
 * @param {typeof import("xlsx")} XLSX
 * @returns {Record<string, unknown>[]}
 */
export function parseCsvText(text, XLSX) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Paste CSV first.");
  if (!XLSX?.read || !XLSX?.utils?.sheet_to_json) {
    throw new Error("CSV parser unavailable.");
  }
  const workbook = XLSX.read(raw, { type: "string" });
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) throw new Error("CSV has no sheet.");
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: "" });
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => r && typeof r === "object" && !Array.isArray(r));
}

/**
 * Compare incoming import columns against the active sheet.
 * @param {string[]} existingColumns
 * @param {Record<string, unknown>[]} incomingRows
 * @returns {{ incoming: string[]; unknown: string[]; missing: string[]; overlap: string[]; hasMismatch: boolean }}
 */
export function diffImportColumns(existingColumns, incomingRows) {
  const existing = [...new Set((existingColumns || []).map(String).filter(Boolean))];
  const incoming = columnKeysFromRows(incomingRows);
  const existingSet = new Set(existing);
  const incomingSet = new Set(incoming);
  const unknown = incoming.filter((c) => !existingSet.has(c));
  const missing = existing.filter((c) => !incomingSet.has(c));
  const overlap = incoming.filter((c) => existingSet.has(c));
  const hasExisting = existing.length > 0;
  const hasMismatch = hasExisting && (unknown.length > 0 || overlap.length === 0);
  return { incoming, unknown, missing, overlap, hasMismatch };
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} existingColumns
 * @param {"enforce"|"add"} policy
 * @returns {Record<string, unknown>[]}
 */
export function applyColumnPolicy(rows, existingColumns, policy) {
  const existing = [...new Set((existingColumns || []).map(String).filter(Boolean))];
  if (policy !== "enforce" || !existing.length) {
    return Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
  }
  const allow = new Set(existing);
  return (rows || []).map((row) => {
    /** @type {Record<string, unknown>} */
    const next = {};
    for (const k of existing) {
      next[k] = row && Object.prototype.hasOwnProperty.call(row, k) ? row[k] : "";
    }
    // Drop unknown keys by only copying allowed fields.
    for (const k of Object.keys(row || {})) {
      if (allow.has(k)) next[k] = row[k];
    }
    return next;
  });
}
