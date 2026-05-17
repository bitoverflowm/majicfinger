"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import {
  CONNECT_WORKSPACE,
  isConnectIntegrationWorkspace,
  isConnectSavedProjectWorkspace,
} from "@/lib/connectHomeWorkspace";
import { deriveConnectFlowStep, isConnectHomeDesignPanelTab } from "@/lib/connectHomeFlow";
import { collectRequestCardEntries } from "@/lib/connectHomeRequestCards";
import {
  connectDemoWorkspaceSectionClass,
  connectHubDemoLayoutClass,
  connectHubFlowStepsViewportCollapsedClass,
  connectHubFlowStepsViewportFixedClass,
  connectHubHubSnapClass,
  connectHubLayoutClass,
  connectHubPageClass,
  connectHubScrollPaddingClass,
  connectHubScrollSnapClass,
  connectWorkspaceScrollInsetClass,
} from "@/lib/connectHubLayout";
import { useConnectHomeAnalyzeScrollLock } from "@/hooks/useConnectHomeAnalyzeScrollLock";
import {
  CONNECT_HOME_SCROLL_ID,
  scheduleConnectAnalyzeAnchorScroll,
  scheduleConnectHomeIntegrationActivate,
  scheduleConnectProjectSheetScroll,
  scheduleConnectWorkspaceScroll,
} from "@/lib/connectHubScroll";
import { useConnectHomeScrollPanels } from "@/hooks/useConnectHomeScrollPanels";
import { cn } from "@/lib/utils";

import DataSheetWithIntegration from "@/components/dataView/dataSheetWithIntegration";
import ConnectDataStep1 from "@/components/connectData/ConnectDataStep1";
import { ConnectHomeFileUpload } from "@/components/connectData/ConnectHomeFileUpload";
import { ConnectHomeFlowSteps } from "@/components/connectData/ConnectHomeFlowSteps";

/** Match Connect hub + nav header white; override AG Grid Balham grey canvas. */
const CONNECT_HOME_SURFACE = "bg-white dark:bg-slate-950";
const CONNECT_HOME_GRID_SURFACE =
  "[&_.ag-theme-balham]:bg-white [&_.ag-theme-balham]:[--ag-background-color:#ffffff] [&_.ag-theme-balham]:[--ag-odd-row-background-color:#ffffff] [&_.ag-theme-balham]:[--ag-header-background-color:#ffffff] [&_.ag-theme-balham]:[--ag-subheader-background-color:#ffffff]";

