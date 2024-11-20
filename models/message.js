const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true },       // ID of the chat room
  id: { type: String, required: true, unique: true },       // ID of the chat room
  sender: { type: String, required: true },      // Username or sender ID
  file: { type: String, required: true },     // Message content
  message: { type: String, required: true },     // Message content
  createdAt: { type: Date, default: Date.now },  // Timestamp
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
