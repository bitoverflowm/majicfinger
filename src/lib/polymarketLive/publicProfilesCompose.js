/**
 * Polymarket Live — public profiles (Gamma GET /public-profile).
 */

/** @typedef {{ addresses: string }} PolymarketPublicProfilesComposeState */

export const POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID = "getPublicProfiles";

export const POLYMARKET_PUBLIC_PROFILES_COLUMNS = [
  {
    name: "createdAt",
    type: "string",
    description: "ISO 8601 timestamp of when the profile was created",
  },
  { name: "proxyWallet", type: "string", description: "The proxy wallet address" },
  { name: "profileImage", type: "string", description: "URL to the profile image" },
  {
    name: "displayUsernamePublic",
    type: "boolean",
    description: "Whether the username is displayed publicly",
  },
  { name: "bio", type: "string", description: "Profile bio" },
  { name: "pseudonym", type: "string", description: "Auto-generated pseudonym" },
  { name: "name", type: "string", description: "User-chosen display name" },
  { name: "users", type: "string", description: "Associated user objects (JSON)" },
  { name: "xUsername", type: "string", description: "X (Twitter) username" },
  { name: "verifiedBadge", type: "boolean", description: "Whether the profile has a verified badge" },
];

export const POLYMARKET_PUBLIC_PROFILES_DEFAULT_COLUMNS =
  POLYMARKET_PUBLIC_PROFILES_COLUMNS.map((column) => column.name);

export function emptyPolymarketPublicProfilesComposeState() {
  return { addresses: "" };
}

/** @param {unknown} raw */
export function normalizePolymarketPublicProfilesComposeState(raw) {
  if (!raw || typeof raw !== "object") return emptyPolymarketPublicProfilesComposeState();
  return {
    addresses: String(
      /** @type {Record<string, unknown>} */ (raw).addresses || "",
    ),
  };
}

/** @param {unknown} raw */
export function parsePolymarketProfileAddresses(raw) {
  const values = Array.isArray(raw) ? raw : String(raw || "").split(/[\s,;]+/);
  const unique = [];
  const seen = new Set();
  for (const value of values) {
    const address = String(value || "").trim();
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(address);
  }
  return unique;
}

/** @param {string} address */
export function isPolymarketWalletAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(address || "").trim());
}

/**
 * @param {unknown} profile
 * @param {string[]} selectedColumns
 */
export function projectPolymarketPublicProfile(profile, selectedColumns) {
  const source =
    profile && typeof profile === "object"
      ? /** @type {Record<string, unknown>} */ (profile)
      : {};
  const selected = new Set(
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : POLYMARKET_PUBLIC_PROFILES_DEFAULT_COLUMNS,
  );
  const row = {};
  for (const { name } of POLYMARKET_PUBLIC_PROFILES_COLUMNS) {
    if (!selected.has(name)) continue;
    const value = source[name];
    row[name] =
      name === "users"
        ? Array.isArray(value)
          ? JSON.stringify(value)
          : value == null
            ? ""
            : String(value)
        : value == null
          ? ""
          : value;
  }
  return row;
}
