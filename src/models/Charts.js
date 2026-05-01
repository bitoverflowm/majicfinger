import mongoose from "mongoose"

const { Schema } = mongoose;
/* User in the db */

const ChartSchema = new mongoose.Schema({
    chart_name: {
        type: String,
        maxLength: [100, "Chart name cannot be more than 100 characters"],
    },
    chart_properties: {
        type: Object,
        default: [],
    },
    created_date: {
        type: Date,
        default: Date.now, // Automatically set to the current date
    },
    last_saved_date: {
        type: Date,
        default: Date.now, // Automatically set to the current date
    },
    labels: {
        type: Array,
        default: []
    },
    user_id: {
        type: Schema.Types.ObjectId, // Defines the type as ObjectId
        ref: 'User', // References the User model
        required: true // Makes this field mandatory
    },
    data_set_id: {
        type: Schema.Types.ObjectId, // Defines the type as ObjectId
        ref: 'DataSet', // References the User model
        required: true // Makes this field mandatory
    },
    /** URL segment for /{user_name}/charts/{public_slug}; unique per owner when set (omit until published) */
    public_slug: {
        type: String,
        maxLength: [120, "public_slug cannot be more than 120 characters"],
    },
    /** When true, chart is served by public embed API and public page */
    is_public: {
        type: Boolean,
        default: false,
    },
    og_image_url: {
        type: String,
    },
    // Stored as data URL for serverless-safe OG snapshots (Vercel filesystem is ephemeral).
    og_image_data: {
        type: String,
    },
    og_image_updated_at: {
        type: Date,
    },
})

// Same as ChartDashboard: sparse+unique still indexes null slug once per user.
ChartSchema.index(
    { user_id: 1, public_slug: 1 },
    {
        unique: true,
        partialFilterExpression: { public_slug: { $type: "string", $gt: "" } },
    },
)

export default mongoose.models.Chart || mongoose.model("Chart", ChartSchema)