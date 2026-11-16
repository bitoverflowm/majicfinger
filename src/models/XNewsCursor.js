import mongoose from "mongoose";

/**
 * Posting cursor for @lychee_news.
 * live_since_ms is stamped at go-live (LN-7) so historical /news items are never dumped to X.
 */
const XNewsCursorSchema = new mongoose.Schema(
  {
    bot_username: { type: String, required: true, unique: true, index: true },
    /** Enablement watermark — only items with t > this may be posted. */
    live_since_ms: { type: Number, default: null },
    /** High-water mark of last successfully posted pulse item time. */
    last_posted_item_t: { type: Number, default: null },
    last_posted_id: { type: String, default: "" },
    last_tick_at: { type: Date, default: null },
    last_tick_summary: { type: Object, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.XNewsCursor || mongoose.model("XNewsCursor", XNewsCursorSchema);
