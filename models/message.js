const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Unique message ID
    roomID: { type: String, required: true }, // The room in which the message was sent
    sender: { type: String, required: true }, // Sender's username
    quote: { type: String, default: null }, // Message content
    read: [
        {
            username: { type: String, required: true },
            time: { type: Date, required: true },
        },
    ],    message: { type: String, required: true }, // Message content
    file: { type: String, default: null }, // Optional file URL or path
    timestamp: { type: Date, default: Date.now }, // Timestamp of the message
});

module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);
