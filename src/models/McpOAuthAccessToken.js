import mongoose from "mongoose";

const { Schema } = mongoose;

const McpOAuthAccessTokenSchema = new Schema(
  {
    token_hash: { type: String, required: true, unique: true, index: true },
    refresh_hash: { type: String, default: "", index: true },
    client_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    resource: { type: String, default: "" },
    scope: { type: String, default: "lychee" },
    expires_at: { type: Date, required: true, index: true },
    refresh_expires_at: { type: Date, default: null },
    revoked_at: { type: Date, default: null },
    last_used_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.McpOAuthAccessToken ||
  mongoose.model("McpOAuthAccessToken", McpOAuthAccessTokenSchema);
