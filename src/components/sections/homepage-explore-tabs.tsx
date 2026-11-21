"use client";

import { useCallback, useMemo, useState } from "react";

import { WarRoomView, type WarRoomNavigateRequest } from "@/components/warRoom/WarRoomView";
import { DashboardDemoSectionLazy } from "@/components/sections/dashboard-demo-section-lazy";
import { HOMEPAGE_DEMO_SECTION_CLASS } from "@/components/sections/dashboard-demo-layout";
import { terminalTab } from "@/components/terminals/openTerminalTab";
import { findTerminal } from "@/lib/workspaceTerminals";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "war-room", label: "War Room" },
  { id: "past", label: "The Past" },
  { id: "present", label: "The Present" },
  { id: "markets", label: "Markets" },
  { id: "holders", label: "Holders" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Same full-bleed width as the homepage demo, without the hero spacing above the card. */
const EXPLORE_DEMO_SECTION_CLASS = cn(
  HOMEPAGE_DEMO_SECTION_CLASS,
  "mt-0 sm:mt-0 md:mt-0 lg:mt-0",
);

const DEMO_STAGE_CLASS =
  "relative left-1/2 h-[min(88svh,58rem)] min-h-[32rem] w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden bg-black";

export function HomepageExploreTabs({ fixture = false }: { fixture?: boolean }) {
  const [tab, setTab] = useState<TabId>("war-room");
  const [holderSubject, setHolderSubject] = useState<{
    kind: "market";
    conditionId: string;
    title: string;
    slug?: string;
  } | null>(null);
  const [analyzeVenue, setAnalyzeVenue] = useState<"kalshi" | "polymarket" | null>(null);

  const holderStart = useMemo(() => {
    const terminal = findTerminal("holder");
    if (!terminal) return null;
    const startTab = terminalTab(terminal, holderSubject, []);
    return {
      workspaceStartTabs: [startTab],
      activeWorkspaceStartTabId: startTab.id,
    };
  }, [holderSubject]);

  const onNavigate = useCallback((request: WarRoomNavigateRequest) => {
    if (request.type === "holders") {
      setHolderSubject({
        kind: "market",
        conditionId: request.conditionId,
        title: request.title,
        slug: request.slug || undefined,
      });
      setTab("holders");
      return;
    }
    if (request.type === "markets") {
      setAnalyzeVenue(request.venue);
      setTab("markets");
      return;
    }
    if (request.type === "war-room-market") {
      setTab("war-room");
    }
  }, []);

  const showTerminalDemo = tab === "past" || tab === "present" || tab === "markets";
  const showHolderDemo = tab === "holders";

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
                onClick={() => setTab(item.id)}
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
          <div className={DEMO_STAGE_CLASS}>
            <WarRoomView
              fixture={fixture}
              embedded
              className="absolute inset-0"
              onNavigate={onNavigate}
            />
          </div>
        ) : null}

        {showTerminalDemo ? (
          <DashboardDemoSectionLazy
            key={`terminal-demo-${tab}-${analyzeVenue || "all"}`}
            force
            framed
            sectionId="explore-demo"
            className={EXPLORE_DEMO_SECTION_CLASS}
            integrationId={
              tab === "markets"
                ? analyzeVenue === "kalshi"
                  ? "kalshiLive"
                  : "polymarket"
                : undefined
            }
          />
        ) : null}

        {showHolderDemo && holderStart ? (
          <DashboardDemoSectionLazy
            key={`holders-${holderSubject?.conditionId || "browse"}`}
            force
            framed
            sectionId="explore-demo"
            className={EXPLORE_DEMO_SECTION_CLASS}
            workspaceStartTabs={holderStart.workspaceStartTabs}
            activeWorkspaceStartTabId={holderStart.activeWorkspaceStartTabId}
          />
        ) : null}
      </div>
    </section>
  );
}
