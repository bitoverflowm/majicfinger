"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { POLL_INTERVAL_MS } from "@/lib/warRoom/constants";

type Snapshot = {
  asOf: string;
  fixture?: boolean;
  fixtureLabel?: string | null;
  stale?: boolean;
  transport?: string;
  pollIntervalMs?: number;
  freshness?: Record<string, { asOf?: string; status?: string; ageMs?: number }>;
  desk: string;
  cursor?: string;
  features: { type: "FeatureCollection"; features: unknown[] };
  pings?: { type: "FeatureCollection"; features: unknown[] };
  feed: Array<Record<string, unknown>>;
  activity?: Array<Record<string, unknown>>;
  selectedMarketId?: string | null;
  emptyReason?: string | null;
  status?: string;
};

type Detail = Record<string, unknown> | null;

function qs(params: Record<string, string | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function useWarRoomData({
  desk,
  market,
  category,
  exploreFeed,
  fixture,
  mobile,
}: {
  desk: string;
  market: string;
  category?: string;
  exploreFeed?: string;
  fixture?: boolean;
  mobile?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [detail, setDetail] = useState<Detail>(null);
  const [error, setError] = useState<string | null>(null);
  const hiddenRef = useRef(false);

  const loadSnapshot = useCallback(async () => {
    if (hiddenRef.current) return;
    const res = await fetch(
      `/api/war-room/snapshot${qs({
        desk,
        market,
        category: category || undefined,
        exploreFeed: exploreFeed || undefined,
        fixture,
        mobile: mobile ? "1" : undefined,
      })}`,
      { credentials: "same-origin" },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || res.statusText);
    setSnapshot(body);
    setError(null);
    return body as Snapshot;
  }, [desk, market, category, exploreFeed, fixture, mobile]);

  const loadDetail = useCallback(
    async (id: string) => {
      if (!id) {
        setDetail(null);
        return;
      }
      const res = await fetch(`/api/war-room/market${qs({ id, fixture })}`, { credentials: "same-origin" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404) throw new Error(body.error || res.statusText);
      setDetail(body);
    },
    [fixture],
  );

  useEffect(() => {
    let cancelled = false;
    loadSnapshot()
      .then((body) => {
        if (cancelled || !body) return;
        const selected = body.selectedMarketId || market;
        if (selected) return loadDetail(selected);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [loadSnapshot, loadDetail, market]);

  useEffect(() => {
    const selected = snapshot?.selectedMarketId || market;
    if (selected) loadDetail(selected).catch(() => {});
  }, [snapshot?.selectedMarketId, market, loadDetail]);

  useEffect(() => {
    const onVis = () => {
      hiddenRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    const interval = window.setInterval(() => {
      loadSnapshot().catch(() => {});
    }, snapshot?.pollIntervalMs || POLL_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(interval);
    };
  }, [loadSnapshot, snapshot?.pollIntervalMs]);

  return { snapshot, detail, error, transport: "poll" as const, reload: loadSnapshot };
}

export function useWarRoomPreview(fixture?: boolean) {
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch(`/api/war-room/preview${qs({ fixture })}`, { credentials: "same-origin" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || res.statusText);
      if (!cancelled) {
        setPreview(body);
        setError(null);
      }
    };
    load().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
    });
    const interval = window.setInterval(() => load().catch(() => {}), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [fixture]);

  return { preview, error };
}
