import { flushSync } from "react-dom";

import { applyHubQueryDraft } from "@/lib/hubs/applyHubQueryDraft";
import { buildHubQueryDraftFromProvenance } from "@/lib/hubs/buildHubQueryDraftFromProvenance";
import { stashConnectComposeEditDraft } from "@/lib/hubs/connectComposeEditDraft";
import { normalizeConnectHomePullDestination } from "@/lib/connectHomePullDestination";

/**
 * Open Connect compose with the same fields as a historical pull (no auto-run).
 *
 * @param {Record<string, unknown>} ctx
 * @param {{
 *   sheetId: string;
 *   sheet?: object | null;
 *   destination?: "replace" | "new_sheet";
 *   pendingSheetName?: string;
 * }} args
 * @returns {{ ok: true; draft: object } | { ok: false; error: string }}
 */
export function openConnectComposeEdit(ctx, { sheetId, sheet, destination, pendingSheetName } = {}) {
  const id = String(sheetId || "").trim();
  const source = sheet || ctx?.dataSheets?.[id] || null;
  if (!id || !source) {
    return { ok: false, error: "Sheet not found." };
  }

  const draft = buildHubQueryDraftFromProvenance({
    provenance: source.provenance,
    sheet: source,
    sheetId: id,
  });
  if (!draft) {
    return {
      ok: false,
      error: "This pull cannot be edited in compose (missing saved query config).",
    };
  }

  const dest = normalizeConnectHomePullDestination(destination ?? "replace");
  const nameFromArg = String(pendingSheetName || "").trim();
  const sheetName =
    dest === "new_sheet"
      ? nameFromArg || String(source.name || "").trim()
      : nameFromArg || String(source.name || "").trim();

  const draftWithName = {
    ...draft,
    pendingSheetName: sheetName || draft.pendingSheetName,
  };

  stashConnectComposeEditDraft(draftWithName);

  flushSync(() => {
    // Replace always targets the history sheet; new sheet is created on Run via destination.
    ctx.setActiveSheetId?.(id);
    ctx.setConnectHomePullDestination?.(dest);
    ctx.setConnectHomePendingSheetName?.(sheetName || "");
    ctx.setConnectHomeAnalyzeActive?.(false);
    ctx.setRightPanelOpen?.(false);

    applyHubQueryDraft(ctx, draftWithName, {
      autoPull: false,
      prepareSheet: false,
      integrationId: draftWithName.integrationId,
    });
  });

  ctx.requestConnectComposeScroll?.();

  return { ok: true, draft: draftWithName };
}
