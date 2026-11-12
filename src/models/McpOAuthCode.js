import mongoose from "mongoose";

const { Schema } = mongoose;

const McpOAuthCodeSchema = new Schema(
  {
    code_hash: { type: String, required: true, unique: true, index: true },
    client_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    redirect_uri: { type: String, required: true },
    code_challenge: { type: String, required: true },
    code_challenge_method: { type: String, default: "S256" },
    resource: { type: String, default: "" },
    scope: { type: String, default: "lychee" },
    expires_at: { type: Date, required: true, index: true },
    consumed_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.McpOAuthCode || mongoose.model("McpOAuthCode", McpOAuthCodeSchema);
