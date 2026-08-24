// Shares the exact same uploads/ directory as the existing Express app
// (app.js's uploadDir = path.join(__dirname, "uploads"), where __dirname
// is the repo root) so files either app writes are servable by both.
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const Message = require('../../../../models/message');
const { authenticateRoom } = require('./roomAccess');

const uploadDir = path.join(__dirname, '..', '..', '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

async function deleteFile(filename) {
  if (!filename) return;
  try {
    await fsp.unlink(path.join(uploadDir, filename));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Failed to delete file ${filename}:`, err.message);
  }
}

// Same permission model as app.js's file_access(): a file is readable by
// anyone who can read the room the message that references it belongs to.
async function checkFileAccess(fileUrl, uid) {
  const message = await Message.findOne({ 'file.file': fileUrl }).select('roomID');
  if (!message) return false;
  return authenticateRoom(message.roomID, uid);
}

module.exports = { uploadDir, deleteFile, checkFileAccess };
