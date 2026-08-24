// Lean reimplementation of the root app's services/messages_func.js
// processMessage() — decrypts the message body and resolves quote/forward
// references. Deliberately does NOT reuse services/messages_func.js
// directly: that module reads TLS certificate files at require() time
// (for its own unused internal https server) and would crash this
// process on any machine that doesn't have those exact certs on disk.
const Message = require('../../../../models/message');
const User = require('../../../../models/user');
const { socketDecrypt } = require('../../../../services/encryption');

async function processMessage(msg) {
  const readUsers = (msg.read || []).map((entry) => ({
    username: entry?.username,
    reaction: entry?.reaction ?? '',
    voice_heared: entry?.voice_heared,
    time: entry?.time ? entry.time.toString() : null,
  }));

  let replyMessage = null;
  if (msg.quote) {
    const found = await Message.findOne({ id: msg.quote }).select('sender message file').lean();
    replyMessage = found
      ? {
          ...found,
          message: socketDecrypt(found.message),
          file: found.file && found.file.length ? found.file[0].fileType : null,
        }
      : { sender: '', message: 'This message has been deleted.' };
  }

  let forwardMessage = null;
  if (msg.forward) {
    const found = await Message.findOne({ id: msg.forward })
      .select('sender message file roomID')
      .lean();
    if (found) {
      const forwardSenderUser = await User.findById(found.sender)
        .select('first_name last_name username')
        .lean()
        .catch(() => null);
      const forwardSenderName = forwardSenderUser
        ? `${forwardSenderUser.first_name || ''} ${forwardSenderUser.last_name || ''}`.trim() ||
          forwardSenderUser.username
        : null;
      forwardMessage = {
        ...found,
        senderName: forwardSenderName,
        senderUsername: forwardSenderUser?.username || null,
        message: socketDecrypt(found.message),
        file: found.file && found.file.length ? found.file[0].fileType : null,
      };
    } else {
      forwardMessage = { sender: '', senderName: '', senderUsername: null, message: 'This message has been deleted.' };
    }
  }

  return {
    ...msg,
    message: socketDecrypt(msg.message),
    reply: replyMessage,
    forward: forwardMessage,
    readUsers,
    readLine: false,
  };
}

module.exports = { processMessage };
