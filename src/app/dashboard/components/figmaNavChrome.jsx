"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BarChart3, ChevronDown, ChevronRight, Play, RotateCw, Square, Table2, Type } from "lucide-react";

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
import { CONNECT_HOME_CENTER_VIEW } from "@/lib/connectHomeFlow";
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

function workspaceTargets(viewing) {
  return (
    viewing === "connectDataHome" ||
    viewing === "dataStart" ||
    viewing === "charts" ||
    viewing === "dashboardComposer"
  );
}

/**
 * One parent tab until dashboards persist multiple tabs.
 * Children mirror the sheet tabs, chart tabs, and dashboard text blocks.
 */
function useDashboardTabTree() {
  const ctx = useMyStateV2();
  const dataSheets = ctx?.dataSheets;
  const chartSheets = ctx?.chartSheets;
  const rows = ctx?.chartDashboardDraft?.layout?.rows;

  return useMemo(() => {
    const sheets = Object.entries(dataSheets && typeof dataSheets === "object" ? dataSheets : {}).map(
      ([id, sheet]) => ({
        id,
        name: String(sheet?.name || "").trim() || "Sheet",
      }),
    );
    const charts = Object.entries(chartSheets && typeof chartSheets === "object" ? chartSheets : {}).map(
      ([id, sheet]) => ({
        id,
        name: String(sheet?.name || "").trim() || "Chart",
      }),
    );
    const texts = (Array.isArray(rows) ? rows : [])
      .filter((row) => row?.type === "text" && row?.id)
      .map((row) => ({
        id: String(row.id),
        name: textBlockLabel(row),
      }));

    return [
      {
        id: "tab-1",
        name: "Tab 1",
        sheets,
        charts,
        texts,
      },
    ];
  }, [chartSheets, dataSheets, rows]);
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
  const tabs = useDashboardTabTree();
  const [openTabs, setOpenTabs] = useState(() => ({ "tab-1": true }));
  const [pickedKey, setPickedKey] = useState(null);

  const viewing = ctx?.viewing;
  const activeSheetId = ctx?.activeSheetId;
  const activeChartSheetId = ctx?.activeChartSheetId;
  const centerView = ctx?.connectHomeCenterView;
  const chartSheets = ctx?.chartSheets || {};

  const focusSurface = (center) => {
    if (!workspaceTargets(viewing)) return;
    if (viewing === "connectDataHome") {
      ctx?.setConnectHomeCenterView?.(center);
      return;
    }
    if (center === CONNECT_HOME_CENTER_VIEW.SHEET) ctx?.setViewing?.("dataStart");
    else if (center === CONNECT_HOME_CENTER_VIEW.CHARTS) ctx?.setViewing?.("charts");
    else if (center === CONNECT_HOME_CENTER_VIEW.DASHBOARD) ctx?.setViewing?.("dashboardComposer");
  };

  const openSheet = (id) => {
    setPickedKey(`sheet:${id}`);
    ctx?.setActiveSheetId?.(id);
    focusSurface(CONNECT_HOME_CENTER_VIEW.SHEET);
  };

  const openChart = async (id) => {
    setPickedKey(`chart:${id}`);
    if (typeof ctx?.chartSnapshotFlusher === "function") {
      try {
        await ctx.chartSnapshotFlusher();
      } catch {
        // Keep the existing chart tab if the flush fails.
      }
    }
    const sheet = chartSheets?.[id];
    ctx?.setActiveChartSheetId?.(id);
    ctx?.setLoadedChartBuilderSnapshot?.(sheet?.snapshot ?? null);
    ctx?.setLoadedChartMeta?.(sheet?.chartMeta ?? null);
    focusSurface(CONNECT_HOME_CENTER_VIEW.CHARTS);
  };

  const openText = (id) => {
    setPickedKey(`text:${id}`);
    focusSurface(CONNECT_HOME_CENTER_VIEW.DASHBOARD);
  };

  const sheetActive = (id) =>
    pickedKey === `sheet:${id}` ||
    (pickedKey == null &&
      viewing !== "welcome" &&
      id === activeSheetId &&
      (centerView === CONNECT_HOME_CENTER_VIEW.SHEET || viewing === "dataStart"));

  const chartActive = (id) =>
    pickedKey === `chart:${id}` ||
    (pickedKey == null &&
      viewing !== "welcome" &&
      id === activeChartSheetId &&
      (centerView === CONNECT_HOME_CENTER_VIEW.CHARTS || viewing === "charts"));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1.5 py-2">
      {tabs.map((tab) => {
        const open = openTabs[tab.id] !== false;
        const empty = tab.sheets.length + tab.charts.length + tab.texts.length === 0;
        return (
          <div key={tab.id}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenTabs((prev) => ({ ...prev, [tab.id]: !open }))}
              className="flex h-7 w-full items-center gap-1 rounded-md px-1.5 text-left text-[12px] font-medium text-neutral-800 hover:bg-black/[0.04] dark:text-neutral-100 dark:hover:bg-white/[0.06]"
            >
              <ChevronRight className={cn("size-3 shrink-0 text-neutral-500 transition-transform", open && "rotate-90")} />
              <span className="min-w-0 flex-1 truncate">{tab.name}</span>
            </button>
            {open ? (
              <div className="pb-1">
                {tab.sheets.map((sheet) => (
                  <LayerRow
                    key={`sheet-${sheet.id}`}
                    nested
                    icon={Table2}
                    label={sheet.name}
                    title="Data sheet"
                    active={sheetActive(sheet.id)}
                    onClick={() => openSheet(sheet.id)}
                  />
                ))}
                {tab.charts.map((chart) => (
                  <LayerRow
                    key={`chart-${chart.id}`}
                    nested
                    icon={BarChart3}
                    label={chart.name}
                    title="Chart"
                    active={chartActive(chart.id)}
                    onClick={() => {
                      void openChart(chart.id);
                    }}
                  />
                ))}
                {tab.texts.map((text) => (
                  <LayerRow
                    key={`text-${text.id}`}
                    nested
                    icon={Type}
                    label={text.name}
                    title="Text"
                    active={pickedKey === `text:${text.id}`}
                    onClick={() => openText(text.id)}
                  />
                ))}
                {empty ? (
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

function LeftChromeHeader({ dashboardName, expanded, onToggle, onOpenDashboard }) {
  return (
    <div className={cn("flex h-10 shrink-0 items-center gap-2 pl-1.5 pr-1", expanded && "border-b border-black/[0.06] dark:border-white/10")}>
      <span className="mr-1 flex size-[22px] shrink-0 overflow-hidden rounded-full">
        <Image src="/logo.png" width={22} height={22} alt="Lychee" className="size-full object-cover" />
      </span>
      {dashboardName ? (
        <button
          type="button"
          onClick={onOpenDashboard}
          title={dashboardName}
          className="min-w-0 flex-1 truncate rounded-md px-1 py-0.5 text-left text-[13px] font-medium tracking-[-0.01em] hover:bg-black/[0.05] dark:hover:bg-white/10"
        >
          {dashboardName}
        </button>
      ) : null}
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
  const expanded = !!ctx?.navChromeExpanded;
  const setExpanded = ctx?.setNavChromeExpanded;

  const loadedName = String(ctx?.loadedDataMeta?.data_set_name || "").trim();
  const startTabs = Array.isArray(ctx?.workspaceStartTabs) ? ctx.workspaceStartTabs : [];
  const activeStartTab = startTabs.find((tab) => tab.id === ctx?.activeWorkspaceStartTabId);
  const welcomeTab = startTabs.find((tab) => tab.id === "welcome");
  const dashboardName =
    ctx?.viewing === "welcome" && activeStartTab?.name
      ? activeStartTab.name
      : loadedName || welcomeTab?.name || (ctx?.welcomeTabRemoved ? "" : "Welcome");

  const toggle = () => setExpanded?.(!expanded);

  const openMainDashboard = () => {
    const onStartDashboard = ctx?.viewing === "welcome" || !loadedName;
    if (onStartDashboard) {
      ctx?.setViewing?.("welcome");
      return;
    }
    ctx?.setConnectHomeCenterView?.(CONNECT_HOME_CENTER_VIEW.DASHBOARD);
    if (ctx?.viewing !== "connectDataHome") {
      ctx?.setViewing?.("dashboardComposer");
    }
  };

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
          onOpenDashboard={openMainDashboard}
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
