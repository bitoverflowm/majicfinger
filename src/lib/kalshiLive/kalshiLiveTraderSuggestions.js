import { KALSHI_LIVE_SOCIAL_API_BASE } from "@/lib/kalshiLive/kalshiLiveApiBase";
import {
  KALSHI_LIVE_SEARCH_TRADERS_QUERY_MIN_LEN,
  normalizeKalshiLiveSearchTradersQuery,
} from "@/lib/kalshiLive/searchTradersColumns";

const SUGGESTION_LIMIT = 8;

/**
 * Search nicknames and enrich with public metrics (parallel).
 * Typical latency: ~1.5s search + ~1.5s parallel metrics ≈ 3s cold.
 *
 * @param {string} queryRaw
 * @param {{ signal?: AbortSignal; limit?: number }} [opts]
 * @returns {Promise<Array<{
 *   nickname: string;
 *   profile_image_path: string;
 *   volume: number | null;
 *   pnl: number | null;
 *   dollars_traded: number | null;
 *   num_markets_traded: number | null;
 *   social_id: string;
 * }>>}
 */
export async function searchKalshiLiveTraderSuggestions(queryRaw, opts = {}) {
  const query = normalizeKalshiLiveSearchTradersQuery(queryRaw);
  if (query.length < KALSHI_LIVE_SEARCH_TRADERS_QUERY_MIN_LEN) return [];
  if (/\s/.test(query)) return [];

  const limit = Math.min(
    SUGGESTION_LIMIT,
    Math.max(1, Math.floor(Number(opts.limit)) || SUGGESTION_LIMIT),
  );
  const base = String(KALSHI_LIVE_SOCIAL_API_BASE).replace(/\/$/, "");
  const searchUrl = `${base}/search/social_profiles?${new URLSearchParams({
    query,
    limit: String(limit),
  }).toString()}`;

  const searchRes = await fetch(searchUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: opts.signal,
  });
  const searchBody = await searchRes.json().catch(() => ({}));
  if (!searchRes.ok) {
    const nested =
      searchBody?.error && typeof searchBody.error === "object"
        ? searchBody.error.message
        : null;
    throw new Error(
      typeof nested === "string"
        ? nested
        : typeof searchBody?.error === "string"
          ? searchBody.error
          : searchRes.statusText || "Trader search failed",
    );
  }

  const profiles = Array.isArray(searchBody?.profiles) ? searchBody.profiles : [];

  const enriched = await Promise.all(
    profiles.map(async (p) => {
      const nickname =
        p && typeof p === "object" && p.nickname != null ? String(p.nickname).trim() : "";
      const profile_image_path =
        p && typeof p === "object" && p.profile_image_path != null
          ? String(p.profile_image_path)
          : "";
      /** @type {{ volume: number | null; pnl: number | null; dollars_traded: number | null; num_markets_traded: number | null; social_id: string }} */
      let metrics = {
        volume: null,
        pnl: null,
        dollars_traded: null,
        num_markets_traded: null,
        social_id: "",
      };

      if (nickname) {
        try {
          const mUrl = `${base}/social/profile/metrics?${new URLSearchParams({
            nickname,
          }).toString()}`;
          const mRes = await fetch(mUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: opts.signal,
          });
          const mBody = await mRes.json().catch(() => ({}));
          if (mRes.ok) {
            const m =
              mBody?.metrics && typeof mBody.metrics === "object" ? mBody.metrics : {};
            const asNum = (v) => {
              const n = Number(v);
              return Number.isFinite(n) ? n : null;
            };
            const asInt = (v) => {
              const n = Math.floor(Number(v));
              return Number.isFinite(n) ? n : null;
            };
            metrics = {
              volume: asNum(m.volume),
              pnl: asNum(m.pnl),
              dollars_traded: asNum(m.dollars_traded),
              num_markets_traded: asInt(m.num_markets_traded),
              social_id: typeof mBody?.social_id === "string" ? mBody.social_id : "",
            };
          }
        } catch {
          // Keep suggestion without metrics if enrichment fails / aborts.
        }
      }

      return {
        nickname,
        profile_image_path,
        volume: metrics.volume,
        pnl: metrics.pnl,
        dollars_traded: metrics.dollars_traded,
        num_markets_traded: metrics.num_markets_traded,
        social_id: metrics.social_id,
      };
    }),
  );

  return enriched.filter((s) => s.nickname);
}
