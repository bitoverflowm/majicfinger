import mongoose from "mongoose"

const { Schema } = mongoose;
/* User in the db */

const PresentationSchema = new mongoose.Schema({
    project_name: {
        type: String,
        maxLength: [100, "Project name cannot be more than 100 characters"],
    },
    presentation_name: {
        type: String,
        maxLength: [100, "Project name cannot be more than 100 characters"],
    },
    display_map: {
        type: Schema.Types.Mixed, // Use Mixed for flexible schemas
    },
    data_meta: {
        type: Schema.Types.Mixed, // Use Mixed for flexible schemas
    },
    data_snap_shot: {
        type: Array,
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
    user_id: {
        type: Schema.Types.ObjectId, // Defines the type as ObjectId
        ref: 'User', // References the User model
        required: true // Makes this field mandatory
    }
})


export default mongoose.models.Presentation || mongoose.model("Presentation", PresentationSchema)