const AUTH_SESSION_ID_KEY = "lychee:authSessionId";
const AUTH_SESSION_STARTED_KEY = "lychee:authSessionStarted";
const AUTH_SESSION_ENDED_KEY = "lychee:authSessionEnded";

/** @returns {string | null} */
export function getAuthSessionId() {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(AUTH_SESSION_ID_KEY);
  } catch {
    return null;
  }
}

/** @returns {string} */
export function getOrCreateAuthSessionId() {
  if (typeof window === "undefined") return "";
  try {
    const existing = sessionStorage.getItem(AUTH_SESSION_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `auth-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(AUTH_SESSION_ID_KEY, id);
    return id;
  } catch {
    return `auth-${Date.now()}`;
  }
}

export function hasAuthSessionStarted() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(AUTH_SESSION_STARTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAuthSessionStarted() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AUTH_SESSION_STARTED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasAuthSessionEnded() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(AUTH_SESSION_ENDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAuthSessionEnded() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AUTH_SESSION_ENDED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearAuthSessionStorage() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AUTH_SESSION_ID_KEY);
    sessionStorage.removeItem(AUTH_SESSION_STARTED_KEY);
    sessionStorage.removeItem(AUTH_SESSION_ENDED_KEY);
  } catch {
    /* ignore */
  }
}

export function resetAuthSessionStorage() {
  clearAuthSessionStorage();
  return getOrCreateAuthSessionId();
}
