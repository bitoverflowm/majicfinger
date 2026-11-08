"use client";

import { useEffect, useRef } from "react";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useWorkspaceProject } from "@/components/projects/workspaceProjectContext";
import { captureProjectThumbnail } from "@/lib/projectThumbnail";

const SETTLE_MS = 15_000;
const STALE_MS = 30 * 60_000;

/**
 * Pictures the open project once per visit, after it settles, when its card has no picture or an old one.
 * "Back to files" takes a fresh one on the way out.
 */
export function ProjectThumbnailKeeper() {
  const canvas = useWorkspaceCanvas();
  const project = useWorkspaceProject();
  const doneRef = useRef("");
  const ready = !!canvas?.ready && !canvas?.readOnly;
  const projectId = project?.id || "";
  const thumbnailAt = project?.thumbnailAt ? new Date(project.thumbnailAt).getTime() : 0;
  const update = project?.update;

  useEffect(() => {
    if (!ready || !projectId || doneRef.current === projectId) return undefined;
    if (thumbnailAt && Date.now() - thumbnailAt < STALE_MS) return undefined;
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      doneRef.current = projectId;
      void captureProjectThumbnail(projectId).then((result) => {
        if (result.ok) update?.({ thumbnailAt: result.thumbnailAt });
      });
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [projectId, ready, thumbnailAt, update]);

  return null;
}
