import { createWorkspaceProject } from "@/lib/workspaceDashboardClient";
import { rememberWorkspaceProject } from "@/lib/workspaceProjectScope";
import { dashboardUrlForProject } from "@/components/projects/workspaceProjectContext";
import { terminalProjectDraft } from "@/components/terminals/openTerminalTab";

/** Query key for Projects → dashboard product surfaces (Historical / Present / Markets / Holders). */
export const SHELL_SURFACE_PARAM = "surface";

export const SHELL_SURFACES = {
  historical: "historical",
  present: "present",
  markets: "markets",
  holders: "holders",
  integrations: "integrations",
};

const BROWSE_MODE_KEY = "lychee:holderTerminal:browseMode";

export function preferHolderBrowseMode(mode) {
  if (mode !== "markets" && mode !== "holders") return;
  try {
    window.localStorage.setItem(BROWSE_MODE_KEY, mode);
  } catch {
    /* storage blocked */
  }
}

function withSurface(url, surface) {
  const next = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (surface) next.searchParams.set(SHELL_SURFACE_PARAM, surface);
  return `${next.pathname}${next.search}`;
}

/**
 * Open or create a dashboard for a Projects shell product tab.
 * @returns {Promise<{ ok: true, href: string } | { ok: false, status?: number, message: string }>}
 */
export async function launchShellProduct({ id, userId }) {
  if (id === "war-room") {
    return { ok: true, href: "/war-room" };
  }

  if (id === "integrations") {
    const created = await createWorkspaceProject({ name: "Integrations", kind: "dashboard" });
    if (!created.ok) return { ok: false, status: created.status, message: created.message };
    rememberWorkspaceProject(userId, { id: created.data.id, scope: created.data.localScope });
    return {
      ok: true,
      href: withSurface(dashboardUrlForProject(created.data.id), SHELL_SURFACES.integrations),
    };
  }

  if (id === "historical" || id === "present") {
    const name = id === "historical" ? "Historical" : "The Present";
    const created = await createWorkspaceProject({ name, kind: "dashboard" });
    if (!created.ok) return { ok: false, status: created.status, message: created.message };
    rememberWorkspaceProject(userId, { id: created.data.id, scope: created.data.localScope });
    return {
      ok: true,
      href: withSurface(dashboardUrlForProject(created.data.id), SHELL_SURFACES[id]),
    };
  }

  if (id === "markets" || id === "holders") {
    preferHolderBrowseMode(id);
    const draft = terminalProjectDraft("holder");
    if (!draft) return { ok: false, message: "Holder Terminal is unavailable." };
    draft.name = id === "markets" ? "Markets" : "Holders";
    const created = await createWorkspaceProject(draft);
    if (!created.ok) return { ok: false, status: created.status, message: created.message };
    rememberWorkspaceProject(userId, { id: created.data.id, scope: created.data.localScope });
    return {
      ok: true,
      href: withSurface(dashboardUrlForProject(created.data.id), SHELL_SURFACES[id]),
    };
  }

  return { ok: false, message: "Unknown product." };
}

/** Read `?surface=` once for dashboard boot. */
export function readShellSurfaceParam(searchParams) {
  const value = String(searchParams?.get?.(SHELL_SURFACE_PARAM) || "").trim();
  return Object.values(SHELL_SURFACES).includes(value) ? value : null;
}
