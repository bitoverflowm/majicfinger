import mongoose from "mongoose";

/** Latest Jarvis "ultra deep" report per Polymarket wallet; backs /jarvis/report/[wallet] and its share card. */
const JarvisTraderReportSchema = new mongoose.Schema(
  {
    wallet: { type: String, required: true, unique: true, index: true },
    report: { type: mongoose.Schema.Types.Mixed, required: true },
    generated_at: { type: Date, required: true },
  },
  { timestamps: true, minimize: false },
);

export default mongoose.models.JarvisTraderReport || mongoose.model("JarvisTraderReport", JarvisTraderReportSchema);
