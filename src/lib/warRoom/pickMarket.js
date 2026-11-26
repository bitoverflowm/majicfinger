import { scrollToDemoSection } from "@/lib/scrollToDemo";

import { warRoomHref } from "./href";

/** Homepage `#demo` / War Room terminal — select a market and reveal pin/detail. */
export const WAR_ROOM_MARKET_PICK_EVENT = "lychee:war-room-market-pick";

/**
 * @param {string | null | undefined} marketId `kalshi:…` / `polymarket:0x…`
 * @returns {boolean} true when handled in-place (homepage or `/war-room`)
 */
export function requestWarRoomMarketPick(marketId) {
  if (typeof window === "undefined") return false;
  const id = String(marketId || "").trim();
  if (!id) return false;

  const path = window.location.pathname || "/";
  const onHome = path === "/" || path === "";
  const onWarRoom = path === "/war-room" || path.startsWith("/war-room/");

  if (onHome) {
    // Scroll first, then emit so War Room can focus after the stage is in view.
    scrollToDemoSection({ behavior: "smooth" });
    const emit = () => {
      window.dispatchEvent(
        new CustomEvent(WAR_ROOM_MARKET_PICK_EVENT, { detail: { marketId: id } }),
      );
    };
    // Two rAFs + short delay: let smooth scroll start and the globe layout settle.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(emit, 280);
      });
    });
    return true;
  }

  if (onWarRoom) {
    const href = warRoomHref({ market: id });
    if (window.location.pathname + window.location.search !== href) {
      window.history.replaceState(null, "", href);
    }
    window.dispatchEvent(
      new CustomEvent(WAR_ROOM_MARKET_PICK_EVENT, { detail: { marketId: id } }),
    );
    return true;
  }

  return false;
}
