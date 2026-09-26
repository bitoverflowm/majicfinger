const STORAGE_KEY = "lycheePendingKalshiGuided";
const EVENT_NAME = "lychee:start-kalshi-guided";

export function requestKalshiHistoricalGuidedWorkflow(workflowId) {
  const id = String(workflowId || "").trim();
  if (!id || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    // The workspace can still open if storage is blocked.
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: id }));
}

export function readPendingKalshiHistoricalGuidedWorkflow() {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function clearPendingKalshiHistoricalGuidedWorkflow() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export const KALSHI_GUIDED_START_EVENT = EVENT_NAME;
