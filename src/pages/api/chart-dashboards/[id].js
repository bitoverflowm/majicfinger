import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import { isValidChartEmbedSlug, normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";
import { validateDashboardPublishSeo } from "@/lib/dashboardPublishSeo";
import { buildDashboardCardGridSnapshots } from "@/lib/server/dashboardCardGridSnapshots";
import { buildPublishedChartBundlesForDashboard } from "@/lib/server/publicDashboardHydration";

async function rebuildPublishedDashboardCaches($set, dash, layoutForValidation) {
  try {
    const dataSetId = $set.data_set_id !== undefined ? $set.data_set_id : dash.data_set_id;
    const dataSetRaw = dataSetId ? await DataSet.findById(dataSetId).lean() : null;
    if (dataSetRaw) {
      $set.card_grid_snapshots = await buildDashboardCardGridSnapshots(
        { layout: layoutForValidation, user_id: dash.user_id },
        dataSetRaw,
      );
    }
    $set.published_chart_bundles = await buildPublishedChartBundlesForDashboard(
      { layout: layoutForValidation },
      dash.user_id,
    );
    $set.published_payload_built_at = new Date();
  } catch {
    /* keep existing snapshots if rebuild fails */
  }
}

function collectChartIdsFromLayoutWithValidation(layout) {
  const ids = new Set();
  if (!layout || typeof layout !== "object") return ids;
  const rows = Array.isArray(layout.rows) ? layout.rows : [];
  for (const row of rows) {
    if (!row || row.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      if (col?.chart_id && mongoose.Types.ObjectId.isValid(String(col.chart_id))) {
        ids.add(String(col.chart_id));
      }
    }
  }
  return ids;
}

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  await dbConnect();

  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  switch (method) {
    case "GET": {
      try {
        let session;
        try {
          session = await getLoginSession(req);
        } catch {
          session = null;
        }
        if (!session?.userId) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const dash = await ChartDashboard.findById(id).lean();
        if (!dash) {
          return res.status(404).json({ success: false, message: "Dashboard not found" });
        }
        if (String(dash.user_id) !== String(session.userId)) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
        return res.status(200).json({ success: true, data: dash });
      } catch (e) {
        return res.status(400).json({ success: false });
      }
    }
    case "PUT": {
      try {
        let session;
        try {
          session = await getLoginSession(req);
        } catch {
          session = null;
        }
        if (!session?.userId) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const dash = await ChartDashboard.findById(id);
        if (!dash) {
          return res.status(404).json({ success: false, message: "Dashboard not found" });
        }
        if (String(dash.user_id) !== String(session.userId)) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const wantsEmbed =
          Object.prototype.hasOwnProperty.call(req.body, "public_slug") ||
          Object.prototype.hasOwnProperty.call(req.body, "is_public");

        const $set = { last_edited_date: new Date() };
        if (typeof req.body.dashboard_name === "string") $set.dashboard_name = req.body.dashboard_name;
        if (typeof req.body.seo_title === "string") $set.seo_title = req.body.seo_title;
        if (Array.isArray(req.body.tags)) {
          $set.tags = req.body.tags
            .filter((t) => typeof t === "string" && t.trim())
            .map((t) => t.trim())
            .slice(0, 30);
        }
        if (Array.isArray(req.body.keywords)) {
          $set.keywords = req.body.keywords
            .filter((t) => typeof t === "string" && t.trim())
            .map((t) => t.trim())
            .slice(0, 30);
        }
        if (typeof req.body.page_heading === "string") $set.page_heading = req.body.page_heading;
        if (typeof req.body.page_subheading === "string") $set.page_subheading = req.body.page_subheading;
        if (req.body.layout && typeof req.body.layout === "object") $set.layout = req.body.layout;
        if (req.body.theme && typeof req.body.theme === "object") $set.theme = req.body.theme;

        if (req.body.data_set_id && mongoose.Types.ObjectId.isValid(String(req.body.data_set_id))) {
          const ds = await DataSet.findById(req.body.data_set_id).lean();
          if (!ds || String(ds.user_id) !== String(session.userId)) {
            return res.status(400).json({ success: false, message: "Invalid data_set_id" });
          }
          $set.data_set_id = req.body.data_set_id;
        }

        const layoutForValidation = $set.layout !== undefined ? $set.layout : dash.layout;
        const chartIds = collectChartIdsFromLayoutWithValidation(layoutForValidation);
        for (const cid of chartIds) {
          const ch = await Chart.findById(cid).lean();
          if (!ch || String(ch.user_id) !== String(session.userId)) {
            return res.status(400).json({
              success: false,
              message: `Chart ${cid} not found or not owned by you`,
            });
          }
        }

        if (wantsEmbed) {
          const pub = !!req.body.is_public;
          $set.is_public = pub;
          if (pub) {
            const seoError = validateDashboardPublishSeo({
              layout: layoutForValidation,
              page_heading:
                $set.page_heading !== undefined ? $set.page_heading : dash.page_heading,
              page_subheading:
                $set.page_subheading !== undefined ? $set.page_subheading : dash.page_subheading,
            });
            if (seoError) {
              return res.status(400).json({ success: false, message: seoError });
            }
            if (!dash.is_public && !dash.published_at) {
              $set.published_at = new Date();
            }
            const raw = normalizeChartEmbedSlug(
              req.body.public_slug || req.body.dashboard_name || "",
            );
            if (!isValidChartEmbedSlug(raw)) {
              return res.status(400).json({
                success: false,
                message: "Invalid public slug (use lowercase letters, numbers, hyphens).",
              });
            }
            const dup = await ChartDashboard.findOne({
              user_id: dash.user_id,
              public_slug: raw,
              _id: { $ne: dash._id },
            }).lean();
            if (dup) {
              return res.status(409).json({
                success: false,
                message: "That slug is already used for one of your dashboards.",
              });
            }
            $set.public_slug = raw;
            await rebuildPublishedDashboardCaches($set, dash, layoutForValidation);
          } else {
            const updated = await ChartDashboard.findByIdAndUpdate(
              id,
              { $set, $unset: { public_slug: "" } },
              { new: true, runValidators: true },
            );
            return res.status(200).json({ success: true, data: updated });
          }
        }

        const layoutChangedOnPublic =
          dash.is_public &&
          !wantsEmbed &&
          ($set.layout !== undefined || $set.data_set_id !== undefined);
        if (layoutChangedOnPublic) {
          await rebuildPublishedDashboardCaches($set, dash, layoutForValidation);
        }

        const updated = await ChartDashboard.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true });
        return res.status(200).json({ success: true, data: updated });
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }
    case "DELETE": {
      try {
        let session;
        try {
          session = await getLoginSession(req);
        } catch {
          session = null;
        }
        if (!session?.userId) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const dash = await ChartDashboard.findById(id);
        if (!dash) {
          return res.status(404).json({ success: false, message: "Dashboard not found" });
        }
        if (String(dash.user_id) !== String(session.userId)) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
        await ChartDashboard.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "Deleted" });
      } catch (e) {
        return res.status(400).json({ success: false });
      }
    }
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
