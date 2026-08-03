import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Thin index of persisted REST live feeds for cron discovery.
 * Canonical config is also stamped onto DataSet sheet provenance/saveMeta.
 */
const LiveFeedSchema = new mongoose.Schema({
  feed_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  data_set_id: {
    type: Schema.Types.ObjectId,
    ref: "DataSet",
    required: true,
    index: true,
  },
  integration: {
    type: String,
    required: true,
  },
  endpoint: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["persisted", "paused", "ended"],
    default: "persisted",
    index: true,
  },
  poll_interval_ms: {
    type: Number,
    required: true,
  },
  config: {
    type: Schema.Types.Mixed,
    required: true,
  },
  last_polled_at: {
    type: Date,
    default: null,
  },
  last_success_at: {
    type: Date,
    default: null,
  },
  last_error: {
    type: String,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

LiveFeedSchema.index({ status: 1, last_polled_at: 1 });

export default mongoose.models.LiveFeed || mongoose.model("LiveFeed", LiveFeedSchema);
