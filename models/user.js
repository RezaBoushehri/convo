const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    first_name: String,
    last_name: String,
    password: String,
    socketID: String,  // store the socket ID
    roomID: String,    // track the room user is in
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
