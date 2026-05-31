"use client";

import { Suspense } from "react";

import { HubQueryDraftLoader } from "@/components/hubs/kalshiQuery/HubQueryDraftLoader";

export function HubQueryLoaderGate() {
  return (
    <Suspense fallback={null}>
      <HubQueryDraftLoader />
    </Suspense>
  );
}
