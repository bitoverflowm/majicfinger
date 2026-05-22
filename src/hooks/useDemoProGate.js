"use client";

import { useCallback, useState } from "react";

import { DemoProFeatureAlert } from "@/components/demo/DemoProFeatureAlert";
import { useMyStateV2 } from "@/context/stateContextV2";

/** Demo gate copy for Becker historical lakes (Kalshi / Polymarket). */
export const DEMO_HISTORICAL_PRO_DESCRIPTION =
  "Only for Pro users at the moment. Want to upgrade to use feature?";

export const DEMO_GATED_HISTORICAL_INTEGRATION_IDS = new Set([
  "kalshiHistorical",
  "polymarketHistorical",
]);

export function isDemoGatedHistoricalIntegration(id) {
  return DEMO_GATED_HISTORICAL_INTEGRATION_IDS.has(id);
}

/**
 * In demo mode, blocks an action and opens the Pro upgrade dialog instead.
 *
 * @returns {{
 *   isDemo: boolean,
 *   runOrRequestPro: (action: () => void, featureLabel?: string) => void,
 *   requestProUpgrade: (featureLabel?: string) => void,
 *   dialog: import("react").ReactNode,
 * }}
 */
export function useDemoProGate() {
  const isDemo = !!useMyStateV2()?.isDemo;
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
      requestProUpgrade(label, {
        title: "Pro only",
        description: DEMO_HISTORICAL_PRO_DESCRIPTION,
      });
    },
    [requestProUpgrade],
  );

  const runOrRequestPro = useCallback(
    (action, label = "this feature") => {
      if (isDemo) {
        requestProUpgrade(label);
        return;
      }
      if (typeof action === "function") action();
    },
    [isDemo, requestProUpgrade],
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
    runOrRequestPro,
    requestProUpgrade,
    requestHistoricalProUpgrade,
    dialog,
  };
}
