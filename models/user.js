const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    first_name: String,
    last_name: String,
    password: String,
    socketID: String,  // Store the socket ID
    roomID: String,    // Track the room the user is in
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
