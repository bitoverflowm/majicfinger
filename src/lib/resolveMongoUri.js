/**
 * Dev default: MONGODB_URI_DEV. Production deploy: MONGODB_URI.
 * Local prod testing: USE_PRODUCTION_DB=1 or `npm run dev -- --prod-db`.
 */

export function useProductionDatabase() {
  const raw = String(process.env.USE_PRODUCTION_DB || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * @returns {"production" | "dev"}
 */
export function mongoDatabaseTarget() {
  if (process.env.NODE_ENV === "production" || useProductionDatabase()) {
    return "production";
  }
  return "dev";
}

/**
 * @returns {string | null}
 */
export function resolveAppMongoUri() {
  const target = mongoDatabaseTarget();
  if (target === "production") {
    return process.env.MONGODB_URI || null;
  }
  return process.env.MONGODB_URI_DEV || null;
}

export function missingMongoUriMessage() {
  const target = mongoDatabaseTarget();
  if (target === "production") {
    return "Please define MONGODB_URI in .env / .env.local (production database).";
  }
  return "Please define MONGODB_URI_DEV in .env / .env.local (dev database), or run with --prod-db to use MONGODB_URI.";
}
