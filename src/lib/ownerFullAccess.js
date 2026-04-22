/** Single account that always receives full dashboard access (any environment). */
export const OWNER_FULL_ACCESS_EMAIL = "rikesh@bitoverflow.org";

export function normalizeUserEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function hasOwnerFullAccessEmail(email) {
  return normalizeUserEmail(email) === normalizeUserEmail(OWNER_FULL_ACCESS_EMAIL);
}

/**
 * Recognize the owner session even if `email` is missing on a malformed client payload,
 * or if Magic / legacy fields differ slightly.
 */
export function isOwnerFullAccessUser(user) {
  if (!user || typeof user !== "object") return false;
  if (hasOwnerFullAccessEmail(user.email) || hasOwnerFullAccessEmail(user.user_email)) return true;

  const nameLc = String(user.name || "").toLowerCase().trim();
  if (nameLc === "rikesh thapa") return true;

  const userNameLc = String(user.user_name || "").toLowerCase().trim();
  if (userNameLc === "misterrpink1") return true;

  const issuerLc = String(user.issuer || "").toLowerCase();
  if (issuerLc.includes("0x8b22102b8969eda426e11a3219b19b871d81d2d9")) return true;

  return false;
}
