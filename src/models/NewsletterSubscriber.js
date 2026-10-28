import mongoose from "mongoose";

const { Schema } = mongoose;

export const NEWSLETTER_SOURCES = ["popup", "inline", "footer"];

const NewsletterSubscriberSchema = new Schema(
  {
    /** Trimmed + lowercased; the only identity key. */
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    status: { type: String, enum: ["subscribed", "unsubscribed"], default: "subscribed", index: true },
    /** Which capture surface the first signup came from. */
    source: { type: String, enum: NEWSLETTER_SOURCES, required: true },
    /** Pathname only (no query string), capped. */
    page_path: { type: String, maxlength: 200 },
    country: { type: String, maxlength: 2 },
    /** Salted SHA-256 of the client IP, for abuse investigation without storing raw IPs. */
    ip_hash: { type: String, maxlength: 64, index: true },
    user_agent: { type: String, maxlength: 300 },
    /** Random token for one-click unsubscribe links in future emails. */
    unsubscribe_token: { type: String, required: true, unique: true },
    subscribed_at: { type: Date, default: Date.now },
    unsubscribed_at: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.NewsletterSubscriber ||
  mongoose.model("NewsletterSubscriber", NewsletterSubscriberSchema);
