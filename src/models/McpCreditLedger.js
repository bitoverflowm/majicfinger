import mongoose from "mongoose";

const { Schema } = mongoose;

const McpCreditLedgerSchema = new Schema(
  {
    user_id: { type: String, required: true, index: true },
    delta: { type: Number, required: true },
    balance_after: { type: Number, default: null },
    reason: { type: String, required: true, maxlength: 80 },
    tool: { type: String, default: "", maxlength: 120 },
    class: { type: String, default: "", maxlength: 40 },
    meta: { type: Schema.Types.Mixed, default: null },
    unlimited_account: { type: Boolean, default: false },
  },
  { timestamps: true },
);

McpCreditLedgerSchema.index({ user_id: 1, createdAt: -1 });

export default mongoose.models.McpCreditLedger || mongoose.model("McpCreditLedger", McpCreditLedgerSchema);
