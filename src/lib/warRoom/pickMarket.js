import { scrollToDemoSection } from "@/lib/scrollToDemo";

import { warRoomHref } from "./href";

/** Homepage `#demo` / War Room terminal — select a market and reveal pin/detail. */
export const WAR_ROOM_MARKET_PICK_EVENT = "lychee:war-room-market-pick";

/** Homepage `#demo` / War Room — select a news headline (same as right-rail news click). */
export const WAR_ROOM_NEWS_PICK_EVENT = "lychee:war-room-news-pick";

/**
 * Survives `/war-room` remounts when Next soft-navigates on `?market=` —
 * the CustomEvent alone is not enough if WarRoomView remounts with selectOnly=false.
 * @type {{ marketId: string; title?: string; venue?: string; detail?: string; selectOnly: boolean; at: number } | null}
 */
let pendingSelectOnlyMarketPick = null;

const PENDING_PICK_TTL_MS = 15_000;

/**
 * @returns {{ marketId: string; title?: string; venue?: string; detail?: string; selectOnly: boolean; at: number } | null}
 */
export function peekPendingSelectOnlyMarketPick() {
  const pending = pendingSelectOnlyMarketPick;
  if (!pending) return null;
  if (Date.now() - pending.at > PENDING_PICK_TTL_MS) {
    pendingSelectOnlyMarketPick = null;
    return null;
  }
  return pending;
}

/**
 * @returns {{ marketId: string; title?: string; venue?: string; detail?: string; selectOnly: boolean; at: number } | null}
 */
export function consumePendingSelectOnlyMarketPick() {
  const pending = peekPendingSelectOnlyMarketPick();
  pendingSelectOnlyMarketPick = null;
  return pending;
}

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

  // Always stash before emit/navigate so remounted WarRoomView can re-enter select-only.
  pendingSelectOnlyMarketPick = { ...detail, at: Date.now() };

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
    // Defer like homepage so Terminal URL sync / remount cannot race ahead of listeners.
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(WAR_ROOM_MARKET_PICK_EVENT, { detail }));
    }, 0);
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
