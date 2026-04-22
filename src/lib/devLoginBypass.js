export const DEV_LOGIN_BYPASS_EMAIL = "rikesh@bitoverflow.org";
export const DEV_LOGIN_BYPASS_NAME = "Rikesh";

/** Unpaid test user: dev-only magic-link skip; does NOT get dashboard unlock via isDevLoginBypassUser. */
export const DEV_UNPAID_TEST_EMAIL = "test@placeholder.com";
export const DEV_UNPAID_TEST_NAME = "test_no_account";

const MAGIC_LINK_BYPASS_NORMALIZED = new Set([
  DEV_LOGIN_BYPASS_EMAIL.toLowerCase(),
  DEV_UNPAID_TEST_EMAIL.toLowerCase(),
]);

/**
 * Development only: these emails may POST /api/login with devBypass (no Magic).
 * Does not grant paid access; see isDevLoginBypassUser for the Rikesh-only shortcut.
 */
export function isDevMagicLinkBypassEmail(email) {
  if (process.env.NODE_ENV === "production") return false;
  const e = String(email ?? "").toLowerCase().trim();
  return MAGIC_LINK_BYPASS_NORMALIZED.has(e);
}

/** Resolve to the canonical stored email for User lookup/create. */
export function devBypassCanonicalEmail(email) {
  const e = String(email ?? "").toLowerCase().trim();
  if (e === DEV_LOGIN_BYPASS_EMAIL.toLowerCase()) return DEV_LOGIN_BYPASS_EMAIL;
  if (e === DEV_UNPAID_TEST_EMAIL.toLowerCase()) return DEV_UNPAID_TEST_EMAIL;
  return null;
}

export function defaultNameForDevBypassEmail(canonicalEmail) {
  if (canonicalEmail === DEV_LOGIN_BYPASS_EMAIL) return DEV_LOGIN_BYPASS_NAME;
  if (canonicalEmail === DEV_UNPAID_TEST_EMAIL) return DEV_UNPAID_TEST_NAME;
  return "Dev User";
}

/** Development-only: grants full dashboard access in dashBody (Rikesh only). */
export function isDevLoginBypassUser(user) {
  if (process.env.NODE_ENV === "production") return false;
  if (!user?.email) return false;
  return String(user.email).toLowerCase().trim() === DEV_LOGIN_BYPASS_EMAIL.toLowerCase();
}
