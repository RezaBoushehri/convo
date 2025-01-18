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
        bgColor: { type: String, default: "rgb(204, 238, 191)" },
        fgColor: { type: String, default: "rgb(0, 0, 0)" },
        sideBgColor: { type: String, default: "rgb(242, 242, 242)" },
        sideFgColor: { type: String, default: "rgb(33, 33, 33)" },
        marginLeft: { type: String, default: "10%" },
        marginRight: { type: String, default: "10%" },
        chatWindowBgColor: { type: String, default: "rgb(245, 245, 245)" },
        chatWindowFgColor: { type: String, default: "rgb(33, 33, 33)" },
        fontSize: { type: String, default: "16px" },
        borderRad: { type: String, default: "15px" },
    },
}, { timestamps: true }); // Automatically add createdAt and updatedAt fields

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
