import mongoose from "mongoose";

const { Schema } = mongoose;

/** User granted "always allow" for a sensitive action class. */
const McpDelegationSchema = new Schema(
  {
    user_id: { type: String, required: true, index: true },
    action_class: { type: String, required: true, maxlength: 60 },
    revoked_at: { type: Date, default: null },
  },
  { timestamps: true },
);

McpDelegationSchema.index({ user_id: 1, action_class: 1 }, { unique: true });

export default mongoose.models.McpDelegation || mongoose.model("McpDelegation", McpDelegationSchema);
