"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { JarvisNavSearch } from "@/components/nav/jarvis-nav-search";
import { DashboardDemoSectionLazy } from "@/components/sections/dashboard-demo-section-lazy";
import { warRoomHref } from "@/lib/warRoom/href";
import { WAR_ROOM_MARKET_PICK_EVENT, WAR_ROOM_NEWS_PICK_EVENT } from "@/lib/warRoom/pickMarket";
import { WORKSPACE_ENTRY_PATH } from "@/lib/workspaceEntry";
import { cn } from "@/lib/utils";

import { useWarRoomResearchDemo } from "./useWarRoomResearchDemo";
import { useWarRoomTheme } from "./useWarRoomTheme";
import { WarRoomView, type WarRoomNavigateRequest } from "./WarRoomView";

const TABS = [
  { id: "war-room", label: "War Room" },
  { id: "past", label: "Historical" },
  { id: "present", label: "Present" },
  { id: "markets", label: "Markets" },
  { id: "holders", label: "Holders" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BARE_DEMO_SECTION_CLASS = "relative z-30 m-0 h-full w-full p-0";

/**
 * Full-page War Room. Same Research Holders / Research Market handoff as the
 * homepage demo: stay on this screen, select Holders or Markets, expand with context.
 */
export function WarRoomTerminal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const market = searchParams?.get("market") || "";
  const fixture = ["1", "true", "yes"].includes(String(searchParams?.get("fixture") || "").toLowerCase());
  const [tab, setTab] = useState<TabId>("war-room");
  const {
    marketSubject,
    holdersSubject,
    marketsStart,
    holdersStart,
    openMarketsTab,
    openHoldersTab,
    applyResearchNavigate,
  } = useWarRoomResearchDemo();

  const onMarketChange = useCallback(
    (id: string | null) => {
      const href = warRoomHref({ market: id });
      const suffix = fixture ? `${href.includes("?") ? "&" : "?"}fixture=1` : "";
      router.replace(`${href}${suffix}`, { scroll: false });
    },
    [fixture, router],
  );

  useEffect(() => {
    const onMarketPick = (event: Event) => {
      const id = String((event as CustomEvent<{ marketId?: string }>).detail?.marketId || "").trim();
      if (!id) return;
      setTab("war-room");
      onMarketChange(id);
    };
    const onNewsPick = () => {
      setTab("war-room");
    };
    window.addEventListener(WAR_ROOM_MARKET_PICK_EVENT, onMarketPick as EventListener);
    window.addEventListener(WAR_ROOM_NEWS_PICK_EVENT, onNewsPick as EventListener);
    return () => {
      window.removeEventListener(WAR_ROOM_MARKET_PICK_EVENT, onMarketPick as EventListener);
      window.removeEventListener(WAR_ROOM_NEWS_PICK_EVENT, onNewsPick as EventListener);
    };
  }, [onMarketChange]);

  const onNavigate = useCallback(
    (request: WarRoomNavigateRequest) => {
      const next = applyResearchNavigate(request);
      if (next === "markets" || next === "holders" || next === "war-room") setTab(next);
    },
    [applyResearchNavigate],
  );

  const onSelectTab = useCallback(
    (id: TabId) => {
      if (id === "markets") {
        openMarketsTab(marketSubject);
        setTab("markets");
        return;
      }
      if (id === "holders") {
        openHoldersTab(holdersSubject);
        setTab("holders");
        return;
      }
      setTab(id);
    },
    [holdersSubject, marketSubject, openHoldersTab, openMarketsTab],
  );

  const showPast = tab === "past";
  const showPresent = tab === "present";
  const showMarkets = tab === "markets" && marketsStart;
  const showHolders = tab === "holders" && holdersStart;
  const holdersKey =
    holdersSubject?.kind === "market"
      ? holdersSubject.conditionId
      : holdersSubject?.kind === "trader"
        ? holdersSubject.address
        : "browse";
  const { dark } = useWarRoomTheme();

  return (
    <div
      className={cn(
        "flex h-[100svh] min-h-[100svh] flex-col",
        dark ? "bg-black text-slate-100" : "bg-background text-foreground",
      )}
      data-war-room-theme={dark ? "dark" : "light"}
    >
      {/* Top chrome mirrors homepage nav: logo · centered Jarvis · CTA */}
      <header
        className={cn(
          "relative flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4",
          dark ? "border-white/10" : "border-border/70",
        )}
      >
        <div className="flex min-w-0 shrink-0 items-center">
          <Link href="/" className="flex shrink-0 items-center gap-2 pr-1">
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-full object-contain"
              priority
            />
            <span
              className={cn(
                "font-black text-lg leading-none",
                dark ? "text-white" : "text-primary",
              )}
            >
              Lychee
            </span>
          </Link>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-14 lg:block">
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-[min(28rem,calc(100vw-22rem))] -translate-x-1/2 -translate-y-1/2">
            <JarvisNavSearch className="mx-auto max-w-none" />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="min-w-0 w-[min(16rem,42vw)] lg:hidden">
            <JarvisNavSearch className="max-w-none" />
          </div>
          <Link
            href={WORKSPACE_ENTRY_PATH}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition",
              dark
                ? "bg-white text-slate-950 hover:bg-white/90"
                : "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            Get full access
          </Link>
        </div>
      </header>

      {/* Explore tabs — same set/style as homepage `#demo` chrome */}
      <div
        role="tablist"
        aria-label="War Room research"
        className={cn(
          "flex shrink-0 flex-wrap gap-1.5 border-b px-3 py-2 sm:px-4",
          dark ? "border-white/10" : "border-border/70",
        )}
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          const showAlpha = selected && item.id === "war-room";
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelectTab(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition sm:px-4 sm:py-1.5 sm:text-sm",
                selected
                  ? dark
                    ? "bg-white text-slate-950"
                    : "bg-foreground text-background"
                  : dark
                    ? "text-slate-400 hover:bg-white/10 hover:text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {showAlpha ? (
                <span
                  className={cn(
                    "inline-flex h-[16px] items-center rounded-full border px-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.08em] sm:h-[18px] sm:text-[10px]",
                    dark
                      ? "border-slate-950/30 text-slate-950/80"
                      : "border-background/30 text-background/85",
                  )}
                  aria-label="Alpha"
                >
                  Alpha
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {tab === "war-room" ? (
          <WarRoomView
            fixture={fixture}
            embedded
            market={market}
            onMarketChange={onMarketChange}
            onNavigate={onNavigate}
            className="h-full"
          />
        ) : null}

        {showPast ? (
          <div className="h-full w-full overflow-auto bg-background">
            <DashboardDemoSectionLazy
              key="war-room-past"
              force
              bare
              sectionId="war-room-historical"
              className={BARE_DEMO_SECTION_CLASS}
              landingDemoSurface="historical"
            />
          </div>
        ) : null}

        {showPresent ? (
          <div className="h-full w-full overflow-auto bg-background">
            <DashboardDemoSectionLazy
              key="war-room-present"
              force
              bare
              sectionId="war-room-present"
              className={BARE_DEMO_SECTION_CLASS}
              landingDemoSurface="present"
            />
          </div>
        ) : null}

        {showMarkets ? (
          <div className="h-full w-full bg-background">
            <DashboardDemoSectionLazy
              key={`markets-${marketSubject?.conditionId || "explore"}`}
              force
              bare
              sectionId="war-room-markets"
              className={BARE_DEMO_SECTION_CLASS}
              landingDemoSurface="markets"
              workspaceStartTabs={marketsStart.workspaceStartTabs}
              activeWorkspaceStartTabId={marketsStart.activeWorkspaceStartTabId}
            />
          </div>
        ) : null}

        {showHolders ? (
          <div className="h-full w-full bg-background">
            <DashboardDemoSectionLazy
              key={`holders-${holdersKey}`}
              force
              bare
              sectionId="war-room-holders"
              className={BARE_DEMO_SECTION_CLASS}
              landingDemoSurface="holders"
              workspaceStartTabs={holdersStart.workspaceStartTabs}
              activeWorkspaceStartTabId={holdersStart.activeWorkspaceStartTabId}
            />
          </div>
        ) : null}
      </div>

      <p className="sr-only">{pathname}</p>
    </div>
  );
}
