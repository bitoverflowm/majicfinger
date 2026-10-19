import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { getLoginSession } from "@/lib/auth";
import { requirePaidMember } from "@/lib/requirePaidMember";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import { sanitizeWorkspaceDashboard } from "@/lib/workspaceDashboardDocument";

async function sessionUserId(req) {
  try {
    const session = await getLoginSession(req);
    return session?.userId ? String(session.userId) : "";
  } catch {
    return "";
  }
}

/** Tab ids go into a Mongo field path, so dots and dollars must never reach it. */
const TAB_ID = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_TABLES = 80;

export const config = {
  api: { bodyParser: { sizeLimit: "16mb" } },
};

/**
 * Applies only what changed: settings, the tabs whose blocks changed, deleted tabs, and changed tables.
 * A deleted tab takes its blocks and the tables behind its sheets with it.
 */
async function patchDashboard(req, res, id, userId) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const blocksIn = body.blocks && typeof body.blocks === "object" ? body.blocks : {};
  const setTabs = Object.keys(blocksIn).filter((tabId) => TAB_ID.test(tabId) && Array.isArray(blocksIn[tabId]));
  const removeTabs = (Array.isArray(body.remove_tabs) ? body.remove_tabs : [])
    .map((tabId) => String(tabId || "").trim())
    .filter((tabId) => TAB_ID.test(tabId) && !setTabs.includes(tabId));
  const tablesIn = body.tables && typeof body.tables === "object" ? body.tables : {};
  const upserts = Array.isArray(tablesIn.upsert) ? tablesIn.upsert : [];
  const removedTables = new Set((Array.isArray(tablesIn.remove) ? tablesIn.remove : []).map((tableId) => String(tableId || "")));
  const meta = body.meta && typeof body.meta === "object" ? body.meta : null;

  const clean = sanitizeWorkspaceDashboard({
    ...(meta || {}),
    blocks: Object.fromEntries(setTabs.map((tabId) => [tabId, blocksIn[tabId]])),
    tables: upserts,
  });

  const projection = { _id: 1 };
  if (upserts.length || removedTables.size || removeTabs.length) projection.tables = 1;
  for (const tabId of removeTabs) projection[`blocks.${tabId}.id`] = 1;
  const current = await WorkspaceDashboard.findOne({ _id: id, user_id: userId }).select(projection).lean();
  if (!current) return res.status(404).json({ success: false, message: "Dashboard not found" });

  const $set = {};
  const $unset = {};
  if (meta) {
    $set.name = clean.name;
    $set.tabs = clean.tabs;
    $set.active_tab_id = clean.active_tab_id;
    $set.welcome_removed = clean.welcome_removed;
  }
  for (const tabId of setTabs) $set[`blocks.${tabId}`] = clean.blocks[tabId] || [];
  for (const tabId of removeTabs) {
    $unset[`blocks.${tabId}`] = "";
    for (const block of current.blocks?.[tabId] || []) {
      if (block?.id) removedTables.add(String(block.id));
    }
  }
  if (removeTabs.length && removedTables.size) {
    const [kept] = await WorkspaceDashboard.aggregate([
      { $match: { _id: current._id } },
      {
        $project: {
          ids: {
            $reduce: {
              input: { $objectToArray: { $ifNull: ["$blocks", {}] } },
              initialValue: [],
              in: {
                $concatArrays: [
                  "$$value",
                  {
                    $cond: [
                      { $or: [{ $in: ["$$this.k", removeTabs] }, { $not: [{ $isArray: "$$this.v" }] }] },
                      [],
                      { $map: { input: "$$this.v", as: "block", in: "$$block.id" } },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    ]);
    for (const blockId of kept?.ids || []) removedTables.delete(String(blockId));
    for (const tabId of setTabs) {
      for (const block of clean.blocks[tabId] || []) removedTables.delete(String(block.id));
    }
  }
  const droppedTables = [];
  if (projection.tables) {
    const byId = new Map((Array.isArray(current.tables) ? current.tables : []).map((table) => [String(table?.id || ""), table]));
    for (const tableId of removedTables) {
      if (byId.delete(tableId)) droppedTables.push(tableId);
    }
    for (const table of clean.tables) byId.set(table.id, table);
    $set.tables = [...byId.values()].slice(0, MAX_TABLES);
  }

  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  if (!Object.keys(update).length) return res.status(200).json({ success: true, data: { _id: current._id } });
  await WorkspaceDashboard.updateOne({ _id: id, user_id: userId }, update);
  return res.status(200).json({
    success: true,
    data: { _id: current._id, saved_tabs: setTabs, removed_tabs: removeTabs, removed_tables: droppedTables },
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PUT, PATCH");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const userId = await sessionUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (req.method !== "GET" && !(await requirePaidMember(req, res, { allowFreeRun: true }))) return;

  const id = String(req.query.id || "");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid dashboard id" });
  }

  try {
    await dbConnect();
  } catch {
    return res.status(503).json({ success: false, message: "Dashboard storage is unavailable." });
  }

  if (req.method === "PATCH") {
    try {
      return await patchDashboard(req, res, id, userId);
    } catch (error) {
      return res.status(500).json({ success: false, message: error?.message || "Could not save the dashboard." });
    }
  }

  const doc = await WorkspaceDashboard.findOne({ _id: id, user_id: userId });
  if (!doc) return res.status(404).json({ success: false, message: "Dashboard not found" });

  if (req.method === "GET") return res.status(200).json({ success: true, data: doc.toObject() });

  const loadedTabs = Array.isArray(req.body?.loaded_tabs)
    ? req.body.loaded_tabs.map((tabId) => String(tabId || "").trim()).filter(Boolean)
    : null;
  const next = sanitizeWorkspaceDashboard(req.body || {});
  if (loadedTabs) {
    const existing = doc.toObject().blocks || {};
    const merged = { ...existing };
    const incoming = next.blocks || {};
    for (const tabId of loadedTabs) {
      if (incoming[tabId]) merged[tabId] = incoming[tabId];
      else delete merged[tabId];
    }
    next.blocks = merged;
  }
  doc.set(next);
  await doc.save();
  return res.status(200).json({ success: true, data: doc.toObject() });
}
