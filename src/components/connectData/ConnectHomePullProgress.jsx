"use client";

import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { useMyStateV2 } from "@/context/stateContextV2";

/** Step 2 progress while Athena compose pull runs (mirrors integrations panel). */
export function ConnectHomePullProgress({ className }) {
  const pull = useMyStateV2()?.connectDataLakePullState ?? {};
  if (!pull.loading) return null;

  return (
    <ConnectProgressWithLabel
      label={pull.label || "Loading data…"}
      progress={pull.progress ?? 0}
      className={className}
    />
  );
}
