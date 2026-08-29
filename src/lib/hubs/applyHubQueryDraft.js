import { flushSync } from "react-dom";

import { genComposeRowId } from "@/lib/dataLakeComposeHelpers";
import { normalizeHubQueryWhereFilters } from "@/lib/hubs/hubQueryDraft";
import { prepareConnectHomePullSheet } from "@/lib/connectHomePullDestination";
import { setPendingResearchBucketing } from "@/lib/hubs/pendingResearchBucketing";

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
 * @param {{ autoPull?: boolean; guidedInlinePull?: boolean; integrationId?: string }} [options]
 */
export function applyHubQueryDraft(ctx, draft, options = {}) {
  const { autoPull = true, guidedInlinePull = false } = options;
  // Edit-from-history passes prepareSheet: false so we don't wipe the sheet until Run.
  const prepareSheet =
    options.prepareSheet != null ? !!options.prepareSheet : autoPull || guidedInlinePull;
  const sampleId = draft.sampleId;
  const columnSelections = draft.columnSelections || {};
  const whereFilters = normalizeHubQueryWhereFilters(draft.whereFilters);

  const integrationId =
    options.integrationId || draft.integrationId || "kalshiHistorical";

  flushSync(() => {
    ctx.setViewing?.("connectDataHome");
    ctx.setConnectWorkspace?.(integrationId);
    ctx.setIntegrationSidebar?.(integrationId);
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
    ctx.setDataLakeComposeRandomSampleEnabled?.(!!draft.randomSampleEnabled);
    ctx.setDataLakeComposeRandomSampleSize?.(draft.randomSampleSize ?? "");
    ctx.setDataLakeColumnComposeItems?.(
      Array.isArray(draft.columnComposeItems) && draft.columnComposeItems.length > 0
        ? draft.columnComposeItems
        : buildColumnComposeItemsFromSelections(sampleId, columnSelections),
    );
    ctx.setConnectActiveComposeOps?.(draft.activeComposeOps || []);

    setPendingResearchBucketing(!!draft.bucketingEnabled, draft.bucketConfig);

    if (draft.pendingSheetName) {
      ctx.setConnectHomePendingSheetName?.(draft.pendingSheetName);
    }
  });

  if (prepareSheet) {
    prepareConnectHomePullSheet(ctx, {
      pendingSheetName: draft.pendingSheetName,
    });
  }
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
