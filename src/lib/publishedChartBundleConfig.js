/** Max rows stored in a published chart snapshot (above → live_lake mode). */
export const PUBLISHED_BUNDLE_MAX_ROWS = 20_000;

/** Max estimated JSON bytes for published snapshot payload. */
export const PUBLISHED_BUNDLE_MAX_BYTES = 4 * 1024 * 1024;

/** Safety cap when reducing rows via chart line filters. */
export const PUBLISHED_BUNDLE_FILTER_ROW_CAP = 50_000;

export const PUBLISHED_BUNDLE_META_VERSION = 1;

export const MATERIALIZATION_MODE_SNAPSHOT = "snapshot";
export const MATERIALIZATION_MODE_LIVE_LAKE = "live_lake";
