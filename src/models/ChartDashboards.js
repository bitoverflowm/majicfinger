import mongoose from "mongoose";

const { Schema } = mongoose;

const ChartDashboardSchema = new mongoose.Schema({
  dashboard_name: {
    type: String,
    maxLength: [120, "Dashboard name cannot be more than 120 characters"],
  },
  page_heading: {
    type: String,
    maxLength: [200, "Page heading cannot be more than 200 characters"],
    default: "",
  },
  page_subheading: {
    type: String,
    maxLength: [2000, "Page subheading cannot be more than 2000 characters"],
    default: "",
  },
  /** { version: 1, rows: [...] } — see dashboardComposer defaults */
  layout: {
    type: Schema.Types.Mixed,
    default: () => ({ version: 1, rows: [] }),
  },
  theme: {
    type: Schema.Types.Mixed,
    default: () => ({ background: "none", background_color: "" }),
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
  last_edited_date: {
    type: Date,
    default: Date.now,
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  data_set_id: {
    type: Schema.Types.ObjectId,
    ref: "DataSet",
    required: true,
  },
  public_slug: {
    type: String,
    maxLength: [120, "public_slug cannot be more than 120 characters"],
  },
  is_public: {
    type: Boolean,
    default: false,
  },
});

// Only enforce uniqueness when a real embed slug exists. A *sparse* unique index still
// treats `public_slug: null` as indexed, so a user could only have one unpublished dashboard.
// After changing this, drop the old index once if MongoDB reports a conflict, e.g. in mongosh:
//   db.chartdashboards.dropIndex("user_id_1_public_slug_1")
ChartDashboardSchema.index(
  { user_id: 1, public_slug: 1 },
  {
    unique: true,
    partialFilterExpression: { public_slug: { $type: "string", $gt: "" } },
  },
);
ChartDashboardSchema.index({ user_id: 1, last_edited_date: -1 });

export default mongoose.models.ChartDashboard ||
  mongoose.model("ChartDashboard", ChartDashboardSchema);
