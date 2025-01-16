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
        bgColor: { type: String, default: "rgb(55, 155, 240)" },
        fgColor: { type: String, default: "rgb(255, 255, 255)" },
        sideBgColor: { type: String, default: "rgb(221, 220, 225)" },
        sideFgColor: { type: String, default: "rgb(80, 129, 188)" },
        marginLeft: { type: String, default: "10%" },
        marginRight: { type: String, default: "10%" },
        chatWindowBgColor: { type: String, default: "rgb(245, 245, 245)" },
        chatWindowFgColor: { type: String, default: "rgb(255, 255, 255)" },
        fontSize: { type: String, default: "13px" },
        borderRad: { type: String, default: "15px" },
    },
}, { timestamps: true }); // Automatically add createdAt and updatedAt fields

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
