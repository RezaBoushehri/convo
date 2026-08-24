// Phase 1 socket.io event surface: presence, room list, joining/leaving a
// room, sending/receiving text messages, and typing indicators. Ported
// faithfully from app.js's io.on('connection', ...) handlers, trimmed to
// this subset — file/voice/video messages, reactions, edit/delete,
// forwarding, read receipts, member management, pagination and calling
// are NOT implemented yet (tracked in react/apps/web-next/README.md).
const mongoose = require('mongoose');
const User = require('../../../../models/user');
const Room = require('../../../../models/room');
const Message = require('../../../../models/message');
const { socketEncrypt, socketDecrypt } = require('../../../../services/encryption');
const { processMessage } = require('./processMessage');
const { sanitizeMessage } = require('./sanitize');
const { authenticateRoom } = require('./roomAccess');
const { deleteFile } = require('./fileStore');

const onlineUsersServer = new Map(); // socket.id -> username

async function addUserToRoom(uid, roomID) {
  await User.findOneAndUpdate({ _id: uid }, { $set: { roomID } });
  await Room.findOneAndUpdate({ roomID }, { $addToSet: { members: uid } });
}

// Real counts/sizes from Message.file across the room's history (this
// app shares the production MongoDB, so rooms already have real
// attachments even though Phase 1 doesn't add upload UI of its own yet).
const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]);

function categorize(fileType) {
  if (!fileType) return 'other';
  if (fileType.startsWith('image/')) return 'photo';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'other';
  if (DOCUMENT_TYPES.has(fileType)) return 'document';
  return 'other';
}

async function getAttachmentsSummary(roomID) {
  const messages = await Message.find({ roomID, file: { $ne: null } }).select('file').lean();
  const summary = {
    document: { count: 0, bytes: 0 },
    photo: { count: 0, bytes: 0 },
    video: { count: 0, bytes: 0 },
    other: { count: 0, bytes: 0 },
  };
  for (const msg of messages) {
    for (const f of msg.file || []) {
      summary[categorize(f.fileType)].count += 1;
      // File size isn't stored on the Message document today, so bytes
      // stays 0 for now — shown as "-" client-side rather than faked.
    }
  }
  return summary;
}

// Most handlers need "the user's current device record" + "which room
// that device is in" — this is the recurring lookup from app.js
// (currentUser.devices.find(d => d.token === socket.token).roomID).
async function getCurrentDeviceRoom(socket) {
  const currentUser = await User.findOne({ _id: socket.user._id, 'devices.token': socket.token });
  const device = currentUser?.devices.find((d) => d.token === socket.token);
  return { currentUser, roomID: device?.roomID || null };
}

