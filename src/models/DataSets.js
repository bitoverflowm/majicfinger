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
    data_sheets: {
        type: Schema.Types.Mixed,
        default: {},
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
    save_revision: {
        type: String,
        default: ""
    },
    save_meta: {
        type: Schema.Types.Mixed,
        default: {}
    },
    user_id: {
        type: Schema.Types.ObjectId, // Defines the type as ObjectId
        ref: 'User', // References the User model
        required: true // Makes this field mandatory
    },
    forked_from_user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    forked_from_data_set_id: {
        type: Schema.Types.ObjectId,
        ref: "DataSet",
        default: null,
    },
    forked_from_chart_id: {
        type: Schema.Types.ObjectId,
        ref: "Chart",
        default: null,
    },
    forked_at: {
        type: Date,
        default: null,
    },
    run_yourself_analysis_id: {
        type: String,
        default: null,
    },
})


export default mongoose.models.DataSet || mongoose.model("DataSet", DataSetSchema)