import { mergeSheetColumns } from "@/lib/integrations/sheetMerge";

/**
 * @typedef {{ action: 'append', sameSheet: { mode: 'new_rows' | 'new_columns', pivotColumn?: string | null } } | { action: 'replace' } | { action: 'new_sheet' }} SheetIntegrationDecision
 */

/**
 * @param {unknown} raw
 * @returns {SheetIntegrationDecision | null}
 */
export function normalizeIntegrationDestination(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    if (raw === "append") return { action: "append", sameSheet: { mode: "new_rows" } };
    if (raw === "new_sheet") return { action: "new_sheet" };
    if (raw === "replace") return { action: "replace" };
    return { action: "replace" };
  }
  if (typeof raw === "object" && raw.action) return raw;
  return { action: "replace" };
}

/**
 * @param {unknown} destination
 * @param {{ incomingRows: unknown, setConnectedData?: Function, addNewSheetAndActivate?: Function, setSheetData?: Function }} ctx
 * @returns {boolean} true if applied
 */
export function applySheetIntegrationDecision(destination, ctx) {
  const d = normalizeIntegrationDestination(destination);
  if (!d) return false;

  const raw = ctx.incomingRows;
  const incomingRows = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const { setConnectedData, addNewSheetAndActivate, setSheetData } = ctx;

  if (d.action === "new_sheet") {
    addNewSheetAndActivate?.((newId) => setSheetData?.(newId, incomingRows));
    return true;
  }
  if (d.action === "replace") {
    setConnectedData?.(incomingRows);
    return true;
  }
  if (d.action === "append") {
    const sub = d.sameSheet;
    if (!sub || sub.mode === "new_rows") {
      setConnectedData?.((prev) => [...(Array.isArray(prev) ? prev : []), ...incomingRows]);
      return true;
    }
    if (sub.mode === "new_columns") {
      setConnectedData?.((prev) => {
        const existing = Array.isArray(prev) ? prev : [];
        return mergeSheetColumns(existing, incomingRows, {
          pivotColumn: sub.pivotColumn ?? null,
        });
      });
      return true;
    }
  }
  return false;
}
