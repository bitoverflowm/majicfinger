/**
 * Hub research-tool bucketing (Buckets / Bands) applied after Athena pull lands.
 * Set when applyHubQueryDraft runs; consumed once when rows are written to the sheet.
 *
 * When Bands compile to Athena CASE+GROUP BY, `athenaCompiled` is set at payload-build
 * time so the post-pull pass only zero-fills empty bands (no full re-aggregate).
 *
 * `sticky` keeps the last enabled config so Compose "Run" / retries can re-arm after
 * a successful take (pending is one-shot).
 */

/** @type {{ enabled: boolean; config: object | null; athenaCompiled?: boolean } | null} */
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
  sticky = { enabled: true, config };
}

/** Re-arm pending from sticky before a pull (Compose Run, retry). */
export function ensurePendingResearchBucketing() {
  if (pending?.enabled && pending.config) return pending;
  if (sticky?.enabled && sticky.config) {
    pending = { enabled: true, config: sticky.config };
  }
  return pending;
}

/**
 * Mark that this pull's compose payload already applied Bands in Athena.
 * @param {boolean} compiled
 */
export function markPendingResearchBucketingAthenaCompiled(compiled) {
  if (!pending?.enabled) return;
  pending = { ...pending, athenaCompiled: !!compiled };
}

/** @returns {{ enabled: boolean; config: object | null; athenaCompiled?: boolean } | null} */
export function peekPendingResearchBucketing() {
  return pending;
}

/** @returns {boolean} */
export function hasStickyResearchBucketing() {
  return !!(sticky?.enabled && sticky.config);
}

/** @returns {{ enabled: boolean; config: object | null; athenaCompiled?: boolean } | null} */
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
