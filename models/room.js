const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    roomID: { type: String, required: true, unique: true }, // Room identifier
    Domain: { type: String }, // Room identifier
    roomName: { type: String }, // Room identifier
    seq: { type: Number, default: 0 },
    admin: { type: String, required: true }, // Admin of the room
    members: [{ type: String }], // Array of member IDs
    setting: [{ type: Object }], // Array of member IDs
    lastUpdated: { type: Date }, // <-- Add this field
    createdAt: { type: Date, default: Date.now }, // Room creation timestamp
});

module.exports = mongoose.models.Room || mongoose.model("Room", roomSchema);
