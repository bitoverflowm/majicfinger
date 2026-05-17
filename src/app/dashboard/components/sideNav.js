"use client";

import Image from "next/image";

import {
  Database,
  HardDriveUpload,
  LayoutDashboard,
  BadgePlus,
  Shovel,
  Cable,
  BarChart3,
  Bot,
  Camera,
  FilePlus2,
  PanelLeftClose,
  Construction,
} from "lucide-react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { CONNECT_WORKSPACE } from "@/lib/connectHomeWorkspace";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const dataViewKeys = ["dataStart", "newSheet", "upload", "integrations", "connectDataHome"];
const chartViewKeys = ["charts"];
const dashboardViewKeys = ["dashboardComposer", "presentation"];
const underConstructionKeys = ["scrape", "generate", "ai"];

const SideNav = () => {
  const contextStateV2 = useMyStateV2();
  const viewing = contextStateV2?.viewing;
  const setViewing = contextStateV2?.setViewing;
  const connectWorkspace = contextStateV2?.connectWorkspace;
  const requestConnectWorkspace = contextStateV2?.requestConnectWorkspace;
  const loadedDataMeta = contextStateV2?.loadedDataMeta;
  const setConnectHomeAnalyzeActive = contextStateV2?.setConnectHomeAnalyzeActive;
  const setRightPanelTab = contextStateV2?.setRightPanelTab;
  const setRightPanelOpen = contextStateV2?.setRightPanelOpen;
  const rightPanelTab = contextStateV2?.rightPanelTab;
  const isDemo = contextStateV2?.isDemo;
  const { state: sidebarState, toggleSidebar } = useSidebar();

  const viewHandler = (key) => {
    setViewing?.(key);
  };

  const openConnectWorkspace = (workspaceId) => {
    setViewing?.("connectDataHome");
    requestConnectWorkspace?.(workspaceId);
  };

  const openConnectHomeCore = (panelTab) => {
    setViewing?.("connectDataHome");
    if (loadedDataMeta?._id) {
      requestConnectWorkspace?.(CONNECT_WORKSPACE.PROJECT, { scroll: false });
    }
    setConnectHomeAnalyzeActive?.(true);
    if (panelTab) {
      setRightPanelTab?.(panelTab);
      setRightPanelOpen?.(true);
    } else {
      setRightPanelTab?.((prev) =>
        prev === "charts" || prev === "dashboard" ? "integrations" : prev,
      );
    }
  };

  const isConnectHome = viewing === "connectDataHome";
  const isExpanded = !isConnectHome && sidebarState === "expanded";

  const isDataActive =
    dataViewKeys.includes(viewing) ||
    (isConnectHome &&
      connectWorkspace === CONNECT_WORKSPACE.PROJECT &&
      rightPanelTab !== "charts" &&
      rightPanelTab !== "dashboard");
  const isChartActive =
    chartViewKeys.includes(viewing) || (isConnectHome && rightPanelTab === "charts");
  const isDashboardActive =
    dashboardViewKeys.includes(viewing) || (isConnectHome && rightPanelTab === "dashboard");
  const isUnderConstructionActive = underConstructionKeys.includes(viewing);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className=" border-sidebar-border">
        <div
          className={`flex items-center gap-2 transition-[width,padding] duration-200 ease-linear ${
            isExpanded ? "w-full justify-between" : "w-full justify-center"
          }`}
        >
          <div className={`flex min-w-0 shrink-0 items-center ${!isExpanded ? "w-full justify-center" : "gap-2"}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden ring-1 ring-sidebar-border">
              <Image src="/logo.png" width={32} height={32} alt="Lychee" className="object-cover rounded-full" />
            </div>
            <span
              className={`font-semibold text-sidebar-foreground truncate transition-opacity duration-200 ${
                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              }`}
            >
              Lychee
            </span>
          </div>
          {isExpanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-sidebar-foreground shrink-0"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapse menu (⌘B)</TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0 pt-3">
        {/* Data */}
        <SidebarGroup className="py-0.5">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isDataActive}
                  onClick={() => openConnectHomeCore()}
                  tooltip="Data"
                >
                  <Database className="h-5 w-5" />
                  <span>Data</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      isActive={
                        viewing === "connectDataHome" && connectWorkspace === CONNECT_WORKSPACE.BLANK
                      }
                      onClick={() => openConnectWorkspace(CONNECT_WORKSPACE.BLANK)}
                    >
                      <FilePlus2 className="h-4 w-4" />
                      <span>New Sheet</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      isActive={
                        viewing === "connectDataHome" && connectWorkspace === CONNECT_WORKSPACE.UPLOAD
                      }
                      onClick={() => openConnectWorkspace(CONNECT_WORKSPACE.UPLOAD)}
                    >
                      <HardDriveUpload className="h-4 w-4" />
                      <span>Upload</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      isActive={viewing === "integrations"}
                      onClick={() => viewHandler("integrations")}
                    >
                      <Cable className="h-4 w-4" />
                      <span>Integrations</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chart */}
        <SidebarGroup className="py-0.5">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isChartActive}
                  onClick={() => openConnectHomeCore("charts")}
                  tooltip="Chart"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Chart</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dashboard */}
        {!isDemo && (
          <SidebarGroup className="py-0.5">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isDashboardActive}
                    onClick={() => openConnectHomeCore("dashboard")}
                    tooltip="Dashboard"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={viewing === "presentation"}
                        onClick={() => viewHandler("presentation")}
                      >
                        <Camera className="h-4 w-4" />
                        <span>Presentation</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Under construction */}
        {!isDemo && (
          <SidebarGroup className="py-0.5">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isUnderConstructionActive}
                    tooltip="Under construction"
                    className="pointer-events-none opacity-70"
                  >
                    <Construction className="h-5 w-5" />
                    <span>Under construction</span>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={viewing === "scrape"}
                        onClick={() => viewHandler("scrape")}
                      >
                        <Shovel className="h-4 w-4" />
                        <span>Scrape</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={viewing === "generate"}
                        onClick={() => viewHandler("generate")}
                      >
                        <BadgePlus className="h-4 w-4" />
                        <span>Generate Data</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={viewing === "ai"}
                        onClick={() => viewHandler("ai")}
                      >
                        <Bot className="h-4 w-4" />
                        <span>AI</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      {!isConnectHome ? <SidebarRail /> : null}
    </Sidebar>
  );
};

export default SideNav;
