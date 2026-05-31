/**
 * Exchange status ping for Kalshi Live.
 * @returns {Promise<{ ok: boolean; body?: Record<string, unknown>; httpStatus: number }>}
 */
export async function pingKalshiLiveExchange() {
  const res = await fetch("/api/integrations/kalshi-live/status", {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  const body = await res.json().catch(() => ({}));
  const reachable =
    res.ok &&
    body &&
    typeof body === "object" &&
    typeof body.exchange_active === "boolean";
  return { ok: reachable, body, httpStatus: res.status };
}

/** @typedef {"idle" | "loading" | "ok" | "error"} KalshiLivePingState */

/**
 * @param {KalshiLivePingState} state
 */
export function kalshiLivePingStateClassName(state) {
  if (state === "loading") return "bg-amber-500 animate-pulse";
  if (state === "ok") return "bg-emerald-500";
  if (state === "error") return "bg-red-500";
  return "bg-slate-300 dark:bg-slate-700";
}

/**
 * @param {KalshiLivePingState} state
 */
export function kalshiLivePingStateLabel(state) {
  if (state === "loading") return "Checking connection…";
  if (state === "ok") return "Connected";
  if (state === "error") return "Connection issue";
  return "Not checked";
}
