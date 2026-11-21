"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import { GlobeStage } from "@/components/warRoom/GlobeStage";
import { useWarRoomData } from "@/components/warRoom/useWarRoomData";
import { warRoomHref } from "@/lib/warRoom/href";
import { useKalshiHistoricalCutoffDisplay, KALSHI_HISTORICAL_DEEP_CAPTION } from "@/hooks/useKalshiHistoricalCutoffDisplay";
import { MARKETING_INTEGRATIONS } from "@/lib/integrations/marketing-catalog";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "war-room", label: "War Room" },
  { id: "past", label: "The Past" },
  { id: "present", label: "The Present" },
  { id: "holders", label: "Holders" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const LIVE_IDS = new Set(["kalshiLive", "polymarket", "binance", "chainlink", "coinGecko", "geckoDex", "twitter"]);
const HISTORICAL_IDS = new Set(["kalshiHistorical", "polymarketHistorical"]);

function Card({
  href,
  title,
  note,
  onClick,
}: {
  href?: string;
  title: string;
  note?: string;
  onClick?: () => void;
}) {
  const className =
    "flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition hover:border-foreground/20 hover:bg-muted/40";
  const body = (
    <>
      <span>
        <span className="block text-sm font-medium text-foreground">{title}</span>
        {note ? <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span> : null}
      </span>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return (
    <Link href={href || "/"} className={className}>
      {body}
    </Link>
  );
}

export function HomepageExploreTabs({ fixture = false }: { fixture?: boolean }) {
  const [tab, setTab] = useState<TabId>("war-room");
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [kalshiOpen, setKalshiOpen] = useState(false);
  const cutoff = useKalshiHistoricalCutoffDisplay();
  const { snapshot } = useWarRoomData({ desk: "all", market: "", fixture });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.longitude, pos.coords.latitude]),
      () => {},
      { enableHighAccuracy: false, maximumAge: 86_400_000, timeout: 4000 },
    );
  }, []);

  const features = (snapshot?.features as { type: "FeatureCollection"; features: never[] }) || {
    type: "FeatureCollection",
    features: [],
  };

  const live = useMemo(
    () => MARKETING_INTEGRATIONS.filter((row) => LIVE_IDS.has(row.id)),
    [],
  );
  const historical = useMemo(
    () => MARKETING_INTEGRATIONS.filter((row) => HISTORICAL_IDS.has(row.id)),
    [],
  );

  return (
    <section id="demo" className="w-full px-4 pb-16 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[min(100%,72rem)]">
        <div
          role="tablist"
          aria-label="Explore Lychee"
          className="flex flex-wrap gap-2"
        >
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
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-border bg-[#070b14]">
          {tab === "war-room" ? (
            <div className="relative min-h-[28rem] sm:min-h-[34rem]">
              <GlobeStage
                enhance="auto"
                features={features}
                initialCenter={center}
                interactive
                onSelect={(id) => {
                  window.location.assign(warRoomHref({ market: id }));
                }}
                className="absolute inset-0"
              />
              <Link
                href="/war-room"
                className="absolute bottom-4 right-4 z-10 inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-medium text-slate-950 shadow-lg"
              >
                Open War Room
              </Link>
            </div>
          ) : (
            <div className="bg-background p-5 sm:p-8">
              {tab === "past" ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold tracking-tight">Analyze the Past</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Card
                        title="Kalshi Historical"
                        note="Choose V2 (recent) or V1 (deep history)"
                        onClick={() => setKalshiOpen((v) => !v)}
                      />
                      {kalshiOpen ? (
                        <div className="ml-2 space-y-2 border-l border-border pl-3">
                          <Card
                            href="/kalshi-historical-data"
                            title="V2 — recent historical"
                            note={cutoff.cutoffLabel ? `Most recent historical data until ${cutoff.cutoffLabel}` : "Recent closed Kalshi history"}
                          />
                          <Card
                            href="/kalshi-historical-data"
                            title="V1 — deep history"
                            note={KALSHI_HISTORICAL_DEEP_CAPTION}
                          />
                        </div>
                      ) : null}
                    </div>
                    {historical
                      .filter((row) => row.id !== "kalshiHistorical")
                      .map((row) => (
                        <Card key={row.id} href={row.href} title={row.label} note={row.description} />
                      ))}
                    <Card href="/news-archive" title="News Archive" note="Search headlines by keyword and time." />
                    <Card
                      href="/guides/download-kalshi-trade-history"
                      title="Download Kalshi Trade History"
                      note="Recipe: pull every trade for a Kalshi market."
                    />
                    <Card
                      href="/guides/download-polymarket-trade-history"
                      title="Download Polymarket Trade History"
                      note="Recipe: pull every trade for a Polymarket market."
                    />
                  </div>
                </div>
              ) : null}

              {tab === "present" ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold tracking-tight">Monitor the present</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {live.map((row) => (
                      <Card key={row.id} href={row.href} title={row.label} note={row.description} />
                    ))}
                    <Card href="/news" title="News" note="Live headlines next to the markets they can move." />
                  </div>
                </div>
              ) : null}

              {tab === "holders" ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold tracking-tight">Holders</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Card
                      href="/polymarket-holder-terminal"
                      title="Holder Terminal"
                      note="Who holds every Polymarket market, what they paid, and how each trader is doing."
                    />
                    <Card
                      href="/guides/polymarket-top-holders"
                      title="Polymarket Holder analysis"
                      note="Recipe and walkthrough for top holders on a market."
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
