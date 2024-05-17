import mongoose from "mongoose"

const { Schema } = mongoose;
/* User in the db */

const DataSetSchema = new mongoose.Schema({
    data_set_name: {
        type: String,
        maxLength: [100, "Project name cannot be more than 100 characters"],
    },
    data: {
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
    labels: {
        type: Array,
        default: []
    },
    source: {
        type: String,
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId, // Defines the type as ObjectId
        ref: 'User', // References the User model
        required: true // Makes this field mandatory
    }
})


export default mongoose.models.DataSet || mongoose.model("DataSet", DataSetSchema)