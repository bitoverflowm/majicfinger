import mongoose from "mongoose";

const { Schema } = mongoose;

const DashboardTagSchema = new Schema(
  {
    /** Normalized tag (lowercased, trimmed). */
    tag: { type: String, required: true, unique: true, index: true },
    /** Example display casing (first-seen). Optional. */
    display: { type: String, default: "" },
    /** Number of times this tag has been saved on a dashboard. */
    count: { type: Number, default: 0 },
    /** Last time we observed this tag in a dashboard save. */
    last_used_at: { type: Date },
  },
  { timestamps: true },
);

DashboardTagSchema.index({ count: -1, last_used_at: -1 });

export default mongoose.models.DashboardTag || mongoose.model("DashboardTag", DashboardTagSchema);

