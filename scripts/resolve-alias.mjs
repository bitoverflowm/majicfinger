import path from "node:path";
import fs from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

const SRC = path.resolve(import.meta.dirname, "../src");

function resolveFileCandidate(base) {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  if (fs.existsSync(`${base}.js`)) return `${base}.js`;
  if (fs.existsSync(`${base}.mjs`)) return `${base}.mjs`;
  if (fs.existsSync(path.join(base, "index.js"))) return path.join(base, "index.js");
  return base;
}

function resolveMapped(specifier) {
  const rel = specifier.slice(2);
  const base = path.join(SRC, rel);
  return resolveFileCandidate(base);
}

function resolveRelativeFromSrc(specifier, parentURL) {
  if (!parentURL || !specifier.startsWith(".")) return null;
  const parentPath = fileURLToPath(parentURL);
  if (!parentPath.startsWith(SRC)) return null;
  const base = path.resolve(path.dirname(parentPath), specifier);
  return resolveFileCandidate(base);
}

function resolveTarget(specifier, parentURL) {
  if (specifier.startsWith("@/")) {
    return pathToFileURL(resolveMapped(specifier)).href;
  }
  const relativeMapped = resolveRelativeFromSrc(specifier, parentURL);
  if (relativeMapped) {
    return pathToFileURL(relativeMapped).href;
  }
  return specifier;
}

/** Resolve `@/` and extensionless relative imports when running Node outside Next.js. */
export async function resolve(specifier, context, nextResolve) {
  const target = resolveTarget(specifier, context.parentURL);
  const isJson = specifier.endsWith(".json") || target.endsWith(".json");
  const nextContext = isJson
    ? { ...context, importAttributes: { ...context.importAttributes, type: "json" } }
    : context;

  if (target !== specifier) {
    return nextResolve(target, nextContext);
  }
  return nextResolve(specifier, nextContext);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) {
    const text = fs.readFileSync(fileURLToPath(url), "utf8");
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${text}`,
    };
  }
  return nextLoad(url, context);
}
