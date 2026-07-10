"use client";

import { useEffect, useRef } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { connectHomeAnySheetHasData } from "@/lib/connectHomePullDestination";

/**
 * Fires once when a guided inline pull has finished loading rows into the sheet.
 */
export function GuidedWorkflowPostPullSync({ onPullComplete }) {
  const ctx = useMyStateV2();
  const firedRef = useRef(false);

  const pull = ctx?.connectDataLakePullState ?? {};
  const hasData = connectHomeAnySheetHasData(ctx?.dataSheets, ctx?.connectedData);
  const pullProgress = Number(pull.progress) || 0;
  const pullDone =
    hasData &&
    !pull.error &&
    (!pull.loading || pullProgress >= 100);

  useEffect(() => {
    if (!pullDone || firedRef.current) return;
    firedRef.current = true;
    onPullComplete?.();
  }, [pullDone, onPullComplete, hasData, pull.loading, pull.error, pullProgress]);

  useEffect(() => {
    if (!hasData) {
      firedRef.current = false;
    }
  }, [hasData]);

  return null;
}
