import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * One project: a dashboard composed on the canvas, or a terminal we built. Either way it holds
 * tabs, canvas blocks, and the tables those blocks point at.
 * Separate from the older ChartDashboard, which still hangs off a DataSet.
 */
const WorkspaceDashboardSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    name: { type: String, default: "Untitled", maxlength: 120 },
    kind: { type: String, enum: ["dashboard", "terminal"], default: "dashboard" },
    starred: { type: Boolean, default: false },
    /** Projects from before projects existed keep the browser storage keys they were saved under (""). */
    local_scope: { type: String, default: "" },
    last_opened_at: { type: Date, default: null },
    /** Tab ids with a sheet on a market that is still trading, refreshed on every save of that tab. */
    live_tabs: { type: [String], default: () => [] },
    published_at: { type: Date, default: null },
    thumbnail: { type: String, default: "", select: false },
    thumbnail_at: { type: Date, default: null },
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
WorkspaceDashboardSchema.index({ user_id: 1, last_opened_at: -1 });

export default mongoose.models.WorkspaceDashboard ||
  mongoose.model("WorkspaceDashboard", WorkspaceDashboardSchema);
