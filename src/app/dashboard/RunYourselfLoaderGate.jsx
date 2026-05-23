"use client";

import { Suspense } from "react";
import { RunYourselfDashboardLoader } from "@/components/runYourself/RunYourselfDashboardLoader";

export function RunYourselfLoaderGate({ userId }) {
  return (
    <Suspense fallback={null}>
      <RunYourselfDashboardLoader userId={userId} />
    </Suspense>
  );
}
