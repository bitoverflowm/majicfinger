/**
 * Client-side fetch for Kalshi Live markets (via same-origin proxy).
 *
 * `limit` is the **maximum total rows** to load (like Kalshi Historical compose limit),
 * not “per page only.” The Kalshi API `limit` query param is set per request as
 * min(1000, remaining rows). Cursor pagination runs only until `limit` total rows
 * are collected or the API has no more pages.
 *
 * @param {{
 *   filters: import("@/lib/kalshiLive/marketFilterRules").KalshiLiveApiFilter[];
 *   /** Max total markets to return (1–1000+ from UI; each API call uses min(1000, remaining)). *\/
 *   limit: number;
 *   tickers?: string;
 *   onPage?: (info: { page: number; rows: Record<string, unknown>[]; cursor: string | null; totalLoaded: number }) => void | Promise<void>;
 *   signal?: AbortSignal;
 * }} opts
 */
export async function fetchAllKalshiLiveMarketsPages(opts) {
  const { filters, limit, tickers, onPage, signal } = opts;
  const filtersJson = JSON.stringify(filters || []);
  const maxTotal = Math.max(1, Math.floor(Number(limit) || 100));

  /** @type {Record<string, unknown>[]} */
  const all = [];
  let cursor = "";
  let page = 0;

  while (all.length < maxTotal) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const remaining = maxTotal - all.length;
    const pageLimit = Math.min(1000, remaining);

    const qs = new URLSearchParams({
      filters: filtersJson,
      limit: String(pageLimit),
    });
    if (tickers) qs.set("tickers", tickers);
    if (cursor) qs.set("cursor", cursor);

    const res = await fetch(`/api/integrations/kalshi-live/markets?${qs.toString()}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof body?.error === "string" ? body.error : res.statusText || "Markets request failed",
      );
    }

    const batch = Array.isArray(body?.markets) ? body.markets : [];
    const slice = batch.slice(0, remaining);
    all.push(...slice);
    page += 1;
    cursor = String(body?.cursor || "").trim();

    await onPage?.({
      page,
      rows: slice,
      cursor: cursor || null,
      totalLoaded: all.length,
    });

    if (all.length >= maxTotal) break;
    if (!cursor || batch.length === 0) break;
  }

  return all;
}
