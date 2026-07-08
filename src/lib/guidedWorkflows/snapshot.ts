import type { GuidedSnapshotMatch, GuidedWorkflowSnapshot } from "./types";

/**
 * @param {object} hubState
 * @param {string} hubState.sampleId
 * @param {Record<string, string[]>} hubState.columnSelections
 * @param {string[]} hubState.activeComposeOps
 * @param {object} hubState.composeDraft
 * @param {string} hubState.sheetName
 */
export function buildGuidedSnapshot(hubState: {
  sampleId: string;
  columnSelections: Record<string, string[]>;
  activeComposeOps: string[];
  composeDraft: Record<string, unknown>;
  sheetName: string;
}): GuidedWorkflowSnapshot {
  const { sampleId, columnSelections, activeComposeOps, composeDraft, sheetName } = hubState;
  const draft = composeDraft || {};

  return {
    sampleId: sampleId || "",
    selectedColumns: sampleId ? columnSelections[sampleId] || [] : [],
    activeComposeOps: (draft.activeComposeOps as string[]) || activeComposeOps || [],
    whereFilters: ((draft.whereFilters as GuidedWorkflowSnapshot["whereFilters"]) || []).map((f) => ({
      column: String(f.column || ""),
      op: String(f.op || ""),
      value: String(f.value ?? ""),
    })),
    orderBy: (draft.orderBy as GuidedWorkflowSnapshot["orderBy"]) || [],
    havingFilters: (draft.havingFilters as unknown[]) || [],
    joins: (draft.joins as unknown[]) || [],
    composeLimitOpen: !!draft.composeLimitOpen,
    composeLimitValue: String(draft.composeLimitValue ?? ""),
    sheetName: sheetName || "",
  };
}

/** Returns true when snapshot satisfies a declarative match spec. */
export function snapshotMatches(
  snapshot: GuidedWorkflowSnapshot,
  match?: GuidedSnapshotMatch,
): boolean {
  if (!match) return true;

  if (match.sampleId != null && snapshot.sampleId !== match.sampleId) return false;

  if (match.selectedColumns != null) {
    const spec = match.selectedColumns;
    if (Array.isArray(spec)) {
      if (spec.some((c) => !snapshot.selectedColumns.includes(c))) return false;
    } else {
      if (spec.includes?.some((c) => !snapshot.selectedColumns.includes(c))) return false;
      if (spec.length != null && snapshot.selectedColumns.length < spec.length) return false;
    }
  }

  if (match.activeComposeOps != null) {
    const spec = match.activeComposeOps;
    if (Array.isArray(spec)) {
      if (spec.some((op) => !snapshot.activeComposeOps.includes(op))) return false;
    } else if (typeof spec === "object" && spec.includes) {
      if (!snapshot.activeComposeOps.includes(spec.includes)) return false;
    }
  }

  if (match.whereFilterCount != null && snapshot.whereFilters.length < match.whereFilterCount) {
    return false;
  }

  if (match.whereFilter != null) {
    const spec = match.whereFilter;
    const found = snapshot.whereFilters.some((f) => {
      if (spec.column != null && f.column !== spec.column) return false;
      if (spec.op != null && f.op !== spec.op) return false;
      if (spec.value != null && f.value !== spec.value) return false;
      if (
        spec.valueEqualsIgnoreCase != null &&
        f.value.trim().toLowerCase() !== spec.valueEqualsIgnoreCase.trim().toLowerCase()
      ) {
        return false;
      }
      return true;
    });
    if (!found) return false;
  }

  if (match.orderBy != null) {
    const spec = match.orderBy;
    const found = snapshot.orderBy.some((row) => {
      if (spec.alias != null && row.alias !== spec.alias) return false;
      if (spec.direction != null && row.direction !== spec.direction) return false;
      return true;
    });
    if (!found) return false;
  }

  if (match.composeLimitOpen != null && snapshot.composeLimitOpen !== match.composeLimitOpen) {
    return false;
  }

  if (match.composeLimitValue != null && snapshot.composeLimitValue !== match.composeLimitValue) {
    return false;
  }

  if (match.sheetName != null && snapshot.sheetName !== match.sheetName) return false;

  if (match.sheetNameNonEmpty && !snapshot.sheetName.trim()) return false;

  return true;
}
