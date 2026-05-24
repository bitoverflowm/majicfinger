import mongoose from "mongoose";

const { Schema } = mongoose;

const TelegramEventCounterSchema = new Schema(
  {
    /** Stable event key, e.g. fork_click, signup, content_view, content_leave */
    event_key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, default: 0 },
    last_event_at: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.TelegramEventCounter ||
  mongoose.model("TelegramEventCounter", TelegramEventCounterSchema);
