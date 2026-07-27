import { normalizeKalshiLiveHolderProfileNickname } from "@/lib/kalshiLive/holderProfileColumns";

/**
 * @param {{ nickname?: string }} params
 * @returns {string | null}
 */
export function validateKalshiLiveHolderProfilePull(params = {}) {
  const nickname = normalizeKalshiLiveHolderProfileNickname(params.nickname);
  if (!nickname) return "Enter a Kalshi nickname to look up.";
  return null;
}

/**
 * @param {{ nickname: string; loadedRowCount?: number }} opts
 */
export function summarizeKalshiLiveHolderProfileRequest(opts) {
  const nickname = normalizeKalshiLiveHolderProfileNickname(opts.nickname);
  const parts = ["GET /v1/social/profile"];
  if (nickname) parts.push(`nickname=${nickname}`);
  if (typeof opts.loadedRowCount === "number") parts.push(`rows=${opts.loadedRowCount}`);
  return parts.join(" · ");
}
