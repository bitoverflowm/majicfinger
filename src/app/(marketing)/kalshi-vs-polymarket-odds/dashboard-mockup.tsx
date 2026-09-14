"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts";

import { HubKalshiLiveDemoCandlesticksProfessionalChart } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoCandlesticksProfessionalChart";
import { HubKalshiLiveDemoOrderbookChart } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoOrderbookChart";
import { SafariBrowserFrame } from "@/components/hubs/kalshiLiveDemo/SafariBrowserFrame";
import { HubPolymarketLiveOrderbookDepthChart } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveOrderbookDepthChart";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { buildStaticCandlestickRows } from "@/lib/kalshiLive/staticBatchCandlesticks";
import { cn } from "@/lib/utils";

type Venue = "kalshi" | "polymarket" | "both";

const DASHBOARD_URL = "lycheedata.com/you/fed-holds-rates-kalshi-vs-polymarket";
const EVENT_TITLE = "Will the Fed hold rates after the September 2026 meeting?";
const KALSHI_TICKER = "KXFED-26SEP-T0";
const POLY_SLUG = "fed-decision-in-september";

function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatCents(value: number) {
  return `${Math.round(value)}¢`;
}

function formatCompact(value: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      notation: value >= 10_000 ? "compact" : "standard",
      maximumFractionDigits: value >= 10_000 ? 1 : 0,
    }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

function formatTapeTime(ms: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

function VenueBadge({ venue }: { venue: Venue }) {
  if (venue === "both") {
    return (
      <span className="inline-flex items-center gap-1">
        <VenueBadge venue="kalshi" />
        <VenueBadge venue="polymarket" />
      </span>
    );
  }
  const kalshi = venue === "kalshi";
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        kalshi
          ? "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-600/20 dark:text-emerald-100"
          : "bg-violet-500/15 text-violet-800 ring-1 ring-violet-600/20 dark:text-violet-100",
      )}
    >
      {kalshi ? "Kalshi" : "Polymarket"}
    </span>
  );
}

