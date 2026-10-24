/** Home timezone for operator-facing Telegram timestamps (NPT). */
export const TELEGRAM_HOME_TIMEZONE =
  process.env.TELEGRAM_HOME_TIMEZONE || "Asia/Kathmandu";

/**
 * @param {Date | string | number} value
 * @param {string} timeZone
 */
export function formatZonedDateTime(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const zone = String(timeZone || "").trim() || "UTC";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(date);
    } catch {
      return date.toISOString();
    }
  }
}

/**
 * Short device line for Telegram, e.g. "iPhone; OS 18_7 like Mac OS X".
 * @param {string | undefined | null} ua
 */
export function shortenUserAgent(ua) {
  const s = String(ua || "").trim();
  if (!s) return "";

  const iphone = s.match(/\(iPhone; CPU iPhone OS ([\d_]+) like Mac OS X\)/);
  if (iphone) return `iPhone; OS ${iphone[1]} like Mac OS X`;

  const ipad = s.match(/\(iPad; CPU (?:iPhone )?OS ([\d_]+) like Mac OS X\)/);
  if (ipad) return `iPad; OS ${ipad[1]} like Mac OS X`;

  const android = s.match(/Android ([\d.]+);[^)]*?([^;)]+)\)/);
  if (android) {
    const device = android[2].replace(/\s*Build\/.*$/i, "").trim();
    return `Android ${android[1]}; ${device || "device"}`;
  }

  const mac = s.match(/Macintosh; Intel Mac OS X ([\d_]+)/);
  const win = s.match(/Windows NT ([\d.]+)/);
  const chrome = s.match(/Chrome\/([\d.]+)/);
  const firefox = s.match(/Firefox\/([\d.]+)/);
  const edg = s.match(/Edg\/([\d.]+)/);
  const safari =
    /Safari\//.test(s) && !chrome && !edg ? s.match(/Version\/([\d.]+)/) : null;

  const browser = edg
    ? `Edge ${edg[1].split(".")[0]}`
    : chrome
      ? `Chrome ${chrome[1].split(".")[0]}`
      : firefox
        ? `Firefox ${firefox[1].split(".")[0]}`
        : safari
          ? `Safari ${safari[1].split(".")[0]}`
          : "";

  if (mac) {
    return [`Mac OS X ${mac[1].replace(/_/g, ".")}`, browser].filter(Boolean).join("; ");
  }
  if (win) {
    return [`Windows ${win[1]}`, browser].filter(Boolean).join("; ");
  }

  return s.slice(0, 90);
}

/**
 * Pretty-print a referrer for Telegram.
 * @param {string | undefined | null} referrer
 * @param {string | undefined | null} entryPath
 */
export function formatReferrerLabel(referrer, entryPath) {
  const raw = String(referrer || "").trim();
  if (!raw) return "direct / none";
  try {
    const url = new URL(raw);
    const path = `${url.pathname || ""}${url.search || ""}`.slice(0, 120);
    if (entryPath && path.startsWith(String(entryPath).split("?")[0])) {
      return `${url.host}${path}`;
    }
    return path && path !== "/" ? `${url.host}${path}` : url.host;
  } catch {
    return raw.slice(0, 160);
  }
}
