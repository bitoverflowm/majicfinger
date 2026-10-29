import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Visitors on a phone or small tablet who asked for a link to try Lychee at their desk.
 * Not a newsletter signup: these addresses only get the link they asked for.
 */
const DesktopLinkRequestSchema = new Schema(
  {
    /** Trimmed + lowercased; one record per address. */
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    /** "pending" until the link email goes out; asking again resets it to "pending". */
    status: { type: String, enum: ["pending", "sent"], default: "pending", index: true },
    /** Pathname only (no query string), capped. */
    page_path: { type: String, maxlength: 200 },
    country: { type: String, maxlength: 2 },
    /** Salted SHA-256 of the client IP, for abuse investigation without storing raw IPs. */
    ip_hash: { type: String, maxlength: 64, index: true },
    user_agent: { type: String, maxlength: 300 },
    request_count: { type: Number, default: 1 },
    last_requested_at: { type: Date, default: Date.now },
    sent_at: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.DesktopLinkRequest || mongoose.model("DesktopLinkRequest", DesktopLinkRequestSchema);
