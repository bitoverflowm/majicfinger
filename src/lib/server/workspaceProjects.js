import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import { tabHasLiveMarket } from "@/components/dashboardComposer/realtimeMode";

export const PROJECT_KINDS = ["dashboard", "terminal"];

export async function sessionUserId(req) {
  try {
    const session = await getLoginSession(req);
    return session?.userId ? String(session.userId) : "";
  } catch {
    return "";
  }
}

export function validProjectId(value) {
  const id = String(value || "").trim();
  return mongoose.Types.ObjectId.isValid(id) ? id : "";
}

/** The project a request means: the one named, or else the one opened last. */
export function projectLookup(userId, projectId) {
  const id = validProjectId(projectId);
  if (id) return { filter: { _id: id, user_id: userId }, sort: null };
  return { filter: { user_id: userId }, sort: { last_opened_at: -1, updatedAt: -1 } };
}

export function findProject(Model, userId, projectId) {
  const { filter, sort } = projectLookup(userId, projectId);
  const query = Model.findOne(filter);
  return sort ? query.sort(sort) : query;
}

/** Opening a project is not an edit, so it leaves `updatedAt` alone. */
export function markProjectOpened(Model, id) {
  return Model.updateOne({ _id: id }, { $set: { last_opened_at: new Date() } }, { timestamps: false }).catch(() => null);
}

/**
 * Before projects, the editor always opened the user's newest document, so the browser copies under
 * the unscoped keys belong to that one. Any older document gets storage of its own.
 */
export async function separateLegacyScopes(Model, userId) {
  const legacy = await Model.find({ user_id: userId, $or: [{ local_scope: { $exists: false } }, { local_scope: "" }, { local_scope: null }] })
    .sort({ updatedAt: -1 })
    .select({ _id: 1 })
    .lean();
  if (legacy.length < 2) return;
  await Promise.all(
    legacy.slice(1).map((doc) =>
      Model.updateOne({ _id: doc._id }, { $set: { local_scope: String(doc._id) } }, { timestamps: false }),
    ),
  );
}

/** Projects saved before `live_tabs` existed get it computed once from their blocks. */
export async function backfillLiveTabs(Model, userId) {
  const stale = await Model.find({ user_id: userId, live_tabs: { $exists: false } }).select({ blocks: 1 }).lean();
  await Promise.all(
    stale.map((doc) =>
      Model.updateOne({ _id: doc._id }, { $set: { live_tabs: liveTabIds(doc.blocks) } }, { timestamps: false }),
    ),
  );
}

/** Tab ids among `blocksByTab` whose sheets include a market that is still trading. */
export function liveTabIds(blocksByTab) {
  return Object.entries(blocksByTab || {})
    .filter(([, list]) => Array.isArray(list) && tabHasLiveMarket(list))
    .map(([tabId]) => tabId);
}

export const PROJECT_LIST_FIELDS =
  "name kind starred local_scope last_opened_at live_tabs published_at thumbnail_at tabs createdAt updatedAt";

function projectKind(doc) {
  if (PROJECT_KINDS.includes(doc?.kind)) return doc.kind;
  return "dashboard";
}

/** What the projects view needs for one card. */
export function projectListItem(doc) {
  const tabs = Array.isArray(doc?.tabs) ? doc.tabs : [];
  const liveTabs = new Set(Array.isArray(doc?.live_tabs) ? doc.live_tabs : []);
  return {
    id: String(doc._id),
    name: String(doc.name || "").trim() || "Untitled",
    kind: projectKind(doc),
    starred: !!doc.starred,
    localScope: String(doc.local_scope || ""),
    tabCount: tabs.length,
    terminalTabs: tabs.filter((tab) => tab?.terminal).length,
    live: tabs.some((tab) => liveTabs.has(tab?.id)),
    published: !!doc.published_at,
    publishedAt: doc.published_at || null,
    thumbnailAt: doc.thumbnail_at || null,
    openedAt: doc.last_opened_at || null,
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}
