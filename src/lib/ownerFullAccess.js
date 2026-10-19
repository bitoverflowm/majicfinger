/** Single account that always receives full dashboard access (any environment). */
export const OWNER_FULL_ACCESS_EMAIL = "rikesh@bitoverflow.org";

export function normalizeUserEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function hasOwnerFullAccessEmail(email) {
  return normalizeUserEmail(email) === normalizeUserEmail(OWNER_FULL_ACCESS_EMAIL);
}

/**
 * Only Magic-verified identity (email, issuer) counts. Display names and handles
 * are user-editable, so they must never grant access.
 */
export function isOwnerFullAccessUser(user) {
  if (!user || typeof user !== "object") return false;
  if (hasOwnerFullAccessEmail(user.email)) return true;

  const issuerLc = String(user.issuer || "").toLowerCase();
  if (issuerLc.includes("0x8b22102b8969eda426e11a3219b19b871d81d2d9")) return true;

  return false;
}
