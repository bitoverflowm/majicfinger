import { createEmptyDashboardLayout } from "@/lib/dashboardLayoutDefaults";

/**
 * Persist dashboard draft (POST if new, PUT if existing). Used by composer auto-save and Save Project.
 * @returns {Promise<{ ok: true, created?: object } | { ok: false, message: string }>}
 */
export async function persistChartDashboardDraft({ draft, userId }) {
  if (!draft) {
    return { ok: false, message: "No dashboard to save." };
  }
  if (!userId) {
    return { ok: false, message: "Sign in to save." };
  }
  if (!draft.data_set_id) {
    return {
      ok: false,
      message: "Please select an associated project to save dashboard under.",
    };
  }

  try {
    if (draft._id) {
      const res = await fetch(`/api/chart-dashboards/${draft._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboard_name: draft.dashboard_name,
          page_heading: draft.page_heading,
          layout: draft.layout,
          theme: draft.theme,
          data_set_id: draft.data_set_id,
        }),
      });
      const j = await res.json();
      if (!j?.success) {
        return { ok: false, message: j?.message || "Save failed" };
      }
      return { ok: true };
    }

    const res = await fetch("/api/chart-dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        data_set_id: draft.data_set_id,
        dashboard_name: draft.dashboard_name || "Untitled dashboard",
        page_heading: draft.page_heading || "",
        layout: draft.layout && typeof draft.layout === "object" ? draft.layout : createEmptyDashboardLayout(),
        theme:
          draft.theme && typeof draft.theme === "object"
            ? draft.theme
            : { background: "none", background_color: "" },
      }),
    });
    const j = await res.json();
    if (!j?.success || !j?.data?._id) {
      return { ok: false, message: j?.message || "Save failed" };
    }
    return { ok: true, created: j.data };
  } catch {
    return { ok: false, message: "Save failed" };
  }
}

export function mergeCreatedChartDashboardDraft(prev, d) {
  if (!d) return prev;
  return {
    ...(prev || {}),
    _id: String(d._id),
    dashboard_name: d.dashboard_name ?? prev?.dashboard_name,
    page_heading: d.page_heading ?? prev?.page_heading ?? "",
    layout: d.layout && typeof d.layout === "object" ? d.layout : prev?.layout,
    theme: d.theme && typeof d.theme === "object" ? d.theme : prev?.theme,
    data_set_id: d.data_set_id ? String(d.data_set_id) : prev?.data_set_id,
    public_slug: d.public_slug || "",
    is_public: !!d.is_public,
  };
}
