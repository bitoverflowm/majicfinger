import mongoose from "mongoose";

const { Schema } = mongoose;

const McpOAuthClientSchema = new Schema(
  {
    client_id: { type: String, required: true, unique: true, index: true },
    client_name: { type: String, default: "", maxlength: 200 },
    redirect_uris: { type: [String], default: () => [] },
    token_endpoint_auth_method: { type: String, default: "none" },
    grant_types: { type: [String], default: () => ["authorization_code", "refresh_token"] },
    response_types: { type: [String], default: () => ["code"] },
    client_uri: { type: String, default: "" },
    metadata_url: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.McpOAuthClient || mongoose.model("McpOAuthClient", McpOAuthClientSchema);
