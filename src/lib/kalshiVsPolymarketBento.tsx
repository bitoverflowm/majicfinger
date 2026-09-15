import {
  ActivityBentoAnimation,
  ChartsBentoAnimation,
  MatchBentoAnimation,
  OrderbookBentoAnimation,
  PricesBentoAnimation,
  SearchBentoAnimation,
} from "@/components/kalshi-vs-polymarket-bento-animations";
import type { BentoItem } from "@/lib/bento-section";
import { kalshiVsPolymarketLanding } from "@/lib/kalshiVsPolymarketLanding";

const visuals = [
  <SearchBentoAnimation key="search" />,
  <MatchBentoAnimation key="match" />,
  <PricesBentoAnimation key="prices" />,
  <ChartsBentoAnimation key="charts" />,
  <ActivityBentoAnimation key="activity" />,
  <OrderbookBentoAnimation key="orderbooks" />,
];

export const kalshiVsPolymarketBentoItems: BentoItem[] =
  kalshiVsPolymarketLanding.bento.items.map((item, index) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    content: visuals[index] ?? visuals[index % visuals.length],
  }));
