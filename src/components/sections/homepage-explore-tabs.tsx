"use client";

import { useCallback, useRef, useState } from "react";

import { WarRoomView, type WarRoomNavigateRequest } from "@/components/warRoom/WarRoomView";
import { useWarRoomResearchDemo } from "@/components/warRoom/useWarRoomResearchDemo";
import { DashboardDemoSectionLazy } from "@/components/sections/dashboard-demo-section-lazy";
import { useLandingExploreScrollHandoff } from "@/hooks/useLandingExploreScrollHandoff";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "war-room", label: "War Room" },
  { id: "past", label: "Historical" },
  { id: "present", label: "The Present" },
  { id: "markets", label: "Markets" },
  { id: "holders", label: "Holders" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Full-bleed stage shared by War Room + Historical / Present / Markets / Holders. */
const DEMO_STAGE_CLASS =
  "relative left-1/2 h-[min(88svh,58rem)] min-h-[32rem] w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden";

/**
 * Terminal demo surface — slightly off the page background in both themes so the stage
 * reads as its own panel (light: soft gray; dark: deeper than page `bg-background`).
 */
const TERMINAL_DEMO_STAGE_CLASS = cn(DEMO_STAGE_CLASS, "bg-[#f5f5f5] dark:bg-[#161616]");

/** Section fills the stage — no painted backdrop, no device chrome. */
const BARE_DEMO_SECTION_CLASS = "relative z-30 m-0 h-full w-full p-0";

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

  const onNavigate = useCallback(
    (request: WarRoomNavigateRequest) => {
      const next = applyResearchNavigate(request);
      if (next) setTab(next);
    },
    [applyResearchNavigate],
  );

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
          <div
            className={cn(DEMO_STAGE_CLASS, "bg-black")}
            data-landing-explore=""
            {...WAR_ROOM_STAGE_ATTR}
          >
            <WarRoomView
              fixture={fixture}
              embedded
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
