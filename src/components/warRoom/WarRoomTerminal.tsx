"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DashboardDemoSectionLazy } from "@/components/sections/dashboard-demo-section-lazy";
import { warRoomHref } from "@/lib/warRoom/href";
import { WAR_ROOM_MARKET_PICK_EVENT } from "@/lib/warRoom/pickMarket";
import { cn } from "@/lib/utils";

import { useWarRoomResearchDemo } from "./useWarRoomResearchDemo";
import { useWarRoomTheme } from "./useWarRoomTheme";
import { WarRoomView, type WarRoomNavigateRequest } from "./WarRoomView";

const TABS = [
  { id: "war-room", label: "War Room" },
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
    const onPick = (event: Event) => {
      const id = String((event as CustomEvent<{ marketId?: string }>).detail?.marketId || "").trim();
      if (!id) return;
      setTab("war-room");
      onMarketChange(id);
    };
    window.addEventListener(WAR_ROOM_MARKET_PICK_EVENT, onPick as EventListener);
    return () => window.removeEventListener(WAR_ROOM_MARKET_PICK_EVENT, onPick as EventListener);
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
      setTab("war-room");
    },
    [holdersSubject, marketSubject, openHoldersTab, openMarketsTab],
  );

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
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-3 border-b px-3 py-1.5",
          dark ? "border-white/10" : "border-border/70",
        )}
      >
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/" className={cn("font-medium", dark ? "text-white" : "text-foreground")}>
            Lychee
          </Link>
          <span className={dark ? "text-slate-600" : "text-muted-foreground"}>/</span>
          <span className={dark ? "text-slate-300" : "text-muted-foreground"}>War Room</span>
        </div>
        <div role="tablist" aria-label="War Room research" className="flex flex-wrap justify-end gap-1.5">
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelectTab(item.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition",
                  selected
                    ? dark
                      ? "bg-white text-slate-950"
                      : "bg-foreground text-background"
                    : dark
                      ? "text-slate-400 hover:bg-white/10 hover:text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

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
