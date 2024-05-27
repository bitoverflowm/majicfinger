import mongoose from "mongoose"

const { Schema } = mongoose;
/* User in the db */

const AiUsageSchema = new mongoose.Schema({
    assistant_id: {
        type: String,
        required: true
    },
    thread_id: {
        type: String,
        required: true
    },
    created_date: {
        type: Date,
        default: Date.now, // Automatically set to the current date
    },
    last_saved_date: {
        type: Date,
        default: Date.now, // Automatically set to the current date
    },
    started_at: {
        type: Date,
    },
    completed_at: {
        type: Date
    },
    usage: {
        type: Schema.Types.Mixed, // Allows for any type of data
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
    res_content: {
        type: Schema.Types.Mixed, // Allows for any type of data
    }
})


export default mongoose.models.AiUsage || mongoose.model("AiUsage", AiUsageSchema)