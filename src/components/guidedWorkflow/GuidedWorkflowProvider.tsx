"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { GuidedWorkflowSnapshot } from "@/lib/guidedWorkflows/types";

import { useGuidedWorkflowEngine, type GuidedWorkflowEngine } from "./useGuidedWorkflowEngine";

type GuidedWorkflowContextValue = GuidedWorkflowEngine & {
  snapshot: GuidedWorkflowSnapshot;
};

const GuidedWorkflowContext = createContext<GuidedWorkflowContextValue | null>(null);

export function GuidedWorkflowProvider({
  snapshot,
  children,
}: {
  snapshot: GuidedWorkflowSnapshot;
  children: ReactNode;
}) {
  const engine = useGuidedWorkflowEngine(snapshot);

  return (
    <GuidedWorkflowContext.Provider value={{ ...engine, snapshot }}>
      {children}
    </GuidedWorkflowContext.Provider>
  );
}

export function useGuidedWorkflow() {
  const ctx = useContext(GuidedWorkflowContext);
  if (!ctx) {
    throw new Error("useGuidedWorkflow must be used within GuidedWorkflowProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (returns null). */
export function useGuidedWorkflowOptional() {
  return useContext(GuidedWorkflowContext);
}
