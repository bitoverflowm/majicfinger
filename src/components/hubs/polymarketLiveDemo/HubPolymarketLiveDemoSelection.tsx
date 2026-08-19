"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  mergePolymarketRealtimeMarkets,
  polymarketRealtimeMarketKey,
} from "@/lib/polymarketLive/polymarketRealtimeCompose";

export const POLYMARKET_LIVE_DEMO_MAX_MARKETS = 2;

export type HubPolymarketLiveDemoMarket = Record<string, unknown> & {
  id?: string;
  slug?: string;
  conditionId?: string;
  title?: string;
  outcomes?: string[];
  tokenIds?: string[];
  imageUrl?: string;
  volume24h?: number | null;
  tags?: string[];
};

type HubPolymarketLiveDemoContextValue = {
  markets: HubPolymarketLiveDemoMarket[];
  setMarkets: (next: HubPolymarketLiveDemoMarket[]) => void;
  addMarkets: (incoming: HubPolymarketLiveDemoMarket[]) => void;
  selectMarket: (market: HubPolymarketLiveDemoMarket) => void;
  metadataRows: Record<string, unknown>[] | null;
  metadataLoading: boolean;
  metadataError: string | null;
};

const HubPolymarketLiveDemoContext =
  createContext<HubPolymarketLiveDemoContextValue | null>(null);

export function featuredPolymarketMarketToDemoMarket(
  featured: Record<string, unknown>,
): HubPolymarketLiveDemoMarket | null {
  const outcomesRaw = Array.isArray(featured.outcomes) ? featured.outcomes : [];
  const pairs = outcomesRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const tokenId = String(item.tokenId || "").trim();
      if (!tokenId) return null;
      return {
        tokenId,
        outcome: String(item.outcome || "").trim() || "Outcome",
      };
    })
    .filter(Boolean) as { tokenId: string; outcome: string }[];
  if (pairs.length < 1) return null;
  const id = String(featured.id || featured.conditionId || featured.slug || "").trim();
  const title = String(featured.title || "").trim() || id;
  if (!id || !title) return null;
  return {
    ...featured,
    id,
    slug: String(featured.slug || "").trim() || undefined,
    conditionId: String(featured.conditionId || id).trim(),
    title,
    tokenIds: pairs.map((pair) => pair.tokenId),
    outcomes: pairs.map((pair) => pair.outcome),
    outcomePairs: pairs,
    selectedTokenIds: pairs.map((pair) => pair.tokenId),
    imageUrl: String(featured.imageUrl || "").trim() || undefined,
    volume24h:
      featured.volume24h != null && Number.isFinite(Number(featured.volume24h))
        ? Number(featured.volume24h)
        : null,
    tags: Array.isArray(featured.tags)
      ? featured.tags.map((tag) => String(tag)).filter(Boolean)
      : [],
  };
}

async function fetchPolymarketMarketMetadata(
  market: HubPolymarketLiveDemoMarket,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const id = String(market.id || "").trim();
  const slug = String(market.slug || "").trim();
  const conditionId = String(market.conditionId || "").trim();
  const tokenId = String(
    Array.isArray(market.tokenIds) ? market.tokenIds[0] : "",
  ).trim();

  const params = new URLSearchParams({
    query: "metadataResolve",
    entity: "market",
  });
  if (id && !id.startsWith("0x")) params.set("id", id);
  if (slug) params.set("slug", slug);
  if (conditionId) params.set("conditionId", conditionId);
  if (!params.has("id") && !params.has("slug") && !params.has("conditionId") && tokenId) {
    params.set("tokenId", tokenId);
  }

  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : "Failed to load market metadata",
    );
  }
  if (body?.market && typeof body.market === "object") {
    return body.market as Record<string, unknown>;
  }
  if (Array.isArray(body?.marketsByConditionId) && body.marketsByConditionId[0]) {
    return body.marketsByConditionId[0] as Record<string, unknown>;
  }
  throw new Error("No market metadata returned");
}

export function HubPolymarketLiveDemoProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState<HubPolymarketLiveDemoMarket[]>([]);
  const [metadataRows, setMetadataRows] = useState<Record<string, unknown>[] | null>(
    null,
  );
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const seqRef = useRef(0);

  const addMarkets = useCallback((incoming: HubPolymarketLiveDemoMarket[]) => {
    if (!incoming.length) return;
    setMarkets((current) => {
      const room = Math.max(0, POLYMARKET_LIVE_DEMO_MAX_MARKETS - current.length);
      if (room <= 0) return current;
      return mergePolymarketRealtimeMarkets(
        current,
        incoming.slice(0, room),
      ) as HubPolymarketLiveDemoMarket[];
    });
  }, []);

  const selectMarket = useCallback((market: HubPolymarketLiveDemoMarket) => {
    const key = polymarketRealtimeMarketKey(market);
    if (!key) return;
    setMarkets([market]);
  }, []);

  const marketsKey = markets
    .map((market) => polymarketRealtimeMarketKey(market))
    .filter(Boolean)
    .join(",");

  useEffect(() => {
    const mySeq = ++seqRef.current;
    if (!markets.length) {
      setMetadataRows(null);
      setMetadataLoading(false);
      setMetadataError(null);
      return undefined;
    }

    const ac = new AbortController();
    setMetadataLoading(true);
    setMetadataError(null);

    void Promise.all(markets.map((market) => fetchPolymarketMarketMetadata(market, ac.signal)))
      .then((rows) => {
        if (mySeq !== seqRef.current) return;
        setMetadataRows(rows);
        setMetadataLoading(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (mySeq !== seqRef.current) return;
        setMetadataRows(null);
        setMetadataLoading(false);
        setMetadataError(
          error instanceof Error ? error.message : "Failed to load market metadata",
        );
      });

    return () => {
      ac.abort();
    };
  }, [markets, marketsKey]);

  const value = useMemo(
    () => ({
      markets,
      setMarkets,
      addMarkets,
      selectMarket,
      metadataRows,
      metadataLoading,
      metadataError,
    }),
    [
      addMarkets,
      markets,
      metadataError,
      metadataLoading,
      metadataRows,
      selectMarket,
    ],
  );

  return (
    <HubPolymarketLiveDemoContext.Provider value={value}>
      {children}
    </HubPolymarketLiveDemoContext.Provider>
  );
}

export function useHubPolymarketLiveDemo() {
  return useContext(HubPolymarketLiveDemoContext);
}
