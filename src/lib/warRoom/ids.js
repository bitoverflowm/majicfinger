/**
 * Stable War Room IDs. Venue tickers / condition IDs stay visible in the suffix
 * so a shared URL is readable and retries are idempotent.
 */

/**
 * @param {"kalshi" | "polymarket"} venue
 * @param {string} venueMarketId
 */
export function warRoomMarketId(venue, venueMarketId) {
  const id = String(venueMarketId || "").trim();
  if (!id) return "";
  return `${venue}:${id}`;
}

/**
 * @param {string} id
 * @returns {{ venue: "kalshi" | "polymarket"; venueMarketId: string } | null}
 */
export function parseWarRoomMarketId(id) {
  const raw = String(id || "").trim();
  const cut = raw.indexOf(":");
  if (cut <= 0) return null;
  const venue = raw.slice(0, cut).toLowerCase();
  const venueMarketId = raw.slice(cut + 1).trim();
  if (!venueMarketId) return null;
  if (venue !== "kalshi" && venue !== "polymarket") return null;
  return { venue, venueMarketId };
}

/**
 * @param {string} kind
 * @param {string} source
 * @param {string} sourceId
 */
export function warRoomSignalId(kind, source, sourceId) {
  return [kind, source, String(sourceId || "").trim()].filter(Boolean).join(":");
}

export function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    const json = Buffer.from(text, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
