"use client";

import { trackJourneyEvent } from "@/lib/analytics/journeyClient";

const PAGE = "/polymarket-live-data";

/** Lightweight product-hub analytics for Polymarket Live landing interactions. */
export function trackPolymarketLiveHubEvent(
  type: string,
  meta: Record<string, unknown> = {},
) {
  trackJourneyEvent(type, {
    path: PAGE,
    label: type,
    meta: { page: PAGE, ...meta },
  });
}
