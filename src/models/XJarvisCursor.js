import mongoose from "mongoose";

/** Singleton-ish cursor for mention since_id (one doc per bot username). */
const XJarvisCursorSchema = new mongoose.Schema(
  {
    bot_username: { type: String, required: true, unique: true, index: true },
    since_id: { type: String, default: "" },
    last_tick_at: { type: Date, default: null },
    last_tick_summary: { type: Object, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.XJarvisCursor || mongoose.model("XJarvisCursor", XJarvisCursorSchema);
