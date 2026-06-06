#!/usr/bin/env node
/**
 * Dev server entry: `npm run dev` or `npm run dev -- --prod-db`
 */
const { spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
const prodDb =
  args.includes("--prod-db") ||
  args.includes("--use-prod-db") ||
  args.includes("--production-db");

if (prodDb) {
  process.env.USE_PRODUCTION_DB = "1";
  console.log("\n⚠️  USE_PRODUCTION_DB enabled — API routes will use MONGODB_URI (production).\n");
}

const root = path.resolve(__dirname, "..");

function run(cmd, cmdArgs, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

(async () => {
  await run("node", ["scripts/build-search-index.js"], "build-search-index");
  const prodDbFlags = new Set(["--prod-db", "--use-prod-db", "--production-db"]);
  const nextArgs = args.filter((a) => !prodDbFlags.has(a));
  await run("npx", ["next", "dev", ...nextArgs], "next dev");
})().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
