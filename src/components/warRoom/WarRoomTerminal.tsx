"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useCompactScreen } from "@/lib/desktopOnly";
import { DESKS } from "@/lib/warRoom/constants";
import { normalizeDesk, warRoomHref } from "@/lib/warRoom/href";
import { cn } from "@/lib/utils";

import { DeskTabs } from "./DeskTabs";
import { DetailPanel } from "./DetailPanel";
import { Feed, type FeedRow } from "./Feed";
import { GlobeStage } from "./GlobeStage";
import { useWarRoomData } from "./useWarRoomData";

type Desk = (typeof DESKS)[number];

export function WarRoomTerminal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const desk = normalizeDesk(searchParams?.get("desk"));
  const market = searchParams?.get("market") || "";
  const fixture = ["1", "true", "yes"].includes(String(searchParams?.get("fixture") || "").toLowerCase());

  const [mobileView, setMobileView] = useState<"globe" | "feed">("feed");
  const compactScreen = useCompactScreen();
  const compact = compactScreen !== false;

  const { snapshot, detail, error, transport } = useWarRoomData({
    desk,
    market,
    fixture,
    mobile: compact,
  });

  const push = useCallback(
    (next: { desk?: Desk; market?: string | null }) => {
      const href = warRoomHref({
        desk: next.desk ?? desk,
        market: next.market === undefined ? market : next.market,
      });
      const suffix = fixture ? `${href.includes("?") ? "&" : "?"}fixture=1` : "";
      router.replace(`${href}${suffix}`, { scroll: false });
    },
    [desk, market, fixture, router],
  );

  const features = (snapshot?.features as { type: "FeatureCollection"; features: never[] }) || {
    type: "FeatureCollection",
    features: [],
  };
  const feed = (snapshot?.feed || []) as FeedRow[];
  const selectedId = snapshot?.selectedMarketId || market || null;

  const freshnessBits = useMemo(() => {
    const f = snapshot?.freshness || {};
    return Object.entries(f)
      .map(([key, value]) => `${key}: ${value?.status || "n/a"}`)
      .join(" · ");
  }, [snapshot?.freshness]);

  const globe = (
    <GlobeStage
      enhance={compact ? "never" : "always"}
      features={features}
      selectedMarketId={selectedId}
      onSelect={(id) => {
        push({ market: id });
        if (compact) setMobileView("feed");
      }}
      onTapPoster={compact ? () => setMobileView("globe") : undefined}
      className="h-full w-full"
    />
  );

  const panel = (
    <div className="flex h-full min-h-0 flex-col bg-[#0b1018]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <DeskTabs desk={desk} onChange={(next) => push({ desk: next, market: null })} />
        {snapshot?.fixture ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
            {snapshot.fixtureLabel || "Lab fixture"}
          </span>
        ) : null}
      </div>
      {error ? <p className="px-3 py-2 text-xs text-rose-300">{error}</p> : null}
      <Feed
        rows={feed}
        selectedId={selectedId}
        onSelect={(id) => push({ market: id })}
        emptyReason={snapshot?.emptyReason}
      />
      <div className="hidden max-h-[46%] min-h-[180px] border-t border-white/10 lg:flex lg:flex-col">
        <DetailPanel
          detail={detail as never}
          emptyReason={snapshot?.emptyReason}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-[100svh] min-h-[100svh] flex-col bg-[#070b14] text-slate-100">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-white">
            Lychee
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-sm text-slate-300">War Room</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>{transport === "poll" ? "Polling 8s" : "Live"}</span>
          {snapshot?.stale ? <span>Stale snapshot</span> : null}
          {compact ? (
            <div className="flex rounded-full border border-white/10 p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded-full px-2 py-1",
                  mobileView === "globe" ? "bg-white text-slate-950" : "",
                )}
                onClick={() => setMobileView("globe")}
              >
                Globe
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-2 py-1",
                  mobileView === "feed" ? "bg-white text-slate-950" : "",
                )}
                onClick={() => setMobileView("feed")}
              >
                Feed
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className={cn("relative min-h-0", compact ? (mobileView === "globe" ? "flex-1" : "hidden") : "flex-1")}>
          {globe}
        </div>
        <aside
          className={cn(
            "min-h-0 border-l border-white/10",
            compact ? (mobileView === "feed" ? "flex w-full flex-col" : "hidden") : "flex w-[min(100%,24rem)] shrink-0 flex-col",
          )}
        >
          {panel}
        </aside>
      </div>

      {compact && mobileView === "feed" ? (
        <div className="max-h-[42%] border-t border-white/10 bg-[#0b1018]">
          <DetailPanel detail={detail as never} emptyReason={snapshot?.emptyReason} />
        </div>
      ) : null}

      <p className="sr-only">
        {pathname} {freshnessBits}
      </p>
    </div>
  );
}
