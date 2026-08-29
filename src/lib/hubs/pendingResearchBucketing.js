/**
 * Hub research-tool bucketing (Buckets / Bands) applied after Athena pull lands.
 * Set when applyHubQueryDraft runs; consumed once when rows are written to the sheet.
 */

/** @type {{ enabled: boolean; config: object | null } | null} */
let pending = null;

/**
 * @param {boolean} enabled
 * @param {object | null | undefined} config
 */
export function setPendingResearchBucketing(enabled, config) {
  if (!enabled || !config || typeof config !== "object") {
    pending = null;
    return;
  }
  pending = { enabled: true, config };
}

/** @returns {{ enabled: boolean; config: object | null } | null} */
export function peekPendingResearchBucketing() {
  return pending;
}

/** @returns {{ enabled: boolean; config: object | null } | null} */
export function takePendingResearchBucketing() {
  const next = pending;
  pending = null;
  return next;
}

export function clearPendingResearchBucketing() {
  pending = null;
}
