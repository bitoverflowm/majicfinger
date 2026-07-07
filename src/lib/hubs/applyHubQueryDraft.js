import { flushSync } from "react-dom";

import { prepareConnectHomePullSheet } from "@/lib/connectHomePullDestination";

/**
 * Hydrate dashboard compose state from a hub query draft and trigger pull.
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/hubs/hubQueryDraft").HubQueryDraft} draft
 * @param {{ autoPull?: boolean }} [options]
 */
export function applyHubQueryDraft(ctx, draft, options = {}) {
  const { autoPull = true } = options;
  const sampleId = draft.sampleId;
  const columnSelections = draft.columnSelections || {};

  flushSync(() => {
    ctx.setViewing?.("connectDataHome");
    ctx.requestConnectWorkspace?.("kalshiHistorical");
    ctx.setIntegrationSidebar?.("kalshiHistorical");
    ctx.setConnectHomeAnalyzeActive?.(false);
    ctx.setConnectHomeCenterView?.("sheet");
    ctx.setRightPanelOpen?.(false);

    ctx.setConnectDataLakeSampleId?.(sampleId);
    ctx.setConnectDataLakeColumnSelections?.({ ...columnSelections });
    ctx.setDataLakeComposeWhereFilters?.(draft.whereFilters || []);
    ctx.setDataLakeComposeHavingFilters?.(draft.havingFilters || []);
    ctx.setDataLakeComposeJoins?.(draft.joins || []);
    ctx.setDataLakeComposeOrderBy?.(draft.orderBy || []);
    ctx.setDataLakeComposeLimitOpen?.(!!draft.composeLimitOpen);
    ctx.setDataLakeComposeLimitValue?.(draft.composeLimitValue ?? "");
    ctx.setDataLakeComposeLimitScope?.(draft.composeLimitScope ?? "primary");
    ctx.setDataLakeColumnComposeItems?.(
      Array.isArray(draft.columnComposeItems) ? draft.columnComposeItems : [],
    );
    ctx.setConnectActiveComposeOps?.(draft.activeComposeOps || []);

    if (draft.pendingSheetName) {
      ctx.setConnectHomePendingSheetName?.(draft.pendingSheetName);
    }
  });

  prepareConnectHomePullSheet(ctx);
  if (autoPull) {
    ctx.requestConnectDataLakePull?.();
  }
}
