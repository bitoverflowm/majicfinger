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
  Gem,
  Bot,
  Camera,
  FilePlus2,
  PanelLeftClose,
} from "lucide-react";

import { useMyStateV2 } from "@/context/stateContextV2";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "dataStart", label: "Data Sheet", icon: Database },
  { key: "upload", label: "Upload", icon: HardDriveUpload },
  { key: "integrations", label: "Integrations", icon: Cable },
  { key: "scrape", label: "Scrape", icon: Shovel },
  { key: "generate", label: "Generate Data", icon: BadgePlus },
  { key: "newSheet", label: "New Sheet", icon: FilePlus2 },
  { key: "charts", label: "Charts", icon: BarChart3 },
  { key: "gallery", label: "Gallery", icon: Gem },
  { key: "ai", label: "AI", icon: Bot },
  { key: "presentation", label: "Presentation", icon: Camera },
];

const SideNav = () => {
  const contextStateV2 = useMyStateV2();
  const viewing = contextStateV2?.viewing;
  const setViewing = contextStateV2?.setViewing;
  const { state: sidebarState, toggleSidebar } = useSidebar();

  const viewHandler = (key) => {
    setViewing?.(key);
  };

  const isExpanded = sidebarState === "expanded";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div
          className={`flex items-center gap-2 transition-[width,padding] duration-200 ease-linear ${
            isExpanded ? "w-full justify-between" : "w-full justify-center"
          }`}
        >
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white overflow-hidden">
              <Image src="/fruit.png" width={24} height={24} alt="Lychee" />
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
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ key, label, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    isActive={viewing === key}
                    onClick={() => viewHandler(key)}
                    tooltip={label}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};

export default SideNav;
