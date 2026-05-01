import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import DataSet from "@/models/DataSets";
import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import { createEmptyDashboardLayout } from "@/lib/dashboardLayoutDefaults";

export default async function handler(req, res) {
  const {
    query: { uid },
    method,
    body,
  } = req;

  await dbConnect();

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
        if (!uid || !mongoose.Types.ObjectId.isValid(String(uid))) {
          return res.status(400).json({ success: false, message: "Invalid uid" });
        }
        if (String(uid) !== String(session.userId)) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
        const list = await ChartDashboard.find({ user_id: uid })
          .select(
            "dashboard_name page_heading data_set_id created_date last_edited_date public_slug is_public",
          )
          .sort({ last_edited_date: -1 })
          .lean();
        return res.status(200).json({ success: true, data: list || [] });
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }
    case "POST": {
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
        const {
          dashboard_name,
          page_heading,
          layout,
          theme,
          user_id,
          data_set_id,
        } = body || {};
        if (!mongoose.Types.ObjectId.isValid(String(user_id))) {
          return res.status(400).json({ success: false, message: "Invalid user_id" });
        }
        if (String(user_id) !== String(session.userId)) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
        if (!mongoose.Types.ObjectId.isValid(String(data_set_id))) {
          return res.status(400).json({ success: false, message: "Invalid data_set_id" });
        }
        const ds = await DataSet.findById(data_set_id).lean();
        if (!ds || String(ds.user_id) !== String(session.userId)) {
          return res.status(400).json({ success: false, message: "Dataset not found or not yours" });
        }
        const doc = await ChartDashboard.create({
          dashboard_name: dashboard_name || "Untitled dashboard",
          page_heading: page_heading || "",
          layout: layout && typeof layout === "object" ? layout : createEmptyDashboardLayout(),
          theme:
            theme && typeof theme === "object"
              ? theme
              : { background: "none", background_color: "" },
          user_id: new mongoose.Types.ObjectId(user_id),
          data_set_id: new mongoose.Types.ObjectId(data_set_id),
          last_edited_date: new Date(),
        });
        return res.status(201).json({ success: true, data: doc });
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
