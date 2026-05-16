"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { CONNECT_WORKSPACE, isConnectIntegrationWorkspace } from "@/lib/connectHomeWorkspace";
import { deriveConnectFlowStep, isConnectHomePublishPanelTab } from "@/lib/connectHomeFlow";
import { collectRequestCardEntries } from "@/lib/connectHomeRequestCards";
import {
  connectHubFlowStepsClass,
  connectHubLayoutClass,
  connectHubPageClass,
  connectHubScrollPaddingClass,
  connectWorkspaceScrollInsetClass,
} from "@/lib/connectHubLayout";
import { scheduleConnectWorkspaceScroll } from "@/lib/connectHubScroll";
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
  const connectWorkspace = context?.connectWorkspace;
  const connectWorkspaceScrollTick = context?.connectWorkspaceScrollTick ?? 0;
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
    (isConnectIntegration ? hasSheetData : !!dataConnected);

  /** Kalshi/Polymarket connect home: slide request summary in only after pull finishes. */
  const connectRequestSummaryReady =
    isConnectIntegration &&
    connectHomeAnalyzeActive &&
    !connectDataLakePullState.loading &&
    hasRequestCards;

  const { panelsVisible } = useConnectHomeScrollPanels({
    scrollRef,
    hubRef,
    workspaceActive,
  });

  const scrollToWorkspace = useCallback(() => {
    scheduleConnectWorkspaceScroll(workspaceRef, scrollRef);
  }, []);

  useLayoutEffect(() => {
    if (!connectWorkspace || !connectWorkspaceScrollTick) return;
    scrollToWorkspace();
  }, [connectWorkspace, connectWorkspaceScrollTick, scrollToWorkspace]);

  useEffect(() => {
    setConnectHomeLeftNavOpen?.(!!showConnectLeftNav);
  }, [showConnectLeftNav, setConnectHomeLeftNavOpen]);

  useEffect(() => {
    if (!workspaceActive) {
      setRightPanelOpen?.(false);
      return;
    }
    if (isConnectIntegration) {
      const publishTab = isConnectHomePublishPanelTab(rightPanelTab);
      if (publishTab || connectRequestSummaryReady) {
        setRightPanelOpen?.(true);
        if (connectRequestSummaryReady && !publishTab) {
          setRightPanelTab?.("integrations");
        }
      } else {
        setRightPanelOpen?.(false);
      }
      return;
    }
    if (!panelsVisible) {
      setRightPanelOpen?.(false);
      return;
    }
    setRightPanelOpen?.(true);
    if (connectWorkspace === CONNECT_WORKSPACE.INTEGRATIONS_PICKER) {
      setRightPanelTab?.("integrations");
    } else if (showDataWorkspace) {
      setRightPanelTab?.("integrations");
    }
  }, [
    connectRequestSummaryReady,
    isConnectIntegration,
    panelsVisible,
    rightPanelTab,
    workspaceActive,
    showDataWorkspace,
    connectWorkspace,
    setRightPanelOpen,
    setRightPanelTab,
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
      scheduleConnectWorkspaceScroll(workspaceRef, scrollRef);
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
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          connectHubScrollPaddingClass,
          CONNECT_HOME_SURFACE,
        )}
      >
        <div className={connectHubPageClass(true)}>
          <ConnectHomeFlowSteps
            currentStep={connectFlowStep}
            className={cn(connectHubFlowStepsClass, showConnectLeftNav && "hidden")}
          />

          <div className={connectHubLayoutClass({ fixedRail: true })}>
            <div className="flex min-w-0 flex-col">
              <div ref={hubRef}>
                <ConnectDataStep1
                  user={user}
                  userProfileFetchOk={userProfileFetchOk}
                  onActivateWorkspace={handleActivateWorkspace}
                  embeddedInShell
                />
              </div>

              {workspaceActive ? (
                <section
                  ref={workspaceRef}
                  id="connect-home-workspace"
                  className={cn(
                    "relative mt-16 min-h-[calc(100dvh-5.5rem)] sm:mt-20 md:mt-28",
                    connectWorkspaceScrollInsetClass,
                    CONNECT_HOME_SURFACE,
                  )}
                >
                  {showUploadPanel ? (
                    <ConnectHomeFileUpload onParsed={handleUploadParsed} />
                  ) : null}
                  {showDataWorkspace ? (
                    <div
                      className={cn(
                        "relative flex min-h-[calc(100dvh-6rem)] flex-col",
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
