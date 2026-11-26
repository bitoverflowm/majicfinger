"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { WarRoomView, type WarRoomNavigateRequest } from "@/components/warRoom/WarRoomView";
import { useWarRoomResearchDemo } from "@/components/warRoom/useWarRoomResearchDemo";
import { DashboardDemoSectionLazy } from "@/components/sections/dashboard-demo-section-lazy";
import { useLandingExploreScrollHandoff } from "@/hooks/useLandingExploreScrollHandoff";
import { cn } from "@/lib/utils";
import { WAR_ROOM_MARKET_PICK_EVENT, WAR_ROOM_NEWS_PICK_EVENT } from "@/lib/warRoom/pickMarket";

const TABS = [
  { id: "war-room", label: "War Room" },
  { id: "past", label: "Historical" },
  { id: "present", label: "The Present" },
  { id: "markets", label: "Markets" },
  { id: "holders", label: "Holders" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Floor for every explore stage (War Room stays fixed at this size). */
const DEMO_STAGE_FLOOR =
  "min-h-[max(32rem,min(88svh,58rem))] w-screen max-w-[100vw] relative left-1/2 -translate-x-1/2";

/** War Room globe needs a fixed viewport + clipped overflow. */
const WAR_ROOM_STAGE_CLASS = cn(DEMO_STAGE_FLOOR, "h-[min(88svh,58rem)] overflow-hidden bg-black");

/**
 * Historical / Present / Markets / Holders — floor matches the old mockup height, then the
 * outer stage grows with WorkspaceCanvas content so sheets/charts are not clipped in a short frame.
 */
const TERMINAL_DEMO_STAGE_CLASS = cn(
  DEMO_STAGE_FLOOR,
  "h-auto overflow-visible bg-[#f5f5f5] dark:bg-[#161616]",
);

/** Section fills the stage floor, then grows with canvas content. */
const BARE_DEMO_SECTION_CLASS = "relative z-30 m-0 min-h-[max(32rem,min(88svh,58rem))] h-auto w-full p-0";

/** Anchor for Learn More / #demo — keeps explore tabs in view (not a lower-page mockup). */
const WAR_ROOM_STAGE_ATTR = { "data-war-room-demo": true } as const;

/**
 * Homepage explore tabs.
 *
 * Research Holders / Research Market stay inside this demo: they select the
 * Holders or Markets top tab and expand that terminal with the selected market.
 */
export function HomepageExploreTabs({ fixture = false }: { fixture?: boolean }) {
  const [tab, setTab] = useState<TabId>("war-room");
  const [market, setMarket] = useState("");
  const [pickNonce, setPickNonce] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  useLandingExploreScrollHandoff(stageRef);
  const {
    marketSubject,
    holdersSubject,
    marketsStart,
    holdersStart,
    openMarketsTab,
    openHoldersTab,
    applyResearchNavigate,
  } = useWarRoomResearchDemo();

  useEffect(() => {
    const onMarketPick = (event: Event) => {
      const id = String((event as CustomEvent<{ marketId?: string }>).detail?.marketId || "").trim();
      if (!id) return;
      setTab("war-room");
      setMarket(id);
      setPickNonce((n) => n + 1);
    };
    const onNewsPick = () => {
      setTab("war-room");
      setPickNonce((n) => n + 1);
    };
    window.addEventListener(WAR_ROOM_MARKET_PICK_EVENT, onMarketPick as EventListener);
    window.addEventListener(WAR_ROOM_NEWS_PICK_EVENT, onNewsPick as EventListener);
    return () => {
      window.removeEventListener(WAR_ROOM_MARKET_PICK_EVENT, onMarketPick as EventListener);
      window.removeEventListener(WAR_ROOM_NEWS_PICK_EVENT, onNewsPick as EventListener);
    };
  }, []);

  const onNavigate = useCallback(
    (request: WarRoomNavigateRequest) => {
      if (request.type === "war-room-market" && request.marketId) {
        setMarket(request.marketId);
      }
      const next = applyResearchNavigate(request);
      if (next) setTab(next);
    },
    [applyResearchNavigate],
  );

  const onMarketChange = useCallback((id: string | null) => {
    setMarket(id || "");
  }, []);

  const onSelectExploreTab = useCallback(
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

  return (
    <section id="demo" className="w-full pb-16">
      <div className="mx-auto w-full max-w-[min(100%,72rem)] px-4 sm:px-6 lg:px-10">
        <div role="tablist" aria-label="Explore Lychee" className="flex flex-wrap gap-2">
          {TABS.map((item) => {
            const selected = tab === item.id;
            const showAlpha = selected && item.id === "war-room";
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelectExploreTab(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition",
                  selected
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {showAlpha ? (
                  <span
                    className="inline-flex h-[18px] items-center rounded-full border border-background/30 px-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-background/85"
                    aria-label="Alpha"
                  >
                    Alpha
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4" ref={stageRef}>
        {tab === "war-room" ? (
          <div className={WAR_ROOM_STAGE_CLASS} data-landing-explore="" {...WAR_ROOM_STAGE_ATTR}>
            <WarRoomView
              fixture={fixture}
              embedded
              market={market}
              pickNonce={pickNonce}
              onMarketChange={onMarketChange}
              className="absolute inset-0"
              onNavigate={onNavigate}
            />
          </div>
        ) : null}

        {showPast ? (
          <div className={TERMINAL_DEMO_STAGE_CLASS} data-landing-explore="">
            <DashboardDemoSectionLazy
              key="terminal-demo-past"
              force
              bare
              sectionId="explore-demo"
              className={BARE_DEMO_SECTION_CLASS}
              landingDemoSurface="historical"
            />
          </div>
        ) : null}

        {showPresent ? (
          <div className={TERMINAL_DEMO_STAGE_CLASS} data-landing-explore="">
            <DashboardDemoSectionLazy
              key="terminal-demo-present"
              force
              bare
              sectionId="explore-demo"
              className={BARE_DEMO_SECTION_CLASS}
              landingDemoSurface="present"
            />
          </div>
        ) : null}

        {showMarkets ? (
          <div className={TERMINAL_DEMO_STAGE_CLASS} data-landing-explore="">
            <DashboardDemoSectionLazy
              key={`markets-${marketSubject?.conditionId || "explore"}`}
              force
              bare
              sectionId="explore-demo"
              className={BARE_DEMO_SECTION_CLASS}
              landingDemoSurface="markets"
              workspaceStartTabs={marketsStart.workspaceStartTabs}
              activeWorkspaceStartTabId={marketsStart.activeWorkspaceStartTabId}
            />
          </div>
        ) : null}

        {showHolders ? (
          <div className={TERMINAL_DEMO_STAGE_CLASS} data-landing-explore="">
            <DashboardDemoSectionLazy
              key={`holders-${holdersKey}`}
              force
              bare
              sectionId="explore-demo"
              className={BARE_DEMO_SECTION_CLASS}
              landingDemoSurface="holders"
              workspaceStartTabs={holdersStart.workspaceStartTabs}
              activeWorkspaceStartTabId={holdersStart.activeWorkspaceStartTabId}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
