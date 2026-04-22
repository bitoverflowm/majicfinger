/**
 * Merge integration pull into an existing sheet as additional columns (join / index-align).
 * Column name clashes get numeric suffixes: t → t_1 → t_2
 * Missing cells use Number.NaN (preserved by coerceCell).
 */

function disambiguateKey(usedSet, base) {
  if (!usedSet.has(base)) return base;
  let i = 1;
  let candidate = `${base}_${i}`;
  while (usedSet.has(candidate)) {
    i += 1;
    candidate = `${base}_${i}`;
  }
  return candidate;
}

function pivotValueKey(value) {
  if (value === undefined) return "\0__undef__";
  if (value === null) return "\0__null__";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function mergeTwoRows(baseRow, incomingRow, pivotColumn, usePivot) {
  const a = baseRow && typeof baseRow === "object" ? baseRow : {};
  const b = incomingRow && typeof incomingRow === "object" ? incomingRow : {};
  const used = new Set(Object.keys(a));
  const out = { ...a };

  for (const [k, v] of Object.entries(b)) {
    if (usePivot && k === pivotColumn) {
      const left = a[pivotColumn];
      const right = b[pivotColumn];
      out[pivotColumn] =
        left !== undefined ? left : right !== undefined ? right : Number.NaN;
      continue;
    }
    let nk = k;
    if (used.has(nk)) nk = disambiguateKey(used, k);
    used.add(nk);
    out[nk] = v;
  }

  if (usePivot && pivotColumn && !(pivotColumn in out)) {
    out[pivotColumn] = Number.NaN;
  }

  return out;
}

function fillMissingWithNaN(rows) {
  if (!rows.length) return rows;
  const orderedKeys = [];
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        orderedKeys.push(k);
      }
    }
  }
  return rows.map((row) => {
    const r = row && typeof row === "object" ? { ...row } : {};
    for (const k of orderedKeys) {
      if (!(k in r)) r[k] = Number.NaN;
    }
    return r;
  });
}

function mergeByPivotKey(existing, incoming, pivotColumn) {
  const existingMap = new Map();
  const existingOrder = [];
  const existingOrphans = [];

  existing.forEach((row) => {
    if (!row || typeof row !== "object") return;
    if (!(pivotColumn in row)) {
      existingOrphans.push(row);
      return;
    }
    const pk = pivotValueKey(row[pivotColumn]);
    if (!existingMap.has(pk)) existingOrder.push(pk);
    existingMap.set(pk, row);
  });

  const incomingMap = new Map();
  const incomingOrder = [];
  const incomingOrphans = [];

  incoming.forEach((row) => {
    if (!row || typeof row !== "object") return;
    if (!(pivotColumn in row)) {
      incomingOrphans.push(row);
      return;
    }
    const pk = pivotValueKey(row[pivotColumn]);
    if (!incomingMap.has(pk)) incomingOrder.push(pk);
    incomingMap.set(pk, row);
  });

  const mergedKeys = [];
  const seen = new Set();
  for (const pk of existingOrder) {
    mergedKeys.push(pk);
    seen.add(pk);
  }
  for (const pk of incomingOrder) {
    if (!seen.has(pk)) {
      mergedKeys.push(pk);
      seen.add(pk);
    }
  }

  const merged = mergedKeys.map((pk) =>
    mergeTwoRows(existingMap.get(pk) || {}, incomingMap.get(pk) || {}, pivotColumn, true),
  );

  for (const row of existingOrphans) {
    merged.push(mergeTwoRows(row, {}, pivotColumn, true));
  }
  for (const row of incomingOrphans) {
    merged.push(mergeTwoRows({}, row, pivotColumn, true));
  }

  return fillMissingWithNaN(merged);
}

function collectIncomingRename(existingKeysOrdered, incomingKeysOrdered) {
  const used = new Set(existingKeysOrdered);
  const rename = new Map();
  for (const k of incomingKeysOrdered) {
    const nk = disambiguateKey(used, k);
    used.add(nk);
    rename.set(k, nk);
  }
  return rename;
}

function orderedKeysFromRows(rows) {
  const ordered = [];
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        ordered.push(k);
      }
    }
  }
  return ordered;
}

function mergeByRowIndex(existing, incoming) {
  const exKeys = orderedKeysFromRows(existing);
  const inKeys = orderedKeysFromRows(incoming);
  const rename = collectIncomingRename(exKeys, inKeys);
  const n = Math.max(existing.length, incoming.length);
  const out = [];

  for (let i = 0; i < n; i += 1) {
    const e = existing[i];
    const inc = incoming[i];
    const eObj = e && typeof e === "object" ? e : {};
    const iObj = inc && typeof inc === "object" ? inc : {};
    const row = {};

    for (const k of exKeys) {
      row[k] = k in eObj ? eObj[k] : Number.NaN;
    }
    for (const k of inKeys) {
      const nk = rename.get(k);
      row[nk] = k in iObj ? iObj[k] : Number.NaN;
    }
    out.push(row);
  }

  return fillMissingWithNaN(out);
}

/**
 * @param {Array<Record<string, unknown>>} existingRows
 * @param {Array<Record<string, unknown>>} incomingRows
 * @param {{ pivotColumn?: string | null }} options
 * @returns {Array<Record<string, unknown>>}
 */
export function mergeSheetColumns(existingRows, incomingRows, options = {}) {
  const pivotColumn = options.pivotColumn ?? null;
  const existing = Array.isArray(existingRows) ? existingRows : [];
  const incoming = Array.isArray(incomingRows) ? incomingRows : [];

  if (existing.length === 0) return incoming.slice();
  if (incoming.length === 0) return existing.slice();

  if (pivotColumn == null || String(pivotColumn).trim() === "") {
    return mergeByRowIndex(existing, incoming);
  }

  return mergeByPivotKey(existing, incoming, pivotColumn);
}
