const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    roomName: { type: String, required: true, unique: true }, // Room identifier
    admin: { type: String, required: true }, // Admin of the room
    members: [{ type: String }], // Array of member IDs
    createdAt: { type: Date, default: Date.now }, // Room creation timestamp
});

module.exports = mongoose.models.Room || mongoose.model("Room", roomSchema);
