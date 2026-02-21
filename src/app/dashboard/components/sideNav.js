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
  SidebarTrigger,
} from "@/components/ui/sidebar";

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

  const viewHandler = (key) => {
    setViewing?.(key);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
          <Image src="/fruit.png" width={15} height={6} alt="logo" />
        </div>
        <SidebarTrigger />
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
    </Sidebar>
  );
};

export default SideNav;
