import mongoose from "mongoose"

/* User in the db */

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        maxLength: [60, "Name cannot be more than 60 characters"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        maxLength: [240, "Email cannot be more than 240 characters"],
    },
    paymentTotal: {
        type: Number,
        default: 0,
    },
    lifetimeMember: {
        type: Boolean,
        default: false,
    },
    subscriptionType: {
        type: String,
    },
    nextPaymentDate: {
        type: Date,
    },
    netPay: {
        type: Number,
    },
    token: {
        type: Number
    },
    profile_pic: {
        type: String,
    },
    mgkIssuer: {
        type: String,
    },
    mgkpublicAddress: {
        type: String,
    },
    confirmedAt: {
        type: Date,
    },
    lastLoginAt: {
        type: Date,
    },
    metadata: {
        type: Object,
    },
})


export default mongoose.models.User || mongoose.model("User", UserSchema)