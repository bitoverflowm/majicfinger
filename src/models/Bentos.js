import mongoose from "mongoose"

const { Schema } = mongoose;
/* User in the db */

const BentoSchema = new mongoose.Schema({
    project_name: {
        type: String,
        maxLength: [100, "Project name cannot be more than 100 characters"],
    },
    project_data: {
        type: Array,
        default: [],
    },
    created_date: {
        type: Date,
        default: Date.now, // Automatically set to the current date
    },
    last_edited_date: {
        type: Date,
        default: Date.now, // Automatically set to the current date
    },
    user_id: {
        type: Schema.Types.ObjectId, // Defines the type as ObjectId
        ref: 'User', // References the User model
        required: true // Makes this field mandatory
    }
})


export default mongoose.models.Bento || mongoose.model("Bento", BentoSchema)