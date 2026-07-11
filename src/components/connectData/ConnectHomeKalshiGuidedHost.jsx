"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { GuidedWorkflowOverlay } from "@/components/guidedWorkflow/GuidedWorkflowOverlay";
import { GuidedWorkflowPostPullSync } from "@/components/guidedWorkflow/GuidedWorkflowPostPullSync";
import { GuidedWorkflowProvider, useGuidedWorkflow } from "@/components/guidedWorkflow/GuidedWorkflowProvider";
import { useMyStateV2 } from "@/context/stateContextV2";
import { KALSHI_GUIDED_STEP_IDS } from "@/lib/guidedWorkflows/kalshiHistorical/stepIds";
import { userSwrFetcher } from "@/lib/hooks";

const EMPTY_GUIDED_SNAPSHOT = {
  sampleId: "",
  selectedColumns: [],
  activeComposeOps: [],
  whereFilters: [],
  orderBy: [],
  havingFilters: [],
  joins: [],
  composeLimitOpen: false,
  composeLimitValue: "",
  sheetName: "",
};

function ConnectHomeKalshiGuidedSessionController() {
  const ctx = useMyStateV2();
  const { data: user } = useSWR("/api/user", userSwrFetcher);
  const isLoggedIn = !!user;
  const isDemo = !!ctx?.isDemo;
  const session = ctx?.connectHomeGuidedSession;
  const setConnectHomeGuidedSession = ctx?.setConnectHomeGuidedSession;
  const setGuidedWorkflowPull = ctx?.setGuidedWorkflowPull;
  const { resumePostPullStep, isGuideOpen, workflow } = useGuidedWorkflow();
  const [postPullReady, setPostPullReady] = useState(false);
  const hadWorkflowRef = useRef(false);

  const clearSession = useCallback(() => {
    setConnectHomeGuidedSession?.(null);
    setGuidedWorkflowPull?.(false);
    setPostPullReady(false);
    hadWorkflowRef.current = false;
  }, [setConnectHomeGuidedSession, setGuidedWorkflowPull]);

  const handlePullComplete = useCallback(() => {
    if (!session?.workflowId) return;
    const stepId = session.resumeStepId || KALSHI_GUIDED_STEP_IDS.dataSheetLoaded;
    resumePostPullStep?.(session.workflowId, stepId);
    setPostPullReady(true);
  }, [session, resumePostPullStep]);

  useEffect(() => {
    if (workflow) hadWorkflowRef.current = true;
    if (hadWorkflowRef.current && !isGuideOpen) {
      clearSession();
    }
  }, [workflow, isGuideOpen, clearSession]);

  useEffect(() => {
    if (!session) {
      setPostPullReady(false);
      hadWorkflowRef.current = false;
    }
  }, [session]);

  if (!session) return null;

  return (
    <>
      <GuidedWorkflowPostPullSync onPullComplete={handlePullComplete} />
      <GuidedWorkflowOverlay
        suspended={!postPullReady}
        hideUpgradeCta={!isDemo && isLoggedIn}
      />
    </>
  );
}

/**
 * Hosts post-pull guided overlay on the real full-screen connect-home sheet
 * (avoids nesting a second DashBody inside the compose column).
 */
export function ConnectHomeKalshiGuidedHost() {
  const ctx = useMyStateV2();
  const session = ctx?.connectHomeGuidedSession;
  const guidedWorkflowPull = !!ctx?.guidedWorkflowPull;

  const active = !!session || guidedWorkflowPull;
  const snapshot = useMemo(() => EMPTY_GUIDED_SNAPSHOT, []);

  if (!active) return null;

  return (
    <GuidedWorkflowProvider snapshot={snapshot}>
      <ConnectHomeKalshiGuidedSessionController />
    </GuidedWorkflowProvider>
  );
}
