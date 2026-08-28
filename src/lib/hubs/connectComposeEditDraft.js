/** @typedef {import("./hubQueryDraft").HubQueryDraft} HubQueryDraft */

/** @type {HubQueryDraft | null} */
let pendingEditDraft = null;

/** @type {Set<() => void>} */
const listeners = new Set();

/**
 * Stash a compose draft for hub builders to consume when Edit opens compose.
 * @param {HubQueryDraft | null | undefined} draft
 */
export function stashConnectComposeEditDraft(draft) {
  pendingEditDraft = draft && typeof draft === "object" ? draft : null;
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore subscriber errors */
    }
  }
}

/**
 * Take (and clear) a pending edit draft for this integration.
 * @param {string} integrationId
 * @returns {HubQueryDraft | null}
 */
export function takeConnectComposeEditDraft(integrationId) {
  if (!pendingEditDraft) return null;
  if (String(pendingEditDraft.integrationId || "") !== String(integrationId || "")) return null;
  const draft = pendingEditDraft;
  pendingEditDraft = null;
  return draft;
}

/** @returns {HubQueryDraft | null} */
export function peekConnectComposeEditDraft() {
  return pendingEditDraft;
}

/**
 * @param {() => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribeConnectComposeEditDraft(fn) {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
