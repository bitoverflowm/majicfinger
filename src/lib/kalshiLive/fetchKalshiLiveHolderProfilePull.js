import { normalizeKalshiLiveHolderProfileNickname } from "@/lib/kalshiLive/holderProfileColumns";
import {
  summarizeKalshiLiveHolderProfileRequest,
  validateKalshiLiveHolderProfilePull,
} from "@/lib/kalshiLive/holderProfileCompose";
import { projectKalshiLiveHolderProfileRows } from "@/lib/kalshiLive/normalizeHolderProfileRow";

/**
 * Pull a Kalshi public social profile (holder profile).
 *
 * @param {{
 *   nickname?: string;
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onProgress?: (info: { label: string; progress: number }) => void;
 * }} opts
 */
export async function fetchKalshiLiveHolderProfilePull(opts) {
  const nickname = normalizeKalshiLiveHolderProfileNickname(opts.nickname);

  const err = validateKalshiLiveHolderProfilePull({ nickname });
  if (err) throw new Error(err);

  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  opts.onProgress?.({ label: "Fetching Kalshi trader profile…", progress: 20 });

  const qs = new URLSearchParams({ nickname });
  const res = await fetch(
    `/api/integrations/kalshi-live/social/profile?${qs.toString()}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: opts.signal,
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const nested =
      body?.error && typeof body.error === "object" ? body.error.message : null;
    const details = typeof body?.details === "string" ? body.details : "";
    const base =
      typeof body?.error === "string"
        ? body.error
        : typeof nested === "string"
          ? nested
          : typeof body?.message === "string"
            ? body.message
            : res.statusText || "Trader profile request failed";
    throw new Error(details ? `${base} (${details})` : base);
  }

  opts.onProgress?.({ label: "Projecting trader profile row…", progress: 80 });

  const raw = {
    social_profile: body?.social_profile || null,
    inner_circle: body?.inner_circle || null,
  };
  const rows = projectKalshiLiveHolderProfileRows(raw, opts.selectedColumns);

  return {
    raw,
    rows,
    nickname,
    querySummary: summarizeKalshiLiveHolderProfileRequest({
      nickname,
      loadedRowCount: rows.length,
    }),
  };
}
