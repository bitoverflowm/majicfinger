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
  /** { version: 1, rows: [...] } — see dashboardComposer defaults */
  layout: {
    type: Schema.Types.Mixed,
    default: () => ({ version: 1, rows: [] }),
  },
  theme: {
    type: Schema.Types.Mixed,
    default: () => ({ background: "dotPattern", background_color: "" }),
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

ChartDashboardSchema.index({ user_id: 1, public_slug: 1 }, { unique: true, sparse: true });
ChartDashboardSchema.index({ user_id: 1, last_edited_date: -1 });

export default mongoose.models.ChartDashboard ||
  mongoose.model("ChartDashboard", ChartDashboardSchema);
