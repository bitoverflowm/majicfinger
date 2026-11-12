import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import WorkspacePublication from "@/models/WorkspacePublications";
import { emptyWorkspaceDashboard, sanitizeWorkspaceDashboard } from "@/lib/workspaceDashboardDocument";
import { liveTabIds, projectListItem } from "@/lib/server/workspaceProjects";
import {
  normalizePublishSlug,
  publishSlugProblem,
  publishedProjectPath,
  PUBLISH_VISIBILITY,
} from "@/lib/workspacePublish";
import { getSiteUrl } from "@/lib/site";

function newBlockId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listRecentProjects(userId, { limit = 8 } = {}) {
  await dbConnect();
  const docs = await WorkspaceDashboard.find({ user_id: String(userId) })
    .sort({ updatedAt: -1 })
    .limit(Math.min(30, Math.max(1, limit)))
    .select("name kind starred last_opened_at published_at tabs createdAt updatedAt")
    .lean();
  return docs.map((doc) => ({
    ...projectListItem(doc),
    tab_count: Array.isArray(doc.tabs) ? doc.tabs.length : 0,
  }));
}

export async function createResearchProject(userId, { name, question = "" } = {}) {
  await dbConnect();
  const title = String(name || question || "MCP research").trim().slice(0, 120) || "MCP research";
  const draft = sanitizeWorkspaceDashboard({
    ...emptyWorkspaceDashboard(),
    name: title,
    welcome_removed: true,
    active_tab_id: "research",
    tabs: [{ id: "research", name: "Research", blank: false }],
    blocks: {
      research: [
        {
          id: newBlockId("text"),
          type: "text",
          title: "Research brief",
          body: question
            ? `Question: ${String(question).slice(0, 1500)}`
            : "Research started via Lychee MCP.",
        },
      ],
    },
  });
  const _id = new mongoose.Types.ObjectId();
  const created = await WorkspaceDashboard.create({
    ...draft,
    _id,
    user_id: String(userId),
    kind: "dashboard",
    local_scope: String(_id),
    last_opened_at: new Date(),
    live_tabs: liveTabIds(draft.blocks),
  });
  return {
    project_id: String(created._id),
    name: created.name,
    dashboard_url: `${getSiteUrl()}/dashboard?project=${created._id}`,
  };
}

export async function openProject(userId, projectId) {
  await dbConnect();
  const doc = await WorkspaceDashboard.findOne({ _id: projectId, user_id: String(userId) }).lean();
  if (!doc) return null;
  await WorkspaceDashboard.updateOne(
    { _id: doc._id },
    { $set: { last_opened_at: new Date() } },
    { timestamps: false },
  );
  return {
    project_id: String(doc._id),
    name: doc.name,
    updated_at: doc.updatedAt,
    tabs: (doc.tabs || []).map((t) => ({ id: t.id, name: t.name })),
    dashboard_url: `${getSiteUrl()}/dashboard?project=${doc._id}`,
  };
}

/**
 * Add insight text + optional simple bar/line snapshot chart into the research tab.
 */
export async function addInsightBlocks(userId, projectId, { title, markdown, chart } = {}) {
  await dbConnect();
  const doc = await WorkspaceDashboard.findOne({ _id: projectId, user_id: String(userId) });
  if (!doc) throw new Error("Project not found");

  const tabId = doc.active_tab_id || (Array.isArray(doc.tabs) && doc.tabs[0]?.id) || "research";
  const blocks = doc.blocks && typeof doc.blocks === "object" ? { ...doc.blocks } : {};
  const list = Array.isArray(blocks[tabId]) ? [...blocks[tabId]] : [];

  if (markdown || title) {
    list.push({
      id: newBlockId("text"),
      type: "text",
      title: String(title || "Insight").slice(0, 120),
      body: String(markdown || "").slice(0, 8000),
    });
  }

  if (chart && Array.isArray(chart.points) && chart.points.length) {
    const points = chart.points.slice(0, 40).map((p) => ({
      label: String(p.label ?? p.name ?? "").slice(0, 80),
      value: Number(p.value),
    })).filter((p) => p.label && Number.isFinite(p.value));
    if (points.length) {
      list.push({
        id: newBlockId("chart"),
        type: "chart",
        title: String(chart.title || "Chart").slice(0, 120),
        chart: {
          kind: "sheet-series",
          seriesKind: chart.seriesKind === "line" ? "line" : "bar",
          points,
          valueTitle: String(chart.valueTitle || "Value").slice(0, 120),
          labelTitle: String(chart.labelTitle || "Label").slice(0, 120),
        },
      });
    }
  }

  blocks[tabId] = list;
  doc.blocks = blocks;
  doc.markModified("blocks");
  doc.last_opened_at = new Date();
  await doc.save();

  return {
    project_id: String(doc._id),
    tab_id: tabId,
    block_count: list.length,
    dashboard_url: `${getSiteUrl()}/dashboard?project=${doc._id}`,
  };
}

export async function publishProject(userId, projectId, { slug, title, description = "", visibility = "unlisted" } = {}) {
  await dbConnect();
  const user = await User.findById(userId).lean();
  const handle = String(user?.user_name || "").trim();
  if (!handle) {
    const err = new Error("Pick a Lychee handle before publishing (Settings → profile).");
    err.code = "HANDLE_REQUIRED";
    throw err;
  }

  const project = await WorkspaceDashboard.findOne({ _id: projectId, user_id: String(userId) })
    .select("name tabs blocks tables active_tab_id")
    .lean();
  if (!project) throw new Error("Project not found");

  const normalized = normalizePublishSlug(slug || project.name || "research");
  const problem = publishSlugProblem(normalized);
  if (problem) throw new Error(problem);

  const clash = await WorkspacePublication.findOne({
    user_id: String(userId),
    slug: normalized,
    project_id: { $ne: projectId },
  })
    .select("_id")
    .lean();
  if (clash) throw new Error("Another of your projects uses that address.");

  const tabs = (Array.isArray(project.tabs) ? project.tabs : []).map((t) => String(t.id)).filter(Boolean);
  if (!tabs.length) throw new Error("Project has no tabs to publish.");

  const vis = PUBLISH_VISIBILITY.includes(visibility) ? visibility : "unlisted";
  const now = new Date();
  const set = {
    user_id: String(userId),
    slug: normalized,
    published: true,
    published_at: now,
    mode: "live",
    visibility: vis,
    tabs,
    title: String(title || project.name || "Untitled").slice(0, 120),
    description: String(description || "").slice(0, 2000),
    seo_title: "",
    seo_description: "",
    keywords: [],
    labels: ["mcp"],
    category: "Trader research",
    password_on: false,
    password_hash: "",
    snapshot: null,
    snapshot_at: null,
  };

  await WorkspacePublication.updateOne(
    { project_id: projectId },
    { $set: set, $setOnInsert: { project_id: projectId, first_published_at: now } },
    { upsert: true },
  );
  await WorkspaceDashboard.updateOne({ _id: projectId }, { $set: { published_at: now } }, { timestamps: false });

  const path = publishedProjectPath(handle, normalized);
  return {
    project_id: String(projectId),
    slug: normalized,
    visibility: vis,
    path,
    url: `${getSiteUrl()}${path}`,
  };
}
