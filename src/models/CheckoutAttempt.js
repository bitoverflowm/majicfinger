import mongoose from "mongoose";

const CheckoutStepSchema = new mongoose.Schema(
  {
    step: { type: String, required: true },
    at: { type: Date, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false },
);

const CheckoutAttemptSchema = new mongoose.Schema(
  {
    attemptId: { type: String, required: true, unique: true, index: true },
    stripeSessionId: { type: String, index: true },
    planKey: { type: String },
    priceId: { type: String },
    mode: { type: String },
    referral: { type: String },
    status: { type: String, default: "open" },
    granted: { type: Boolean, default: false },
    grantFinished: { type: Boolean, default: false },
    billingEmail: { type: String },
    loginEmail: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    stripeCustomerId: { type: String },
    lastError: { type: String },
    linkAlerted: { type: Boolean, default: false },
    matchAlerted: { type: Boolean, default: false },
    pendingAlerted: { type: Boolean, default: false },
    expiresAt: { type: Date },
    planLabel: { type: String },
    amount: { type: Number },
    interval: { type: String },
    testMode: { type: Boolean },
    prefillEmail: { type: String },
    contactEmail: { type: String },
    source: { type: mongoose.Schema.Types.Mixed },
    /** Visitor journey session that opened this checkout (for Telegram context). */
    visitorSessionId: { type: String, index: true },
    /** Snapshot of the visitor path before checkout (entry, pricing, clicks). */
    visitorContext: { type: mongoose.Schema.Types.Mixed },
    steps: { type: [CheckoutStepSchema], default: undefined },
    telegramMessageId: { type: Number },
    telegramClaimed: { type: Boolean },
    telegramPings: { type: [String], default: undefined },
  },
  { timestamps: true },
);

export default mongoose.models.CheckoutAttempt ||
  mongoose.model("CheckoutAttempt", CheckoutAttemptSchema);
