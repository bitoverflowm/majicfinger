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

async function fetchSnapshot(params: {
  desk: string;
  market: string;
  category?: string;
  exploreFeed?: string;
  fixture?: boolean;
  mobile?: boolean;
  /** Fast desk-only shell (skips Gamma boosts). */
  shell?: boolean;
}) {
  const res = await fetch(
    `/api/war-room/snapshot${qs({
      desk: params.desk,
      market: params.market,
      category: params.category || undefined,
      exploreFeed: params.exploreFeed || undefined,
      fixture: params.fixture,
      mobile: params.mobile ? "1" : undefined,
      shell: params.shell ? "1" : undefined,
    })}`,
    { credentials: "same-origin" },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || res.statusText);
  const features =
    body?.features?.type === "FeatureCollection" && Array.isArray(body.features.features)
      ? body.features
      : { type: "FeatureCollection", features: [] };
  const pings =
    body?.pings?.type === "FeatureCollection" && Array.isArray(body.pings.features)
      ? body.pings
      : { type: "FeatureCollection", features: [] };
  return {
    ...(body as Snapshot),
    features,
    pings,
    feed: Array.isArray(body?.feed) ? body.feed : [],
    activity: Array.isArray(body?.activity) ? body.activity : [],
  };
}

async function fetchDetail(id: string, fixture?: boolean) {
  const res = await fetch(`/api/war-room/market${qs({ id, fixture })}`, {
    credentials: "same-origin",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 404) throw new Error(body.error || res.statusText);
  return body as Detail;
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
  /** True while a filter/view change is fetching — never blanks existing UI. */
  const [loading, setLoading] = useState(true);

  const hiddenRef = useRef(false);
  const filterGenRef = useRef(0);
  const marketRef = useRef(market);
  marketRef.current = market;

  // Only filter/view inputs — not `market`, or every ping click would flash loading.
  const filterKey = `${desk}|${category || ""}|${exploreFeed || ""}|${fixture ? 1 : 0}|${mobile ? 1 : 0}`;
  const wantsBoost = Boolean(category || (exploreFeed && exploreFeed !== "tradable"));

  useEffect(() => {
    const gen = ++filterGenRef.current;
    let cancelled = false;
    setLoading(true);

    const applySnapshot = (body: Snapshot) => {
      if (cancelled || filterGenRef.current !== gen) return false;
      setSnapshot(body);
      setError(null);
      return true;
    };

    (async () => {
      try {
        if (hiddenRef.current) return;

        // Stream: paint a desk shell first when Gamma boosts are needed, then replace.
        if (wantsBoost) {
          try {
            const shell = await fetchSnapshot({
              desk,
              market: marketRef.current,
              category,
              exploreFeed,
              fixture,
              mobile,
              shell: true,
            });
            applySnapshot(shell);
          } catch {
            /* full fetch below still runs */
          }
        }

        if (cancelled || filterGenRef.current !== gen) return;

        const body = await fetchSnapshot({
          desk,
          market: marketRef.current,
          category,
          exploreFeed,
          fixture,
          mobile,
        });
        if (!applySnapshot(body)) return;

        // Detail never blocks rails/globe — load after the snapshot lands.
        const selected = body.selectedMarketId || marketRef.current;
        if (selected) {
          fetchDetail(selected, fixture)
            .then((nextDetail) => {
              if (!cancelled && filterGenRef.current === gen) setDetail(nextDetail);
            })
            .catch(() => {});
        } else {
          setDetail(null);
        }
      } catch (err) {
        if (!cancelled && filterGenRef.current === gen) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled && filterGenRef.current === gen) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filterKey, desk, category, exploreFeed, fixture, mobile, wantsBoost]);

  // Market taps: refresh detail only, keep rails/globe as-is.
  useEffect(() => {
    const selected = market || snapshot?.selectedMarketId;
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    fetchDetail(selected, fixture)
      .then((body) => {
        if (!cancelled) setDetail(body);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [market, snapshot?.selectedMarketId, fixture]);

  useEffect(() => {
    const onVis = () => {
      hiddenRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    const interval = window.setInterval(() => {
      if (hiddenRef.current) return;
      // Silent background refresh — no loading chrome.
      fetchSnapshot({
        desk,
        market: marketRef.current,
        category,
        exploreFeed,
        fixture,
        mobile,
      })
        .then((body) => {
          setSnapshot(body);
          setError(null);
        })
        .catch(() => {});
    }, snapshot?.pollIntervalMs || POLL_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(interval);
    };
  }, [filterKey, desk, category, exploreFeed, fixture, mobile, snapshot?.pollIntervalMs]);

  const reload = useCallback(async () => {
    const gen = ++filterGenRef.current;
    setLoading(true);
    try {
      const body = await fetchSnapshot({
        desk,
        market: marketRef.current,
        category,
        exploreFeed,
        fixture,
        mobile,
      });
      if (filterGenRef.current !== gen) return null;
      setSnapshot(body);
      setError(null);
      return body;
    } catch (err) {
      if (filterGenRef.current === gen) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
      return null;
    } finally {
      if (filterGenRef.current === gen) setLoading(false);
    }
  }, [desk, category, exploreFeed, fixture, mobile]);

  return { snapshot, detail, error, loading, transport: "poll" as const, reload };
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
