import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * One saved search or executed pull, owned by the session user who created it.
 * user_id is always taken from the login session, never from the request body.
 */
const WorkspaceQueryRecordSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    kind: { type: String, enum: ["saved", "pull"], required: true },
    entry_id: { type: String, required: true },
    integration_id: { type: String, default: "" },
    label: { type: String, default: "" },
    saved_at: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true },
);

WorkspaceQueryRecordSchema.index({ user_id: 1, kind: 1, saved_at: -1 });
WorkspaceQueryRecordSchema.index({ user_id: 1, kind: 1, entry_id: 1 }, { unique: true });

export default mongoose.models.WorkspaceQueryRecord ||
  mongoose.model("WorkspaceQueryRecord", WorkspaceQueryRecordSchema);
