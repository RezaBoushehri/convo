const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    first_name: {
        type: String,
        required: true,
        trim: true,
    },
    last_name: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    socketID: {
        type: String,
        default: null, // Optional, will be null if not set
    },
    roomID: {
        type: String,
        default: null, // Optional, will be null if not set
    },
    settings: {
        bgColor: { type: String, default: "#3385ff" },
        fgColor: { type: String, default: "#ffffff" },
        marginLeft: { type: String, default: "10%" },
        marginRight: { type: String, default: "10%" },
        chatWindowBgColor: { type: String, default: "#434343" },
        chatWindowFgColor: { type: String, default: "#ffffff" },
        fontSize: { type: String, default: "16px" },
        borderRad: { type: String, default: "10px" },
    },
}, { timestamps: true }); // Automatically add createdAt and updatedAt fields

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
