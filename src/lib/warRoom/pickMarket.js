import { scrollToDemoSection } from "@/lib/scrollToDemo";

import { warRoomHref } from "./href";

/** Homepage `#demo` / War Room terminal — select a market and reveal pin/detail. */
export const WAR_ROOM_MARKET_PICK_EVENT = "lychee:war-room-market-pick";

/** Homepage `#demo` / War Room — select a news headline (same as right-rail news click). */
export const WAR_ROOM_NEWS_PICK_EVENT = "lychee:war-room-news-pick";

/** Kick homepage smooth-scroll immediately (use from click capture before React work). */
export function kickWarRoomDemoScroll() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "/";
  if (path !== "/" && path !== "") return;
  scrollToDemoSection({ behavior: "smooth" });
}

/**
 * @typedef {{ title?: string; venue?: string; detail?: string }} WarRoomPickMeta
 */

/**
 * @param {string | null | undefined} marketId `kalshi:…` / `polymarket:0x…`
 * @param {WarRoomPickMeta & { scroll?: boolean }} [meta] optional label; `scroll:false` when caller already scrolled (capture phase)
 * @returns {boolean} true when handled in-place (homepage or `/war-room`)
 */
export function requestWarRoomMarketPick(marketId, meta = {}) {
  if (typeof window === "undefined") return false;
  const id = String(marketId || "").trim();
  if (!id) return false;

  const path = window.location.pathname || "/";
  const onHome = path === "/" || path === "";
  const onWarRoom = path === "/war-room" || path.startsWith("/war-room/");
  const shouldScroll = meta.scroll !== false;
  const detail = {
    marketId: id,
    selectOnly: true,
    title: meta.title ? String(meta.title) : undefined,
    venue: meta.venue ? String(meta.venue) : undefined,
    detail: meta.detail ? String(meta.detail) : undefined,
  };

  if (onHome) {
    // Prefer capture-phase scroll from the caller; otherwise scroll here before emit.
    if (shouldScroll) scrollToDemoSection({ behavior: "smooth" });
    // Defer the pick event so React select-only work cannot block the scroll.
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(WAR_ROOM_MARKET_PICK_EVENT, { detail }));
    }, 0);
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

/**
 * Jarvis / nav news pick → War Room headline reveal (not /news-archive).
 * @param {{ query?: string; title?: string; scroll?: boolean }} [meta]
 * @returns {boolean}
 */
export function requestWarRoomNewsPick(meta = {}) {
  if (typeof window === "undefined") return false;
  const query = String(meta.query || meta.title || "").trim();
  if (!query) return false;

  const path = window.location.pathname || "/";
  const onHome = path === "/" || path === "";
  const onWarRoom = path === "/war-room" || path.startsWith("/war-room/");
  const shouldScroll = meta.scroll !== false;
  const detail = {
    query,
    title: meta.title ? String(meta.title) : query,
    selectOnly: true,
  };

  if (onHome) {
    if (shouldScroll) scrollToDemoSection({ behavior: "smooth" });
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(WAR_ROOM_NEWS_PICK_EVENT, { detail }));
    }, 0);
    return true;
  }

  if (onWarRoom) {
    window.dispatchEvent(new CustomEvent(WAR_ROOM_NEWS_PICK_EVENT, { detail }));
    return true;
  }

  return false;
}
