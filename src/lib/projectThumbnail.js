import { captureNodeThumbnail } from "@/components/dashboardComposer/blockExport";
import { uploadWorkspaceProjectThumbnail } from "@/lib/workspaceDashboardClient";

/** Marks the part of the dashboard a project's card shows in the projects view. */
export const PROJECT_THUMBNAIL_ROOT = "data-project-thumbnail-root";

const MAX_THUMBNAIL = 380_000;

function pageBackground() {
  const color = getComputedStyle(document.body).backgroundColor;
  return color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent" ? color : "#ffffff";
}

/** Pictures the open dashboard and stores it on the project. Resolves `{ ok, thumbnailAt }`; never throws. */
export async function captureProjectThumbnail(projectId, { keepalive = false } = {}) {
  if (!projectId || typeof document === "undefined") return { ok: false };
  try {
    const node = document.querySelector(`[${PROJECT_THUMBNAIL_ROOT}]`);
    const image = await captureNodeThumbnail(node, { background: pageBackground() });
    if (!image || image.length > MAX_THUMBNAIL) return { ok: false };
    const saved = await uploadWorkspaceProjectThumbnail(projectId, image, { keepalive });
    return saved.ok ? { ok: true, thumbnailAt: saved.data?.thumbnailAt || null } : { ok: false };
  } catch {
    return { ok: false };
  }
}
