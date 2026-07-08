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
  const { startWorkflow, cancelWorkflow, isGuideOpen } = useGuidedWorkflow();

  useEffect(() => {
    actionsRef.current = { startWorkflow, cancelWorkflow };
  }, [actionsRef, startWorkflow, cancelWorkflow]);

  useEffect(() => {
    onActiveChange?.(isGuideOpen);
  }, [isGuideOpen, onActiveChange]);

  useEffect(() => {
    const id = pendingWorkflowIdRef.current;
    if (!id) return;
    pendingWorkflowIdRef.current = null;
    startWorkflow(id);
  }, [startWorkflow, pendingWorkflowIdRef, startAfterTick]);

  return null;
}
