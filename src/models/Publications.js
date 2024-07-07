import mongoose from "mongoose"

const { Schema } = mongoose;
/* User in the db */

const PublicationSchema = new mongoose.Schema({
    project_name: {
        type: String,
        maxLength: [100, "Project name cannot be more than 100 characters"],
        required: true,
    },
    presentation_name: {
        type: String,
        maxLength: [100, "Project name cannot be more than 100 characters"],
        required: true,
    },
    template: {
        type: String,
        required: true,
    },
    main_title: {
        type: String,
        required: true,
    },
    sub_title: {
        type: String,
        required: true,
    },
    display_map: {
        type: Schema.Types.Mixed, // Use Mixed for flexible schemas
        required: true,  
    },
    data_meta: {
        type: Schema.Types.Mixed, // Use Mixed for flexible schemas
        required: true,
    },
    data_snap_shot: {
        type: Array,
        default: [],
        required: true,
    },
    palette: {
        type: Array,
        default: ["#fff"],
        required: true,
    },
    created_date: {
        type: Date,
        default: Date.now, // Automatically set to the current date
        required: true,
    },
    deployed_date: {
        type: Date,
        default: Date.now, // Automatically set to the current date
        required: true,
    },
    presentation_id: {
        type: Schema.Types.ObjectId,
        ref: 'Presentation',
    },
    user_id: {
        type: Schema.Types.ObjectId, // Defines the type as ObjectId
        ref: 'User', // References the User model
        required: true // Makes this field mandatory
    }
})


export default mongoose.models.Publication || mongoose.model("Publication", PublicationSchema)