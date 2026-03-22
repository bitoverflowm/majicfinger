/**
 * Loads AWS-related env from repo-root `.env` then `.env.local` (Next-style: local overrides).
 * Used by Becker CLI scripts so `node scripts/...` picks up the same vars as the app without
 * falling through to the EC2 metadata provider.
 */
const fs = require("fs");
const path = require("path");

let loaded = false;

function parseEnvFile(filePath, { override }) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!override && process.env[key] !== undefined) continue;
    process.env[key] = val;
  }
}

function loadRepoEnvForAws() {
  if (loaded) return;
  loaded = true;
  const root = process.cwd();
  try {
    require("dotenv").config({ path: path.join(root, ".env") });
    require("dotenv").config({ path: path.join(root, ".env.local"), override: true });
  } catch (e) {
    if (e.code !== "MODULE_NOT_FOUND") throw e;
    parseEnvFile(path.join(root, ".env"), { override: false });
    parseEnvFile(path.join(root, ".env.local"), { override: true });
  }
}

function resolveAwsCredentialsOrThrow() {
  loadRepoEnvForAws();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      [
        "Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY.",
        "Add them to .env at the project root (or export in your shell) and run this script from the repo root.",
      ].join(" "),
    );
  }
  return { accessKeyId, secretAccessKey };
}

module.exports = { loadRepoEnvForAws, resolveAwsCredentialsOrThrow };
