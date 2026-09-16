"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import {
  useHubPolymarketLiveDemo,
  type HubPolymarketLiveDemoMarket,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import {
  polymarketRealtimeMarketFromSuggestion,
  polymarketRealtimeMarketsFromEventSuggestion,
} from "@/lib/polymarketLive/polymarketRealtimeCompose";

function classifyPrefillValue(value: string): "conditionId" | "id" | "slug" {
  if (value.startsWith("0x") || /^\d{20,}$/.test(value)) return "conditionId";
  if (/^\d+$/.test(value)) return "id";
  return "slug";
}

async function resolvePolymarketEntity(
  value: string,
  entity: "market" | "event",
  signal: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({ query: "metadataResolve", entity });
  const kind = classifyPrefillValue(value);
  if (kind === "conditionId" && entity === "market") params.set("conditionId", value);
  else if (kind === "id") params.set("id", value);
  else params.set("slug", value);

  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body || typeof body !== "object") return null;
  return body as Record<string, unknown>;
}

function demoMarketFromResolved(data: Record<string, unknown> | null): HubPolymarketLiveDemoMarket | null {
  if (!data) return null;
  const market =
    (data.market && typeof data.market === "object" ? data.market : null) ||
    (Array.isArray(data.marketsByConditionId) ? data.marketsByConditionId[0] : null) ||
    (Array.isArray(data.marketBySlug) ? data.marketBySlug[0] : null) ||
    (data.marketBySlug && typeof data.marketBySlug === "object" && !Array.isArray(data.marketBySlug)
      ? data.marketBySlug
      : null) ||
    (data.marketById && typeof data.marketById === "object" ? data.marketById : null);
  if (market && typeof market === "object") {
    const row = market as Record<string, unknown>;
    return polymarketRealtimeMarketFromSuggestion({
      entity: "market",
      id: row.id,
      slug: row.slug,
      title: row.question || row.title,
      conditionId: row.conditionId || row.condition_id,
      raw: row,
    }) as HubPolymarketLiveDemoMarket | null;
  }

  const event =
    (data.event && typeof data.event === "object" ? data.event : null) ||
    (data.eventBySlug && typeof data.eventBySlug === "object" ? data.eventBySlug : null) ||
    (data.eventById && typeof data.eventById === "object" ? data.eventById : null);
  if (event && typeof event === "object") {
    const nested = polymarketRealtimeMarketsFromEventSuggestion({
      entity: "event",
      id: (event as { id?: unknown }).id,
      slug: (event as { slug?: unknown }).slug,
      title: (event as { title?: unknown }).title,
      raw: event,
    }) as HubPolymarketLiveDemoMarket[];
    return nested[0] || null;
  }
  return null;
}

export function CompareMarketPrefill() {
  const params = useSearchParams();
  const selection = useHubPolymarketLiveDemo();
  const setMarkets = selection?.setMarkets;
  const appliedKey = useRef("");

  useEffect(() => {
    if (!params) return;
    const pm = String(params.get("pm") || params.get("market") || "").trim();
    const pe = String(params.get("pe") || params.get("event") || "").trim();
    const key = `${pm}|${pe}`;
    if (!pm && !pe) return;
    if (!setMarkets) return;
    if (appliedKey.current === key) return;

    const ac = new AbortController();
    void (async () => {
      try {
        let resolved: Record<string, unknown> | null = null;
        if (pm) resolved = await resolvePolymarketEntity(pm, "market", ac.signal);
        if (!demoMarketFromResolved(resolved) && pe) {
          resolved = await resolvePolymarketEntity(pe, "event", ac.signal);
        }
        const market = demoMarketFromResolved(resolved);
        if (!market || ac.signal.aborted) return;
        appliedKey.current = key;
        setMarkets([market]);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    })();

    return () => ac.abort();
  }, [params, setMarkets]);

  return null;
}
