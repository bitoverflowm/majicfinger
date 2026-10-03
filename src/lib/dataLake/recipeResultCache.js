/** Session cache for an identical small compose or count. Full pulls stay on Athena. */

const RECIPE_TTL_MS = 10 * 60 * 1000;
const RECIPE_MAX = 32;
const recipeCache = new Map();

export function recipeCacheKey(body) {
  if (!body || typeof body !== "object") return "";
  return JSON.stringify({
    lake: body.lake || "",
    table: body.table || "",
    queryType: body.queryType || "select",
    limit: body.limit ?? null,
    filters: body.filters ?? null,
    compose: body.compose ?? null,
    columns: body.columns ?? null,
    caseSensitive: body.caseSensitive === true,
    demo: body.demo === true,
  });
}

export function recipeCacheable(body) {
  if (!body || typeof body !== "object") return false;
  if (body.queryType === "count") return true;
  const limit = Number(body.limit);
  return Number.isFinite(limit) && limit > 0 && limit <= 50;
}

export function readRecipeCache(key) {
  if (!key) return null;
  const hit = recipeCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > RECIPE_TTL_MS) {
    recipeCache.delete(key);
    return null;
  }
  recipeCache.delete(key);
  recipeCache.set(key, hit);
  return hit.value;
}

export function writeRecipeCache(key, value) {
  if (!key) return;
  recipeCache.set(key, { at: Date.now(), value });
  while (recipeCache.size > RECIPE_MAX) {
    const oldest = recipeCache.keys().next().value;
    recipeCache.delete(oldest);
  }
}
