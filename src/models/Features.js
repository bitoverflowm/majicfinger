import mongoose from "mongoose"

/* User in the db */

const FeatureSchema = new mongoose.Schema({
    title: {
        type: String,
        maxLength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
        type: String,
        required: [true, "Description is required"],
        maxLength: [1000, "Description cannot be more than 1000 characters"],
    },
    votes: {
        type: Number,
        default: 1,
    },
    lastVoteAt: {
        type: Date,
    },
    status: {
        type: String,
        default: "polling votes"
    },
    tag: {
        type: Array,
        default: []
    }
})


export default mongoose.models.Feature || mongoose.model("Feature", FeatureSchema)