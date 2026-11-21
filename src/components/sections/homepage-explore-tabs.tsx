"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, Newspaper } from "lucide-react";

import { GlobeStage } from "@/components/warRoom/GlobeStage";
import { useWarRoomData } from "@/components/warRoom/useWarRoomData";
import { warRoomHref } from "@/lib/warRoom/href";
import {
  useKalshiHistoricalCutoffDisplay,
  kalshiHistoricalV2Caption,
  kalshiLiveCaption,
  KALSHI_HISTORICAL_DEEP_CAPTION,
} from "@/hooks/useKalshiHistoricalCutoffDisplay";
import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";
import { DEMO_WINDOW_TITLE } from "@/components/sections/dashboard-demo-layout";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "war-room", label: "War Room" },
  { id: "past", label: "The Past" },
  { id: "present", label: "The Present" },
  { id: "holders", label: "Holders" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const LOGO_BG: Record<string, string> = {
  kalshi: "bg-[#28CC95]",
  polymarket: "bg-[#2E5CFF]",
  binance: "bg-black",
  chainlink: "bg-[#375BD2]",
  coinGecko: "bg-black",
  geckoDex: "bg-black",
  twitter: "bg-black",
  news: "bg-zinc-800",
};

type Pill = {
  id: string;
  name: string;
  href: string;
  caption?: string;
  logo?: { src: string; brand: keyof typeof LOGO_BG };
  icon?: ReactNode;
};

const PILL_CLASS = cn(
  "flex w-full min-h-[2.625rem] items-center gap-2.5 rounded-md border border-border/40 bg-card px-2 py-1 text-left",
  "text-xs font-light leading-none text-foreground transition-all duration-200",
  "hover:border-border hover:bg-muted/25 hover:shadow-md",
);

function LogoSlot({ brand, src }: { brand: keyof typeof LOGO_BG; src: string }) {
  return (
    <span
      className={cn(
        "relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md text-white",
        LOGO_BG[brand],
      )}
    >
      <Image src={src} alt="" fill className="object-contain p-0.5" sizes="28px" />
    </span>
  );
}

function DemoPill({ pill }: { pill: Pill }) {
  return (
    <Link href={pill.href} className={PILL_CLASS} title={pill.caption || pill.name}>
      {pill.logo ? (
        <LogoSlot brand={pill.logo.brand} src={pill.logo.src} />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/70 text-muted-foreground">
          {pill.icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate leading-tight">{pill.name}</span>
        {pill.caption ? (
          <span className="mt-0.5 block truncate text-[10px] font-light leading-tight text-muted-foreground">
            {pill.caption}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function DemoPicker({
  heading,
  subtext,
  pills,
}: {
  heading: string;
  subtext: string;
  pills: Pill[];
}) {
  return (
    <DemoWindowMockup title={DEMO_WINDOW_TITLE} className="min-h-[28rem] sm:min-h-[34rem]">
      <div className="flex h-full min-h-[28rem] flex-col bg-background p-5 sm:min-h-[34rem] sm:p-8">
        <div>
          <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground">{heading}</h2>
          <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-snug text-muted-foreground">{subtext}</p>
        </div>
        <p className="mb-2 mt-8 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Integrations
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pills.map((pill) => (
            <DemoPill key={pill.id} pill={pill} />
          ))}
        </div>
      </div>
    </DemoWindowMockup>
  );
}

export function HomepageExploreTabs({ fixture = false }: { fixture?: boolean }) {
  const [tab, setTab] = useState<TabId>("war-room");
  const [center, setCenter] = useState<[number, number] | null>(null);
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

  const pastPills = useMemo<Pill[]>(
    () => [
      {
        id: "kalshiHistoricalV2",
        name: "Kalshi Historical v2",
        href: "/kalshi-historical-data",
        caption: kalshiHistoricalV2Caption(cutoff.cutoffLabel),
        logo: { src: "/kalshi.png", brand: "kalshi" },
      },
      {
        id: "kalshiHistorical",
        name: "Kalshi Historical",
        href: "/kalshi-historical-data",
        caption: KALSHI_HISTORICAL_DEEP_CAPTION,
        logo: { src: "/kalshi.png", brand: "kalshi" },
      },
      {
        id: "polymarketHistorical",
        name: "Polymarket Historical",
        href: "/polymarket-historical-data",
        caption: "Closed Polymarket markets and trade history",
        logo: { src: "/polymarket.png", brand: "polymarket" },
      },
      {
        id: "news-archive",
        name: "News Archive",
        href: "/news-archive",
        caption: "Search headlines by keyword and time",
        icon: <Newspaper className="size-3.5" strokeWidth={1.75} />,
      },
      {
        id: "kalshi-trades-recipe",
        name: "Download Kalshi Trade History",
        href: "/guides/download-kalshi-trade-history",
        caption: "Recipe: pull every trade for a Kalshi market",
        icon: <BookOpen className="size-3.5" strokeWidth={1.75} />,
      },
      {
        id: "poly-trades-recipe",
        name: "Download Polymarket Trade History",
        href: "/guides/download-polymarket-trade-history",
        caption: "Recipe: pull every trade for a Polymarket market",
        icon: <BookOpen className="size-3.5" strokeWidth={1.75} />,
      },
    ],
    [cutoff.cutoffLabel],
  );

  const presentPills = useMemo<Pill[]>(
    () => [
      {
        id: "kalshiLive",
        name: "Kalshi Live",
        href: "/kalshi-live-data",
        caption: kalshiLiveCaption(cutoff.cutoffLabel),
        logo: { src: "/kalshi.png", brand: "kalshi" },
      },
      {
        id: "polymarket",
        name: "Polymarket Live",
        href: "/polymarket-live-data",
        caption: "Live markets, prices, trades, and order books",
        logo: { src: "/polymarket.png", brand: "polymarket" },
      },
      {
        id: "binance",
        name: "Binance",
        href: "/integrations/binance",
        caption: "Spot prices streamed next to the odds",
        logo: { src: "/binance.jpeg", brand: "binance" },
      },
      {
        id: "chainlink",
        name: "Chainlink",
        href: "/integrations/chainlink",
        caption: "On-chain reference prices",
        logo: { src: "/chainlink.png", brand: "chainlink" },
      },
      {
        id: "coinGecko",
        name: "CoinGecko",
        href: "/integrations/coinGecko",
        caption: "Crypto prices and market analytics",
        logo: { src: "/coinGecko.png", brand: "coinGecko" },
      },
      {
        id: "geckoDex",
        name: "GeckoTerminal",
        href: "/integrations/geckoDex",
        caption: "DEX prices, liquidity, and volume",
        logo: { src: "/geckoDex1.png", brand: "geckoDex" },
      },
      {
        id: "twitter",
        name: "Twitter",
        href: "/integrations/twitter",
        caption: "Tweets, profiles, and engagement",
        logo: { src: "/x.png", brand: "twitter" },
      },
      {
        id: "news",
        name: "News",
        href: "/news",
        caption: "Live headlines next to the markets they can move",
        icon: <Newspaper className="size-3.5" strokeWidth={1.75} />,
      },
    ],
    [cutoff.cutoffLabel],
  );

  const holderPills = useMemo<Pill[]>(
    () => [
      {
        id: "holder-terminal",
        name: "Holder Terminal",
        href: "/polymarket-holder-terminal",
        caption: "Who holds every Polymarket market, what they paid, how each trader is doing",
        logo: { src: "/polymarket.png", brand: "polymarket" },
      },
      {
        id: "holder-analysis",
        name: "Polymarket Holder analysis",
        href: "/guides/polymarket-top-holders",
        caption: "Recipe and walkthrough for top holders on a market",
        icon: <BookOpen className="size-3.5" strokeWidth={1.75} />,
      },
    ],
    [],
  );

  return (
    <section id="demo" className="w-full px-4 pb-16 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[min(100%,72rem)]">
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

        <div className="mt-4">
          {tab === "war-room" ? (
            <div className="relative h-[min(88svh,58rem)] min-h-[32rem] overflow-hidden rounded-[1.5rem] bg-[#070b14]">
              <GlobeStage
                enhance="auto"
                features={features}
                initialCenter={center}
                keepGlobe
                interactive
                onSelect={(id) => {
                  window.location.assign(warRoomHref({ market: id }));
                }}
                className="absolute inset-0"
              />
              <Link
                href="/war-room"
                className="absolute bottom-4 left-4 z-10 inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-medium text-slate-950 shadow-lg"
              >
                Open War Room
              </Link>
            </div>
          ) : null}

          {tab === "past" ? (
            <DemoPicker
              heading="Analyze the Past"
              subtext="Pull closed Kalshi and Polymarket markets, trade history, and the news archive — same sources as the terminal demo."
              pills={pastPills}
            />
          ) : null}

          {tab === "present" ? (
            <DemoPicker
              heading="Monitor the present"
              subtext="Live Kalshi, Polymarket, and supporting feeds. Pick a source the way you would in the terminal."
              pills={presentPills}
            />
          ) : null}

          {tab === "holders" ? (
            <DemoPicker
              heading="Holders"
              subtext="Open the Holder Terminal or run the Polymarket holder analysis recipe."
              pills={holderPills}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
