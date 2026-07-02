/**
 * Extract client network / device metadata from an incoming API request (Vercel-friendly).
 * @param {import('next').NextApiRequest | { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }} req
 */
export function extractClientMeta(req) {
  const headers = req?.headers || {};

  const pick = (name) => {
    const raw = headers[name];
    if (Array.isArray(raw)) return decodeHeaderValue(String(raw[0] || ""));
    return decodeHeaderValue(typeof raw === "string" ? raw : "");
  };

  const forwarded = pick("x-forwarded-for");
  const clientIp = forwarded
    ? forwarded.split(",")[0].trim()
    : pick("x-real-ip") || req?.socket?.remoteAddress || "";

  const acceptLanguage = pick("accept-language");
  const language = acceptLanguage ? acceptLanguage.split(",")[0].trim() : "";

  const country = pick("x-vercel-ip-country").toUpperCase();
  const region = pick("x-vercel-ip-country-region");
  const city = pick("x-vercel-ip-city");

  return {
    client_ip: clientIp,
    country: /^[A-Z]{2}$/.test(country) ? country : "",
    region: region || "",
    city: city || "",
    user_agent: pick("user-agent"),
    accept_language: language,
  };
}

/** @param {string} value */
function decodeHeaderValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  try {
    return decodeURIComponent(trimmed.replace(/\+/g, " "));
  } catch {
    return trimmed;
  }
}

const GEO_FIELD_KEYS = [
  "client_ip",
  "country",
  "region",
  "city",
  "user_agent",
  "accept_language",
];

/** @param {Record<string, unknown>} meta */
export function geoFieldsFromMeta(meta = {}) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of GEO_FIELD_KEYS) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

/**
 * Mask IP for outbound Telegram while keeping full IP in Mongo.
 * @param {string | undefined | null} ip
 */
export function maskClientIpForTelegram(ip) {
  const value = String(ip || "").trim();
  if (!value) return "";

  if (value.includes(".")) {
    const parts = value.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }

  if (value.includes(":")) {
    const parts = value.split(":").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts.slice(0, 3).join(":")}:…`;
    }
  }

  return "masked";
}
