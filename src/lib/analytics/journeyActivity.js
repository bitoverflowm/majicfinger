"use client";

/** Idle this long on an open tab → end the visitor journey and send the summary. */
export const VISITOR_IDLE_END_MS = 10 * 60 * 1000;

/** @type {{ path: string; label: string; contentType: string; contentName: string }} */
let lastAt = { path: "", label: "", contentType: "", contentName: "" };
let lastActivityAt = 0;
let idleTimer = null;
/** @type {null | (() => void)} */
let idleEndHandler = null;

function clientTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/**
 * @param {{
 *   path?: string;
 *   label?: string;
 *   contentType?: string;
 *   contentName?: string;
 *   name?: string;
 * }} [partial]
 */
export function noteJourneyActivity(partial = {}) {
  if (typeof window === "undefined") return;
  lastActivityAt = Date.now();
  const path = partial.path || window.location.pathname || "";
  lastAt = {
    path,
    label: String(partial.label || lastAt.label || ""),
    contentType: String(partial.contentType || lastAt.contentType || ""),
    contentName: String(partial.contentName || partial.name || lastAt.contentName || ""),
  };
  scheduleIdleEnd();
}

export function getJourneyExitSnapshot(exitReason = "pagehide") {
  const now = Date.now();
  const idleMs = lastActivityAt ? Math.max(0, now - lastActivityAt) : 0;
  return {
    exitReason,
    idleSeconds: Math.round(idleMs / 1000),
    lastPath: lastAt.path || (typeof window !== "undefined" ? window.location.pathname : ""),
    lastLabel: lastAt.label || "",
    lastContentType: lastAt.contentType || "",
    lastContentName: lastAt.contentName || "",
    timeZone: clientTimeZone(),
  };
}

/** @param {() => void} handler */
export function setJourneyIdleEndHandler(handler) {
  idleEndHandler = handler;
  if (lastActivityAt) scheduleIdleEnd();
}

function scheduleIdleEnd() {
  if (typeof window === "undefined") return;
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (!idleEndHandler) return;

  idleTimer = window.setTimeout(() => {
    idleTimer = null;
    // Only auto-end while the tab is still visible — background tabs flush on pagehide.
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    idleEndHandler?.();
  }, VISITOR_IDLE_END_MS);
}

export function clearJourneyIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}
