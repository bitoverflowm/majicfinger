"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getKalshiHistoricalGuidedWorkflow } from "@/lib/guidedWorkflows/kalshiHistorical";
import { snapshotMatches } from "@/lib/guidedWorkflows/snapshot";
import type {
  GuidedStep,
  GuidedWorkflowDefinition,
  GuidedWorkflowSnapshot,
  GuidedWorkflowStatus,
} from "@/lib/guidedWorkflows/types";

import { findGuidedTargetElement } from "./guidedTargetRegistry";

function stepComplete(
  step: GuidedStep,
  snapshot: GuidedWorkflowSnapshot,
  clickedTarget: boolean,
): boolean {
  const { completeWhen } = step;

  if (completeWhen.type === "click") {
    if (!clickedTarget) return false;
    return snapshotMatches(snapshot, step.assert);
  }

  if (completeWhen.type === "state") {
    const stateOk = snapshotMatches(snapshot, completeWhen.match);
    if (!stateOk) return false;
    return snapshotMatches(snapshot, step.assert);
  }

  return false;
}

export function useGuidedWorkflowEngine(snapshot: GuidedWorkflowSnapshot) {
  const [status, setStatus] = useState<GuidedWorkflowStatus>("idle");
  const [workflow, setWorkflow] = useState<GuidedWorkflowDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const currentStep = workflow?.steps[stepIndex] ?? null;
  const isActive = status === "active";

  const startWorkflow = useCallback((workflowId: string) => {
    const def = getKalshiHistoricalGuidedWorkflow(workflowId);
    if (!def || def.steps.length === 0) return false;
    setWorkflow(def);
    setStepIndex(0);
    setStatus("active");
    return true;
  }, []);

  const cancelWorkflow = useCallback(() => {
    setStatus("cancelled");
    setWorkflow(null);
    setStepIndex(0);
    window.setTimeout(() => setStatus("idle"), 0);
  }, []);

  const completeWorkflow = useCallback(() => {
    setStatus("completed");
    setWorkflow(null);
    setStepIndex(0);
    window.setTimeout(() => setStatus("idle"), 0);
  }, []);

  const advanceIfReady = useCallback(
    (clickedTarget: boolean) => {
      if (status !== "active" || !workflow || !currentStep) return;

      const snap = snapshotRef.current;
      if (!stepComplete(currentStep, snap, clickedTarget)) return;

      const nextIndex = stepIndex + 1;
      if (nextIndex >= workflow.steps.length) {
        completeWorkflow();
        return;
      }
      setStepIndex(nextIndex);
    },
    [status, workflow, currentStep, stepIndex, completeWorkflow],
  );

  /** Call when user clicks the spotlight target. */
  const notifyTargetClick = useCallback(() => {
    advanceIfReady(true);
  }, [advanceIfReady]);

  /** Poll state-based steps (e.g. column selected). */
  useEffect(() => {
    if (!isActive || !currentStep) return;
    if (currentStep.completeWhen.type !== "state") return;

    const id = window.setInterval(() => {
      advanceIfReady(false);
    }, 200);

    return () => window.clearInterval(id);
  }, [isActive, currentStep, advanceIfReady]);

  /** Esc to exit */
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelWorkflow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, cancelWorkflow]);

  /** Forward clicks on the active target element */
  useEffect(() => {
    if (!isActive || !currentStep) return;
    if (currentStep.completeWhen.type !== "click") return;

    const el = findGuidedTargetElement(currentStep.target);
    if (!el) return;

    const onClick = () => {
      window.setTimeout(() => notifyTargetClick(), 50);
    };
    el.addEventListener("click", onClick, true);
    return () => el.removeEventListener("click", onClick, true);
  }, [isActive, currentStep, notifyTargetClick]);

  return {
    status,
    isActive,
    workflow,
    stepIndex,
    currentStep,
    totalSteps: workflow?.steps.length ?? 0,
    startWorkflow,
    cancelWorkflow,
    completeWorkflow,
    notifyTargetClick,
  };
}

export type GuidedWorkflowEngine = ReturnType<typeof useGuidedWorkflowEngine>;
