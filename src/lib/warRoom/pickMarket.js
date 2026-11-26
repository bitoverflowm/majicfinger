import { scrollToDemoSection } from "@/lib/scrollToDemo";

import { warRoomHref } from "./href";

/** Homepage `#demo` / War Room terminal — select a market and reveal pin/detail. */
export const WAR_ROOM_MARKET_PICK_EVENT = "lychee:war-room-market-pick";

/** Homepage `#demo` / War Room — select a news headline (same as right-rail news click). */
export const WAR_ROOM_NEWS_PICK_EVENT = "lychee:war-room-news-pick";

const LENS_STORAGE_KEY = "lychee:war-room-pick-lens";
const PENDING_PICK_TTL_MS = 120_000;

/**
 * Survives `/war-room` remounts, Next soft-nav, and Design Mode HMR.
 * Module var is fast; sessionStorage is durable across remounts.
 * @type {{ marketId: string; title?: string; venue?: string; detail?: string; selectOnly: boolean; at: number } | null}
 */
let pendingSelectOnlyMarketPick = null;

function readStoredLens() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LENS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.marketId) return null;
    if (Date.now() - Number(parsed.at || 0) > PENDING_PICK_TTL_MS) {
      window.sessionStorage.removeItem(LENS_STORAGE_KEY);
      return null;
    }
    return {
      marketId: String(parsed.marketId),
      title: parsed.title ? String(parsed.title) : undefined,
      venue: parsed.venue ? String(parsed.venue) : undefined,
      detail: parsed.detail ? String(parsed.detail) : undefined,
      selectOnly: parsed.selectOnly !== false,
      at: Number(parsed.at) || Date.now(),
    };
  } catch {
    return null;
  }
}

function writeStoredLens(detail) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LENS_STORAGE_KEY, JSON.stringify(detail));
  } catch {
    /* private mode */
  }
}

/**
 * @returns {{ marketId: string; title?: string; venue?: string; detail?: string; selectOnly: boolean; at: number } | null}
 */
export function peekPendingSelectOnlyMarketPick() {
  if (pendingSelectOnlyMarketPick) {
    if (Date.now() - pendingSelectOnlyMarketPick.at > PENDING_PICK_TTL_MS) {
      pendingSelectOnlyMarketPick = null;
    } else {
      return pendingSelectOnlyMarketPick;
    }
  }
  const stored = readStoredLens();
  if (stored) pendingSelectOnlyMarketPick = stored;
  return stored;
}

/**
 * Keep sticky lens for remounts — do not wipe sessionStorage here.
 * @returns {{ marketId: string; title?: string; venue?: string; detail?: string; selectOnly: boolean; at: number } | null}
 */
export function consumePendingSelectOnlyMarketPick() {
  return peekPendingSelectOnlyMarketPick();
}

/** Clear sticky lens when leaving pick mode (explore chips, news, clear). */
export function clearPendingSelectOnlyMarketPick() {
  pendingSelectOnlyMarketPick = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LENS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
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
    at: Date.now(),
  };

  // Sticky before emit/navigate so remounted WarRoomView / HMR re-enters select-only.
  pendingSelectOnlyMarketPick = detail;
  writeStoredLens(detail);

  if (onHome) {
    if (shouldScroll) scrollToDemoSection({ behavior: "smooth" });
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

  clearPendingSelectOnlyMarketPick();

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
