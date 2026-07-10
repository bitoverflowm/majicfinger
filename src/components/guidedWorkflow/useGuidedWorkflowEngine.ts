"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getKalshiHistoricalGuidedWorkflow } from "@/lib/guidedWorkflows/kalshiHistorical";
import { KALSHI_GUIDED_STEP_IDS } from "@/lib/guidedWorkflows/kalshiHistorical/stepIds";
import { snapshotMatches } from "@/lib/guidedWorkflows/snapshot";
import type {
  GuidedPhase,
  GuidedStep,
  GuidedWorkflowDefinition,
  GuidedWorkflowSnapshot,
} from "@/lib/guidedWorkflows/types";
import { isInfoStep } from "@/lib/guidedWorkflows/types";

import { findGuidedTargetElement } from "./guidedTargetRegistry";

function stepComplete(
  step: GuidedStep,
  snapshot: GuidedWorkflowSnapshot,
  clickedTarget: boolean,
): boolean {
  const { completeWhen } = step;

  if (completeWhen.type === "continue") {
    return false;
  }

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
  const [phase, setPhase] = useState<GuidedPhase>("idle");
  const [workflow, setWorkflow] = useState<GuidedWorkflowDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const workflowRef = useRef<GuidedWorkflowDefinition | null>(null);
  workflowRef.current = workflow;
  const suppressRunQueryAdvanceRef = useRef(false);

  const currentStep = phase === "active" ? workflow?.steps[stepIndex] ?? null : null;
  const isGuideOpen = phase !== "idle";
  const isActive = phase === "active";

  const startWorkflow = useCallback((workflowId: string) => {
    const def = getKalshiHistoricalGuidedWorkflow(workflowId);
    if (!def) return false;
    setWorkflow(def);
    setStepIndex(0);
    setPhase("intro");
    return true;
  }, []);

  const cancelWorkflow = useCallback(() => {
    setPhase("idle");
    setWorkflow(null);
    setStepIndex(0);
  }, []);

  const completeWorkflow = useCallback(() => {
    setPhase("idle");
    setWorkflow(null);
    setStepIndex(0);
  }, []);

  const goToStepById = useCallback((stepId: string) => {
    const wf = workflowRef.current;
    if (!wf) return false;
    const idx = wf.steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return false;
    setStepIndex(idx);
    setPhase("active");
    return true;
  }, []);

  const startWorkflowAtStep = useCallback((workflowId: string, stepId: string) => {
    const def = getKalshiHistoricalGuidedWorkflow(workflowId);
    if (!def) return false;
    const idx = def.steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return false;
    setWorkflow(def);
    setStepIndex(idx);
    setPhase("active");
    return true;
  }, []);

  const resumePostPullStep = useCallback(
    (workflowId: string, stepId: string) => {
      const wf = workflowRef.current;
      if (wf?.id === workflowId) {
        return goToStepById(stepId);
      }
      return startWorkflowAtStep(workflowId, stepId);
    },
    [goToStepById, startWorkflowAtStep],
  );

  const suppressRunQueryAdvance = useCallback(() => {
    suppressRunQueryAdvanceRef.current = true;
  }, []);

  const clearSuppressRunQueryAdvance = useCallback(() => {
    suppressRunQueryAdvanceRef.current = false;
  }, []);

  /** Intro modal — user clicked Begin */
  const beginGuide = useCallback(() => {
    if (phase !== "intro" || !workflow) return;
    setPhase("exit-hint");
  }, [phase, workflow]);

  /** Exit-hint dismissed — start step-by-step guide */
  const dismissExitHint = useCallback(() => {
    if (phase !== "exit-hint" || !workflow) return;
    if (workflow.steps.length === 0) {
      completeWorkflow();
      return;
    }
    setStepIndex(0);
    setPhase("active");
  }, [phase, workflow, completeWorkflow]);

  const advanceIfReady = useCallback(
    (clickedTarget: boolean) => {
      if (phase !== "active" || !workflow || !currentStep) return;

      const snap = snapshotRef.current;
      if (!stepComplete(currentStep, snap, clickedTarget)) return;

      const nextIndex = stepIndex + 1;
      if (nextIndex >= workflow.steps.length) {
        completeWorkflow();
        return;
      }
      setStepIndex(nextIndex);
    },
    [phase, workflow, currentStep, stepIndex, completeWorkflow],
  );

  const notifyTargetClick = useCallback(() => {
    const wf = workflowRef.current;
    const step = phase === "active" ? wf?.steps[stepIndex] ?? null : null;
    if (step?.id === KALSHI_GUIDED_STEP_IDS.runQuery && suppressRunQueryAdvanceRef.current) {
      return;
    }
    advanceIfReady(true);
  }, [advanceIfReady, phase, stepIndex]);

  const continueStep = useCallback(() => {
    if (phase !== "active" || !workflow || !currentStep) return;
    if (currentStep.completeWhen.type !== "continue") return;
    if (!snapshotMatches(snapshotRef.current, currentStep.assert)) return;

    const nextIndex = stepIndex + 1;
    if (nextIndex >= workflow.steps.length) {
      completeWorkflow();
      return;
    }
    setStepIndex(nextIndex);
  }, [phase, workflow, currentStep, stepIndex, completeWorkflow]);

  useEffect(() => {
    if (!isActive || !currentStep) return;
    if (isInfoStep(currentStep)) return;
    if (currentStep.completeWhen.type !== "state") return;

    const id = window.setInterval(() => {
      advanceIfReady(false);
    }, 200);

    return () => window.clearInterval(id);
  }, [isActive, currentStep, advanceIfReady]);

  useEffect(() => {
    if (!isGuideOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelWorkflow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isGuideOpen, cancelWorkflow]);

  useEffect(() => {
    if (!isActive || !currentStep) return;
    if (isInfoStep(currentStep)) return;
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
    phase,
    isGuideOpen,
    isActive,
    workflow,
    stepIndex,
    currentStep,
    totalSteps: workflow?.steps.length ?? 0,
    startWorkflow,
    cancelWorkflow,
    completeWorkflow,
    beginGuide,
    dismissExitHint,
    notifyTargetClick,
    continueStep,
    goToStepById,
    startWorkflowAtStep,
    resumePostPullStep,
    suppressRunQueryAdvance,
    clearSuppressRunQueryAdvance,
    isInfoStep: currentStep ? isInfoStep(currentStep) : false,
  };
}

export type GuidedWorkflowEngine = ReturnType<typeof useGuidedWorkflowEngine>;
