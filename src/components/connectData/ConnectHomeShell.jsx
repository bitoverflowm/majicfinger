"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { CONNECT_WORKSPACE, isConnectIntegrationWorkspace } from "@/lib/connectHomeWorkspace";
import { deriveConnectFlowStep } from "@/lib/connectHomeFlow";
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
  const dataConnected = context?.dataConnected;
  const viewing = context?.viewing;
  const connectedData = context?.connectedData;
  const dataSheets = context?.dataSheets;
  const rightPanelTab = context?.rightPanelTab;
  const setRightPanelOpen = context?.setRightPanelOpen;
  const setRightPanelTab = context?.setRightPanelTab;

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
    // Hub picker (no workspace) or hub still in view — hide integrations drawer.
    if (!workspaceActive || !panelsVisible) {
      setRightPanelOpen?.(false);
      return;
    }
    setRightPanelOpen?.(true);
    if (
      connectWorkspace === CONNECT_WORKSPACE.INTEGRATIONS_PICKER ||
      isConnectIntegrationWorkspace(connectWorkspace)
    ) {
      setRightPanelTab?.("integrations");
    } else if (showDataWorkspace) {
      setRightPanelTab?.("integrations");
    }
  }, [
    panelsVisible,
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
          <ConnectHomeFlowSteps currentStep={connectFlowStep} className={connectHubFlowStepsClass} />

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