function registerChatEvents(io) {
  // Socket auth middleware — same shape as app.js: requires an
  // authenticated session (populated by passport via the shared
  // sessionMiddleware, attached in server.js) and at least one device
  // token on the user record.
  io.use((socket, next) => {
    const session = socket.request.session;
    if (!session || !session.passport || !session.passport.user) {
      return next(new Error('unauthorized'));
    }
    User.findByUsername(session.passport.user)
      .then((user) => {
        if (!user) return next(new Error('unauthorized User'));
        if (!user.device_login && !user.devices?.length) return next(new Error('unauthorized Device'));
        socket.user = user;
        socket.token = socket.request.cookies?.autoLogin || user.device_login;
        next();
      })
      .catch((err) => next(err));
  });

  io.on('connection', async (socket) => {
    console.log('[web-next] client connected', socket.id, socket.user.username);

    await User.findOneAndUpdate(
      { _id: socket.user._id, 'devices.token': socket.token },
      {
        socketID: socket.id,
        status: 'online',
        lastActive: new Date(),
        $set: { 'devices.$.socketID': socket.id, 'devices.$.lastActive': new Date() },
      }
    );

    socket.on('userLoggedIn', async () => {
      const currentUser = socket.user;
      onlineUsersServer.set(socket.id, currentUser.username);
      socket.broadcast.emit('userCameBack', {
        username: currentUser.username,
        name: `${currentUser.first_name} ${currentUser.last_name}`,
      });
      socket.emit('onlineUsers', Array.from(onlineUsersServer.values()));
    });

    socket.on('ping', () => {
      socket.emit('pong');
      socket.emit('onlineUsers', Array.from(onlineUsersServer.values()));
    });

    socket.on('roomList', async ({ cursor, cache } = {}, callback) => {
      try {
        const currentUser = await User.findOne({ _id: socket.user._id, 'devices.token': socket.token });
        if (!currentUser) return socket.emit('error', { message: 'User not found' });

        const matchStage = { members: currentUser._id.toString() };
        if (cursor) {
          matchStage.$expr = { $lt: [{ $ifNull: ['$lastUpdated', '$createdAt'] }, new Date(cursor)] };
        }

        const rooms = await Room.aggregate([
          { $match: matchStage },
          { $addFields: { sortDate: { $ifNull: ['$lastUpdated', '$createdAt'] } } },
          { $sort: { sortDate: -1 } },
          { $limit: 50 },
        ]);

        const usernames = new Set();
        rooms.forEach((room) => {
          room.lastMessage = { message: socketDecrypt(room?.last_content ?? '') };
          room.members?.forEach((id) => usernames.add(id));
        });

        const memberObjectIds = Array.from(usernames).map((id) => new mongoose.Types.ObjectId(id));
        const users = await User.find({ _id: { $in: memberObjectIds } })
          .select('username first_name last_name lastActive status')
          .lean();

        // Real unread counts (messages in the room not yet marked read by
        // this user), not a fabricated badge number.
        const uid = currentUser._id.toString();
        await Promise.all(
          rooms.map(async (room) => {
            room.unreadCount = await Message.countDocuments({
              roomID: room.roomID,
              'read.username': { $ne: uid },
            });
          })
        );

        const nextCursor = rooms.length ? rooms[rooms.length - 1].sortDate : null;
        const payload = { room: rooms, cache, users, nextCursor };
        socket.emit('roomList', payload);
        if (typeof callback === 'function') callback(payload);
      } catch (err) {
        console.error('roomList error', err);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('joinRoom', async (data) => {
      try {
        const roomID = data?.roomID ?? '';
        if (!roomID) return socket.emit('error', { message: 'No room.' });

        const currentUser = await User.findOne({ _id: socket.user._id, 'devices.token': socket.token });
        if (!currentUser) return socket.emit('error', { message: 'User not found.' });

        const device = currentUser.devices.find((d) => d.token === socket.token);
        const previousRoom = device?.roomID;
        if (previousRoom && previousRoom !== roomID) {
          socket.leave(previousRoom);
          socket.broadcast.to(previousRoom).emit('userLeft', { username: currentUser.username, roomID: previousRoom });
          await User.updateOne(
            { _id: socket.user._id, 'devices.token': socket.token },
            { $set: { 'devices.$.roomID': null, 'devices.$.lastActive': new Date() } }
          );
        }

        const allowed = await authenticateRoom(roomID, currentUser._id.toString());
        if (!allowed) {
          socket.leave(roomID);
          return socket.emit('error', { message: 'No Access to join.' });
        }

        socket.join(roomID);
        await addUserToRoom(currentUser._id, roomID);
        await User.updateOne(
          { _id: socket.user._id, 'devices.token': socket.token },
          { $set: { 'devices.$.roomID': roomID, 'devices.$.lastActive': new Date() } }
        );

        let room = await Room.findOneAndUpdate(
          { roomID, 'member_data.id': currentUser._id.toString() },
          { $set: { 'member_data.$.joined_at': new Date(), 'member_data.$.leaved_at': null } },
          { new: true }
        );
        if (!room) {
          room = await Room.findOneAndUpdate(
            { roomID },
            { $push: { member_data: { id: currentUser._id.toString(), joined_at: new Date() } } },
            { new: true }
          );
        }
        if (!room) return socket.emit('error', { message: 'Room not found.' });

        socket.emit('applySettings', currentUser.settings);

        const memberObjectIds = room.members.map((id) => new mongoose.Types.ObjectId(id));
        const member_users = await User.find({ _id: { $in: memberObjectIds } })
          .select('username first_name last_name lastActive status')
          .lean();

        let otherUser = null;
        if (room.setting?.[0]?.type === 'PV_chat') {
          const otherId = room.members.find((m) => m !== currentUser._id.toString());
          if (otherId) {
            const other = await User.findById(otherId).select('username first_name last_name status lastActive').lean();
            if (other) {
              otherUser = {
                _id: other._id,
                username: other.username,
                first_name: other.first_name,
                last_name: other.last_name,
                fullName: `${other.first_name} ${other.last_name}`,
                status: other.status || 'offline',
                lastActive: other.lastActive,
              };
            }
          }
        }

        socket.emit('members', room.members);
        socket.emit('joined', { room, name: `${currentUser.first_name} ${currentUser.last_name}`, member_users, otherUser });
        getAttachmentsSummary(roomID)
          .then((summary) => socket.emit('attachmentsSummary', { roomID, summary }))
          .catch((err) => console.error('attachmentsSummary error', err));

        const recentMessages = await Message.find({ roomID }).sort({ timestamp: -1 }).limit(50).lean();
        const processed = await Promise.all(recentMessages.reverse().map((msg) => processMessage(msg)));
        const lastUnreadIndex = processed.findLastIndex(
          (msg) => !(msg.read || []).some((r) => r.username === currentUser._id.toString())
        );
        // roomID is included here (unlike the legacy app's equivalent
        // event) so a fast room switch can't misattribute a
        // still-in-flight response from a room the client already left.
        const payload = { roomID, messages: processed, prepend: true, join: true };
        if (lastUnreadIndex !== -1) {
          processed[lastUnreadIndex].readLine = true;
          payload.unread = true;
        }
        if (processed.length) {
          socket.emit('restoreMessages', payload);
        } else {
          socket.emit('noMoreMessages', { roomID, message: 'No older messages.' });
        }

        socket.broadcast
          .to(roomID)
          .emit('userJoined', { name: `${currentUser.first_name} ${currentUser.last_name}`, member_users, member_data: room.member_data });
      } catch (err) {
        console.error('joinRoom error', err);
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('leaveRoom', async ({ roomID } = {}) => {
      if (!roomID) return;
      socket.leave(roomID);
      socket.broadcast.to(roomID).emit('userLeft', { username: socket.user.username, roomID });
      socket.broadcast.to(roomID).emit('typing', { username: socket.user.username, isTyping: false });
    });

    socket.on('typing', async (data) => {
      try {
        const { isTyping, name, status } = data || {};
        const currentUser = await User.findOne({ _id: socket.user._id, 'devices.token': socket.token });
        const device = currentUser?.devices.find((d) => d.token === socket.token);
        if (!currentUser || !device?.roomID) return;
        socket.broadcast.to(device.roomID).emit('typing', { username: currentUser.username, name, status, isTyping });
      } catch (err) {
        console.error('typing error', err);
      }
    });

    socket.on('chat', async (data, callback) => {
      const tempId = data?.id;
      try {
        const currentUser = socket.user;
        const roomID = data?.roomID;
        if (!currentUser?._id) throw new Error('User not found.');

        const allowed = await authenticateRoom(roomID, currentUser._id.toString());
        if (!allowed) {
          socket.leave(roomID);
          return socket.emit('error', { message: 'Failed to send (no access).' });
        }

        const counterDoc = await Room.findOneAndUpdate(
          { roomID },
          { $inc: { seq: 1 } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        const id = `${roomID}-${1000000 + counterDoc.seq}`;

        const trimmed = (data?.message || '').trim();
        const clean = sanitizeMessage(trimmed);
        if (!clean && !data?.file && !data?.forward) throw new Error('no message.');

        const timestamp = new Date();
        const newMessage = new Message({
          id,
          roomID,
          sender: currentUser._id.toString(),
          quote: data?.quote ? `${roomID}-${data.quote}` : null,
          message: clean ? socketEncrypt(clean) : '',
          file: data?.file ? (Array.isArray(data.file) ? data.file : [data.file]) : null,
          forward: data?.forward || null,
          read: [{ username: currentUser._id.toString(), time: timestamp }],
          encrypt: true,
          timestamp,
        });
        await newMessage.save();

        const displayName = `${currentUser.first_name} ${currentUser.last_name}`;
        const room = await Room.findOneAndUpdate(
          { roomID },
          {
            $set: {
              lastUpdated: timestamp,
              last_content: socketEncrypt(clean ? `${displayName}: ${clean}` : `${displayName}: sent a file`),
            },
          },
          { new: true }
        );
        if (!room) throw new Error('Room not found!');

        const enriched = await processMessage(newMessage.toObject());
        if (typeof callback === 'function') callback({ success: true, messageId: tempId });
        io.in(roomID).emit('chat', enriched);
      } catch (err) {
        console.error('chat error', err);
        if (typeof callback === 'function') callback({ success: false, messageId: tempId, message: err.message });
        socket.emit('error', { message: err.message });
      }
    });

    // ---- pagination: load messages older than the oldest one currently shown ----
    socket.on('requestOlderMessages', async ({ roomID, beforeId } = {}) => {
      try {
        if (!roomID || !beforeId) return socket.emit('error', { message: 'Missing roomID/beforeId.' });
        const allowed = await authenticateRoom(roomID, socket.user._id.toString());
        if (!allowed) return socket.emit('error', { message: 'No access.' });

        const older = await Message.find({ roomID, id: { $lt: beforeId } })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();

        if (!older.length) return socket.emit('noMoreMessages', { roomID });

        const processed = await Promise.all(older.reverse().map((msg) => processMessage(msg)));
        socket.emit('restoreMessages', { roomID, messages: processed, prepend: true });
      } catch (err) {
        console.error('requestOlderMessages error', err);
        socket.emit('error', { message: err.message });
      }
    });

    // ---- edit / delete / delete_file ----
    socket.on('edit', async ({ messageId, new_message } = {}, callback) => {
      try {
        if (!messageId) throw new Error('Invalid messageId.');
        const { currentUser, roomID } = await getCurrentDeviceRoom(socket);
        if (!currentUser || !roomID) throw new Error('User not authenticated or not in a room.');

        const message = await Message.findOne({ id: messageId });
        if (!message) throw new Error('Message not found.');
        if (message.roomID !== roomID) throw new Error('Message does not belong to your current room.');
        if (message.sender !== currentUser._id.toString()) throw new Error('You can only edit your own messages.');

        const clean = sanitizeMessage(new_message);
        await Message.updateOne({ id: messageId }, { $set: { message: socketEncrypt(clean), edited: new Date() } });

        io.in(roomID).emit('edit', { messageId, new_message: clean });
        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        console.error('edit error', err);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('delete', async ({ messageId } = {}, callback) => {
      try {
        if (!messageId) throw new Error('Invalid messageId.');
        const { currentUser, roomID } = await getCurrentDeviceRoom(socket);
        if (!currentUser || !roomID) throw new Error('User not authenticated or not in a room.');

        const message = await Message.findOne({ id: messageId });
        if (!message) throw new Error('Message not found.');
        if (message.roomID !== roomID) throw new Error('Message does not belong to your current room.');
        if (message.sender !== currentUser._id.toString()) throw new Error('You can only delete your own messages.');

        for (const f of message.file || []) {
          if (f.file) await deleteFile(f.file.split('/').pop());
        }
        await Message.deleteOne({ id: messageId });
        await Room.findOneAndUpdate({ roomID }, { $set: { lastUpdated: new Date() } });

        io.in(roomID).emit('delete', { messageId });
        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        console.error('delete error', err);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('delete_file', async ({ fileId } = {}, callback) => {
      try {
        if (!fileId) throw new Error('Invalid fileId.');
        const { currentUser, roomID } = await getCurrentDeviceRoom(socket);
        if (!currentUser || !roomID) throw new Error('User not authenticated or not in a room.');

        const message = await Message.findOne({ 'file._id': fileId });
        const file = message?.file.find((f) => f._id.toString() === fileId);
        if (!message || !file) throw new Error('File not found.');
        if (message.roomID !== roomID) throw new Error('Message does not belong to your current room.');
        if (message.sender !== currentUser._id.toString()) throw new Error('You can only delete your own files.');

        await deleteFile(file.file.split('/').pop());
        await Message.updateOne({ 'file._id': fileId }, { $pull: { file: { _id: fileId } } });

        io.in(roomID).emit('delete_file', { fileId, messageId: message.id });
        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        console.error('delete_file error', err);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // ---- reactions ----
    socket.on('addReaction', async ({ messageId, reaction } = {}) => {
      try {
        const { currentUser, roomID } = await getCurrentDeviceRoom(socket);
        if (!currentUser || !roomID) throw new Error('User not found or not part of a room.');

        const message = await Message.findOne({ id: messageId });
        if (!message) throw new Error('Message not found');

        const uid = currentUser._id.toString();
        const existing = message.read.find((r) => r.username === uid);
        if (existing) existing.reaction = reaction;
        else message.read.push({ username: uid, reaction, time: new Date() });
        await message.save();

        io.in(message.roomID).emit('reactionAdded', { messageId, username: uid, reaction });
      } catch (err) {
        console.error('addReaction error', err);
        socket.emit('error', { message: 'Failed to add reaction.' });
      }
    });

    // ---- voice-note "heard" marker ----
    socket.on('voice_heared', async ({ file_id } = {}) => {
      try {
        const { currentUser, roomID } = await getCurrentDeviceRoom(socket);
        if (!currentUser || !roomID) throw new Error('User not found or not in a room.');

        const uid = currentUser._id.toString();
        // Flip voice_heared on the user's existing read entry if they have
        // one; otherwise push a fresh entry. Doing this as one atomic
        // $addToSet keyed only on username would risk a duplicate read
        // entry for the same user, so it's two explicit steps instead.
        const setResult = await Message.updateOne(
          { roomID, 'file._id': file_id, 'read.username': uid },
          { $set: { 'read.$.voice_heared': true } }
        );
        if (setResult.matchedCount === 0) {
          await Message.updateOne(
            { roomID, 'file._id': file_id },
            { $push: { read: { username: uid, time: new Date(), voice_heared: true } } }
          );
        }
        const updated = await Message.findOne({ roomID, 'file._id': file_id }).select('id');
        if (updated) io.in(roomID).emit('update_voice_heared', { file_id, username: uid, messageId: updated.id });
      } catch (err) {
        console.error('voice_heared error', err);
      }
    });

    // ---- read receipts ----
    socket.on('markMessagesRead', async ({ messageIds, roomID } = {}) => {
      try {
        if (!roomID || !Array.isArray(messageIds) || !messageIds.length) return;
        const currentUser = await User.findOne({ _id: socket.user._id, 'devices.token': socket.token });
        if (!currentUser) return;
        const uid = currentUser._id.toString();

        await Message.updateMany(
          { id: { $in: messageIds }, roomID, 'read.username': { $ne: uid } },
          { $addToSet: { read: { username: uid, time: new Date() } } }
        );

        const updated = await Message.find({ id: { $in: messageIds } }).select('id read').lean();
        updated.forEach((msg) => {
          socket.broadcast.to(roomID).emit('readMessageUpdate', { id: msg.id, readUsers: msg.read });
        });
      } catch (err) {
        console.error('markMessagesRead error', err);
      }
    });

    // ---- relays another member's live upload progress to the room ----
    socket.on('uploadProgress', async ({ progress, loaded, total } = {}) => {
      try {
        const { currentUser, roomID } = await getCurrentDeviceRoom(socket);
        if (!currentUser || !roomID || typeof progress !== 'number') return;
        io.in(roomID).emit('uploadProgress', { user: currentUser.username, progress, loaded, total });
      } catch (err) {
        console.error('uploadProgress error', err);
      }
    });

    socket.on('disconnect', () => {
      const username = onlineUsersServer.get(socket.id);
      onlineUsersServer.delete(socket.id);
      if (username) socket.broadcast.emit('typing', { username, isTyping: false });
    });
  });
}

module.exports = { registerChatEvents };
