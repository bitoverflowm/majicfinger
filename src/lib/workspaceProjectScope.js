/**
 * Which project the dashboard has open, for code that keys browser storage by user.
 * Every project has a "welcome" tab, so start tabs and canvas copies are kept per project.
 * Projects from before projects existed use scope "" and keep their old storage keys.
 */

let activeScope = "";

export function setWorkspaceProjectScope(scope) {
  activeScope = String(scope || "");
}

export function workspaceProjectScope() {
  return activeScope;
}

/** The storage owner for `userId` inside the open project. Signed-out and demo storage is never scoped. */
export function scopedLocalOwner(userId, scope = activeScope) {
  const id = String(userId || "");
  if (!id || id === "local" || !scope) return id;
  return `${id}@${scope}`;
}

const LAST_PROJECT_PREFIX = "lycheeWorkspaceLastProject:";
const SCOPES_PREFIX = "lycheeWorkspaceProjectScopes:";

function readJson(key, fallback) {
  if (typeof localStorage === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode can block storage; the project then resolves from the server.
  }
}

/** `{ id, scope }` of the project this browser had open last, or null. */
export function readLastWorkspaceProject(userId) {
  const last = readJson(`${LAST_PROJECT_PREFIX}${userId}`, null);
  return last && typeof last.id === "string" && last.id ? { id: last.id, scope: String(last.scope || "") } : null;
}

export function readWorkspaceProjectScope(userId, projectId) {
  const scopes = readJson(`${SCOPES_PREFIX}${userId}`, {});
  return typeof scopes?.[projectId] === "string" ? scopes[projectId] : null;
}

export function rememberWorkspaceProject(userId, project) {
  if (!userId || !project?.id) return;
  const scope = String(project.scope ?? project.localScope ?? "");
  writeJson(`${LAST_PROJECT_PREFIX}${userId}`, { id: project.id, scope });
  const scopes = readJson(`${SCOPES_PREFIX}${userId}`, {});
  writeJson(`${SCOPES_PREFIX}${userId}`, { ...(scopes && typeof scopes === "object" ? scopes : {}), [project.id]: scope });
}

/** Drops a deleted project's browser copies, so they cannot seed a later project. */
export function forgetWorkspaceProject(userId, project) {
  if (!userId || !project?.id || typeof localStorage === "undefined") return;
  const scope = String(project.scope ?? project.localScope ?? "");
  const owner = scope ? `${userId}@${scope}` : String(userId);
  const canvasPrefix = `lycheeWorkspaceCanvas:v1:${owner}:`;
  const exact = new Set([`lycheeWorkspaceStartTabs:${owner}`, `lycheeWorkspaceDashboardDoc:v1:${owner}`]);
  try {
    const doomed = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key.startsWith(canvasPrefix) || exact.has(key))) doomed.push(key);
    }
    for (const key of doomed) localStorage.removeItem(key);
    const scopes = readJson(`${SCOPES_PREFIX}${userId}`, {});
    if (scopes && typeof scopes === "object" && project.id in scopes) {
      delete scopes[project.id];
      writeJson(`${SCOPES_PREFIX}${userId}`, scopes);
    }
    if (readLastWorkspaceProject(userId)?.id === project.id) localStorage.removeItem(`${LAST_PROJECT_PREFIX}${userId}`);
  } catch {
    // Storage blocked; nothing to clean.
  }
}
