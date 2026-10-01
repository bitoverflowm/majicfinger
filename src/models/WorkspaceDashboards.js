import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * One dashboard project: tabs, canvas blocks, and the tables those blocks point at.
 * Separate from the older ChartDashboard, which still hangs off a DataSet.
 */
const WorkspaceDashboardSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    name: { type: String, default: "Untitled", maxlength: 120 },
    active_tab_id: { type: String, default: "welcome" },
    welcome_removed: { type: Boolean, default: false },
    tabs: { type: Schema.Types.Mixed, default: () => [{ id: "welcome", name: "Welcome", blank: false }] },
    blocks: { type: Schema.Types.Mixed, default: () => ({}) },
    tables: { type: Schema.Types.Mixed, default: () => [] },
    charts: { type: Schema.Types.Mixed, default: () => [] },
  },
  { timestamps: true },
);

WorkspaceDashboardSchema.index({ user_id: 1, updatedAt: -1 });

export default mongoose.models.WorkspaceDashboard ||
  mongoose.model("WorkspaceDashboard", WorkspaceDashboardSchema);
