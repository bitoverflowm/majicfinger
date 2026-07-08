import { flushSync } from "react-dom";

import { genComposeRowId } from "@/lib/dataLakeComposeHelpers";
import { normalizeHubQueryWhereFilters } from "@/lib/hubs/hubQueryDraft";
import { prepareConnectHomePullSheet } from "@/lib/connectHomePullDestination";

/**
 * @param {string} sampleId
 * @param {Record<string, string[]>} columnSelections
 */
export function buildColumnComposeItemsFromSelections(sampleId, columnSelections) {
  const cols = columnSelections?.[sampleId];
  if (!Array.isArray(cols) || cols.length === 0) return [];
  return cols.map((col) => ({
    id: genComposeRowId(),
    column: col,
    alias: col,
    aggregate: null,
    dateBucket: null,
    dateFormat: null,
    stringBucket: null,
    numberBucket: null,
    numberScale: "none",
    decimals: null,
    treatAsDate: false,
    sumCase: { enabled: false, branches: [], elseColumn: "" },
    equation: { enabled: false },
    displayName: null,
  }));
}

/**
 * Hydrate dashboard compose state from a hub query draft and trigger pull.
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/hubs/hubQueryDraft").HubQueryDraft} draft
 * @param {{ autoPull?: boolean; guidedInlinePull?: boolean }} [options]
 */
export function applyHubQueryDraft(ctx, draft, options = {}) {
  const { autoPull = true, guidedInlinePull = false } = options;
  const sampleId = draft.sampleId;
  const columnSelections = draft.columnSelections || {};
  const whereFilters = normalizeHubQueryWhereFilters(draft.whereFilters);

  flushSync(() => {
    ctx.setViewing?.("connectDataHome");
    ctx.setConnectWorkspace?.("kalshiHistorical");
    ctx.setIntegrationSidebar?.("kalshiHistorical");
    if (guidedInlinePull) {
      ctx.setConnectHomeAnalyzeActive?.(true);
      ctx.setGuidedWorkflowPullRequested?.(true);
      ctx.setConnectDataLakePullState?.({
        loading: true,
        error: null,
        label: "Preparing your data pull…",
        progress: 2,
      });
    } else {
      ctx.setConnectHomeAnalyzeActive?.(false);
    }
    ctx.setConnectHomeCenterView?.("sheet");
    ctx.setRightPanelOpen?.(false);

    ctx.setConnectDataLakeSampleId?.(sampleId);
    ctx.setConnectDataLakeColumnSelections?.({ ...columnSelections });
    ctx.setDataLakeComposeWhereFilters?.(whereFilters);
    ctx.setDataLakeComposeHavingFilters?.(draft.havingFilters || []);
    ctx.setDataLakeComposeJoins?.(draft.joins || []);
    ctx.setDataLakeComposeOrderBy?.(draft.orderBy || []);
    ctx.setDataLakeComposeLimitOpen?.(!!draft.composeLimitOpen);
    ctx.setDataLakeComposeLimitValue?.(draft.composeLimitValue ?? "");
    ctx.setDataLakeComposeLimitScope?.(draft.composeLimitScope ?? "primary");
    ctx.setDataLakeColumnComposeItems?.(
      Array.isArray(draft.columnComposeItems) && draft.columnComposeItems.length > 0
        ? draft.columnComposeItems
        : buildColumnComposeItemsFromSelections(sampleId, columnSelections),
    );
    ctx.setConnectActiveComposeOps?.(draft.activeComposeOps || []);

    if (draft.pendingSheetName) {
      ctx.setConnectHomePendingSheetName?.(draft.pendingSheetName);
    }
  });

  prepareConnectHomePullSheet(ctx);
  if (guidedInlinePull && ctx.guidedWorkflowHubDraftRef) {
    ctx.guidedWorkflowHubDraftRef.current = {
      ...draft,
      whereFilters,
    };
  }
  if (autoPull || guidedInlinePull) {
    ctx.requestConnectDataLakePull?.();
  }
}
