import { DESKS } from "./constants";
import { parseWarRoomMarketId } from "./ids";

/**
 * @param {string | null | undefined} desk
 * @returns {"all" | "weather" | "geopolitics"}
 */
export function normalizeDesk(desk) {
  const value = String(desk || "").trim().toLowerCase();
  return DESKS.includes(/** @type {typeof DESKS[number]} */ (value)) ? value : "all";
}

/**
 * @param {{ desk?: string | null; market?: string | null }} [opts]
 */
export function warRoomHref(opts = {}) {
  const params = new URLSearchParams();
  const desk = normalizeDesk(opts.desk);
  if (desk !== "all") params.set("desk", desk);
  const market = String(opts.market || "").trim();
  if (market && parseWarRoomMarketId(market)) params.set("market", market);
  const qs = params.toString();
  return qs ? `/war-room?${qs}` : "/war-room";
}

/**
 * @param {Record<string, string | string[] | undefined> | URLSearchParams | null | undefined} query
 */
export function deskAndMarketFromQuery(query) {
  const read = (key) => {
    if (!query) return "";
    if (typeof query.get === "function") return String(query.get(key) || "").trim();
    const raw = query[key];
    return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
  };
  return {
    desk: normalizeDesk(read("desk")),
    market: read("market"),
    fixture: ["1", "true", "yes"].includes(read("fixture").toLowerCase()),
  };
}
