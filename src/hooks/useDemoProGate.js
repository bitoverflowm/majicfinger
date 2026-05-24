"use client";

import { useCallback, useState } from "react";

import { DemoProFeatureAlert } from "@/components/demo/DemoProFeatureAlert";
import { useMyStateV2 } from "@/context/stateContextV2";

/** Demo gate copy for Becker historical lakes (Kalshi / Polymarket). */
export const DEMO_HISTORICAL_PRO_DESCRIPTION =
  "Only for Pro users at the moment. Want to upgrade to use feature?";

export const WORKSPACE_WRITE_LOCKED_DESCRIPTION =
  "You can browse projects, sheets, charts, and dashboards. Saving, data pulls, uploads, and integrations require an active paid plan (or lifetime access).";

export const DEMO_GATED_HISTORICAL_INTEGRATION_IDS = new Set([
  "kalshiHistorical",
  "polymarketHistorical",
]);

export function isDemoGatedHistoricalIntegration(id) {
  return DEMO_GATED_HISTORICAL_INTEGRATION_IDS.has(id);
}

/**
 * In demo mode, blocks an action and opens the Pro upgrade dialog instead.
 * When workspaceWriteLocked (free tier paywall), blocks writes but allows navigation.
 *
 * @returns {{
 *   isDemo: boolean,
 *   workspaceWriteLocked: boolean,
 *   runOrRequestPro: (action: () => void, featureLabel?: string) => void,
 *   requestProUpgrade: (featureLabel?: string, opts?: object) => void,
 *   requestHistoricalProUpgrade: (featureLabel?: string) => void,
 *   dialog: import("react").ReactNode,
 * }}
 */
export function useDemoProGate() {
  const isDemo = !!useMyStateV2()?.isDemo;
  const workspaceWriteLocked = !!useMyStateV2()?.workspaceWriteLocked;
  const [open, setOpen] = useState(false);
  const [featureLabel, setFeatureLabel] = useState("this feature");
  const [dialogTitle, setDialogTitle] = useState(undefined);
  const [dialogDescription, setDialogDescription] = useState(undefined);

  const requestProUpgrade = useCallback((label = "this feature", opts = {}) => {
    setFeatureLabel(label);
    setDialogTitle(opts.title);
    setDialogDescription(opts.description);
    setOpen(true);
  }, []);

  const requestHistoricalProUpgrade = useCallback(
    (label = "Historical data") => {
      if (workspaceWriteLocked && !isDemo) {
        requestProUpgrade(label, {
          title: "Upgrade to unlock",
          description: WORKSPACE_WRITE_LOCKED_DESCRIPTION,
        });
        return;
      }
      requestProUpgrade(label, {
        title: "Pro only",
        description: DEMO_HISTORICAL_PRO_DESCRIPTION,
      });
    },
    [isDemo, requestProUpgrade, workspaceWriteLocked],
  );

  const runOrRequestPro = useCallback(
    (action, label = "this feature") => {
      if (isDemo) {
        requestProUpgrade(label);
        return;
      }
      if (workspaceWriteLocked) {
        requestProUpgrade(label, {
          title: "Upgrade to unlock",
          description: WORKSPACE_WRITE_LOCKED_DESCRIPTION,
        });
        return;
      }
      if (typeof action === "function") action();
    },
    [isDemo, requestProUpgrade, workspaceWriteLocked],
  );

  const dialog = (
    <DemoProFeatureAlert
      open={open}
      onOpenChange={setOpen}
      featureLabel={featureLabel}
      title={dialogTitle}
      description={dialogDescription}
    />
  );

  return {
    isDemo,
    workspaceWriteLocked,
    runOrRequestPro,
    requestProUpgrade,
    requestHistoricalProUpgrade,
    dialog,
  };
}
