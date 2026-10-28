export const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;

const EMAIL_RE =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

/** @param {unknown} value */
export function normalizeNewsletterEmail(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

/**
 * Strict, ASCII-only check. Returns the normalized email, or "" when invalid.
 * @param {unknown} value
 */
export function parseNewsletterEmail(value) {
  const email = normalizeNewsletterEmail(value);
  if (!email || email.length > MAX_EMAIL_LENGTH) return "";
  const at = email.indexOf("@");
  if (at < 1 || at > MAX_LOCAL_LENGTH) return "";
  return EMAIL_RE.test(email) ? email : "";
}
