import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const SRC = path.resolve(import.meta.dirname, "../src");

function resolveMapped(specifier) {
  const rel = specifier.slice(2);
  const base = path.join(SRC, rel);
  if (fs.existsSync(base)) return base;
  if (fs.existsSync(`${base}.js`)) return `${base}.js`;
  if (fs.existsSync(`${base}.mjs`)) return `${base}.mjs`;
  return base;
}

/** Resolve `@/` imports when running Node unit tests outside Next.js. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const mapped = resolveMapped(specifier);
    return nextResolve(pathToFileURL(mapped).href, context);
  }
  return nextResolve(specifier, context);
}
