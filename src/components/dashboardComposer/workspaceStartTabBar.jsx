"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, MoreVertical, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DestructiveConfirmMenuItem } from "@/components/ui/destructive-confirm-menu-item";
import { cn } from "@/lib/utils";
import {
  WELCOME_START_TAB_ID,
  duplicateTabName,
  newBlankTabName,
  newStartTabId,
  saveWorkspaceStartTabs,
} from "@/lib/workspaceStartTabs";
import { terminalTabField } from "@/lib/workspaceTerminals";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { LandingDemoMembersOnlyPortal } from "@/components/dashboardComposer/landingDemoMembersOnly";
import { useUser } from "@/lib/hooks";

function StartTabChip({ tab, selected, userId, onSelect }) {
  const context = useMyStateV2();
  const canvas = useWorkspaceCanvas();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(tab.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!renaming) setDraftName(tab.name);
  }, [renaming, tab.name]);

  useEffect(() => {
    if (!renaming) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [renaming]);

  const persist = (next) => {
    context?.setWorkspaceStartTabs?.(next.tabs);
    context?.setWelcomeTabRemoved?.(next.welcomeRemoved);
    context?.setActiveWorkspaceStartTabId?.(next.activeId);
    saveWorkspaceStartTabs(userId, next);
  };

  const current = () => ({
    welcomeRemoved: !!context?.welcomeTabRemoved,
    tabs: Array.isArray(context?.workspaceStartTabs) ? context.workspaceStartTabs : [],
    activeId: context?.activeWorkspaceStartTabId || null,
  });

  const duplicate = () => {
    const state = current();
    const copy = {
      id: newStartTabId(),
      name: duplicateTabName(tab.name, state.tabs.map((item) => item.name)),
      blank: !!tab.blank,
      ...terminalTabField(tab),
    };
    const index = state.tabs.findIndex((item) => item.id === tab.id);
    const at = index < 0 ? state.tabs.length : index + 1;
    const tabs = [...state.tabs.slice(0, at), copy, ...state.tabs.slice(at)];
    persist({ ...state, tabs, activeId: copy.id });
    onSelect?.(copy.id);
    setMenuOpen(false);
  };

  const commitRename = () => {
    const name = String(inputRef.current?.value ?? draftName).trim();
    setRenaming(false);
    if (!name || name === tab.name) {
      setDraftName(tab.name);
      return;
    }
    const state = current();
    persist({
      ...state,
      tabs: state.tabs.map((item) => (item.id === tab.id ? { ...item, name } : item)),
    });
  };

  const remove = () => {
    const state = current();
    const index = state.tabs.findIndex((item) => item.id === tab.id);
    const tabs = state.tabs.filter((item) => item.id !== tab.id);
    const welcomeRemoved = state.welcomeRemoved || tab.id === WELCOME_START_TAB_ID;
    const neighbor = tabs[index] || tabs[index - 1] || null;
    const activeId =
      state.activeId === tab.id ? neighbor?.id || null : state.activeId;
    persist({ welcomeRemoved, tabs, activeId });
    canvas?.deleteTab?.(tab.id);
    setMenuOpen(false);
    if (state.activeId === tab.id) {
      if (neighbor) onSelect?.(neighbor.id);
      else context?.setViewing?.("connectDataHome");
    }
  };

  return (
    <div className="group/tab relative inline-flex shrink-0">
      {renaming ? (
        <input
          ref={inputRef}
          value={draftName}
          aria-label="Rename tab"
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              setDraftName(tab.name);
              setRenaming(false);
            }
          }}
          style={{ width: Math.max(88, draftName.length * 7 + 28) }}
          className="h-7 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <button
          type="button"
          role="tab"
          aria-selected={selected}
          data-start-tab-id={tab.id}
          onClick={() => onSelect?.(tab.id)}
          className={cn(
            "inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs font-medium shadow-sm transition-[padding-right] duration-200 ease-out",
            selected
              ? "bg-card text-foreground"
              : "bg-background text-muted-foreground transition-[padding-right,color,background-color] duration-200 hover:bg-muted hover:text-foreground",
            menuOpen && "pr-6",
            "group-hover/tab:pr-6 group-focus-within/tab:pr-6",
          )}
        >
          {tab.name}
        </button>
      )}
      {renaming ? null : (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${tab.name}`}
              className={cn(
                "absolute right-0.5 top-1/2 inline-flex size-5 -translate-y-1/2 translate-x-1 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-[opacity,transform] duration-200 ease-out hover:bg-muted hover:text-foreground",
                "pointer-events-none group-hover/tab:pointer-events-auto group-hover/tab:translate-x-0 group-hover/tab:opacity-100 group-focus-within/tab:pointer-events-auto group-focus-within/tab:translate-x-0 group-focus-within/tab:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:translate-x-0 data-[state=open]:opacity-100",
              )}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.(tab.id);
              }}
            >
              <MoreVertical className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={6} className="w-48 rounded-xl p-1 shadow-lg">
            <DropdownMenuItem
              className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
              onSelect={duplicate}
            >
              <Copy className="size-4 text-muted-foreground" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
              onSelect={() => {
                setDraftName(tab.name);
                setRenaming(true);
              }}
            >
              <Pencil className="size-4 text-muted-foreground" />
              Rename
            </DropdownMenuItem>
            <DestructiveConfirmMenuItem onConfirm={remove} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function WorkspaceStartTabs({ tabsActive, onOpenTabs }) {
  const context = useMyStateV2();
  const canvas = useWorkspaceCanvas();
  const sessionUser = useUser();
  const tabs = Array.isArray(context?.workspaceStartTabs) ? context.workspaceStartTabs : [];
  const activeId = context?.activeWorkspaceStartTabId;

  const selectTab = (id) => {
    if (canvas?.requestTab) {
      canvas.requestTab(id);
      return;
    }
    context?.setActiveWorkspaceStartTabId?.(id);
    onOpenTabs?.();
  };

  const [membersOnlyOpen, setMembersOnlyOpen] = useState(false);
  const closeMembersOnly = useCallback(() => setMembersOnlyOpen(false), []);

  const addBlankTab = () => {
    if (context?.landingDemo) {
      setMembersOnlyOpen(true);
      return;
    }
    const state = {
      welcomeRemoved: !!context?.welcomeTabRemoved,
      tabs,
      activeId: activeId || null,
    };
    const tab = {
      id: newStartTabId(),
      name: newBlankTabName(tabs.map((item) => item.name)),
      blank: true,
    };
    const next = { ...state, tabs: [...tabs, tab] };
    context?.setWorkspaceStartTabs?.(next.tabs);
    context?.setWelcomeTabRemoved?.(next.welcomeRemoved);
    saveWorkspaceStartTabs(sessionUser?.userId, { ...next, activeId: activeId || null });
    if (canvas?.requestTab) {
      canvas.requestTab(tab.id);
      return;
    }
    context?.setActiveWorkspaceStartTabId?.(tab.id);
    onOpenTabs?.();
  };

  return (
    <div
      role="tablist"
      aria-label="Workspace"
      className="relative z-30 flex h-11 shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto px-4"
    >
      {tabs.map((tab) => (
        <StartTabChip
          key={tab.id}
          tab={tab}
          selected={!!tabsActive && tab.id === activeId}
          userId={sessionUser?.userId}
          onSelect={selectTab}
        />
      ))}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="New tab"
              onClick={addBlankTab}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-sm leading-none text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            >
              +
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="text-xs">
            New tab
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {context?.landingDemo ? (
        <LandingDemoMembersOnlyPortal open={membersOnlyOpen} onClose={closeMembersOnly} />
      ) : null}
    </div>
  );
}
