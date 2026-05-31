import mongoose from "mongoose";

const { Schema } = mongoose;

const VisitorEventSchema = new Schema(
  {
    session_id: { type: String, required: true, index: true },
    ts: { type: Date, required: true, default: Date.now },
    type: { type: String, required: true, index: true },
    path: { type: String, default: "" },
    label: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

VisitorEventSchema.index({ session_id: 1, ts: 1 });

export default mongoose.models.VisitorEvent ||
  mongoose.model("VisitorEvent", VisitorEventSchema);
