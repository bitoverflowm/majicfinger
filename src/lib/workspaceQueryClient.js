const LEGACY_KEYS = ["lycheeIntegrationSavedSearches", "lycheeIntegrationQueryHistory"];

function cacheKey(userId, kind) {
  return `lycheeWorkspaceQueries:v1:${userId}:${kind}`;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function readList(userId, kind) {
  if (typeof localStorage === "undefined" || !userId) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(cacheKey(userId, kind)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function discardSharedQueryStorage() {
  if (typeof localStorage === "undefined") return;
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
}

export function readUserQueryCache(userId) {
  return { saved: readList(userId, "saved"), pulls: readList(userId, "pull") };
}

export function writeUserQueryCache(userId, { saved, pulls }) {
  if (typeof localStorage === "undefined" || !userId) return;
  try {
    localStorage.setItem(cacheKey(userId, "saved"), JSON.stringify(saved || []));
    localStorage.setItem(cacheKey(userId, "pull"), JSON.stringify(pulls || []));
  } catch {
    // Private mode can block storage. The account copy is on the server.
  }
}

export async function loadWorkspaceQueries() {
  const res = await fetch("/api/workspace-queries", { credentials: "include" });
  const json = await readJson(res);
  if (res.status === 401) return { ok: false, unauthorized: true };
  if (!res.ok || !json?.success) return { ok: false };
  return {
    ok: true,
    saved: Array.isArray(json.saved) ? json.saved : [],
    pulls: Array.isArray(json.pulls) ? json.pulls : [],
  };
}

export async function saveWorkspaceQuery(kind, entry) {
  const res = await fetch("/api/workspace-queries", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, entry }),
  });
  const json = await readJson(res);
  if (!res.ok || !json?.success) return { ok: false };
  return { ok: true, entry: json.entry };
}
