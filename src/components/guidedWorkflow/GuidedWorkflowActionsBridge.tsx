"use client";

import { useEffect } from "react";

import { useGuidedWorkflow } from "./GuidedWorkflowProvider";

/**
 * Bridges guided workflow actions to parent state (outside useGuidedWorkflow tree leaf).
 */
export function GuidedWorkflowActionsBridge({
  actionsRef,
  pendingWorkflowIdRef,
  inlinePullWorkflowIdRef,
  onActiveChange,
  startAfterTick,
}) {
  const { startWorkflow, cancelWorkflow, isGuideOpen, workflow } = useGuidedWorkflow();

  useEffect(() => {
    actionsRef.current = { startWorkflow, cancelWorkflow, workflow };
  }, [actionsRef, startWorkflow, cancelWorkflow, workflow]);

  useEffect(() => {
    if (!inlinePullWorkflowIdRef || !workflow?.id) return;
    inlinePullWorkflowIdRef.current = workflow.id;
  }, [workflow, inlinePullWorkflowIdRef]);

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
