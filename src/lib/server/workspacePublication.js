import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import WorkspacePublication from "@/models/WorkspacePublications";
import { PUBLISH_IMAGE_DATA_URL } from "@/lib/workspacePublish";

/** Fields on a publication anyone may read. Images and the password stay server-side. */
export const PUBLICATION_PUBLIC_FIELDS =
  "project_id user_id slug published published_at first_published_at mode visibility tabs title description seo_title seo_description keywords labels category og_at header_at password_on snapshot_at updatedAt";

/** Tab fields a published page needs. Anything else a tab carries stays private. */
const TAB_FIELDS = ["id", "name", "blank", "terminal", "terminalSubject", "terminalLayout", "margins"];

/** Keys that could hold a credential, wherever they sit in a block. */
const SECRET_KEY = /(api[_-]?key|secret|token|password|passphrase|authorization|credential|cookie|private[_-]?key|bearer)/i;

function scrubSecrets(value, depth = 0) {
  if (depth > 12 || value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => scrubSecrets(item, depth + 1));
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    out[key] = scrubSecrets(item, depth + 1);
  }
  return out;
}

function publicTab(tab) {
  const out = {};
  for (const key of TAB_FIELDS) if (tab?.[key] !== undefined) out[key] = tab[key];
  return out;
}

/**
 * The part of a project a published page shows: only the tabs it lists, in the project's order,
 * their blocks without anything that looks like a credential, and the tables those blocks use.
 */
export function publishedContent(doc, tabIds) {
  const wanted = new Set((tabIds || []).map(String));
  const allTabs = Array.isArray(doc?.tabs) ? doc.tabs : [];
  const tabs = allTabs.filter((tab) => wanted.has(String(tab?.id))).map(publicTab);
  const blocks = {};
  const blockById = new Set();
  for (const tab of tabs) {
    const list = Array.isArray(doc?.blocks?.[tab.id]) ? doc.blocks[tab.id] : [];
    blocks[tab.id] = list.map((block) => scrubSecrets(block));
    for (const block of list) {
      if (block?.id) blockById.add(String(block.id));
      if (block?.tableId) blockById.add(String(block.tableId));
    }
  }
  const tables = (Array.isArray(doc?.tables) ? doc.tables : []).filter((table) => table?.id && blockById.has(String(table.id))).map((table) => scrubSecrets(table));
  const active = tabs.find((tab) => tab.id === doc?.active_tab_id)?.id || tabs[0]?.id || "";
  return { name: String(doc?.name || "").trim() || "Untitled", tabs, blocks, tables, active_tab_id: active };
}

export function hashPublishPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPublishPassword(password, stored) {
  const [kind, salt, hash] = String(stored || "").split(":");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const given = crypto.scryptSync(String(password ?? ""), salt, 32);
  const want = Buffer.from(hash, "hex");
  return want.length === given.length && crypto.timingSafeEqual(given, want);
}

export function unlockCookieName(publicationId) {
  return `lychee_pub_${String(publicationId)}`;
}

/** Changing the password changes the token, so earlier unlocks stop working. */
export function unlockToken(publicationId, passwordHash) {
  const secret = process.env.TOKEN_SECRET || "lychee-publish";
  return crypto.createHmac("sha256", secret).update(`${publicationId}:${String(passwordHash || "").slice(-24)}`).digest("hex");
}

export function unlockMatches(publicationId, passwordHash, cookieValue) {
  const want = Buffer.from(unlockToken(publicationId, passwordHash));
  const given = Buffer.from(String(cookieValue || ""));
  return want.length === given.length && crypto.timingSafeEqual(want, given);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The account behind a handle. Exact match first; handles are typed in any case. */
export async function userByHandle(handle) {
  const name = String(handle || "").trim();
  if (!name || name.length > 64) return null;
  await dbConnect();
  const fields = "_id user_name profile_pic";
  return (
    (await User.findOne({ user_name: name }).select(fields).lean()) ||
    (await User.findOne({ user_name: new RegExp(`^${escapeRegex(name)}$`, "i") }).select(fields).lean())
  );
}

/**
 * The published project at `/<handle>/<slug>`, or null. `select` adds private fields
 * (`+password_hash`, `+snapshot`, an image) for the routes that need them.
 */
export async function resolvePublication(handle, slug, { select = "" } = {}) {
  const user = await userByHandle(handle);
  if (!user?._id) return null;
  const query = WorkspacePublication.findOne({ user_id: String(user._id), slug: String(slug || "").toLowerCase(), published: true }).select(
    `${PUBLICATION_PUBLIC_FIELDS}${select ? ` ${select}` : ""}`,
  );
  const publication = await query.lean();
  if (!publication) return null;
  return { user, publication };
}

/** What the page shows: the saved snapshot, or the project as it is now. */
export async function publicationContent(publication) {
  if (publication.mode === "snapshot") {
    const row = publication.snapshot !== undefined
      ? publication
      : await WorkspacePublication.findById(publication._id).select("+snapshot").lean();
    if (row?.snapshot) return { ...row.snapshot, updatedAt: publication.snapshot_at || publication.published_at };
  }
  const doc = await WorkspaceDashboard.findOne({ _id: publication.project_id, user_id: publication.user_id }).lean();
  if (!doc) return null;
  return { ...publishedContent(doc, publication.tabs), updatedAt: doc.updatedAt };
}

/** A stored image data URL as `{ type, body }`, or null. */
export function imageFromDataUrl(dataUrl) {
  const match = PUBLISH_IMAGE_DATA_URL.exec(String(dataUrl || ""));
  return match ? { type: `image/${match[1]}`, body: Buffer.from(match[2], "base64") } : null;
}
