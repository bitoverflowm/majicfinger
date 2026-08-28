import { flushSync } from "react-dom";

import { applyHubQueryDraft } from "@/lib/hubs/applyHubQueryDraft";
import { buildHubQueryDraftFromProvenance } from "@/lib/hubs/buildHubQueryDraftFromProvenance";
import { stashConnectComposeEditDraft } from "@/lib/hubs/connectComposeEditDraft";

/**
 * Open Connect compose with the same fields as a historical pull (no auto-run).
 * Replace vs new sheet stays on the usual pull destination controls.
 *
 * @param {Record<string, unknown>} ctx
 * @param {{ sheetId: string; sheet?: object | null }} args
 * @returns {{ ok: true; draft: object } | { ok: false; error: string }}
 */
export function openConnectComposeEdit(ctx, { sheetId, sheet } = {}) {
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

  stashConnectComposeEditDraft(draft);

  flushSync(() => {
    ctx.setActiveSheetId?.(id);
    ctx.setConnectHomePullDestination?.("replace");
    ctx.setConnectHomePendingSheetName?.(String(source.name || "").trim() || "");
    ctx.setConnectHomeAnalyzeActive?.(false);
    ctx.setRightPanelOpen?.(false);

    applyHubQueryDraft(ctx, draft, {
      autoPull: false,
      prepareSheet: false,
      integrationId: draft.integrationId,
    });
  });

  ctx.requestConnectComposeScroll?.();

  return { ok: true, draft };
}
