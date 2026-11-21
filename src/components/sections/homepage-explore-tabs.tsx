"use client";

import { useCallback, useMemo, useState } from "react";

import { WarRoomView, type WarRoomNavigateRequest } from "@/components/warRoom/WarRoomView";
import { DashboardDemoSectionLazy } from "@/components/sections/dashboard-demo-section-lazy";
import { terminalTab } from "@/components/terminals/openTerminalTab";
import { parseWarRoomMarketId } from "@/lib/warRoom/ids";
import { findTerminal } from "@/lib/workspaceTerminals";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "war-room", label: "War Room" },
  { id: "past", label: "Historical" },
  { id: "present", label: "The Present" },
  { id: "markets", label: "Markets" },
  { id: "holders", label: "Holders" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type MarketSubject = {
  kind: "market";
  conditionId: string;
  title: string;
  slug?: string;
};

type TraderSubject = {
  kind: "trader";
  address: string;
  title?: string;
};

const BROWSE_MODE_KEY = "lychee:holderTerminal:browseMode";

/** Full-bleed stage shared by War Room + Historical / Present / Markets / Holders. */
const DEMO_STAGE_CLASS =
  "relative left-1/2 h-[min(88svh,58rem)] min-h-[32rem] w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden";

/** Section fills the stage — no painted backdrop, no device chrome. */
const BARE_DEMO_SECTION_CLASS = "relative z-30 m-0 h-full w-full p-0";

/** Anchor for Learn More / #demo — keeps explore tabs in view (not a lower-page mockup). */
const WAR_ROOM_STAGE_ATTR = { "data-war-room-demo": true } as const;

function preferBrowseMode(mode: "markets" | "holders") {
  try {
    window.localStorage.setItem(BROWSE_MODE_KEY, mode);
  } catch {
    /* storage blocked */
  }
}

function holderWorkspace(subject: MarketSubject | TraderSubject | null) {
  const terminal = findTerminal("holder");
  if (!terminal) return null;
  const startTab = terminalTab(terminal, subject, []);
  return {
    workspaceStartTabs: [startTab],
    activeWorkspaceStartTabId: startTab.id,
  };
}

/**
 * Homepage explore tabs.
 *
 * Markets → Holder Terminal “Explore markets” (pick a market → market inspection).
 * Holders → Holder Terminal browse holders, or a specific trader once one is selected.
 */
export function HomepageExploreTabs({ fixture = false }: { fixture?: boolean }) {
  const [tab, setTab] = useState<TabId>("war-room");
  /** Market under inspection in the Markets (Explore markets) tab. */
  const [marketSubject, setMarketSubject] = useState<MarketSubject | null>(null);
  /** Specific wallet once the user has picked a holder. */
  const [traderSubject, setTraderSubject] = useState<TraderSubject | null>(null);

  const marketsStart = useMemo(() => holderWorkspace(marketSubject), [marketSubject]);
  const holdersStart = useMemo(() => holderWorkspace(traderSubject), [traderSubject]);

  const openMarketsTab = useCallback((subject: MarketSubject | null = null) => {
    preferBrowseMode("markets");
    setMarketSubject(subject);
    setTab("markets");
  }, []);

  const openHoldersTab = useCallback((subject: TraderSubject | null = null) => {
    preferBrowseMode("holders");
    if (subject) setTraderSubject(subject);
    setTab("holders");
  }, []);

  const onNavigate = useCallback(
    (request: WarRoomNavigateRequest) => {
      // Both War Room CTAs land in Holder Terminal market inspection / explore — not the old live-integration demo.
      if (request.type === "holders") {
        openMarketsTab({
          kind: "market",
          conditionId: request.conditionId,
          title: request.title,
          slug: request.slug || undefined,
        });
        return;
      }
      if (request.type === "markets") {
        const parsed = parseWarRoomMarketId(request.marketId);
        if (parsed?.venue === "polymarket" && parsed.venueMarketId) {
          openMarketsTab({
            kind: "market",
            conditionId: parsed.venueMarketId,
            title: request.title || request.marketId,
            slug: request.slug || undefined,
          });
          return;
        }
        openMarketsTab(null);
        return;
      }
      if (request.type === "war-room-market") {
        setTab("war-room");
      }
    },
    [openMarketsTab],
  );

  const onSelectExploreTab = useCallback(
    (id: TabId) => {
      if (id === "markets") {
        openMarketsTab(marketSubject);
        return;
      }
      if (id === "holders") {
        openHoldersTab(traderSubject);
        return;
      }
      setTab(id);
    },
    [marketSubject, openHoldersTab, openMarketsTab, traderSubject],
  );

  const showPast = tab === "past";
  const showPresent = tab === "present";
  const showMarkets = tab === "markets" && marketsStart;
  const showHolders = tab === "holders" && holdersStart;

  return (
    <section id="demo" className="w-full pb-16">
      <div className="mx-auto w-full max-w-[min(100%,72rem)] px-4 sm:px-6 lg:px-10">
        <div role="tablist" aria-label="Explore Lychee" className="flex flex-wrap gap-2">
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelectExploreTab(item.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition",
                  selected
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        {tab === "war-room" ? (
          <div className={cn(DEMO_STAGE_CLASS, "bg-black")} {...WAR_ROOM_STAGE_ATTR}>
            <WarRoomView
              fixture={fixture}
              embedded
              className="absolute inset-0"
              onNavigate={onNavigate}
            />
          </div>
        ) : null}

        {showPast ? (
          <div className={cn(DEMO_STAGE_CLASS, "bg-background")}>
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
          <div className={cn(DEMO_STAGE_CLASS, "bg-background")}>
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
          <div className={cn(DEMO_STAGE_CLASS, "bg-background")}>
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
          <div className={cn(DEMO_STAGE_CLASS, "bg-background")}>
            <DashboardDemoSectionLazy
              key={`holders-${traderSubject?.address || "browse"}`}
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
