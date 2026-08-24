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

const onlineUsersServer = new Map(); // socket.id -> username

async function authenticateRoom(roomID, uid) {
  const room = await Room.findOne({ roomID });
  if (!room) return false;
  if (!room?.setting?.[0]?.Joinable_url) return true;
  if (room.setting[0].Joinable_url === 'private' && !room.members.includes(uid)) return false;
  return true;
}

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

    socket.on('disconnect', () => {
      const username = onlineUsersServer.get(socket.id);
      onlineUsersServer.delete(socket.id);
      if (username) socket.broadcast.emit('typing', { username, isTyping: false });
    });
  });
}

module.exports = { registerChatEvents };
