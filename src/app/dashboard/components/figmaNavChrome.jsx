"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BarChart3, Check, ChevronDown, ChevronRight, Database, Play, RotateCw, Save, Square, Table2, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useUser } from "@/lib/hooks";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { pageIdForTab } from "@/lib/workspaceDashboardDocument";
import { DASHBOARD_FREE_TEXT_PLACEHOLDER } from "@/lib/dashboardFreeTextTheme";
import { cn } from "@/lib/utils";

const PILL_SHADOW =
  "shadow-[0_0_0.5px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.1),0_5px_12px_rgba(0,0,0,0.13)]";

const CHROME_SURFACE = cn(
  "bg-white text-neutral-800 dark:bg-[#2c2c2c] dark:text-neutral-100",
  PILL_SHADOW,
  "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_5px_12px_rgba(0,0,0,0.45)]",
);

function SidebarToggleIcon({ className }) {
  return (
    <svg viewBox="0 0 28 20" className={cn("h-3.5 w-5", className)} fill="none" aria-hidden>
      <rect x="1" y="1" width="26" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 1v18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function textBlockLabel(row) {
  const body = String(row?.body || "").trim().replace(/\s+/g, " ");
  if (!body || body === DASHBOARD_FREE_TEXT_PLACEHOLDER) {
    return row?.textVariant === "heading" ? "Heading" : "Text";
  }
  return body.length > 48 ? `${body.slice(0, 48)}…` : body;
}

function blockLabel(block) {
  if (block?.type === "text") return textBlockLabel(block);
  const title = String(block?.title || "").trim();
  if (title) return title;
  if (block?.type === "chart") return "Chart";
  if (block?.type === "source") return "Data source";
  return "Data sheet";
}

function layersFromBlocks(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  const item = (block) => ({ id: block.id, name: blockLabel(block), type: block.type });
  return {
    sheets: list.filter((block) => block?.type === "sheet").map(item),
    sources: list.filter((block) => block?.type === "source").map(item),
    charts: list.filter((block) => block?.type === "chart").map(item),
    texts: list.filter((block) => block?.type === "text").map(item),
  };
}

/**
 * Sidebar lists each dashboard tab, then the sheets, charts, and text on that tab.
 */
function useDashboardTabTree() {
  const ctx = useMyStateV2();
  const canvas = useWorkspaceCanvas();
  const dataSheets = ctx?.dataSheets;
  const chartSheets = ctx?.chartSheets;
  const rows = ctx?.chartDashboardDraft?.layout?.rows;
  const startTabs = ctx?.workspaceStartTabs;
  const blocksByPage = canvas?.blocksByPage;

  return useMemo(() => {
    if (Array.isArray(startTabs) && startTabs.length && blocksByPage) {
      return startTabs.map((tab) => ({
        id: tab.id,
        name: String(tab.name || "").trim() || "Tab",
        pageId: pageIdForTab(tab.id),
        ...layersFromBlocks(blocksByPage[pageIdForTab(tab.id)]),
      }));
    }

    const sheets = Object.entries(dataSheets && typeof dataSheets === "object" ? dataSheets : {}).map(
      ([id, sheet]) => ({
        id,
        name: String(sheet?.name || "").trim() || "Sheet",
        type: "sheet",
      }),
    );
    const charts = Object.entries(chartSheets && typeof chartSheets === "object" ? chartSheets : {}).map(
      ([id, sheet]) => ({
        id,
        name: String(sheet?.name || "").trim() || "Chart",
        type: "chart",
      }),
    );
    const texts = (Array.isArray(rows) ? rows : [])
      .filter((row) => row?.type === "text" && row?.id)
      .map((row) => ({
        id: String(row.id),
        name: textBlockLabel(row),
        type: "text",
      }));

    return [
      {
        id: "tab-1",
        name: "Tab 1",
        pageId: "",
        sheets,
        sources: [],
        charts,
        texts,
      },
    ];
  }, [blocksByPage, chartSheets, dataSheets, rows, startTabs]);
}

function LayerRow({ active, icon: Icon, label, title, nested, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left text-[12px] leading-none hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
        nested ? "pl-7" : "pl-2",
        active
          ? "bg-[#e5f4ff] text-[#0d99ff] hover:bg-[#e5f4ff] dark:bg-[#0d99ff]/20 dark:text-[#8ecaff] dark:hover:bg-[#0d99ff]/20"
          : "text-neutral-800 dark:text-neutral-100",
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function DashboardLayerTree() {
  const ctx = useMyStateV2();
  const canvas = useWorkspaceCanvas();
  const tabs = useDashboardTabTree();
  const [openTabs, setOpenTabs] = useState({});

  const viewing = ctx?.viewing;
  const activeTabId = ctx?.activeWorkspaceStartTabId;
  const selectedId = canvas?.selectedId;

  const openTab = (tab) => {
    setOpenTabs((prev) => ({ ...prev, [tab.id]: true }));
    if (!tab.pageId) return;
    ctx?.setViewing?.("welcome");
    ctx?.setActiveWorkspaceStartTabId?.(tab.id);
  };

  const openBlock = (tab, blockId) => {
    openTab(tab);
    canvas?.focusBlock?.(blockId, tab.pageId);
  };

  const blockActive = (tab, id) =>
    viewing === "welcome" && tab.id === activeTabId && id === selectedId;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1.5 py-2">
      {tabs.map((tab) => {
        const open = openTabs[tab.id] !== false;
        const count = tab.sheets.length + tab.sources.length + tab.charts.length + tab.texts.length;
        const tabActive = viewing === "welcome" && tab.id === activeTabId;
        return (
          <div key={tab.id}>
            <div
              className={cn(
                "flex h-7 w-full items-center gap-0.5 rounded-md pr-1.5",
                tabActive && "bg-[#e5f4ff] dark:bg-[#0d99ff]/20",
              )}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-label={open ? `Collapse ${tab.name}` : `Expand ${tab.name}`}
                onClick={() => setOpenTabs((prev) => ({ ...prev, [tab.id]: !open }))}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <ChevronRight className={cn("size-3 transition-transform", open && "rotate-90")} />
              </button>
              <button
                type="button"
                onClick={() => openTab(tab)}
                className={cn(
                  "min-w-0 flex-1 truncate text-left text-[12px] font-medium",
                  tabActive ? "text-[#0d99ff] dark:text-[#8ecaff]" : "text-neutral-800 dark:text-neutral-100",
                )}
              >
                {tab.name}
              </button>
            </div>
            {open ? (
              <div className="pb-1">
                {tab.sheets.map((sheet) => (
                  <LayerRow
                    key={`sheet-${sheet.id}`}
                    nested
                    icon={Table2}
                    label={sheet.name}
                    title="Data sheet"
                    active={blockActive(tab, sheet.id)}
                    onClick={() => openBlock(tab, sheet.id)}
                  />
                ))}
                {tab.sources.map((source) => (
                  <LayerRow
                    key={`source-${source.id}`}
                    nested
                    icon={Database}
                    label={source.name}
                    title="Data source"
                    active={blockActive(tab, source.id)}
                    onClick={() => openBlock(tab, source.id)}
                  />
                ))}
                {tab.charts.map((chart) => (
                  <LayerRow
                    key={`chart-${chart.id}`}
                    nested
                    icon={BarChart3}
                    label={chart.name}
                    title="Chart"
                    active={blockActive(tab, chart.id)}
                    onClick={() => openBlock(tab, chart.id)}
                  />
                ))}
                {tab.texts.map((text) => (
                  <LayerRow
                    key={`text-${text.id}`}
                    nested
                    icon={Type}
                    label={text.name}
                    title="Text"
                    active={blockActive(tab, text.id)}
                    onClick={() => openBlock(tab, text.id)}
                  />
                ))}
                {count === 0 ? (
                  <p className="px-7 py-1 text-[11px] text-neutral-500">Nothing in this tab yet</p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LiveTransportControls() {
  const ctx = useMyStateV2();
  const [selectedKey, setSelectedKey] = useState(null);

  const streamsBySheetId = ctx?.liveStreamState?.streamsBySheetId || {};
  const feedsById = ctx?.liveFeedState?.feedsById || {};
  const dataSheets = ctx?.dataSheets || {};

  const targets = useMemo(() => {
    const streamTargets = Object.keys(streamsBySheetId)
      .filter((id) => streamsBySheetId[id]?.isRunning || streamsBySheetId[id]?.config)
      .map((id) => ({
        key: `stream:${id}`,
        kind: "stream",
        id,
        label: dataSheets?.[id]?.name || id,
      }));
    const feedTargets = Object.keys(feedsById)
      .filter((id) => feedsById[id]?.isRunning || feedsById[id]?.config)
      .map((id) => ({
        key: `feed:${id}`,
        kind: "feed",
        id,
        label: feedsById[id]?.label || feedsById[id]?.name || "Live feed",
      }));
    return [...streamTargets, ...feedTargets];
  }, [dataSheets, feedsById, streamsBySheetId]);

  if (!targets.length) return null;

  const active = targets.find((target) => target.key === selectedKey) || targets[0];
  const state =
    active.kind === "stream" ? streamsBySheetId[active.id] : feedsById[active.id];
  const actions = active.kind === "stream" ? ctx?.liveStreamActions : ctx?.liveFeedActions;
  const iconButton =
    "inline-flex size-7 items-center justify-center rounded-md text-neutral-700 hover:bg-black/[0.05] disabled:opacity-40 dark:text-neutral-200 dark:hover:bg-white/10";

  return (
    <div className="flex items-center">
      {targets.length > 1 ? (
        <select
          className="mr-0.5 max-w-[88px] truncate bg-transparent text-[11px] text-neutral-600 outline-none dark:text-neutral-300"
          value={active.key}
          aria-label="Select live feed"
          onChange={(event) => setSelectedKey(event.target.value)}
        >
          {targets.map((target) => (
            <option key={target.key} value={target.key}>
              {target.label}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="button"
        className={iconButton}
        title={state?.isPaused ? "Play" : "Play"}
        aria-label="Play"
        onClick={() => actions?.resume?.(active.id)}
      >
        <Play className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        title="Stop"
        aria-label="Stop"
        onClick={() => actions?.stop?.(active.id)}
      >
        <Square className="size-3.5" />
      </button>
      <button
        type="button"
        className={iconButton}
        title="Replay"
        aria-label="Replay"
        onClick={() => actions?.restart?.(active.id)}
      >
        <RotateCw className="size-3.5" />
      </button>
    </div>
  );
}

function AccountMenu({ onLogout }) {
  const user = useUser();
  const ctx = useMyStateV2();
  const userHandle = ctx?.userHandle;
  const profilePic = ctx?.profilePic;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-0.5 rounded-md py-0.5 pl-0.5 pr-1 hover:bg-black/[0.05] dark:hover:bg-white/10"
          aria-label="Account menu"
        >
          <UserAvatar
            src={profilePic}
            handle={userHandle}
            name={user?.name}
            email={user?.email}
            size={24}
            className="size-6 border-0"
            fallbackClassName="border-0 bg-transparent dark:bg-transparent"
          />
          <ChevronDown className="size-3 text-neutral-500" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Profile</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => ctx?.setViewing?.("profilePage")}>Manage</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => ctx?.setViewing?.("manageAccount")}>Billing</DropdownMenuItem>
        <DropdownMenuItem>Support</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onLogout?.()}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SaveDashboardButton() {
  const canvas = useWorkspaceCanvas();
  const [state, setState] = useState("idle");

  const onClick = async () => {
    if (state === "saving") return;
    setState("saving");
    const result = await canvas?.saveNow?.();
    setState(result?.ok ? "saved" : "idle");
    if (result?.ok) window.setTimeout(() => setState((current) => (current === "saved" ? "idle" : current)), 1400);
  };

  const saved = state === "saved";
  return (
    <button
      type="button"
      aria-label={saved ? "Saved" : "Save dashboard"}
      title={saved ? "Saved" : "Save"}
      disabled={state === "saving"}
      onClick={() => {
        void onClick();
      }}
      className="inline-flex size-7 items-center justify-center rounded-md text-neutral-700 hover:bg-black/[0.05] disabled:opacity-60 dark:text-neutral-200 dark:hover:bg-white/10"
    >
      {saved ? <Check className="size-4" aria-hidden /> : <Save className="size-4" aria-hidden />}
    </button>
  );
}

function RightChromeControls({ onLogout, expanded }) {
  const user = useUser();
  const router = useRouter();

  return (
    <div className={cn("flex items-center gap-0.5", expanded && "min-w-0 flex-wrap")}>
      {user ? (
        <AccountMenu onLogout={onLogout} />
      ) : (
        <Button
          variant="default"
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => router.push("/login")}
        >
          Log In
        </Button>
      )}
      <SaveDashboardButton />
      <AnimatedThemeToggler className="inline-flex size-7 items-center justify-center rounded-md text-neutral-700 hover:bg-black/[0.05] dark:text-neutral-200 dark:hover:bg-white/10 [&_svg]:size-4" />
      <LiveTransportControls />
      <button
        type="button"
        className="ml-1 inline-flex h-7 items-center rounded-md bg-[#0d99ff] px-3 text-[13px] font-medium text-white hover:bg-[#0b87e0]"
      >
        Share
      </button>
    </div>
  );
}

function DashboardNameField({ name, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [editing, name]);

  if (editing) {
    return (
      <input
        autoFocus
        aria-label="Dashboard name"
        value={draft}
        maxLength={120}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          onCommit(draft);
          setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(name);
            setEditing(false);
          }
        }}
        className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-[13px] font-medium tracking-[-0.01em] outline-none ring-1 ring-[#0d99ff]"
      />
    );
  }

  return (
    <button
      type="button"
      title={name}
      onClick={() => setEditing(true)}
      className="min-w-0 flex-1 truncate rounded-md px-1 py-0.5 text-left text-[13px] font-medium tracking-[-0.01em] hover:bg-black/[0.05] dark:hover:bg-white/10"
    >
      {name}
    </button>
  );
}

function LeftChromeHeader({ dashboardName, expanded, onToggle, onRename }) {
  return (
    <div className={cn("flex h-10 shrink-0 items-center gap-2 pl-1.5 pr-1", expanded && "border-b border-black/[0.06] dark:border-white/10")}>
      <span className="mr-1 flex size-[22px] shrink-0 overflow-hidden rounded-full">
        <Image src="/logo.png" width={22} height={22} alt="Lychee" className="size-full object-cover" />
      </span>
      <DashboardNameField name={dashboardName} onCommit={onRename} />
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={expanded}
        aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-700 hover:bg-black/[0.05] dark:text-neutral-200 dark:hover:bg-white/10"
      >
        <SidebarToggleIcon />
      </button>
    </div>
  );
}

export default function FigmaNavChrome({ onLogout }) {
  const ctx = useMyStateV2();
  const canvas = useWorkspaceCanvas();
  const expanded = !!ctx?.navChromeExpanded;
  const setExpanded = ctx?.setNavChromeExpanded;
  const dashboardName = canvas?.dashboardName || "Untitled";

  const toggle = () => setExpanded?.(!expanded);

  return (
    <>
      {expanded ? (
        <button
          type="button"
          aria-label="Collapse navigation"
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setExpanded?.(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-2 z-40 flex flex-col rounded-[13px]",
          CHROME_SURFACE,
          expanded ? "bottom-2 top-2 w-[260px]" : "top-2 h-10 w-auto max-w-[min(280px,calc(100vw-18rem))]",
        )}
      >
        <LeftChromeHeader
          dashboardName={dashboardName}
          expanded={expanded}
          onToggle={toggle}
          onRename={(next) => canvas?.renameDashboard?.(next)}
        />
        {expanded ? <DashboardLayerTree /> : null}
      </aside>

      <aside
        className={cn(
          "fixed right-2 z-40 flex flex-col rounded-[13px]",
          CHROME_SURFACE,
          expanded ? "bottom-2 top-2 w-[260px]" : "top-2 h-10 w-auto",
        )}
      >
        <div className={cn("flex h-10 shrink-0 items-center px-1.5", expanded && "border-b border-black/[0.06] dark:border-white/10")}>
          <RightChromeControls onLogout={onLogout} expanded={expanded} />
        </div>
      </aside>
    </>
  );
}
