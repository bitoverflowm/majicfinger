/**
 * War Room / homepage hero flags.
 *
 * NEXT_PUBLIC_WAR_ROOM_HERO — new globe/story hero (default on for this branch).
 *   Set to 0/false to restore the existing landing-hero copy + CTAs.
 * NEXT_PUBLIC_LANDING_DEMO — load the heavy homepage dashboard demo (default off).
 * WAR_ROOM_FIXTURE / NEXT_PUBLIC_WAR_ROOM_FIXTURE — force the labeled lab fixture.
 */

function readEnv(name) {
  if (typeof process === "undefined" || !process.env) return "";
  const raw = process.env[name];
  return raw == null ? "" : String(raw).trim();
}

/**
 * @param {string} name
 * @param {boolean} defaultOn
 */
export function envFlag(name, defaultOn = false) {
  const raw = readEnv(name).toLowerCase();
  if (!raw) return defaultOn;
  if (["0", "false", "off", "no"].includes(raw)) return false;
  if (["1", "true", "on", "yes"].includes(raw)) return true;
  return defaultOn;
}

/** New homepage hero: globe poster, featured story, Open War Room. */
export function isWarRoomHeroEnabled() {
  return envFlag("NEXT_PUBLIC_WAR_ROOM_HERO", true);
}

/**
 * The live dashboard demo on the landing page. Off unless explicitly re-enabled,
 * and never combined with the War Room hero.
 */
export function isLandingDemoEnabled() {
  if (isWarRoomHeroEnabled()) return false;
  return envFlag("NEXT_PUBLIC_LANDING_DEMO", false);
}

export function isWarRoomFixtureForced() {
  return envFlag("WAR_ROOM_FIXTURE", false) || envFlag("NEXT_PUBLIC_WAR_ROOM_FIXTURE", false);
}

/** Labeled fixture is allowed in non-production, or when forced. Production stays on live/empty. */
export function allowFixtureFallback() {
  if (isWarRoomFixtureForced()) return true;
  return readEnv("NODE_ENV") !== "production";
}

export function isProductionRuntime() {
  return readEnv("NODE_ENV") === "production";
}
