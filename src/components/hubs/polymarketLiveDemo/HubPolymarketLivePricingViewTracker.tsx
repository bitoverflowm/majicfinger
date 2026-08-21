"use client";

import { useEffect, useRef } from "react";

import { trackPolymarketLiveHubEvent } from "@/lib/analytics/polymarketLiveHubEvents";

/** Fires once when the Polymarket Live pricing block enters the viewport. */
export function HubPolymarketLivePricingViewTracker({
  enabled,
}: {
  enabled?: boolean;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (!enabled || sent.current) return undefined;
    const el = document.getElementById("polymarket-live-pricing");
    if (!el) return undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || sent.current) return;
        sent.current = true;
        trackPolymarketLiveHubEvent("polymarket_live_pricing_view");
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  return null;
}
