async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function call(url, init, fallback) {
  try {
    const res = await fetch(url, { credentials: "include", ...init });
    const json = await readJson(res);
    if (!res.ok || !json?.success) return { ok: false, status: res.status, code: json?.code || "", message: json?.message || fallback };
    return { ok: true, data: json.data ?? null };
  } catch {
    return { ok: false, status: 0, code: "", message: fallback };
  }
}

export function loadProjectPublish(projectId) {
  return call(`/api/workspace-dashboards/publish/${encodeURIComponent(projectId)}`, {}, "Couldn't load the publish settings.");
}

export function publishProject(projectId, settings) {
  return call(
    `/api/workspace-dashboards/publish/${encodeURIComponent(projectId)}`,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) },
    "Couldn't publish. Try again.",
  );
}

export function unpublishProject(projectId) {
  return call(`/api/workspace-dashboards/publish/${encodeURIComponent(projectId)}`, { method: "DELETE" }, "Couldn't unpublish. Try again.");
}

export function checkPublishSlug(slug, projectId) {
  const params = new URLSearchParams({ slug: String(slug || ""), project: String(projectId || "") });
  return call(`/api/workspace-dashboards/publish/check-slug?${params}`, {}, "Couldn't check that address.");
}

function publicBase(handle, slug) {
  return `/api/public/projects/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`;
}

export function loadPublishedProject(handle, slug) {
  return call(publicBase(handle, slug), {}, "Couldn't load this dashboard.");
}

export function unlockPublishedProject(handle, slug, password) {
  return call(
    `${publicBase(handle, slug)}/unlock`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) },
    "Couldn't check the password. Try again.",
  );
}

/** `kind` "og" or "header"; `version` busts caches after an upload. */
export function publishedImageUrl(handle, slug, kind, version) {
  const params = new URLSearchParams({ kind });
  if (version) params.set("v", String(new Date(version).getTime() || version));
  return `${publicBase(handle, slug)}/image?${params}`;
}

/** Saves the account's handle, which every published page's address starts with. */
export async function saveUserHandle(userId, handle) {
  const name = String(handle || "").trim();
  if (!/^[A-Za-z0-9_]{2,30}$/.test(name)) return { ok: false, message: "Use 2 to 30 letters, numbers or underscores." };
  try {
    const res = await fetch(`/api/users/checkUserhandle?userHandle=${encodeURIComponent(name)}`, { credentials: "include" });
    const json = await readJson(res);
    if (json?.reserved) return { ok: false, message: "That handle is reserved. Try another." };
    if (json?.exists) return { ok: false, message: "That handle is taken. Try another." };
  } catch {
    return { ok: false, message: "Couldn't check that handle." };
  }
  return call(
    `/api/users/${encodeURIComponent(userId)}`,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_name: name }) },
    "Couldn't save that handle.",
  );
}
