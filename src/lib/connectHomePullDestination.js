/**
 * Connect home pull — replace active sheet vs add a new sheet.
 */

import { flushSync } from "react-dom";

import { applySheetIntegrationDecision } from "@/lib/integrations/applyIntegrationDestination";

/** @typedef {"replace" | "new_sheet"} ConnectHomePullDestination */

/**
 * @param {Record<string, { data?: unknown[] }> | null | undefined} dataSheets
 * @param {unknown[] | null | undefined} connectedData
 */
/**
 * User-initiated Run pull (show cancel / sheet progress) — not lake warm-boot only.
 *
 * @param {{ loading?: boolean; label?: string; progress?: number } | null | undefined} pullState
 * @param {{ analyzeActive?: boolean }} [options]
 */
export function isConnectUserDataPullActive(pullState, { analyzeActive = false } = {}) {
  if (!pullState?.loading) return false;
  const label = String(pullState.label || "").toLowerCase();
  if (/preparing workspace/.test(label)) return false;
  if (
    !analyzeActive &&
    /preparing your data pull/.test(label) &&
    (Number(pullState.progress) || 0) <= 2
  ) {
    return false;
  }
  return true;
}

export function connectHomeAnySheetHasData(dataSheets, connectedData) {
  const sheets =
    dataSheets && typeof dataSheets === "object" ? Object.values(dataSheets) : [];
  if (sheets.some((s) => Array.isArray(s?.data) && s.data.length > 0)) return true;
  return Array.isArray(connectedData) && connectedData.length > 0;
}

/**
 * @param {ConnectHomePullDestination | string | null | undefined} value
 * @returns {ConnectHomePullDestination}
 */
export function normalizeConnectHomePullDestination(value) {
  return value === "new_sheet" ? "new_sheet" : "replace";
}

/**
 * Rename a sheet when the user entered a Connect home sheet name.
 *
 * @param {object} ctx
 * @param {string} [sheetId] defaults to activeSheetId
 * @param {string} [nameOverride] prefer over ctx.connectHomePendingSheetName (avoids stale ctx after setState)
 */
export function applyConnectHomeSheetNameToSheet(ctx, sheetId, nameOverride) {
  const fromOverride = nameOverride != null ? String(nameOverride).trim() : "";
  const sheetName = fromOverride || String(ctx?.connectHomePendingSheetName || "").trim();
  const targetId = sheetId || ctx?.activeSheetId;
  const { setDataSheets } = ctx || {};
  if (!sheetName || !targetId || !setDataSheets) return;
  setDataSheets((prev) => {
    const cur = prev?.[targetId];
    if (!cur) return prev;
    return { ...(prev || {}), [targetId]: { ...cur, name: sheetName.slice(0, 80) } };
  });
}

export function applyConnectHomeSheetNameToActiveSheet(ctx, nameOverride) {
  applyConnectHomeSheetNameToSheet(ctx, undefined, nameOverride);
}

/**
 * @param {object} ctx
 * @returns {{ action: "replace" } | { action: "new_sheet" }}
 */
export function resolveConnectHomeSheetDestination(ctx) {
  const hasData = connectHomeAnySheetHasData(ctx?.dataSheets, ctx?.connectedData);
  if (!hasData) return { action: "replace" };
  const dest = normalizeConnectHomePullDestination(ctx?.connectHomePullDestination);
  return dest === "new_sheet" ? { action: "new_sheet" } : { action: "replace" };
}

/**
 * Prepare sheet target for Connect home live-stream pulls.
 *
 * @param {object} ctx
 * @param {{ onStart: (sheetId: string) => void, stopActiveStream?: boolean }} options
 */
/**
 * Before Run pull: empty target sheet and switch to it so Step 2 shows progress + skeleton.
 *
 * @param {object} ctx
 * @param {{ pendingSheetName?: string }} [opts] explicit name — ctx.connectHomePendingSheetName may be stale mid-flush
 * @returns {{ action: "replace" } | { action: "new_sheet" }}
 */
export function prepareConnectHomePullSheet(ctx, opts = {}) {
  const pendingSheetName =
    opts.pendingSheetName != null
      ? String(opts.pendingSheetName).trim()
      : String(ctx?.connectHomePendingSheetName || "").trim();
  const destination = resolveConnectHomeSheetDestination(ctx);
  if (destination.action === "new_sheet" && ctx?.addNewSheetAndActivate) {
    const activeId = ctx?.activeSheetId;
    const activeSheet = activeId ? ctx?.dataSheets?.[activeId] : null;
    const activePreparedEmpty =
      activeId &&
      Array.isArray(activeSheet?.data) &&
      activeSheet.data.length === 0 &&
      !activeSheet?.provenance;
    if (activePreparedEmpty) {
      flushSync(() => {
        applyConnectHomeSheetNameToSheet(ctx, activeId, pendingSheetName);
        ctx.setSheetData?.(activeId, []);
      });
      return destination;
    }
    ctx.addNewSheetAndActivate(
      (newId) => {
        ctx.setSheetData?.(newId, []);
        applyConnectHomeSheetNameToSheet(ctx, newId, pendingSheetName);
      },
      { syncActivate: true },
    );
    return destination;
  }
  flushSync(() => {
    applyConnectHomeSheetNameToActiveSheet(ctx, pendingSheetName);
    ctx.replaceCurrentSheetData?.([]);
  });
  return destination;
}

/**
 * Apply pulled rows without creating a duplicate sheet when Step 2 already prepared an empty tab.
 *
 * @param {object} ctx
 * @param {unknown} incomingRows
 */
export function applyConnectHomePullData(ctx, incomingRows) {
  const destination = resolveConnectHomeSheetDestination(ctx);
  const rows = Array.isArray(incomingRows) ? incomingRows : incomingRows != null ? [incomingRows] : [];
  const activeId = ctx?.activeSheetId;
  const activeSheet = activeId ? ctx?.dataSheets?.[activeId] : null;
  const preparedEmpty =
    destination.action === "new_sheet" &&
    activeId &&
    Array.isArray(activeSheet?.data) &&
    activeSheet.data.length === 0;

  if (preparedEmpty && ctx?.setSheetData) {
    ctx.setSheetData(activeId, rows);
    applyConnectHomeSheetNameToSheet(ctx, activeId);
    return true;
  }

  return applySheetIntegrationDecision(destination, {
    incomingRows: rows,
    setConnectedData: ctx?.setConnectedData,
    addNewSheetAndActivate: ctx?.addNewSheetAndActivate,
    setSheetData: ctx?.setSheetData,
  });
}

export function runConnectHomeLiveStreamPull(ctx, { onStart, stopActiveStream = false }) {
  const destination = resolveConnectHomeSheetDestination(ctx);
  const { activeSheetId, addNewSheetAndActivate, replaceCurrentSheetData, setSheetData, liveStreamActions } =
    ctx || {};

  if (destination.action === "new_sheet" && addNewSheetAndActivate) {
    addNewSheetAndActivate((newId) => {
      setSheetData?.(newId, []);
      applyConnectHomeSheetNameToSheet(ctx, newId);
      onStart(newId);
    });
    return;
  }

  applyConnectHomeSheetNameToActiveSheet(ctx);
  if (stopActiveStream && activeSheetId) {
    liveStreamActions?.stop?.(activeSheetId);
  }
  replaceCurrentSheetData?.([]);
  if (activeSheetId) onStart(activeSheetId);
}
