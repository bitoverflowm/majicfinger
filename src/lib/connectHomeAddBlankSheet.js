import { CONNECT_HOME_CENTER_VIEW } from "@/lib/connectHomeFlow";

const NEW_SHEET_NAME_RE = /^new_sheet_(\d+)$/;

/** One empty row so the grid opens ready to type (same as CONNECT_BLANK_SHEET_SEED_ROWS). */
const BLANK_SHEET_SEED_ROWS = [{}];

/**
 * Next auto label for a blank Connect sheet: `new_sheet_0`, `new_sheet_1`, …
 * Uses the max existing `new_sheet_N` name (not sheet id), so users can keep
 * adding empty sheets indefinitely.
 *
 * @param {Record<string, { name?: string }>|null|undefined} dataSheets
 * @returns {string}
 */
export function nextNewSheetLabel(dataSheets) {
  const sheets =
    dataSheets && typeof dataSheets === "object" ? Object.values(dataSheets) : [];
  let max = -1;
  for (const sheet of sheets) {
    const m = String(sheet?.name || "").match(NEW_SHEET_NAME_RE);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `new_sheet_${max + 1}`;
}

/**
 * Add a new empty data sheet to the current Connect workspace and focus it.
 *
 * Shared entry for:
 * - Workspace nav “Add sheet” icon (`ConnectHomeWorkspaceNav`)
 * - Connect hub “Start from blank” when adding into an existing project (later)
 *
 * @param {object} ctx Connect state / actions from `useMyStateV2`
 * @returns {string|null} New sheet id, or null if unavailable
 */
export function connectHomeAddBlankSheet(ctx) {
  const addNewSheetAndActivate = ctx?.addNewSheetAndActivate;
  if (typeof addNewSheetAndActivate !== "function") return null;

  const name = nextNewSheetLabel(ctx?.dataSheets);
  /** @type {string|null} */
  let createdId = null;

  addNewSheetAndActivate(
    (newId) => {
      createdId = newId;
      ctx?.setConnectHomeCenterView?.(CONNECT_HOME_CENTER_VIEW.SHEET);
      ctx?.setConnectHomeAnalyzeActive?.(true);
      if (ctx?.setDataConnected && !ctx?.dataConnected) {
        ctx.setDataConnected(true);
      }
      ctx?.setRightPanelTab?.((prev) =>
        prev === "charts" || prev === "dashboard" ? "integrations" : prev,
      );
    },
    {
      name,
      data: [...BLANK_SHEET_SEED_ROWS],
      syncActivate: true,
    },
  );

  return createdId;
}
