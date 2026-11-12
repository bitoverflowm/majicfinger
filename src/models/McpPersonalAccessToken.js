import mongoose from "mongoose";

const { Schema } = mongoose;

/** One active personal access token per user (regenerate revokes the previous hash). */
const McpPersonalAccessTokenSchema = new Schema(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    token_hash: { type: String, required: true, unique: true, index: true, select: false },
    token_prefix: { type: String, required: true },
    label: { type: String, default: "default", maxlength: 80 },
    last_used_at: { type: Date, default: null },
    revoked_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.McpPersonalAccessToken ||
  mongoose.model("McpPersonalAccessToken", McpPersonalAccessTokenSchema);
