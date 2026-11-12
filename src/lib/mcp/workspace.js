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
import { layoutRunSheets, recordsFromRows } from "@/components/dashboardComposer/integrationRunSheets";
import { chartSpecsForSheet } from "@/lib/visualizations/sheetCharts";
import { snapshotForSheet } from "@/lib/mcp/chartSnapshots";

/** Must match WORKSPACE_PROJECT_PARAM in workspaceProjectContext (`workspace`, not `project`). */
function dashboardPathForProject(id) {
  return id ? `/dashboard?workspace=${encodeURIComponent(String(id))}` : "/dashboard";
}

function newBlockId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function absoluteDashboardUrl(projectId) {
  return `${getSiteUrl()}${dashboardPathForProject(projectId)}`;
}

function columnsFromRows(rows, preferred = []) {
  const keys = new Set(preferred);
  for (const row of rows || []) {
    if (!row || typeof row !== "object") continue;
    for (const key of Object.keys(row)) keys.add(key);
  }
  const order = preferred.length
    ? [...preferred.filter((k) => keys.has(k)), ...[...keys].filter((k) => !preferred.includes(k))]
    : [...keys];
  return order.slice(0, 24).map((id) => {
    const sample = (rows || []).find((r) => r && r[id] != null)?.[id];
    const type = typeof sample === "number" ? "number" : typeof sample === "boolean" ? "boolean" : "string";
    return { id, title: id.replace(/_/g, " "), type };
  });
}

function chartBlocksForSheet(sheetBlock, originY) {
  const specs = chartSpecsForSheet(sheetBlock);
  if (specs.length) {
    return specs.map((spec, index) => ({
      id: `chart-${sheetBlock.id}-${spec.chartView || "view"}`,
      type: "chart",
      source: "sheet-chart",
      sourceSheetId: sheetBlock.id,
      chartView: spec.chartView,
      title: spec.title,
      x: sheetBlock.x || 28,
      y: (originY || (sheetBlock.y || 88) + (sheetBlock.h || 360) + 16) + index * ((spec.h || 360) + 16),
      w: spec.w || 540,
      h: spec.h || 360,
      body: "",
    }));
  }
  // Fallback: force Lychee bars when preset registry would leave table-only sheets chartless.
  return [
    {
      id: `chart-${sheetBlock.id}-bars`,
      type: "chart",
      source: "sheet-chart",
      sourceSheetId: sheetBlock.id,
      chartView: "bars",
      title: `${sheetBlock.title || "Sheet"} chart`,
      x: sheetBlock.x || 28,
      y: (sheetBlock.y || 88) + (sheetBlock.h || 360) + 16,
      w: 540,
      h: 360,
      body: "",
      pull: { chartView: "bars" },
    },
  ];
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
    dashboard_url: absoluteDashboardUrl(doc._id),
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
          x: 28,
          y: 24,
          w: 540,
          h: 160,
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
    dashboard_url: absoluteDashboardUrl(created._id),
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
    dashboard_url: absoluteDashboardUrl(doc._id),
  };
}

/**
 * Add a real Lychee sheet (+ chart blocks) from row objects.
 */
export async function addSheetWithChart(
  userId,
  projectId,
  {
    title,
    rows,
    preferredColumns = [],
    sheetId,
    chartView = "",
    integrationId = "polymarket",
    table = "mcp",
  } = {},
) {
  await dbConnect();
  const doc = await WorkspaceDashboard.findOne({ _id: projectId, user_id: String(userId) });
  if (!doc) throw new Error("Project not found");

  const tabId = doc.active_tab_id || (Array.isArray(doc.tabs) && doc.tabs[0]?.id) || "research";
  const blocks = doc.blocks && typeof doc.blocks === "object" ? { ...doc.blocks } : {};
  const existing = Array.isArray(blocks[tabId]) ? [...blocks[tabId]] : [];
  const originY = existing.reduce((max, b) => Math.max(max, (b.y || 0) + (b.h || 0)), 40) + 24;

  // Analysis/charting: land large live pulls. Athena lake dumps stay on prepare_full_pull.
  const listRows = Array.isArray(rows) ? rows.slice(0, 5000) : [];
  if (!listRows.length) throw new Error("rows required to build a Lychee sheet");

  const columns = columnsFromRows(listRows, preferredColumns);
  const sheetSpec = {
    id: String(sheetId || newBlockId("sheet")).slice(0, 180),
    title: String(title || "Sheet").slice(0, 120),
    columns,
    rows: listRows,
    keepAllRows: listRows.length <= 2000,
    rowCount: listRows.length,
    integrationId,
    table,
    pull: chartView ? { chartView } : undefined,
    provenance: { via: "lychee-mcp", at: new Date().toISOString() },
  };

  const [sheetBlock] = layoutRunSheets([sheetSpec], { originY });
  // Ensure records exist for chart rendering.
  if (!sheetBlock.records?.length) {
    sheetBlock.records = recordsFromRows(columns, listRows);
  }
  if (chartView) {
    sheetBlock.pull = { ...(sheetBlock.pull || {}), chartView };
  }

  const charts = chartBlocksForSheet(sheetBlock, (sheetBlock.y || originY) + (sheetBlock.h || 360) + 16);
  blocks[tabId] = [...existing, sheetBlock, ...charts];
  doc.blocks = blocks;
  doc.markModified("blocks");
  doc.last_opened_at = new Date();
  await doc.save();

  const chart_snapshot = snapshotForSheet({
    title: String(title || "Sheet").slice(0, 120),
    rows: listRows,
    chartView: chartView || charts[0]?.chartView || "bars",
  });

  return {
    project_id: String(doc._id),
    tab_id: tabId,
    sheet_id: sheetBlock.id,
    chart_ids: charts.map((c) => c.id),
    chart_views: charts.map((c) => c.chartView).filter(Boolean),
    chart_snapshot,
    chart_images: chart_snapshot ? [chart_snapshot] : [],
    row_count: listRows.length,
    dashboard_url: absoluteDashboardUrl(doc._id),
    show_in_chat:
      "Tool result includes an inline chart image — mention Chart title and keep the image visible in your reply (not only a link).",
  };
}