function MockCard({
  title,
  description,
  venue,
  className,
  children,
}: {
  title: string;
  description?: string;
  venue: Venue;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/50 px-3 py-2.5">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-medium leading-snug text-foreground">{title}</h3>
            <VenueBadge venue={venue} />
          </div>
          {description ? (
            <p className="text-[11px] leading-snug text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[10px] font-medium text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          Live
        </span>
      </div>
      <div className="flex min-h-[16rem] min-w-0 flex-1 flex-col">{children}</div>
    </article>
  );
}

function buildMockDashboard() {
  const now = Date.now();
  const kalshiRand = mulberry32(hashSeed(KALSHI_TICKER));
  const polyRand = mulberry32(hashSeed(POLY_SLUG));
  const kalshiMid = 0.22;
  const polyMid = 0.31;

  const kalshiCandles = buildStaticCandlestickRows({
    marketTicker: KALSHI_TICKER,
    periods: 48,
    periodSeconds: 3600,
    startPrice: kalshiMid,
  });
  const polyCandles = buildStaticCandlestickRows({
    marketTicker: "FEDHOLD-SEP26",
    periods: 48,
    periodSeconds: 3600,
    startPrice: polyMid,
  });

  const points = 42;
  const stepMs = 8 * 60 * 1000;
  let kalshiPrice = kalshiMid;
  let polyPrice = polyMid;
  const kalshiTrades: Record<string, unknown>[] = [];
  const polyTrades: Record<string, unknown>[] = [];
  const spreadSeries: { t: number; label: string; kalshi: number; polymarket: number }[] = [];
  const liquiditySeries: { t: number; label: string; kalshi: number; polymarket: number }[] = [];

  for (let i = 0; i < points; i += 1) {
    const t = now - (points - 1 - i) * stepMs;
    kalshiPrice = Math.min(0.48, Math.max(0.1, kalshiPrice + (kalshiRand() - 0.47) * 0.028));
    polyPrice = Math.min(0.55, Math.max(0.12, polyPrice + (polyRand() - 0.49) * 0.032));
    const live = i >= points - 3;
    kalshiTrades.push({
      created_time: new Date(t).toISOString(),
      yes_price_dollars: Number(kalshiPrice.toFixed(4)),
      source: live ? "live" : "history",
    });
    polyTrades.push({
      created_time: new Date(t).toISOString(),
      yes_price_dollars: Number(polyPrice.toFixed(4)),
      source: live ? "live" : "history",
    });
    const label = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
      new Date(t),
    );
    spreadSeries.push({
      t,
      label,
      kalshi: Number((0.8 + kalshiRand() * 1.6).toFixed(2)),
      polymarket: Number((1.1 + polyRand() * 2.1).toFixed(2)),
    });
    liquiditySeries.push({
      t,
      label,
      kalshi: Math.round(18_000 + kalshiRand() * 22_000),
      polymarket: Math.round(24_000 + polyRand() * 36_000),
    });
  }

  const priceHistory = kalshiTrades.map((row, index) => {
    const poly = polyTrades[index];
    return {
      label: new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(String(row.created_time))),
      kalshi: Math.round(Number(row.yes_price_dollars) * 100),
      polymarket: Math.round(Number(poly?.yes_price_dollars) * 100),
    };
  });

  const kalshiBook: Record<string, unknown>[] = [];
  for (let i = 0; i < 11; i += 1) {
    const yesPrice = Number((kalshiMid - 0.01 * (i + 1)).toFixed(2));
    const noPrice = Number((1 - (kalshiMid + 0.01 * (i + 1))).toFixed(2));
    if (yesPrice > 0.03) {
      kalshiBook.push({
        ticker: KALSHI_TICKER,
        side: "yes",
        price_dollars: yesPrice,
        quantity_fp: Math.round(480 + i * 210 + kalshiRand() * 160),
      });
    }
    if (noPrice > 0.03 && noPrice < 0.97) {
      kalshiBook.push({
        ticker: KALSHI_TICKER,
        side: "no",
        price_dollars: noPrice,
        quantity_fp: Math.round(420 + i * 190 + kalshiRand() * 140),
      });
    }
  }

  const polyBids = Array.from({ length: 11 }, (_, i) => ({
    price: Number((polyMid - 0.01 * (i + 1)).toFixed(2)),
    size: Math.round(720 + i * 240 + polyRand() * 180),
  }));
  const polyAsks = Array.from({ length: 11 }, (_, i) => ({
    price: Number((polyMid + 0.01 * (i + 1)).toFixed(2)),
    size: Math.round(640 + i * 220 + polyRand() * 160),
  }));

  const tapeSides = ["Yes", "No"] as const;
  const tape = Array.from({ length: 9 }, (_, i) => {
    const kalshi = i % 2 === 0;
    const rand = kalshi ? kalshiRand : polyRand;
    const ms = now - i * 23_000;
    const side = tapeSides[i % 2]!;
    const price = kalshi ? kalshiPrice : polyPrice;
    return {
      id: `${i}-${ms}`,
      venue: kalshi ? ("kalshi" as const) : ("polymarket" as const),
      time: formatTapeTime(ms),
      side,
      price: formatCents(price * 100 + (rand() - 0.5) * 2),
      size: formatCompact(Math.round(40 + rand() * 860)),
    };
  });

  const holders = [
    { name: "0x8f2a…c41d", venue: "polymarket" as const, outcome: "Yes", size: 184_200, share: 18.4 },
    { name: "ThetaWhale", venue: "polymarket" as const, outcome: "Yes", size: 121_800, share: 12.2 },
    { name: "K-MM-04", venue: "kalshi" as const, outcome: "No", size: 96_400, share: 9.6 },
    { name: "0xb19e…11aa", venue: "polymarket" as const, outcome: "No", size: 74_900, share: 7.5 },
    { name: "Desk 7", venue: "kalshi" as const, outcome: "Yes", size: 61_200, share: 6.1 },
    { name: "polybot.eth", venue: "polymarket" as const, outcome: "Yes", size: 48_700, share: 4.9 },
  ];

  return {
    kalshiCandles,
    polyCandles,
    kalshiTrades,
    polyTrades,
    kalshiBook,
    polyBids,
    polyAsks,
    spreadSeries,
    liquiditySeries,
    priceHistory,
    tape,
    holders,
  };
}

const PRICE_CHART_CONFIG = {
  kalshi: { label: "Kalshi", color: "var(--chart-2)" },
  polymarket: { label: "Polymarket", color: "var(--chart-3)" },
};

const SPREAD_CHART_CONFIG = {
  kalshi: { label: "Kalshi spread", color: "var(--chart-2)" },
  polymarket: { label: "Polymarket spread", color: "var(--chart-1)" },
};

const LIQUIDITY_CHART_CONFIG = {
  kalshi: { label: "Kalshi size", color: "var(--chart-2)" },
  polymarket: { label: "Polymarket size", color: "var(--chart-3)" },
};

