import mongoose from "mongoose";

const XJarvisJobSchema = new mongoose.Schema(
  {
    tweet_id: { type: String, required: true, index: true, unique: true },
    author_id: { type: String, default: "" },
    author_handle: { type: String, default: "" },
    text: { type: String, default: "" },
    parent_text: { type: String, default: "" },
    intent: { type: Object, default: null },
    status: {
      type: String,
      enum: ["queued", "draft_ready", "needs_clarification", "posted", "skipped", "error"],
      default: "queued",
      index: true,
    },
    draft_reply: { type: String, default: "" },
    research: { type: Object, default: null },
    deliver: { type: String, enum: ["public_reply", "dm", "lychee_link"], default: "public_reply" },
    reply_tweet_id: { type: String, default: "" },
    error: { type: String, default: "" },
    dry_run: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.models.XJarvisJob || mongoose.model("XJarvisJob", XJarvisJobSchema);
