import mongoose from "mongoose";

const { Schema } = mongoose;

const McpAuditEventSchema = new Schema(
  {
    user_id: { type: String, required: true, index: true },
    tool: { type: String, required: true, maxlength: 120 },
    class: { type: String, default: "", maxlength: 40 },
    credits: { type: Number, default: 0 },
    ok: { type: Boolean, default: true },
    error: { type: String, default: "", maxlength: 500 },
    arg_summary: { type: String, default: "", maxlength: 500 },
    client: { type: String, default: "", maxlength: 80 },
    auth_kind: { type: String, default: "", maxlength: 40 },
  },
  { timestamps: true },
);

McpAuditEventSchema.index({ user_id: 1, createdAt: -1 });
McpAuditEventSchema.index({ createdAt: -1 });

export default mongoose.models.McpAuditEvent || mongoose.model("McpAuditEvent", McpAuditEventSchema);
