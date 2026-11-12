import crypto from "crypto";

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function timingSafeEqualHex(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/** PKCE S256: BASE64URL(SHA256(verifier)) */
export function pkceChallengeS256(verifier) {
  return crypto.createHash("sha256").update(String(verifier)).digest("base64url");
}
