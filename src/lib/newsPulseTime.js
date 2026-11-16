/**
 * Live relative labels for the /news pulse timestamps.
 * @param {number} thenMs
 * @param {number} [nowMs]
 */
export function formatRelativeAgo(thenMs, nowMs = Date.now()) {
  const delta = Math.max(0, nowMs - thenMs);
  const sec = Math.floor(delta / 1000);
  if (sec < 1) return "just now";
  if (sec < 60) return sec === 1 ? "1 second ago" : `${sec} seconds ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? "1 minute ago" : `${min} minutes ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "1 hour ago" : `${hr} hours ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return day === 1 ? "1 day ago" : `${day} days ago`;
  const month = Math.floor(day / 30);
  return month === 1 ? "1 month ago" : `${month} months ago`;
}
