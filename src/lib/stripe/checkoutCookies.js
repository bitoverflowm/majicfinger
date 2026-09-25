import { serialize, parse } from "cookie";

export const CHECKOUT_ATTEMPT_COOKIE = "lycheeCheckoutAttempt";
const MAX_AGE = 60 * 60 * 24 * 7;

function cookieOptions(maxAge) {
  return {
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  };
}

export function attemptCookieHeader(attemptId) {
  return serialize(CHECKOUT_ATTEMPT_COOKIE, attemptId, cookieOptions(MAX_AGE));
}

export function clearAttemptCookieHeader() {
  return serialize(CHECKOUT_ATTEMPT_COOKIE, "", {
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export function readAttemptId(req) {
  const fromReq = req?.cookies?.[CHECKOUT_ATTEMPT_COOKIE];
  if (fromReq) return String(fromReq);
  const parsed = parse(req?.headers?.cookie || "");
  const value = parsed[CHECKOUT_ATTEMPT_COOKIE];
  return value ? String(value) : "";
}

/** Keep an existing Set-Cookie (login session) and add another. */
export function appendSetCookie(res, cookieHeader) {
  const prev = res.getHeader("Set-Cookie");
  const list = prev == null ? [] : Array.isArray(prev) ? prev.slice() : [String(prev)];
  res.setHeader("Set-Cookie", [...list, cookieHeader]);
}
