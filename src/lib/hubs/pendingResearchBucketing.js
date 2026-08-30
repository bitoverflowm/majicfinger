/**
 * Hub research-tool bucketing (Buckets / Bands) applied after Athena pull lands.
 * Set when applyHubQueryDraft runs; consumed once when rows are written to the sheet.
 *
 * `sticky` keeps the last enabled config so Compose "Run" / retries can re-arm after
 * a successful take (pending is one-shot).
 */

/** @type {{ enabled: boolean; config: object | null } | null} */
let pending = null;

/** @type {{ enabled: boolean; config: object | null } | null} */
let sticky = null;

/**
 * @param {boolean} enabled
 * @param {object | null | undefined} config
 */
export function setPendingResearchBucketing(enabled, config) {
  if (!enabled || !config || typeof config !== "object") {
    pending = null;
    sticky = null;
    return;
  }
  const next = { enabled: true, config };
  pending = next;
  sticky = next;
}

/** Re-arm pending from sticky before a pull (Compose Run, retry). */
export function ensurePendingResearchBucketing() {
  if (pending?.enabled && pending.config) return pending;
  if (sticky?.enabled && sticky.config) {
    pending = { enabled: true, config: sticky.config };
  }
  return pending;
}

/** @returns {{ enabled: boolean; config: object | null } | null} */
export function peekPendingResearchBucketing() {
  return pending;
}

/** @returns {boolean} */
export function hasStickyResearchBucketing() {
  return !!(sticky?.enabled && sticky.config);
}

/** @returns {{ enabled: boolean; config: object | null } | null} */
export function takePendingResearchBucketing() {
  const next = pending;
  pending = null;
  return next;
}

/** Drop one-shot pending only (keep sticky for the next pull). */
export function clearPendingResearchBucketing() {
  pending = null;
}

/** Drop pending + sticky (Clear workspace / disable bucketing). */
export function clearResearchBucketingSticky() {
  pending = null;
  sticky = null;
}
