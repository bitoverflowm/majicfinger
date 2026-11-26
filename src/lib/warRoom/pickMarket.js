import { scrollToDemoSection } from "@/lib/scrollToDemo";

import { warRoomHref } from "./href";

/** Homepage `#demo` / War Room terminal — select a market and reveal pin/detail. */
export const WAR_ROOM_MARKET_PICK_EVENT = "lychee:war-room-market-pick";

/**
 * @typedef {{ title?: string; venue?: string; detail?: string }} WarRoomPickMeta
 */

/**
 * @param {string | null | undefined} marketId `kalshi:…` / `polymarket:0x…`
 * @param {WarRoomPickMeta} [meta] optional label from search so left panel is not blank if lookup fails
 * @returns {boolean} true when handled in-place (homepage or `/war-room`)
 */
export function requestWarRoomMarketPick(marketId, meta = {}) {
  if (typeof window === "undefined") return false;
  const id = String(marketId || "").trim();
  if (!id) return false;

  const path = window.location.pathname || "/";
  const onHome = path === "/" || path === "";
  const onWarRoom = path === "/war-room" || path.startsWith("/war-room/");
  const detail = {
    marketId: id,
    selectOnly: true,
    title: meta.title ? String(meta.title) : undefined,
    venue: meta.venue ? String(meta.venue) : undefined,
    detail: meta.detail ? String(meta.detail) : undefined,
  };

  if (onHome) {
    // Scroll + emit in the same turn — never wait on desk/snapshot before scrolling.
    scrollToDemoSection({ behavior: "smooth" });
    window.dispatchEvent(new CustomEvent(WAR_ROOM_MARKET_PICK_EVENT, { detail }));
    return true;
  }

  if (onWarRoom) {
    const href = warRoomHref({ market: id });
    if (window.location.pathname + window.location.search !== href) {
      window.history.replaceState(null, "", href);
    }
    window.dispatchEvent(new CustomEvent(WAR_ROOM_MARKET_PICK_EVENT, { detail }));
    return true;
  }

  return false;
}
