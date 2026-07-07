"use client";

import { useEffect } from "react";

import { useGuidedWorkflow } from "./GuidedWorkflowProvider";

/**
 * Bridges guided workflow actions to parent state (outside useGuidedWorkflow tree leaf).
 */
export function GuidedWorkflowActionsBridge({
  actionsRef,
  pendingWorkflowIdRef,
  onActiveChange,
  startAfterTick,
}) {
  const { startWorkflow, cancelWorkflow, isActive } = useGuidedWorkflow();

  useEffect(() => {
    actionsRef.current = { startWorkflow, cancelWorkflow };
  }, [actionsRef, startWorkflow, cancelWorkflow]);

  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  useEffect(() => {
    const id = pendingWorkflowIdRef.current;
    if (!id || isActive) return;
    pendingWorkflowIdRef.current = null;
    startWorkflow(id);
  }, [isActive, startWorkflow, pendingWorkflowIdRef, startAfterTick]);

  return null;
}
