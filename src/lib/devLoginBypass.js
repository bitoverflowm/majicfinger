export const DEV_LOGIN_BYPASS_EMAIL = "rikesh@bitoverflow.org";
export const DEV_LOGIN_BYPASS_NAME = "Rikesh";

/** Development-only: session for the one-click login bypass user (see /api/login). */
export function isDevLoginBypassUser(user) {
  if (process.env.NODE_ENV !== "development") return false;
  if (!user?.email) return false;
  return String(user.email).toLowerCase().trim() === DEV_LOGIN_BYPASS_EMAIL.toLowerCase();
}