export default function ConnectHomeShell({ user, userProfileFetchOk, startNew, setStartNew }) {
  const context = useMyStateV2();
  const isDemo = !!context?.isDemo;
  const connectWorkspace = context?.connectWorkspace;
  const connectWorkspaceScrollTick = context?.connectWorkspaceScrollTick ?? 0;
  const connectAnalyzeScrollTick = context?.connectAnalyzeScrollTick ?? 0;
  const connectHomeAnalyzeActive = !!context?.connectHomeAnalyzeActive;
  const connectDataLakePullState = context?.connectDataLakePullState ?? {};
  const dataConnected = context?.dataConnected;
  const viewing = context?.viewing;
  const connectedData = context?.connectedData;
  const dataSheets = context?.dataSheets;
  const rightPanelTab = context?.rightPanelTab;
  const setRightPanelOpen = context?.setRightPanelOpen;
  const setRightPanelTab = context?.setRightPanelTab;
  const setConnectHomeLeftNavOpen = context?.setConnectHomeLeftNavOpen;
  const connectHomeFlowStepsOpen = context?.connectHomeFlowStepsOpen !== false;
  const setConnectHomeFlowStepsOpen = context?.setConnectHomeFlowStepsOpen;

  const scrollRef = useRef(null);
  const hubRef = useRef(null);
  const workspaceRef = useRef(null);

  const [blankStartNew, setBlankStartNew] = useState(false);

  const workspaceActive = !!connectWorkspace;

  const showUploadPanel =
    connectWorkspace === CONNECT_WORKSPACE.UPLOAD && !dataConnected;

  const showDataWorkspace = useMemo(() => {
    if (!connectWorkspace) return false;
    if (connectWorkspace === CONNECT_WORKSPACE.UPLOAD) return !!dataConnected;
    if (connectWorkspace === CONNECT_WORKSPACE.BLANK) return true;
    if (connectWorkspace === CONNECT_WORKSPACE.PROJECT) return true;
    if (connectWorkspace === CONNECT_WORKSPACE.INTEGRATIONS_PICKER) return true;
    if (isConnectIntegrationWorkspace(connectWorkspace)) return true;
    return false;
  }, [connectWorkspace, dataConnected]);

  const connectFlowStep = useMemo(
    () =>
      deriveConnectFlowStep({
        viewing,
        dataConnected,
        connectedData,
        dataSheets,
        rightPanelTab,
      }),
    [viewing, dataConnected, connectedData, dataSheets, rightPanelTab],
  );

  const isConnectIntegration = isConnectIntegrationWorkspace(connectWorkspace);

  const hasRequestCards = useMemo(
    () => collectRequestCardEntries(dataSheets).length > 0,
    [dataSheets],
  );

  const hasSheetData = useMemo(() => {
    const sheets = dataSheets && typeof dataSheets === "object" ? Object.values(dataSheets) : [];
    return sheets.some((s) => Array.isArray(s?.data) && s.data.length > 0);
  }, [dataSheets]);

  /** Step 2 grid visible: slide in app SideNav only after Run pull reaches analyze (not Step 1 compose). */
  const showConnectLeftNav =
    workspaceActive &&
    !connectDataLakePullState.loading &&
    hasSheetData &&
    connectHomeAnalyzeActive &&
    (isConnectIntegration
      ? hasSheetData
      : connectWorkspace === CONNECT_WORKSPACE.PROJECT
        ? hasSheetData
        : !!dataConnected);

  /** Kalshi/Polymarket connect home: slide request summary in only after pull finishes. */
  const connectRequestSummaryReady =
    isConnectIntegration &&
    connectHomeAnalyzeActive &&
    !connectDataLakePullState.loading &&
    hasRequestCards;

  const [connectPanelUserDismissed, setConnectPanelUserDismissed] = useState(false);
  const [connectHomePanelPinned, setConnectHomePanelPinned] = useState(false);
  /** User-picked drawer tab (+ Integration, tab bar); do not auto-switch to request history. */
  const [connectHomePreferredPanelTab, setConnectHomePreferredPanelTab] = useState(null);

  useEffect(() => {
    if (!connectRequestSummaryReady) {
      setConnectHomePreferredPanelTab(null);
    }
  }, [connectRequestSummaryReady]);

  const trackAnalyzeSection =
    connectHomeAnalyzeActive && (hasSheetData || connectRequestSummaryReady);

  const scrollLockEnabled =
    workspaceActive && connectHomeAnalyzeActive && hasSheetData;

  const { allowScrollAboveAnalyze } = useConnectHomeAnalyzeScrollLock({
    scrollRef,
    hubRef,
    enabled: scrollLockEnabled,
  });

  const { panelsVisible, analyzePanelsEngaged } = useConnectHomeScrollPanels({
    scrollRef,
    hubRef,
    workspaceRef,
    workspaceActive,
    trackAnalyzeSection,
  });

  /** Right drawer: scroll with Step 2 analyze block; Step 1 uses hub/workspace engagement. */
  const connectHomePanelsEngaged = trackAnalyzeSection ? analyzePanelsEngaged : panelsVisible;
  const connectHomePanelsVisible = connectHomePanelsEngaged || connectHomePanelPinned;

  useEffect(() => {
    if (!connectHomePanelsEngaged) setConnectHomePanelPinned(false);
  }, [connectHomePanelsEngaged]);

  const scrollToWorkspace = useCallback(() => {
    /** New integration pull — always land on query builder, not the sheet grid. */
    if (isConnectIntegrationWorkspace(connectWorkspace)) {
      scheduleConnectHomeIntegrationActivate(workspaceRef, scrollRef);
      return;
    }
    if (isConnectSavedProjectWorkspace(connectWorkspace) && hasSheetData) {
      scheduleConnectProjectSheetScroll(workspaceRef, scrollRef);
      return;
    }
    if (connectHomeAnalyzeActive || hasSheetData) {
      scheduleConnectAnalyzeAnchorScroll(scrollRef);
      return;
    }
    scheduleConnectWorkspaceScroll(workspaceRef, scrollRef);
  }, [connectWorkspace, connectHomeAnalyzeActive, hasSheetData]);

  useLayoutEffect(() => {
    if (!connectWorkspace || !connectWorkspaceScrollTick) return;
    scrollToWorkspace();
  }, [connectWorkspace, connectWorkspaceScrollTick, scrollToWorkspace]);

  useLayoutEffect(() => {
    if (!connectAnalyzeScrollTick) return;
    if (!isConnectSavedProjectWorkspace(connectWorkspace) && !connectHomeAnalyzeActive) return;
    scrollToWorkspace();
  }, [connectAnalyzeScrollTick, connectWorkspace, connectHomeAnalyzeActive, scrollToWorkspace]);

  useEffect(() => {
    setConnectHomeLeftNavOpen?.(!!showConnectLeftNav);
  }, [showConnectLeftNav, setConnectHomeLeftNavOpen]);

  useEffect(() => {
    if (!workspaceActive) {
      setRightPanelOpen?.(false);
      return;
    }

    /** User closed the drawer (X or collapse); do not auto-reopen until they use the edge tab or a workspace chip. */
    if (connectPanelUserDismissed) {
      return;
    }

    /** Demo embed: drawer opens only when the user picks Integration / Chart / etc. */
    if (isDemo && !connectHomePanelPinned) {
      setRightPanelOpen?.(false);
      return;
    }

    const designPanelTab = isConnectHomeDesignPanelTab(rightPanelTab);
    const analyzePanelsAllowed =
      connectHomeAnalyzeActive &&
      (connectHomePanelsVisible ||
        (isConnectSavedProjectWorkspace(connectWorkspace) && hasSheetData) ||
        designPanelTab);

    if (!analyzePanelsAllowed) {
      setRightPanelOpen?.(false);
      return;
    }

    if (designPanelTab) {
      setRightPanelOpen?.(true);
      return;
    }

    if (isConnectIntegration) {
      if (connectRequestSummaryReady || hasSheetData) {
        setRightPanelOpen?.(true);
      }
      return;
    }

    setRightPanelOpen?.(true);
    /** Only default integrations for the picker / pre-upload — not loaded projects (user may open Request history). */
    if (connectWorkspace === CONNECT_WORKSPACE.INTEGRATIONS_PICKER) {
      setRightPanelTab?.("integrations");
    } else if (connectWorkspace === CONNECT_WORKSPACE.UPLOAD && !dataConnected) {
      setRightPanelTab?.("integrations");
    }
  }, [
    connectPanelUserDismissed,
    connectHomeAnalyzeActive,
    connectRequestSummaryReady,
    hasSheetData,
    isConnectIntegration,
    connectHomePanelsVisible,
    rightPanelTab,
    workspaceActive,
    showDataWorkspace,
    connectWorkspace,
    setRightPanelOpen,
    setRightPanelTab,
    isDemo,
    connectHomePanelPinned,
  ]);

  useEffect(() => {
    if (connectWorkspace === CONNECT_WORKSPACE.BLANK) {
      setBlankStartNew(true);
      setStartNew?.(true);
    } else {
      setBlankStartNew(false);
    }
  }, [connectWorkspace, setStartNew]);

  const handleActivateWorkspace = useCallback(
    (id) => {
      context?.requestConnectWorkspace?.(id);
      scheduleConnectHomeIntegrationActivate(workspaceRef, scrollRef);
    },
    [context],
  );

  const handleUploadParsed = useCallback(() => {
    scrollToWorkspace();
  }, [scrollToWorkspace]);

  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
      <div
        ref={scrollRef}
        id={CONNECT_HOME_SCROLL_ID}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          !isDemo && connectHubScrollPaddingClass,
          (isDemo || connectHomeAnalyzeActive) && connectHubScrollSnapClass,
          !isDemo && !connectHomeAnalyzeActive && "snap-y snap-proximity",
          CONNECT_HOME_SURFACE,
        )}
      >
        <div className={connectHubPageClass(true, { embeddedDemo: isDemo })}>
          {!isDemo ? (
            <ConnectHomeFlowSteps
              currentStep={connectFlowStep}
              collapsible
              fixedRail
              expanded={connectHomeFlowStepsOpen}
              onExpandedChange={setConnectHomeFlowStepsOpen}
              className={cn(
                connectHubFlowStepsViewportFixedClass,
                !connectHomeFlowStepsOpen &&
                  cn(connectHubFlowStepsViewportCollapsedClass, "!w-0 !min-w-0"),
                panelsVisible && connectHomeAnalyzeActive && "hidden",
              )}
            />
          ) : null}

          <div
            className={
              isDemo
                ? connectHubDemoLayoutClass
                : connectHubLayoutClass({
                    fixedRail: true,
                    withAppSidebar: false,
                    flowStepsExpanded: connectHomeFlowStepsOpen,
                  })
            }
          >
            {isDemo ? (
              <ConnectHomeFlowSteps
                currentStep={connectFlowStep}
                sticky
                className="sticky top-2 z-10 shrink-0 self-start"
              />
            ) : null}
            <div className="flex min-w-0 flex-col">
              <div ref={hubRef} className={connectHubHubSnapClass}>
                <ConnectDataStep1
                  user={user}
                  userProfileFetchOk={userProfileFetchOk}
                  onActivateWorkspace={handleActivateWorkspace}
                  embeddedInShell
                  embeddedDemo={isDemo}
                />
              </div>

              {workspaceActive ? (
                <section
                  ref={workspaceRef}
                  id="connect-home-workspace"
                  className={cn(
                    isDemo
                      ? connectDemoWorkspaceSectionClass
                      : cn(
                          "relative mt-16 min-h-[calc(100dvh-5.5rem)] sm:mt-20 md:mt-28",
                          connectHubHubSnapClass,
                        ),
                    !isDemo && connectWorkspaceScrollInsetClass,
                    CONNECT_HOME_SURFACE,
                    "w-full min-w-0 max-w-none",
                  )}
                >
                  {showUploadPanel ? (
                    <ConnectHomeFileUpload onParsed={handleUploadParsed} />
                  ) : null}
                  {showDataWorkspace ? (
                    <div
                      className={cn(
                        "relative flex min-h-0 flex-1 flex-col",
                        !isDemo && "min-h-[calc(100dvh-6rem)]",
                        CONNECT_HOME_SURFACE,
                        CONNECT_HOME_GRID_SURFACE,
                        showUploadPanel && "hidden",
                      )}
                    >
                      <DataSheetWithIntegration
                        user={user}
                        startNew={connectWorkspace === CONNECT_WORKSPACE.BLANK ? blankStartNew : startNew}
                        setStartNew={setStartNew}
                        connectHomeMode
                        connectHomePanelsVisible={connectHomePanelsVisible}
                        onConnectHomePanelUserDismiss={() => {
                          setConnectPanelUserDismissed(true);
                          setConnectHomePanelPinned(false);
                        }}
                        connectHomePreferredPanelTab={connectHomePreferredPanelTab}
                        onConnectHomePanelManualOpen={(tab) => {
                          setConnectPanelUserDismissed(false);
                          setConnectHomePanelPinned(true);
                          if (tab) setConnectHomePreferredPanelTab(tab);
                          if (tab === "integrations" && connectHomeAnalyzeActive) {
                            allowScrollAboveAnalyze();
                            scheduleConnectHomeIntegrationActivate(workspaceRef, scrollRef);
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
