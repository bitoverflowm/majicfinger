"use client";

import { useEffect, useRef } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { trackAuthEvent } from "@/lib/analytics/authJourneyClient";

const MIN_DWELL_SECONDS = 3;

/**
 * Tracks how long the user stays in each connect workspace / integration.
 */
export function useAuthWorkspaceDwell() {
  const context = useMyStateV2();
  const connectWorkspace = context?.connectWorkspace;
  const integrationSidebar = context?.integrationSidebar;

  const activeRef = useRef({
    workspace: null,
    integrationId: null,
    startedAt: null,
  });

  useEffect(() => {
    const prev = activeRef.current;
    const now = Date.now();

    const workspaceKey = connectWorkspace || integrationSidebar || null;
    const integrationId = integrationSidebar || connectWorkspace || null;

    if (prev.startedAt && prev.workspace && prev.workspace !== workspaceKey) {
      const dwellSec = Math.round((now - prev.startedAt) / 1000);
      if (dwellSec >= MIN_DWELL_SECONDS) {
        trackAuthEvent("workspace_dwell", {
          meta: {
            workspace: prev.workspace,
            integrationId: prev.integrationId,
            durationSeconds: dwellSec,
          },
        });
      }
    }

    activeRef.current = {
      workspace: workspaceKey,
      integrationId,
      startedAt: workspaceKey ? now : null,
    };
  }, [connectWorkspace, integrationSidebar]);

  useEffect(() => {
    return () => {
      const prev = activeRef.current;
      if (!prev.startedAt || !prev.workspace) return;
      const dwellSec = Math.round((Date.now() - prev.startedAt) / 1000);
      if (dwellSec >= MIN_DWELL_SECONDS) {
        trackAuthEvent("workspace_dwell", {
          meta: {
            workspace: prev.workspace,
            integrationId: prev.integrationId,
            durationSeconds: dwellSec,
          },
        });
      }
    };
  }, []);
}
