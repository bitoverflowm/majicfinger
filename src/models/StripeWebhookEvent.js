import mongoose from "mongoose";

const StripeWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String },
    status: { type: String, enum: ["processing", "processed"], default: "processing" },
    objectId: { type: String },
    processedAt: { type: Date },
    // Stripe retries for up to 3 days; keep a margin, then let MongoDB drop the row.
    expiresAt: { type: Date, index: { expires: 0 } },
  },
  { timestamps: true },
);

export default mongoose.models.StripeWebhookEvent ||
  mongoose.model("StripeWebhookEvent", StripeWebhookEventSchema);