export function KalshiVsPolymarketDashboardMockup() {
  const mock = useMemo(() => buildMockDashboard(), []);

  return (
    <section
      id="demo"
      className="relative z-30 mx-auto mb-0 mt-14 w-full max-w-[min(100%,84rem)] scroll-mt-28 px-6 pb-6 pt-0 sm:mt-12 sm:px-8 md:mt-8 lg:mt-6 lg:px-10"
    >
      <SafariBrowserFrame
        url={DASHBOARD_URL}
        className="max-h-[min(90vh,920px)]"
        bodyClassName="max-h-[calc(min(90vh,920px)-52px)]"
      >
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-1">
              <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {EVENT_TITLE}
              </h2>
              <p className="text-sm text-muted-foreground">
                8 simulated charts · Kalshi Live + Polymarket Live · preview layout
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-medium text-foreground hover:bg-emerald-500/15"
                asChild
              >
                <Link href="#pricing">
                  <span
                    className="size-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
                    aria-hidden
                  />
                  Start live feed
                </Link>
              </Button>
              <Button type="button" size="sm" className="h-8 px-3 text-xs" asChild>
                <Link href="#pricing">Get full access now</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MockCard
              title="Candlesticks"
              description={`${KALSHI_TICKER} · 1h bars`}
              venue="kalshi"
            >
              <HubKalshiLiveDemoCandlesticksProfessionalChart
                candles={mock.kalshiCandles}
                chartClassName="min-h-[16rem] border-0 rounded-none"
                className="min-h-[16rem]"
              />
            </MockCard>
            <MockCard
              title="Candlesticks"
              description={`${POLY_SLUG} · 1h bars`}
              venue="polymarket"
            >
              <HubKalshiLiveDemoCandlesticksProfessionalChart
                candles={mock.polyCandles}
                chartClassName="min-h-[16rem] border-0 rounded-none"
                className="min-h-[16rem]"
              />
            </MockCard>

            <MockCard
              title="YES price history"
              description="Last 6 hours of prints, overlaid"
              venue="both"
              className="lg:col-span-2"
            >
              <ChartContainer
                config={PRICE_CHART_CONFIG}
                className="aspect-auto h-full min-h-[16rem] w-full px-2 py-2 sm:px-3"
              >
                <LineChart
                  data={mock.priceHistory}
                  margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    domain={[12, 48]}
                    tickFormatter={(value) => formatCents(Number(value))}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="kalshi"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="polymarket"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
            </MockCard>

            <MockCard title="Order book" description="Yes bids vs implied asks" venue="kalshi">
              <HubKalshiLiveDemoOrderbookChart className="min-h-[16rem]" levels={mock.kalshiBook} />
            </MockCard>
            <MockCard title="Order book" description="CLOB bids and asks" venue="polymarket">
              <HubPolymarketLiveOrderbookDepthChart
                className="min-h-[16rem]"
                bids={mock.polyBids}
                asks={mock.polyAsks}
              />
            </MockCard>

            <MockCard title="Spread" description="Best ask − best bid (cents)" venue="both">
              <ChartContainer
                config={SPREAD_CHART_CONFIG}
                className="aspect-auto h-full min-h-[16rem] w-full px-2 py-2 sm:px-3"
              >
                <LineChart data={mock.spreadSeries} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tickFormatter={(value) => `${value}¢`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="kalshi" stroke="var(--color-kalshi)" strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="polymarket"
                    stroke="var(--color-polymarket)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </MockCard>

            <MockCard title="Liquidity" description="Size at the top of book" venue="both">
              <ChartContainer
                config={LIQUIDITY_CHART_CONFIG}
                className="aspect-auto h-full min-h-[16rem] w-full px-2 py-2 sm:px-3"
              >
                <AreaChart
                  data={mock.liquiditySeries}
                  margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(value) => formatCompact(Number(value))}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="kalshi"
                    stroke="var(--color-kalshi)"
                    fill="var(--color-kalshi)"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="polymarket"
                    stroke="var(--color-polymarket)"
                    fill="var(--color-polymarket)"
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </MockCard>

            <MockCard title="Trade tape" description="Latest prints from both books" venue="both">
              <div className="min-h-[16rem] overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Venue</th>
                      <th className="px-3 py-2 font-medium">Side</th>
                      <th className="px-3 py-2 font-medium">Price</th>
                      <th className="px-3 py-2 font-medium">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mock.tape.map((row) => (
                      <tr key={row.id} className="border-b border-border/40 last:border-0">
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.time}</td>
                        <td className="px-3 py-2">
                          <VenueBadge venue={row.venue} />
                        </td>
                        <td className="px-3 py-2">{row.side}</td>
                        <td className="px-3 py-2 font-medium tabular-nums text-foreground">{row.price}</td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MockCard>

            <MockCard title="Holders" description="Largest reported positions" venue="both">
              <ChartContainer
                config={PRICE_CHART_CONFIG}
                className="aspect-auto h-full min-h-[16rem] w-full px-2 py-2 sm:px-3"
              >
                <BarChart
                  data={mock.holders}
                  layout="vertical"
                  margin={{ top: 8, right: 12, left: 8, bottom: 4 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCompact(Number(value))}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={88}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, _name, item) => {
                          const share = item?.payload?.share;
                          return `${formatCompact(Number(value))} · ${share}%`;
                        }}
                      />
                    }
                  />
                  <Bar dataKey="size" radius={4}>
                    {mock.holders.map((row) => (
                      <Cell
                        key={row.name}
                        fill={row.venue === "kalshi" ? "var(--chart-2)" : "var(--chart-3)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </MockCard>
          </div>
        </div>
      </SafariBrowserFrame>
    </section>
  );
}
