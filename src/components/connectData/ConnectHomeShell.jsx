"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { CONNECT_WORKSPACE, isConnectIntegrationWorkspace } from "@/lib/connectHomeWorkspace";
import { useConnectHomeScrollPanels } from "@/hooks/useConnectHomeScrollPanels";
import { cn } from "@/lib/utils";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import SideNav from "@/app/dashboard/components/sideNav";
import DataSheetWithIntegration from "@/components/dataView/dataSheetWithIntegration";
import ConnectDataStep1 from "@/components/connectData/ConnectDataStep1";
import { ConnectHomeFileUpload } from "@/components/connectData/ConnectHomeFileUpload";

export default function ConnectHomeShell({ user, userProfileFetchOk, startNew, setStartNew }) {
  const context = useMyStateV2();
  const connectWorkspace = context?.connectWorkspace;
  const connectWorkspaceScrollTick = context?.connectWorkspaceScrollTick ?? 0;
  const dataConnected = context?.dataConnected;
  const setRightPanelOpen = context?.setRightPanelOpen;
  const setRightPanelTab = context?.setRightPanelTab;
  const setIntegrationSidebar = context?.setIntegrationSidebar;

  const scrollRef = useRef(null);
  const hubRef = useRef(null);
  const workspaceRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [blankStartNew, setBlankStartNew] = useState(false);

  const workspaceActive = !!connectWorkspace;

  const showUploadPanel =
    connectWorkspace === CONNECT_WORKSPACE.UPLOAD && !dataConnected;

  const showDataWorkspace = useMemo(() => {
    if (!connectWorkspace) return false;
    if (connectWorkspace === CONNECT_WORKSPACE.UPLOAD) return !!dataConnected;
    if (connectWorkspace === CONNECT_WORKSPACE.BLANK) return true;
    if (isConnectIntegrationWorkspace(connectWorkspace)) return true;
    return false;
  }, [connectWorkspace, dataConnected]);

  const { panelsVisible } = useConnectHomeScrollPanels({
    scrollRef,
    hubRef,
    workspaceActive,
  });

  const scrollToWorkspace = useCallback(() => {
    requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    if (!connectWorkspace || !connectWorkspaceScrollTick) return;
    scrollToWorkspace();
  }, [connectWorkspace, connectWorkspaceScrollTick, scrollToWorkspace]);

  useEffect(() => {
    setSidebarOpen(panelsVisible);
    if (panelsVisible && workspaceActive) {
      setRightPanelOpen?.(true);
      if (isConnectIntegrationWorkspace(connectWorkspace)) {
        setRightPanelTab?.("integrations");
      } else if (showDataWorkspace) {
        setRightPanelTab?.("integrations");
      }
    } else if (!panelsVisible) {
      setRightPanelOpen?.(false);
    }
  }, [
    panelsVisible,
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
    },
    [context],
  );

  const handleUploadParsed = useCallback(() => {
    scrollToWorkspace();
  }, [scrollToWorkspace]);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} defaultOpen={false}>
      <div className="flex min-h-0 min-w-0 flex-1">
        <SideNav />
        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-muted/20 via-background to-background"
          >
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
                className="relative min-h-[calc(100dvh-5.5rem)] scroll-mt-4 border-t border-border/40 bg-background"
              >
                {showUploadPanel ? (
                  <ConnectHomeFileUpload onParsed={handleUploadParsed} />
                ) : null}
                {showDataWorkspace ? (
                  <div
                    className={cn(
                      "relative flex min-h-[calc(100dvh-6rem)] flex-col",
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
