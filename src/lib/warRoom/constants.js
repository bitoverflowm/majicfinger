export const WAR_ROOM_MODEL_VERSION = 1;

export const DESKS = /** @type {const} */ (["all", "weather", "geopolitics"]);

/** @typedef {(typeof DESKS)[number]} WarRoomDesk */

export const DESK_LABELS = {
  all: "All",
  weather: "Weather",
  geopolitics: "Geopolitics",
};

export const FEATURED_WEATHER_SERIES = "KXHIGHNY";
export const FEATURED_WEATHER_CITY = "New York City";
export const FEATURED_WEATHER_NWS_STATION = "KNYC";
export const FEATURED_WEATHER_CLINYC = "CLINYC";
export const NYC_COORDINATES = /** @type {[number, number]} */ ([-73.9654, 40.7829]);

export const LARGE_FILL_USD = 5_000;

export const PREVIEW_CACHE_TTL_MS = 20_000;
export const SNAPSHOT_CACHE_TTL_MS = 20_000;
export const SOURCE_TIMEOUT_MS = 8_000;
export const POLL_INTERVAL_MS = 8_000;
export const STREAM_HEARTBEAT_MS = 15_000;
export const MAP_UPDATE_CADENCE_MS = 350;

/** Map density — enough for a busy globe without melting mobile. */
export const MOBILE_POINT_CAP = 90;
export const DESKTOP_POINT_CAP = 220;
export const PREVIEW_STORY_CAP = 3;
/** Cap headlines shown as map pings + activity rows (newest keep the slots). */
export const NEWS_ACTIVITY_CAP = 36;
/** Cap live trade rows in the activity pane. */
export const TRADE_ACTIVITY_CAP = 40;
/** Right-rail market list (map can show more points than the feed). */
export const FEED_ROW_CAP = 48;

export const NWS_USER_AGENT = "Lychee War Room (https://lycheedata.com; kash@lycheedata.com)";

export const GEOPOLITICS_SERIES = ["KXFED", "KXPRES", "KXGOVSHUT", "KXUKRAINE", "KXIRAN"];

export const GEOPOLITICS_TITLE_RE =
  /\b(fed|fomc|interest rate|inflation|cpi|tariff|election|president|senate|congress|house|ceasefire|ukraine|russia|iran|israel|gaza|taiwan|china|hormuz|nato|sanction|strike|missile|troop|blockade|nuclear|war)\b/i;