export async function addInsightBlocks(userId, projectId, { title, markdown, chart } = {}) {
  await dbConnect();
  const doc = await WorkspaceDashboard.findOne({ _id: projectId, user_id: String(userId) });
  if (!doc) throw new Error("Project not found");

  const tabId = doc.active_tab_id || (Array.isArray(doc.tabs) && doc.tabs[0]?.id) || "research";
  const blocks = doc.blocks && typeof doc.blocks === "object" ? { ...doc.blocks } : {};
  const list = Array.isArray(blocks[tabId]) ? [...blocks[tabId]] : [];
  const originY = list.reduce((max, b) => Math.max(max, (b.y || 0) + (b.h || 0)), 40) + 24;

  if (markdown || title) {
    list.push({
      id: newBlockId("text"),
      type: "text",
      title: String(title || "Insight").slice(0, 120),
      x: 28,
      y: originY,
      w: 540,
      h: 220,
      body: String(markdown || "").slice(0, 8000),
    });
  }

  // If agent still sends inline chart points, materialize as a sheet+chart instead of a dead chart shell.
  if (chart && Array.isArray(chart.points) && chart.points.length) {
    const rows = chart.points.slice(0, 40).map((p) => ({
      label: String(p.label ?? p.name ?? "").slice(0, 80),
      value: Number(p.value),
    })).filter((p) => p.label && Number.isFinite(p.value));
    if (rows.length) {
      const built = await addSheetWithChart(userId, projectId, {
        title: String(chart.title || title || "Chart data").slice(0, 120),
        rows,
        preferredColumns: ["label", "value"],
        chartView: chart.seriesKind === "line" ? "line" : "bars",
        table: "mcp_insight_chart",
      });
      return {
        project_id: String(doc._id),
        tab_id: tabId,
        via: "sheet_with_chart",
        ...built,
      };
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
    dashboard_url: absoluteDashboardUrl(doc._id),
  };
}

/**
 * One-shot: create or reuse project, add holders + trades sheets/charts, insight text.
 */
export async function pullMarketBundleIntoProject(
  userId,
  {
    projectId = "",
    projectName = "",
    question = "",
    market,
    holdersRows = [],
    tradesRows = [],
    analysisMarkdown = "",
  } = {},
) {
  let project =
    projectId
      ? await openProject(userId, projectId)
      : await createResearchProject(userId, {
          name: projectName || market?.title || "Market research",
          question: question || market?.title || "",
        });
  if (!project?.project_id) throw new Error("Could not create or open project");

  const results = { project_id: project.project_id, dashboard_url: project.dashboard_url, sheets: [] };

  const marketTitle = market?.title || "Market";

  if (holdersRows?.length) {
    const byOutcome = new Map();
    for (const row of holdersRows) {
      const key = row.outcome || (row.outcome_index === 1 ? "NO" : row.outcome_index === 0 ? "YES" : "HOLDERS");
      if (!byOutcome.has(key)) byOutcome.set(key, []);
      byOutcome.get(key).push({
        ...row,
        market_title: marketTitle,
        outcome: row.outcome || key,
        name: row.name || row.pseudonym || row.proxy_wallet || "wallet",
      });
    }
    for (const [outcome, rows] of byOutcome) {
      const sheet = await addSheetWithChart(userId, project.project_id, {
        title: `${marketTitle} · ${outcome} holders`,
        rows,
        preferredColumns: [
          "market_title",
          "outcome",
          "name",
          "pseudonym",
          "amount",
          "proxy_wallet",
          "outcome_index",
          "verified",
        ],
        sheetId: `holders-${outcome}-${String(market?.condition_id || "").slice(0, 14)}`,
        chartView: "treemap",
        table: "getHoldersByMarkets",
      });
      results.sheets.push(sheet);
    }
  }

  if (tradesRows?.length) {
    const sheet = await addSheetWithChart(userId, project.project_id, {
      title: `${marketTitle} · trades`,
      rows: tradesRows.map((row) => ({ ...row, market_title: marketTitle })),
      preferredColumns: ["timestamp", "side", "price", "size", "outcome", "proxy_wallet", "market_title"],
      sheetId: `trades-${String(market?.condition_id || "").slice(0, 18)}`,
      chartView: "trade-price",
      table: "getTradesByMarket",
    });
    results.sheets.push(sheet);
  }

  if (analysisMarkdown) {
    await addInsightBlocks(userId, project.project_id, {
      title: "Analysis",
      markdown: analysisMarkdown,
    });
  }

  results.dashboard_url = absoluteDashboardUrl(project.project_id);
  results.chart_images = results.sheets.flatMap((s) => s.chart_images || []).filter(Boolean);
  results.show_in_chat =
    "Each sheet includes chart_snapshot / inline images — show Chart 1, Chart 2… in the reply as they land.";
  return results;
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
  const url = `${getSiteUrl()}${path}`;
  const og_image_url = `${getSiteUrl()}/${encodeURIComponent(handle)}/${encodeURIComponent(normalized)}/image?kind=og`;
  return {
    project_id: String(projectId),
    slug: normalized,
    visibility: vis,
    path,
    url,
    og_image_url,
    dashboard_url: absoluteDashboardUrl(projectId),
  };
}
