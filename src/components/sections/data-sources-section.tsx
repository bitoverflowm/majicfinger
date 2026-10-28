import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { DemoScrollLink } from "./demo-scroll-link";
import { EconomicReportsDemo, HyperliquidDemo, PollsDemo, SatelliteDemo } from "./data-sources/data-demos";
import { BinanceFeedDemo, ChainlinkFeedDemo } from "./data-sources/feed-demos";
import { KalshiDataDemo } from "./data-sources/kalshi-data-demo";
import { RequestSourceDemo } from "./data-sources/request-source-demo";
import { PolymarketDataDemo } from "./data-sources/polymarket-data-demo";
import { NewsDemo, ProductHuntDemo, RedditDemo, XDemo } from "./data-sources/signal-demos";
import { VenueVoteDemo } from "./data-sources/venue-vote-demo";
import { VoteButton } from "./data-sources/vote-controls";

type SourceLink = { label: string; href: string; /** Scrolls up and opens the homepage demo. */ demo?: boolean };

type SourceCard = {
  id: string;
  title: string;
  description: string;
  demo: ReactNode;
  links?: readonly SourceLink[];
  /** Coming-soon cards take a vote instead of links. */
  vote?: { id: string; name: string };
};

type SourceRow = {
  id: string;
  /** Short label above the cards; the cards keep their own h3. */
  label?: string;
  /** Row heading and intro; the cards nest under it as h4. */
  heading?: string;
  description?: string;
  columns: 2 | 3;
  compact?: boolean;
  cards: readonly SourceCard[];
};

const LIVE_PRICES_GUIDE = "/guides/polymarket-live-prices";

const ROWS: readonly SourceRow[] = [
  {
    id: "markets",
    label: "The Markets",
    columns: 3,
    cards: [
      {
        id: "kalshi",
        title: "Kalshi data",
        description:
          "Explore markets, historical trades, price history, and current order books. Connect trading activity with market details to investigate how prices and participation change.",
        links: [
          { label: "Explore historical Kalshi data", href: "/kalshi-historical-data" },
          { label: "Explore real-time Kalshi data", href: "/kalshi-live-data" },
        ],
        demo: <KalshiDataDemo />,
      },
      {
        id: "polymarket",
        title: "Polymarket data",
        description:
          "Explore market prices, trades, order books, and holder data. Move from a market to the wallets holding positions, then investigate their available activity and exposure.",
        links: [
          { label: "Explore historical Polymarket data", href: "/polymarket-historical-data" },
          { label: "Explore real-time Polymarket data", href: "/polymarket-live-data" },
        ],
        demo: <PolymarketDataDemo />,
      },
      {
        id: "next",
        title: "Vote on what we add next",
        description:
          "Limitless, Novig, ProphetX, OG, and more are on our list. Tell us which markets you want to research alongside Kalshi and Polymarket, and we'll prioritize the integrations with the most votes.",
        demo: <VenueVoteDemo />,
      },
    ],
  },
  {
    id: "feeds",
    heading: "Binance and Chainlink feeds",
    description:
      "Follow underlying crypto prices alongside prediction market odds. Add supporting feeds to your workspace and compare changes across sources.",
    columns: 2,
    cards: [
      {
        id: "binance",
        title: "Binance spot prices",
        description:
          "Live Binance spot prices for BTC, ETH, SOL, XRP, BNB, and DOGE in USDT, about one tick a second, streamed through Polymarket. Line them up against the odds on the same coin to see which moved first.",
        links: [
          { label: "Try Binance in the demo", href: "/#demo", demo: true },
          { label: "Read the live prices guide", href: LIVE_PRICES_GUIDE },
        ],
        demo: <BinanceFeedDemo />,
      },
      {
        id: "chainlink",
        title: "Chainlink settlement prices",
        description:
          "Polymarket sets the price to beat and settles its crypto Up/Down markets, including the 15-minute ones, on Chainlink's 60-second TWAP. Follow that exact price for BTC, ETH, SOL, XRP, DOGE, HYPE, BNB, and ZEC, along with Chainlink spot prices and the legacy 30-second TWAP.",
        links: [
          { label: "Try Chainlink in the demo", href: "/#demo", demo: true },
          { label: "Read the live prices guide", href: LIVE_PRICES_GUIDE },
        ],
        demo: <ChainlinkFeedDemo />,
      },
    ],
  },
  {
    id: "coming-soon",
    heading: "Coming soon",
    description:
      "The next sources we're connecting, so you can see what moved a market and how fast it reacted. Vote for the ones you want first.",
    columns: 3,
    compact: true,
    cards: [
      {
        id: "news",
        title: "News",
        description:
          "Breaking headlines overlaid on market prices, so you can see which stories moved the odds and how quickly traders reacted.",
        vote: { id: "news", name: "News" },
        demo: <NewsDemo />,
      },
      {
        id: "x",
        title: "X (Twitter)",
        description:
          "Posts, mentions, and engagement from X lined up against market moves. Spot when the conversation leads the price, and when it follows.",
        vote: { id: "x", name: "X (Twitter)" },
        demo: <XDemo />,
      },
      {
        id: "reddit",
        title: "Reddit",
        description:
          "Posts, comments, and sentiment from communities like r/wallstreetbets and r/economics, tracked next to the markets they're discussing.",
        vote: { id: "reddit", name: "Reddit" },
        demo: <RedditDemo />,
      },
      {
        id: "product-hunt",
        title: "Product Hunt",
        description:
          "Daily launch rankings and upvotes as they change, for markets on which products finish at the top of the leaderboard.",
        vote: { id: "productHunt", name: "Product Hunt" },
        demo: <ProductHuntDemo />,
      },
      {
        id: "satellite",
        title: "Government satellite data",
        description:
          "Storm tracks, wildfires, and weather from NOAA and NASA satellites, next to the weather and climate markets they inform.",
        vote: { id: "satellite", name: "Government satellite data" },
        demo: <SatelliteDemo />,
      },
      {
        id: "hyperliquid",
        title: "Hyperliquid",
        description:
          "Perpetual futures prices, funding rates, and open interest, to compare leveraged crypto positioning with prediction market odds.",
        vote: { id: "hyperliquid", name: "Hyperliquid" },
        demo: <HyperliquidDemo />,
      },
      {
        id: "polls",
        title: "Polling data",
        description:
          "Polling averages from RealClearPolling and FiveThirtyEight's archive, compared with what election markets are pricing.",
        vote: { id: "polls", name: "Polling data" },
        demo: <PollsDemo />,
      },
      {
        id: "economic-reports",
        title: "Economic reports",
        description:
          "CPI, mortgage rates, and gas prices as they're released, next to the rate and economy markets that react to them.",
        vote: { id: "economicReports", name: "Economic reports" },
        demo: <EconomicReportsDemo />,
      },
      {
        id: "request",
        title: "Request a data source",
        description:
          "Have a dataset in mind? Vote on the ideas we're weighing or suggest your own. The integrations with the most votes get built first.",
        demo: <RequestSourceDemo />,
      },
    ],
  },
];

