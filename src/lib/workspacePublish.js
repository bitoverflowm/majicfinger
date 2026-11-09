/**
 * Publishing a project to `lycheedata.com/<handle>/<slug>`: the settings a publish carries, their
 * limits, and who may use which option. Shared by the publish dialog and the API.
 */

import { membershipState, normalizeMembershipTier } from "@/lib/membershipAccess";
import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";

export const PUBLISH_MODES = ["live", "snapshot"];
export const PUBLISH_VISIBILITY = ["public", "unlisted"];

export const PUBLISH_CATEGORIES = [
  "Politics",
  "Elections",
  "Economics",
  "Crypto",
  "Sports",
  "Tech & AI",
  "Culture",
  "Science & weather",
  "Trader research",
  "Other",
];

export const PUBLISH_LIMITS = {
  title: 120,
  slug: 80,
  description: 2000,
  seoTitle: 70,
  seoDescription: 170,
  keyword: 40,
  keywords: 15,
  label: 32,
  labels: 8,
  passwordMin: 6,
  passwordMax: 128,
  /** Uploaded images arrive as data URLs; base64 is about 4/3 of the file. */
  image: 2_000_000,
};

/** These sit under `/<handle>/` already, so a project can't take them. */
const RESERVED_SLUGS = new Set(["charts", "dashboards", "settings", "edit", "og-image", "api"]);

export const PUBLISH_IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

export function normalizePublishSlug(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PUBLISH_LIMITS.slug)
    .replace(/-+$/g, "");
}

/** "" when the slug can be used, otherwise why not. */
export function publishSlugProblem(slug) {
  if (!slug) return "Give the page an address.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Use lowercase letters, numbers and dashes.";
  if (RESERVED_SLUGS.has(slug)) return "That address is taken by Lychee. Try another.";
  return "";
}

export function publishedProjectPath(handle, slug) {
  return `/${encodeURIComponent(String(handle || ""))}/${encodeURIComponent(String(slug || ""))}`;
}

/** Trimmed, de-duplicated, capped: what keyword and label fields accept. */
export function cleanPublishList(list, { max, each }) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(list) ? list : String(list || "").split(",")) {
    const item = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, each);
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

/** Password-protected pages are a Quant plan feature. */
export function userCanPasswordProtect(user) {
  if (!user) return false;
  if (isOwnerFullAccessUser(user)) return true;
  return normalizeMembershipTier(user.subscriptionTier) === "quant" && membershipState(user).hasAccess;
}

/** The page's description, or a sentence built from what's on it. */
export function fallbackPublishDescription({ title, tabs }) {
  const names = (tabs || []).map((tab) => String(tab?.name || "").trim()).filter(Boolean);
  const lead = String(title || "").trim() || "A prediction market dashboard";
  if (!names.length) return `${lead}, built on Lychee with live Polymarket and Kalshi data.`;
  const list = names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(", ");
  return `${lead}: ${list}. Built on Lychee with live Polymarket and Kalshi data.`;
}
