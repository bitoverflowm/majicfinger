/**
 * Apply a hub query draft into HubKalshi/HubPolymarket local builder state.
 *
 * @param {import("./hubQueryDraft").HubQueryDraft} draft
 * @param {{
 *   setSampleId: (id: string) => void;
 *   setColumnSelections: (next: Record<string, string[]>) => void;
 *   setActiveComposeOps: (ops: string[]) => void;
 *   setComposeDraft: (draft: object) => void;
 *   composeDraftRef: { current: object };
 *   setComposeSeed: (seed: object | null) => void;
 *   setSheetName?: (name: string) => void;
 *   setError?: (msg: string | null) => void;
 * }} setters
 */
export function applyDraftToHubBuilderState(draft, setters) {
  if (!draft?.sampleId) return;

  const composeSnapshot = {
    activeComposeOps: draft.activeComposeOps || [],
    columnComposeItems: draft.columnComposeItems || [],
    orderBy: draft.orderBy || [],
    whereFilters: draft.whereFilters || [],
    havingFilters: draft.havingFilters || [],
    joins: draft.joins || [],
    composeLimitOpen: !!draft.composeLimitOpen,
    composeLimitValue: draft.composeLimitValue ?? "",
    composeLimitScope: draft.composeLimitScope ?? "primary",
    randomSampleEnabled: !!draft.randomSampleEnabled,
    randomSampleSize: draft.randomSampleSize ?? "",
    randomSampleSeeded: draft.randomSampleSeeded !== false,
    randomSampleSeed: draft.randomSampleSeed ?? "",
    bucketingEnabled: !!draft.bucketingEnabled,
    bucketConfig:
      draft.bucketConfig && typeof draft.bucketConfig === "object" ? draft.bucketConfig : null,
  };

  setters.setError?.(null);
  setters.setSampleId(draft.sampleId);
  setters.setColumnSelections({ ...(draft.columnSelections || {}) });
  setters.setActiveComposeOps(Array.isArray(draft.activeComposeOps) ? [...draft.activeComposeOps] : []);
  setters.composeDraftRef.current = composeSnapshot;
  setters.setComposeDraft(composeSnapshot);
  setters.setComposeSeed(composeSnapshot);
  if (setters.setSheetName) {
    setters.setSheetName(String(draft.pendingSheetName || "").trim());
  }
}
