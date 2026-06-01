import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

const MAX_SUGGESTIONS = 12;
/** Cap in-memory scan when API filters return few hits (unfiltered list can be large). */
const BROAD_SCAN_CAP = 4000;

const DEFAULT_UPSTREAM_TIMEOUT_MS = 90_000;

function isAbortError(err) {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

/**
 * @param {Record<string, string | boolean | undefined>} params
 * @param {{ signal?: AbortSignal; timeoutMs?: number }} [opts]
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function fetchKalshiLiveSeriesListUpstream(params = {}, opts = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    if (typeof value === "boolean") {
      qs.set(key, value ? "true" : "false");
    } else {
      qs.set(key, String(value));
    }
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const url = `${kalshiLiveUrl("series")}${suffix}`;

  const timeoutMs = Math.max(5_000, Number(opts.timeoutMs) || DEFAULT_UPSTREAM_TIMEOUT_MS);
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const onParentAbort = () => timeoutController.abort();
  if (opts.signal) {
    if (opts.signal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException("Aborted", "AbortError");
    }
    opts.signal.addEventListener("abort", onParentAbort, { once: true });
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: timeoutController.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof body?.message === "string"
          ? body.message
          : typeof body?.error === "string"
            ? body.error
            : res.statusText || "Series list request failed";
      throw new Error(msg);
    }
    return Array.isArray(body?.series) ? body.series : [];
  } catch (err) {
    if (isAbortError(err)) {
      if (opts.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      throw new Error(
        `Kalshi series list timed out after ${Math.round(timeoutMs / 1000)}s. Try a narrower category filter or fewer columns (e.g. turn off product metadata).`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    opts.signal?.removeEventListener("abort", onParentAbort);
  }
}

/**
 * @param {Record<string, unknown>} series
 * @param {string} needle
 */
export function scoreKalshiLiveSeriesMatch(series, needle) {
  const n = needle.toLowerCase();
  if (!n) return 0;

  const ticker = String(series.ticker || "").toLowerCase();
  const title = String(series.title || "").toLowerCase();
  const category = String(series.category || "").toLowerCase();
  const frequency = String(series.frequency || "").toLowerCase();
  const tags = Array.isArray(series.tags)
    ? series.tags.map((t) => String(t).toLowerCase())
    : [];

  if (ticker === n) return 100;
  if (ticker.startsWith(n)) return 85;
  if (ticker.includes(n)) return 70;
  if (title === n) return 80;
  if (title.includes(n)) return 65;
  if (category === n) return 75;
  if (category.includes(n)) return 55;
  if (tags.some((t) => t === n)) return 72;
  if (tags.some((t) => t.includes(n))) return 50;
  if (frequency.includes(n)) return 40;
  return 0;
}

/**
 * @param {Record<string, unknown>} series
 */
export function kalshiLiveSeriesToSuggestion(series) {
  const ticker = String(series.ticker || "").trim();
  const title = String(series.title || ticker).trim();
  const parts = [series.category, series.frequency].map((x) => String(x || "").trim()).filter(Boolean);
  return {
    entity: "series",
    ticker,
    title,
    subtitle: parts.join(" · ") || undefined,
    category: String(series.category || ""),
    frequency: String(series.frequency || ""),
  };
}

/**
 * Flexible series search: tries Kalshi list filters (tags, category), then scans
 * the unfiltered list for text matches on ticker / title / category / tags.
 *
 * @param {string} q
 * @param {{ includeVolume?: boolean }} [opts]
 */
export async function searchKalshiLiveSeriesSuggestions(q, opts = {}) {
  const needle = String(q || "").trim();
  if (needle.length < 2) return [];

  const baseParams = opts.includeVolume ? { include_volume: true } : {};
  const byTicker = new Map();
  const apiHitTickers = new Set();

  const addSeries = (list, markApiHit = false) => {
    for (const s of list) {
      const ticker = String(s?.ticker || "").trim();
      if (!ticker) continue;
      if (!byTicker.has(ticker)) byTicker.set(ticker, s);
      if (markApiHit) apiHitTickers.add(ticker);
    }
  };

  const [byTags, byCategory] = await Promise.all([
    fetchKalshiLiveSeriesListUpstream({ ...baseParams, tags: needle }).catch(() => []),
    fetchKalshiLiveSeriesListUpstream({ ...baseParams, category: needle }).catch(() => []),
  ]);
  addSeries(byTags, true);
  addSeries(byCategory, true);

  if (byTicker.size < MAX_SUGGESTIONS) {
    try {
      const all = await fetchKalshiLiveSeriesListUpstream(baseParams);
      const scanLen = Math.min(all.length, BROAD_SCAN_CAP);
      for (let i = 0; i < scanLen; i++) {
        const s = all[i];
        if (scoreKalshiLiveSeriesMatch(s, needle) > 0) {
          addSeries([s], false);
        }
      }
    } catch {
      /* keep API-filter results only */
    }
  }

  const scored = [...byTicker.values()]
    .map((s) => {
      let score = scoreKalshiLiveSeriesMatch(s, needle);
      if (apiHitTickers.has(String(s.ticker || ""))) {
        score = Math.max(score, 68);
      }
      return { s, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, MAX_SUGGESTIONS).map((row) => kalshiLiveSeriesToSuggestion(row.s));
}
