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
}, { timestamps: true }); // Automatically add createdAt and updatedAt fields

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
