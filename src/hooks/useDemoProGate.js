"use client";

import { useCallback, useState } from "react";

import { DemoProFeatureAlert } from "@/components/demo/DemoProFeatureAlert";
import { useMyStateV2 } from "@/context/stateContextV2";

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

  const requestProUpgrade = useCallback((label = "this feature") => {
    setFeatureLabel(label);
    setOpen(true);
  }, []);

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
    />
  );

  return { isDemo, runOrRequestPro, requestProUpgrade, dialog };
}
