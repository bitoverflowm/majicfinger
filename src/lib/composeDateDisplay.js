/**
 * Display formatting for compose date buckets + client-side reformat from bucket epoch ms.
 */

/** Hidden column suffix: bucket start (UTC ms) for a formatted date dimension. */
export const COMPOSE_DATE_BUCKET_MS_SUFFIX = "__bucket_ms";

/**
 * @param {string} alias
 * @returns {string}
 */
export function composeBucketMsColumnAlias(alias) {
  return `${String(alias || "").trim()}${COMPOSE_DATE_BUCKET_MS_SUFFIX}`;
}

/**
 * @param {string} columnName
 * @returns {boolean}
 */
export function isComposeBucketMsColumn(columnName) {
  return String(columnName || "").endsWith(COMPOSE_DATE_BUCKET_MS_SUFFIX);
}

/**
 * Default display format for a date bucket (null = bucket-native SQL label).
 * @param {string | null | undefined} dateBucket
 * @returns {null | "iso" | "ym" | "hm" | "dmy" | "dm"}
 */
export function defaultDateFormatForBucket(dateBucket) {
  if (!dateBucket) return null;
  if (dateBucket === "hour") return "hm";
  if (dateBucket === "day" || dateBucket === "week") return "iso";
  if (dateBucket === "month") return "ym";
  // quarter, year: bucket-native labels (Q1 '24, 2024)
  return null;
}

/**
 * Format bucket-start epoch ms for sheet display (matches Athena compose labels).
 * @param {unknown} ms
 * @param {string | null | undefined} dateFormat
 * @param {string | null | undefined} dateBucket
 * @returns {number | string | null}
 */
export function formatComposeDateFromBucketMs(ms, dateFormat, dateBucket) {
  if (ms == null || ms === "") return null;
  const n = typeof ms === "number" ? ms : Number(ms);
  if (!Number.isFinite(n)) return null;

  const fmt = dateFormat || null;
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return null;

  if (fmt === "raw") return n;

  const pad2 = (x) => String(x).padStart(2, "0");

  if (fmt === "iso") {
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  }
  if (fmt === "hm") {
    return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  }
  if (fmt === "dmy") {
    return `${pad2(d.getUTCDate())}-${pad2(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
  }
  if (fmt === "ym") {
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
  }
  if (fmt === "dm") {
    return `${pad2(d.getUTCDate())}-${pad2(d.getUTCMonth() + 1)}`;
  }

  // Bucket-native (auto) when format is null
  if (dateBucket === "quarter") {
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    const yy = String(d.getUTCFullYear()).slice(-2);
    return `Q${q} '${yy}`;
  }
  if (dateBucket === "month") {
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
  }
  if (dateBucket === "year") {
    return String(d.getUTCFullYear());
  }
  if (dateBucket === "hour") {
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:00`;
  }
  if (dateBucket === "week" || dateBucket === "day") {
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }

  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
