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
    }
})


export default mongoose.models.Chart || mongoose.model("Chart", ChartSchema)