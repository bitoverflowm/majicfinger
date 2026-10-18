import { emptyWorkspaceDashboard } from "@/lib/workspaceDashboardDocument";

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function loadWorkspaceDashboardPreview() {
  const res = await fetch("/api/workspace-dashboards/preview", { credentials: "include" });
  const json = await readJson(res);
  if (res.status === 401) return { ok: false, unauthorized: true };
  if (res.status === 404) return { ok: true, data: null };
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.message || "Could not load the preview." };
  }
  return { ok: true, data: json.data || null };
}

/** `blocksOnly` skips the tables list, for tabs fetched after the first one. */
export async function loadCurrentWorkspaceDashboard(tab, { blocksOnly = false } = {}) {
  const id = String(tab || "").trim();
  const query = id ? `?tab=${encodeURIComponent(id)}${blocksOnly ? "&part=1" : ""}` : "";
  const res = await fetch(`/api/workspace-dashboards/current${query}`, { credentials: "include" });
  const json = await readJson(res);
  if (res.status === 401) return { ok: false, unauthorized: true };
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.message || "Could not load the dashboard." };
  }
  return { ok: true, data: json.data || null };
}

export async function createWorkspaceDashboard(draft) {
  const res = await fetch("/api/workspace-dashboards/current", {
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
 * @param {{ meta?: object, blocks?: Record<string, object[]>, remove_tabs?: string[], tables?: { upsert?: object[], remove?: string[] } }} patch
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
