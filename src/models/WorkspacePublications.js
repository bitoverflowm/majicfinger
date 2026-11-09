import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * A project published at `/<handle>/<slug>`. One per project. A live page reads the project as it
 * is saved now; a snapshot page reads `snapshot`, a copy taken when it was last published.
 */
const WorkspacePublicationSchema = new mongoose.Schema(
  {
    project_id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true, index: true },
    slug: { type: String, required: true, maxlength: 80 },
    /** False once unpublished: the settings stay so publishing again starts from them. */
    published: { type: Boolean, default: false },
    published_at: { type: Date, default: null },
    first_published_at: { type: Date, default: null },
    mode: { type: String, enum: ["live", "snapshot"], default: "live" },
    visibility: { type: String, enum: ["public", "unlisted"], default: "public" },
    tabs: { type: [String], default: () => [] },
    title: { type: String, default: "", maxlength: 120 },
    description: { type: String, default: "", maxlength: 2000 },
    seo_title: { type: String, default: "", maxlength: 70 },
    seo_description: { type: String, default: "", maxlength: 170 },
    keywords: { type: [String], default: () => [] },
    labels: { type: [String], default: () => [] },
    category: { type: String, default: "" },
    og_image: { type: String, default: "", select: false },
    og_auto: { type: String, default: "", select: false },
    og_at: { type: Date, default: null },
    header_image: { type: String, default: "", select: false },
    header_at: { type: Date, default: null },
    password_hash: { type: String, default: "", select: false },
    password_on: { type: Boolean, default: false },
    snapshot: { type: Schema.Types.Mixed, default: null, select: false },
    snapshot_at: { type: Date, default: null },
  },
  { timestamps: true },
);

WorkspacePublicationSchema.index({ user_id: 1, slug: 1 }, { unique: true });
WorkspacePublicationSchema.index({ published: 1, visibility: 1, password_on: 1 });

export default mongoose.models.WorkspacePublication ||
  mongoose.model("WorkspacePublication", WorkspacePublicationSchema);
