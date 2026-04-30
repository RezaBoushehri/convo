const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    roomID: { type: String, required: true, unique: true }, // Room identifier
    Domain: { type: String }, // Room identifier
    roomName: { type: String }, // Room identifier
    seq: { type: Number, default: 0 },
    admin: { type: String, required: true }, // Admin of the room
    members: [{ type: String }], // Array of member IDs
    member_data: [
        {
            id : { type: String },
            joined_at : { type: Date },
            leaved_at : { type: Date },
        }
    ], // Array of member IDs
    last_content: { type: String }, // Room identifier
    setting: [{ type: Object }], // Array of member IDs
    lastUpdated: { type: Date }, // <-- Add this field
    createdAt: { type: Date, default: Date.now }, // Room creation timestamp
});

module.exports = mongoose.models.Room || mongoose.model("Room", roomSchema);
