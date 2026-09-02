/**
 * Cross-component bus: Sheet panel → GridView equation editors.
 * Avoids threading more state through the giant StateContextV2 provider.
 */

/** @typedef {{
 *   sheetId?: string | null;
 *   type: string;
 *   label: string;
 *   op?: object | null;
 *   composeAlias?: string | null;
 * }} SheetEquationEditRequest
 */

/** @type {Set<(req: SheetEquationEditRequest) => void>} */
const listeners = new Set();

/**
 * @param {SheetEquationEditRequest} request
 */
export function requestSheetEquationEdit(request) {
  if (!request || typeof request !== "object") return;
  const payload = { ...request, ts: Date.now() };
  for (const fn of listeners) {
    try {
      fn(payload);
    } catch {
      /* ignore listener errors */
    }
  }
}

/**
 * @param {(req: SheetEquationEditRequest) => void} fn
 * @returns {() => void}
 */
export function subscribeSheetEquationEdit(fn) {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Build clickable equation entries from a sheet's operation history (+ compose equations).
 * @param {object | null | undefined} sheet
 * @returns {Array<{ id: string; label: string; type: string; op: object | null; composeAlias?: string }>}
 */
export function listSheetEquations(sheet) {
  const out = [];
  const history = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
  for (const op of history) {
    if (!op || typeof op !== "object") continue;
    const type = String(op.type || "");
    const id = String(op.id || `${type}-${out.length}`);

    if (type === "computed.column") {
      const col = op.column || op.payload?.column;
      const kind = op.expression?.kind || op.payload?.expression?.kind;
      out.push({
        id,
        type,
        op,
        label: col ? `${col}${kind ? ` (${kind})` : ""}` : "Computed column",
      });
      continue;
    }
    if (type === "summary.row") {
      const outputs = op.outputs || op.payload?.outputs;
      const label =
        Array.isArray(outputs) && outputs.length ? outputs.join(", ") : "Summary row";
      out.push({ id, type, op, label: `Summary · ${label}` });
      continue;
    }
    if (type === "bucket.sheet" || type === "band.sheet") {
      out.push({
        id,
        type,
        op,
        label: type === "band.sheet" ? "Bands" : "Buckets",
      });
      continue;
    }
    if (type.startsWith("quant.") || type.includes("equation")) {
      out.push({ id, type, op, label: type });
    }
  }

  const select = sheet?.provenance?.composeSpec?.select;
  if (Array.isArray(select)) {
    select.forEach((item, idx) => {
      if (!item?.equation) return;
      const alias = String(item.alias || item.column || "equation").trim();
      out.push({
        id: `compose-eq-${alias || idx}`,
        type: "compose.equation",
        op: null,
        composeAlias: alias,
        label: `Compose · ${alias}`,
      });
    });
  }

  // Dedupe by label+type while keeping first op reference
  const seen = new Set();
  return out.filter((entry) => {
    const key = `${entry.type}::${entry.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(entry.label);
  });
}