const KEYFRAMES = `
@keyframes ds-row-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes ds-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ds-draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes ds-scale-x { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes ds-up { from { color: #0f9f6e; } to { color: var(--primary); } }
@keyframes ds-down { from { color: #e5484d; } to { color: var(--primary); } }
.ds-row-in { animation: ds-row-in .45s cubic-bezier(.165,.84,.44,1) both; }
.ds-fade { animation: ds-fade .4s ease-out both; }
.ds-draw { animation: ds-draw 1.1s cubic-bezier(.165,.84,.44,1) both; }
.ds-grow-x { transform-origin: left; animation: ds-scale-x .6s cubic-bezier(.165,.84,.44,1) both; }
.ds-progress { transform-origin: left; animation: ds-scale-x 2.6s linear both; }
.ds-up { animation: ds-up 1s ease-out both; }
.ds-down { animation: ds-down 1s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  #data-sources [class*="ds-"] { animation: none !important; }
}
`;

const LINK_CLASS = "w-fit text-sm text-secondary transition-colors hover:text-primary";

export function DataSourcesSection() {
  return (
    <section id="data-sources" className="relative w-full scroll-mt-28">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div className="mx-auto w-full max-w-[min(100%,84rem)] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
        <div className="max-w-2xl">
          <h2 className="text-xl font-normal tracking-tight text-primary sm:text-2xl">
            Live and historical prediction market data, connected.
          </h2>
          <p className="mt-1 text-muted-foreground">
            Research Kalshi and Polymarket alongside Binance prices and Chainlink feeds. Bring market odds, trading
            activity, and underlying crypto prices into the same workspace.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-14 md:mt-10">
          {ROWS.map((row) => (
            <div key={row.id}>
              {row.heading ? (
                <div className="mb-4 max-w-2xl">
                  <h3 className="text-lg font-normal tracking-tight text-primary">{row.heading}</h3>
                  {row.description ? <p className="text-muted-foreground">{row.description}</p> : null}
                </div>
              ) : (
                <p className="mb-4 text-lg font-normal tracking-tight text-primary">{row.label}</p>
              )}
              <div
                className={cn(
                  "grid grid-cols-1 gap-4",
                  row.columns === 2 ? "lg:grid-cols-2" : row.compact ? "sm:grid-cols-2 lg:grid-cols-3" : "lg:grid-cols-3",
                )}
              >
                {row.cards.map((card) => (
                  <SourceCardView key={card.id} card={card} nested={!!row.heading} compact={row.compact} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SourceCardView({ card, nested, compact }: { card: SourceCard; nested: boolean; compact?: boolean }) {
  const Title = nested ? "h4" : "h3";
  return (
    <article className="flex flex-col rounded-xl bg-muted p-2 sm:p-3">
      <div
        className={cn(
          "px-3 pt-3 leading-snug tracking-tight sm:px-4 sm:pt-4",
          compact ? "pb-5 text-base" : "pb-6 text-[1.0625rem]",
        )}
      >
        <Title className="font-normal text-primary">{card.title}</Title>
        <p className="text-muted-foreground">{card.description}</p>
        {card.links?.length ? (
          <div className="mt-4 flex flex-col gap-1.5">
            {card.links.map((link) =>
              link.demo ? (
                <DemoScrollLink key={link.label} href={link.href} activateLandingDemo className={LINK_CLASS}>
                  {link.label} →
                </DemoScrollLink>
              ) : (
                <Link key={link.label} href={link.href} className={LINK_CLASS}>
                  {link.label} →
                </Link>
              ),
            )}
          </div>
        ) : null}
        {card.vote ? <VoteButton id={card.vote.id} name={card.vote.name} className="mt-4" /> : null}
      </div>
      <div className="mt-auto">{card.demo}</div>
    </article>
  );
}
