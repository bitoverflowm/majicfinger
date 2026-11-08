import { emptyWorkspaceDashboard } from "@/lib/workspaceDashboardDocument";

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function withParams(path, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function loadWorkspaceDashboardPreview({ project = "" } = {}) {
  const res = await fetch(withParams("/api/workspace-dashboards/preview", { project }), { credentials: "include" });
  const json = await readJson(res);
  if (res.status === 401) return { ok: false, unauthorized: true };
  if (res.status === 404) return { ok: true, data: null };
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.message || "Could not load the preview." };
  }
  return { ok: true, data: json.data || null };
}

/**
 * Loads one project (`project`, else the one opened last), with the blocks of one tab.
 * `blocksOnly` skips the tables list, for tabs fetched after the first one.
 */
export async function loadCurrentWorkspaceDashboard(tab, { blocksOnly = false, project = "" } = {}) {
  const id = String(tab || "").trim();
  const url = withParams("/api/workspace-dashboards/current", {
    project,
    tab: id,
    part: id && blocksOnly ? "1" : "",
  });
  const res = await fetch(url, { credentials: "include" });
  const json = await readJson(res);
  if (res.status === 401) return { ok: false, unauthorized: true };
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.message || "Could not load the dashboard." };
  }
  return { ok: true, data: json.data || null };
}

/** Creates the user's first project; returns the existing one (or `project`) when there is one. */
export async function createWorkspaceDashboard(draft, { project = "" } = {}) {
  const res = await fetch(withParams("/api/workspace-dashboards/current", { project }), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft || emptyWorkspaceDashboard()),
  });
  const json = await readJson(res);
  if (!res.ok || !json?.success || !json.data) {
    return { ok: false, message: json?.message || "Could not create the dashboard." };
  }
  return { ok: true, data: json.data };
}

/**
 * Saves only what changed.
 * @param {string} id
 * @param {{ meta?: object, blocks?: Record<string, object[]>, remove_tabs?: string[], tables?: { upsert?: object[], remove?: string[] }, project?: { starred?: boolean, kind?: string, name?: string } }} patch
 */
export async function patchWorkspaceDashboard(id, patch, { keepalive = false } = {}) {
  const res = await fetch(`/api/workspace-dashboards/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch || {}),
    keepalive,
  });
  const json = await readJson(res);
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.message || "Could not save the dashboard." };
  }
  return { ok: true, data: json.data };
}

export async function saveWorkspaceDashboard(id, draft, { keepalive = false } = {}) {
  const res = await fetch(`/api/workspace-dashboards/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
    keepalive,
  });
  const json = await readJson(res);
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.message || "Could not save the dashboard." };
  }
  return { ok: true, data: json.data };
}

/** Summaries of every project, newest edit first. */
export async function listWorkspaceProjects() {
  const res = await fetch("/api/workspace-dashboards", { credentials: "include" });
  const json = await readJson(res);
  if (res.status === 401) return { ok: false, unauthorized: true };
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.message || "Could not load your projects." };
  }
  return { ok: true, data: Array.isArray(json.data) ? json.data : [] };
}

/** One project's summary: `id`, or the one opened last. `data` is null when there is none. */
export async function loadWorkspaceProjectHead(id = "") {
  const res = await fetch(withParams("/api/workspace-dashboards", id ? { id } : { last: "1" }), { credentials: "include" });
  const json = await readJson(res);
  if (res.status === 401) return { ok: false, unauthorized: true };
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.message || "Could not load the project." };
  }
  return { ok: true, data: json.data || null };
}

/**
 * @param {{ name?: string, kind?: "dashboard" | "terminal", tabs?: object[], active_tab_id?: string, welcome_removed?: boolean }} draft
 */
export async function createWorkspaceProject(draft = {}) {
  const res = await fetch("/api/workspace-dashboards", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const json = await readJson(res);
  if (!res.ok || !json?.success || !json.data) {
    return { ok: false, status: res.status, message: json?.message || "Could not create the project." };
  }
  return { ok: true, data: json.data };
}

/** @param {{ starred?: boolean, kind?: "dashboard" | "terminal", name?: string }} fields */
export function updateWorkspaceProject(id, fields) {
  return patchWorkspaceDashboard(id, { project: fields });
}

export async function deleteWorkspaceProject(id) {
  const res = await fetch(`/api/workspace-dashboards/${id}`, { method: "DELETE", credentials: "include" });
  const json = await readJson(res);
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.message || "Could not delete the project." };
  }
  return { ok: true };
}

export async function uploadWorkspaceProjectThumbnail(id, image, { keepalive = false } = {}) {
  const res = await fetch(`/api/workspace-dashboards/thumbnail/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
    keepalive,
  });
  const json = await readJson(res);
  if (!res.ok || !json?.success) return { ok: false, message: json?.message || "Could not save the thumbnail." };
  return { ok: true, data: json.data };
}

export function workspaceProjectThumbnailUrl(project) {
  if (!project?.id || !project.thumbnailAt) return "";
  return `/api/workspace-dashboards/thumbnail/${project.id}?v=${encodeURIComponent(new Date(project.thumbnailAt).getTime())}`;
}
