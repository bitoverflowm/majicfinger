"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BOOST_STREAM_LIMITS, POLL_INTERVAL_MS } from "@/lib/warRoom/constants";

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
  /** Every market drawn on the globe (may be larger than `feed`). */
  mapMarkets?: Array<Record<string, unknown>>;
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
  /** Progressive boost tier — paint pins/rails before the full desk cap. */
  boostLimit?: number;
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
      boostLimit: params.boostLimit != null ? String(params.boostLimit) : undefined,
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
    mapMarkets: Array.isArray(body?.mapMarkets) ? body.mapMarkets : undefined,
    activity: Array.isArray(body?.activity) ? body.activity : [],
  };
}

export function useWarRoomData({
  desk,
  market,
  category,
  exploreFeed,
  fixture,
  mobile,
  /** Nav pick path: do not refetch the full tradable desk when `market` changes. */
  selectOnly = false,
}: {
  desk: string;
  market: string;
  category?: string;
  exploreFeed?: string;
  fixture?: boolean;
  mobile?: boolean;
  selectOnly?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** True while a filter/view change is fetching — never blanks existing UI. */
  const [loading, setLoading] = useState(!selectOnly);

  const hiddenRef = useRef(false);
  const filterGenRef = useRef(0);
  const pollInflightRef = useRef(false);
  const marketRef = useRef(market);
  marketRef.current = market;
  const selectOnlyRef = useRef(selectOnly);
  selectOnlyRef.current = selectOnly;

  // Only filter/view inputs — not `market`, or every ping click would flash loading.
  const filterKey = `${desk}|${category || ""}|${exploreFeed || ""}|${fixture ? 1 : 0}|${mobile ? 1 : 0}`;
  // Tradable still Gamma-boosts 200+ markers — paint the desk shell first.
  const wantsBoost = Boolean(category || exploreFeed);

  const applySnapshot = useCallback((body: Snapshot, gen?: number) => {
    // Hard gate: never let an in-flight desk/poll paint over select-only.
    if (selectOnlyRef.current) return false;
    if (gen != null && filterGenRef.current !== gen) return false;
    setSnapshot(body);
    setError(null);
    return true;
  }, []);

  // Entering select-only: invalidate in-flight gens and drop any desk already painted.
  useEffect(() => {
    if (!selectOnly) return;
    filterGenRef.current += 1;
    setSnapshot(null);
    setLoading(false);
  }, [selectOnly]);

  useEffect(() => {
    // Jarvis / nav select-only: never hydrate the tradable desk (pins/rails flood).
    if (selectOnly) {
      setLoading(false);
      return;
    }

    const gen = ++filterGenRef.current;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Progressive paint: desk shell → mid boost tiers → full cap.
        // Each applySnapshot fills globe pins + markets/activity rails as soon as ready.
        // Do not gate the whole load on document.hidden — homepage #demo still needs
        // shell/mid-tiers while the stage scrolls into view.
        if (wantsBoost) {
          // Never let a late/sparse shell clobber a denser mid-tier that already painted.
          let bestCount = -1;
          const paint = (body: Snapshot) => {
            if (cancelled || filterGenRef.current !== gen || selectOnlyRef.current) return false;
            const n =
              (body.features?.features?.length ?? 0) ||
              (body.mapMarkets?.length ?? 0) ||
              (body.feed?.length ?? 0);
            if (n < bestCount) return false;
            bestCount = n;
            applySnapshot(body, gen);
            return true;
          };

          // Race shell against a short budget so a hung/cold shell cannot block mid-tiers.
          const shellP = fetchSnapshot({
            desk,
            market: marketRef.current,
            category,
            exploreFeed,
            fixture,
            mobile,
            shell: true,
          })
            .then((shell) => {
              paint(shell);
              return shell;
            })
            .catch(() => null);

          await Promise.race([
            shellP,
            new Promise<null>((resolve) => {
              window.setTimeout(() => resolve(null), 2_500);
            }),
          ]);

          for (const boostLimit of BOOST_STREAM_LIMITS) {
            if (cancelled || filterGenRef.current !== gen || selectOnlyRef.current) return;
            try {
              const partial = await fetchSnapshot({
                desk,
                market: marketRef.current,
                category,
                exploreFeed,
                fixture,
                mobile,
                boostLimit,
              });
              paint(partial);
            } catch {
              /* keep densest snapshot so far; continue toward full */
            }
          }
          // Allow a late shell to paint only if nothing denser landed.
          await shellP;
        }

        if (cancelled || filterGenRef.current !== gen || selectOnlyRef.current) return;
        if (hiddenRef.current) {
          // Tab hidden after progressive paint — skip the expensive full hydrate for now.
          return;
        }

        const body = await fetchSnapshot({
          desk,
          market: marketRef.current,
          category,
          exploreFeed,
          fixture,
          mobile,
        });
        if (!cancelled) applySnapshot(body, gen);
      } catch (err) {
        if (!cancelled && filterGenRef.current === gen && !selectOnlyRef.current) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled && filterGenRef.current === gen) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filterKey, desk, category, exploreFeed, fixture, mobile, wantsBoost, selectOnly, applySnapshot]);

  // Nav / deep-link market picks: refetch silently so the selected contract is
  // injected into feed/map/features. Do not flip `loading` (no blank flash).
  // Skip when `selectOnly` — pick path uses `/api/war-room/market` instead of the full desk.
  const prevMarketRef = useRef<string | null>(null);
  useEffect(() => {
    const id = String(market || "").trim();
    const prev = prevMarketRef.current;
    prevMarketRef.current = id;
    if (prev === null || prev === id) return;
    if (selectOnlyRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        if (hiddenRef.current) return;
        const body = await fetchSnapshot({
          desk,
          market: id,
          category,
          exploreFeed,
          fixture,
          mobile,
        });
        if (cancelled || selectOnlyRef.current) return;
        applySnapshot(body);
      } catch {
        /* keep current snapshot */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [market, desk, category, exploreFeed, fixture, mobile, applySnapshot]);

  useEffect(() => {
    const onVis = () => {
      hiddenRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    const interval = window.setInterval(() => {
      if (hiddenRef.current || pollInflightRef.current) return;
      // Select-only nav picks must not rehydrate the full tradable desk/pings.
      if (selectOnlyRef.current) return;
      pollInflightRef.current = true;
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
          if (selectOnlyRef.current) return;
          applySnapshot(body);
        })
        .catch(() => {})
        .finally(() => {
          pollInflightRef.current = false;
        });
    }, snapshot?.pollIntervalMs || POLL_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(interval);
    };
  }, [filterKey, desk, category, exploreFeed, fixture, mobile, snapshot?.pollIntervalMs, applySnapshot]);

  const reload = useCallback(async () => {
    if (selectOnlyRef.current) return null;
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
      if (filterGenRef.current !== gen || selectOnlyRef.current) return null;
      applySnapshot(body, gen);
      return body;
    } catch (err) {
      if (filterGenRef.current === gen && !selectOnlyRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
      return null;
    } finally {
      if (filterGenRef.current === gen) setLoading(false);
    }
  }, [desk, category, exploreFeed, fixture, mobile, applySnapshot]);

  return { snapshot, detail: null as Detail, error, loading, transport: "poll" as const, reload };
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
