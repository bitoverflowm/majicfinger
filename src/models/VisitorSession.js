import mongoose from "mongoose";

const { Schema } = mongoose;

const VisitorSessionSchema = new Schema(
  {
    session_id: { type: String, required: true, unique: true, index: true },
    session_kind: { type: String, enum: ["visitor", "auth"], default: "visitor", index: true },
    started_at: { type: Date, required: true },
    ended_at: { type: Date },
    last_seen_at: { type: Date },
    last_chain_at: { type: Date },
    chain_count: { type: Number, default: 0 },
    entry_path: { type: String, default: "/" },
    entry_url: { type: String },
    entry_search: { type: String },
    page_type: { type: String },
    page_name: { type: String },
    referrer: { type: String, default: "" },
    visitor_id: { type: String, index: true },
    start_dedupe_key: { type: String, index: true },
    utm_source: { type: String },
    utm_medium: { type: String },
    utm_campaign: { type: String },
    utm_term: { type: String },
    utm_content: { type: String },
    user_id: { type: String },
    email: { type: String },
    is_logged_in: { type: Boolean, default: false },
    summary_sent_at: { type: Date },
    /** Set when the session-start Telegram alert has been sent (dedupes batch/session_end races). */
    start_notified_at: { type: Date },
    /** True when a start Telegram was actually delivered (false when skipped e.g. IP dedupe). */
    start_telegram_sent: { type: Boolean, default: false },
    start_telegram_skip_reason: { type: String },
    summary_skip_reason: { type: String },
    client_ip: { type: String, index: true },
    country: { type: String },
    region: { type: String },
    city: { type: String },
    user_agent: { type: String },
    accept_language: { type: String },
  },
  { timestamps: true },
);

VisitorSessionSchema.index({ started_at: -1 });
VisitorSessionSchema.index({ ended_at: -1 });
VisitorSessionSchema.index({ client_ip: 1, start_telegram_sent: 1, start_notified_at: -1 });
VisitorSessionSchema.index({ visitor_id: 1, start_telegram_sent: 1, start_notified_at: -1 });
VisitorSessionSchema.index({ start_dedupe_key: 1, start_telegram_sent: 1, start_notified_at: -1 });

export default mongoose.models.VisitorSession ||
  mongoose.model("VisitorSession", VisitorSessionSchema);
