import mongoose from "mongoose";

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
  },
  { timestamps: true },
);

export default mongoose.models.CheckoutAttempt ||
  mongoose.model("CheckoutAttempt", CheckoutAttemptSchema);
