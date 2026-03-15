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

const dataViewKeys = ["dataStart", "newSheet", "upload", "integrations"];
const chartViewKeys = ["charts"];
const dashboardViewKeys = ["dashboard", "presentation"];
const underConstructionKeys = ["scrape", "generate", "ai"];

const SideNav = () => {
  const contextStateV2 = useMyStateV2();
  const viewing = contextStateV2?.viewing;
  const setViewing = contextStateV2?.setViewing;
  const { state: sidebarState, toggleSidebar } = useSidebar();

  const viewHandler = (key) => {
    setViewing?.(key);
  };

  const isExpanded = sidebarState === "expanded";

  const isDataActive = dataViewKeys.includes(viewing);
  const isChartActive = chartViewKeys.includes(viewing);
  const isDashboardActive = dashboardViewKeys.includes(viewing);
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
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white overflow-hidden">
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
                  onClick={() => viewHandler("dataStart")}
                  tooltip="Data"
                >
                  <Database className="h-5 w-5" />
                  <span>Data</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      isActive={viewing === "newSheet"}
                      onClick={() => viewHandler("newSheet")}
                    >
                      <FilePlus2 className="h-4 w-4" />
                      <span>New Sheet</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      isActive={viewing === "upload"}
                      onClick={() => viewHandler("upload")}
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
                  onClick={() => viewHandler("charts")}
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
        <SidebarGroup className="py-0.5">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isDashboardActive}
                  onClick={() => viewHandler("dashboard")}
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

        {/* Under construction */}
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
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};

export default SideNav;
