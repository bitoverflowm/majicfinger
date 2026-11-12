import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Per-user MCP credit wallet.
 * `unlimited` is set for owner full-access accounts; ledger still records usage for testing.
 */
const McpCreditAccountSchema = new Schema(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    lifetime_granted: { type: Number, default: 0 },
    lifetime_spent: { type: Number, default: 0 },
    unlimited: { type: Boolean, default: false },
    period_key: { type: String, default: "" },
    period_granted: { type: Number, default: 0 },
    updated_from_tier_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.McpCreditAccount || mongoose.model("McpCreditAccount", McpCreditAccountSchema);
