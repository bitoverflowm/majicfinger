import mongoose from "mongoose";

const { Schema } = mongoose;

const VisitorSessionSchema = new Schema(
  {
    session_id: { type: String, required: true, unique: true, index: true },
    session_kind: { type: String, enum: ["visitor", "auth"], default: "visitor", index: true },
    started_at: { type: Date, required: true },
    ended_at: { type: Date },
    last_seen_at: { type: Date },
    last_chain_at: { type: Date },
    chain_count: { type: Number, default: 0 },
    entry_path: { type: String, default: "/" },
    referrer: { type: String, default: "" },
    user_id: { type: String },
    email: { type: String },
    is_logged_in: { type: Boolean, default: false },
    summary_sent_at: { type: Date },
  },
  { timestamps: true },
);

VisitorSessionSchema.index({ started_at: -1 });
VisitorSessionSchema.index({ ended_at: -1 });

export default mongoose.models.VisitorSession ||
  mongoose.model("VisitorSession", VisitorSessionSchema);
