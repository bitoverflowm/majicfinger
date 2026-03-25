/**
 * Athena compose date buckets are emitted as human-readable strings like:
 * - "Q1 '24"
 * - "2024-03"
 * - "2024"
 * - "2024-03-14"
 *
 * When we GROUP BY these string expressions (and the client doesn't explicitly
 * request sorting), engines may return groups in lexicographic order
 * ("Q1 ...", then all "Q2 ...", etc.). This helper re-orders rows
 * chronologically for the matched bucket column before we send them to the client.
 */

const DATE_LIKE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_LIKE = /^(\d{4})-(\d{2})$/;
const YEAR_LIKE = /^(\d{4})$/;
const QUARTER_LIKE = /^Q([1-4])\s*'?\s*(\d{2})$/i;

function twoDigitYearToFullYear(yy) {
  // Map 00-69 -> 2000-2069 and 70-99 -> 1970-1999.
  // This matches common financial dataset usage and your examples (e.g. "20" => 2020).
  return yy >= 70 ? 1900 + yy : 2000 + yy;
}

export function parseBucketSortKey(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const s = value.trim();
  if (!s) return null;

  if (DATE_LIKE_YYYY_MM_DD.test(s)) {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  }

  const q = s.match(QUARTER_LIKE);
  if (q) {
    const quarter = Number(q[1]); // 1..4
    const yy = Number(q[2]); // 00..99
    const year = twoDigitYearToFullYear(yy);
    const monthIndex = (quarter - 1) * 3; // quarter start month index
    return Date.UTC(year, monthIndex, 1);
  }

  const m = s.match(MONTH_LIKE);
  if (m) {
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;
    return Date.UTC(year, monthIndex, 1);
  }

  const y = s.match(YEAR_LIKE);
  if (y) {
    const year = Number(y[1]);
    if (!Number.isFinite(year)) return null;
    return Date.UTC(year, 0, 1);
  }

  return null;
}

/**
 * @param {{ columns: string[]; rows: string[][] }} opts
 * @returns {string[][]}
 */
export function sortRowsChronologicallyByDetectedBucketColumn({ columns, rows }) {
  if (!Array.isArray(columns) || !Array.isArray(rows) || rows.length === 0) return rows;

  const rowCount = rows.length;
  const minMatches = Math.max(3, Math.floor(rowCount * 0.6));

  let best = null; // { colIdx, matches, keys }

  for (let colIdx = 0; colIdx < columns.length; colIdx++) {
    let matches = 0;
    const keys = new Array(rowCount);
    for (let i = 0; i < rowCount; i++) {
      const v = rows[i]?.[colIdx];
      const k = parseBucketSortKey(v);
      keys[i] = k;
      if (k != null) matches++;
    }

    if (matches >= minMatches && (!best || matches > best.matches)) {
      best = { colIdx, matches, keys };
    }
  }

  if (!best) return rows;

  return [...rows]
    .map((row, i) => ({ row, key: best.keys[i], i }))
    .sort((a, b) => {
      const ka = a.key;
      const kb = b.key;
      if (ka == null && kb == null) return a.i - b.i;
      if (ka == null) return 1;
      if (kb == null) return -1;
      if (ka !== kb) return ka - kb;
      return a.i - b.i;
    })
    .map((x) => x.row);
}

