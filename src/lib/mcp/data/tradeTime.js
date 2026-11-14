/** Unix seconds from ISO, unix seconds, or unix milliseconds. */
export function toUnixSeconds(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value > 1e12 ? value / 1000 : value);
  }
  const s = String(value).trim();
  if (!s) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.floor(n > 1e12 ? n / 1000 : n);
  }
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

export function tradeUnixSeconds(row) {
  if (!row || typeof row !== "object") return null;
  return toUnixSeconds(row.timestamp ?? row.createdAt ?? row.time ?? row.t);
}

/** Keep only rows whose timestamp is inside [start, end] (unix seconds, inclusive). */
export function filterTradesByRange(rows, startSec, endSec) {
  const start = toUnixSeconds(startSec);
  const end = toUnixSeconds(endSec);
  if (start == null && end == null) return Array.isArray(rows) ? rows : [];
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const t = tradeUnixSeconds(row);
    if (t == null) return false;
    if (start != null && t < start) return false;
    if (end != null && t > end) return false;
    return true;
  });
}
