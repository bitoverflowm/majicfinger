import mongoose from "mongoose";

const { Schema } = mongoose;

const McpPendingConfirmationSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    action_class: { type: String, required: true, maxlength: 60 },
    tool: { type: String, required: true, maxlength: 120 },
    args: { type: Schema.Types.Mixed, default: null },
    credit_quote: { type: Number, default: 0 },
    summary: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: ["pending", "approved", "denied", "expired"], default: "pending" },
    expires_at: { type: Date, required: true, index: true },
    resolved_at: { type: Date, default: null },
    allow_forever: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.McpPendingConfirmation ||
  mongoose.model("McpPendingConfirmation", McpPendingConfirmationSchema);
