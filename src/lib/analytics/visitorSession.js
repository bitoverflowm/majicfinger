const SESSION_ID_KEY = "lychee:visitorSessionId";
const SESSION_STARTED_KEY = "lychee:visitorSessionStarted";
const SESSION_ENDED_KEY = "lychee:visitorSessionEnded";

/** @returns {string | null} */
export function getVisitorSessionId() {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(SESSION_ID_KEY);
  } catch {
    return null;
  }
}

/** @returns {string} */
export function getOrCreateVisitorSessionId() {
  if (typeof window === "undefined") return "";

  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_ID_KEY, id);
    return id;
  } catch {
    return `sess-${Date.now()}`;
  }
}

export function hasVisitorSessionStarted() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_STARTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markVisitorSessionStarted() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_STARTED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasVisitorSessionEnded() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_ENDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markVisitorSessionEnded() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_ENDED_KEY, "1");
  } catch {
    /* ignore */
  }
}
