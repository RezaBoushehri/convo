// WebRTC call signaling (1:1 and mesh group voice/video). Ported from
// app.js's io.on('connection', ...) call:* handlers — same in-memory call
// state shape, same ring-timeout/device-switch/no-answer semantics. Runs
// as its own io.on('connection', ...) registration (socket.io allows more
// than one; the auth middleware from chatEvents.js's io.use() already ran
// by the time either fires, so socket.user/socket.token are available here
// too).
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const User = require('../../../../models/user');
const Room = require('../../../../models/room');

const CALL_RING_TIMEOUT_MS = 45000;
const TURN_CREDENTIAL_TTL_SECONDS = 24 * 60 * 60; // 24h, matches coturn's static-auth-secret scheme

const activeCalls = new Map(); // callId -> call
const roomActiveCallId = new Map(); // roomID -> callId

// Self-hosted STUN/TURN (coturn) config via env vars — falls back to
// Google's public STUN if STUN_URL isn't set. TURN is only added when both
// TURN_URL and TURN_SECRET are set (coturn's use-auth-secret mode).
function buildIceServers() {
  const iceServers = [{ urls: process.env.STUN_URL || 'stun:stun.l.google.com:19302' }];
  if (process.env.TURN_URL && process.env.TURN_SECRET) {
    const username = `${Math.floor(Date.now() / 1000) + TURN_CREDENTIAL_TTL_SECONDS}`;
    const credential = crypto.createHmac('sha1', process.env.TURN_SECRET).update(username).digest('base64');
    iceServers.push({ urls: process.env.TURN_URL, username, credential });
    if (process.env.TURNS_URL) iceServers.push({ urls: process.env.TURNS_URL, username, credential });
  }
  return iceServers;
}

function buildCallParticipant(socket) {
  return {
    socketId: socket.id,
    userId: socket.user._id.toString(),
    username: socket.user.username,
    fullName: `${socket.user.first_name} ${socket.user.last_name}`,
  };
}

function serializeCallParticipants(call) {
  return Array.from(call.participants.values());
}

// Calls aren't scoped to whoever currently has the chat room open — notify
// every joined participant plus everyone still being rung, on whichever
// socket/device they're actually on.
function notifyCall(io, call, event, payload, excludeSocketId = null) {
  const targets = new Set([...call.participants.keys(), ...call.ringingSocketIds.keys()]);
  if (excludeSocketId) targets.delete(excludeSocketId);
  targets.forEach((socketId) => io.to(socketId).emit(event, payload));
}

function endCall(io, callId, reason) {
  const call = activeCalls.get(callId);
  if (!call) return;
  if (call.ringTimeout) clearTimeout(call.ringTimeout);
  activeCalls.delete(callId);
  if (roomActiveCallId.get(call.roomID) === callId) roomActiveCallId.delete(call.roomID);
  notifyCall(io, call, 'call:ended', { callId, reason });
}

function removeParticipantFromCall(io, callId, socketId, reason) {
  const call = activeCalls.get(callId);
  if (!call || !call.participants.has(socketId)) return;
  call.participants.delete(socketId);
  call.ringingSocketIds.delete(socketId);
  if (call.participants.size === 0 || (call.participants.size <= 1 && call.ringingSocketIds.size === 0)) {
    endCall(io, callId, reason);
    return;
  }
  notifyCall(io, call, 'call:participant-left', { callId, socketId, reason });
}

// A person is one participant, not one per device/tab. If this user is
// already in the call from a different socket, don't silently add a
// second tile for them — make the caller confirm switching devices first.
function joinCall(io, callId, socket, callback, { forceSwitch = false } = {}) {
  const call = activeCalls.get(callId);
  if (!call) {
    callback?.({ success: false, message: 'Call has ended' });
    return;
  }

  const userId = socket.user._id.toString();
  const existingByUser = serializeCallParticipants(call).find((p) => p.userId === userId);

  if (existingByUser && existingByUser.socketId !== socket.id) {
    if (!forceSwitch) {
      callback?.({ success: false, code: 'already-in-call', message: "You're already in this call on another device" });
      return;
    }
    const oldSocketId = existingByUser.socketId;
    call.participants.delete(oldSocketId);
    io.to(oldSocketId).emit('call:device-switched', { callId });
    notifyCall(io, call, 'call:participant-left', { callId, socketId: oldSocketId, reason: 'switched-device' }, socket.id);
  }

  if (call.ringTimeout) {
    clearTimeout(call.ringTimeout);
    call.ringTimeout = null;
  }
  call.status = 'active';
  call.ringingSocketIds.delete(socket.id);

  // This user answered on this device — their other still-ringing devices
  // can stop ringing, they can't join separately anymore.
  Array.from(call.ringingSocketIds.entries()).forEach(([ringSocketId, ringUserId]) => {
    if (ringUserId === userId && ringSocketId !== socket.id) {
      call.ringingSocketIds.delete(ringSocketId);
      io.to(ringSocketId).emit('call:ended', { callId, reason: 'answered-elsewhere' });
    }
  });

  const existingParticipants = serializeCallParticipants(call);
  const participant = buildCallParticipant(socket);
  call.participants.set(socket.id, participant);

  callback?.({ success: true, callId, callType: call.callType, roomID: call.roomID, participants: existingParticipants });
  notifyCall(io, call, 'call:participant-joined', { callId, participant }, socket.id);
}

function registerCallEvents(io) {
  io.on('connection', (socket) => {
    socket.on('call:ice-servers', (data, callback) => {
      callback?.({ iceServers: buildIceServers() });
    });

    socket.on('call:invite', async ({ callType, forceSwitch } = {}, callback) => {
      try {
        if (callType !== 'audio' && callType !== 'video') {
          return callback?.({ success: false, message: 'Invalid call type' });
        }
        const currentUser = await User.findOne({ _id: socket.user._id, 'devices.token': socket.token });
        const deviceRoom = currentUser?.devices.find((d) => d.token === socket.token)?.roomID;
        if (!currentUser || !deviceRoom) {
          return callback?.({ success: false, message: 'Join a room before starting a call' });
        }

        const existingCallId = roomActiveCallId.get(deviceRoom);
        if (existingCallId && activeCalls.has(existingCallId)) {
          return joinCall(io, existingCallId, socket, callback, { forceSwitch });
        }

        const room = await Room.findOne({ roomID: deviceRoom });
        if (!room) return callback?.({ success: false, message: 'Room not found' });
        const isDirect = room.setting?.[0]?.type === 'PV_chat';

        const memberObjectIds = room.members
          .filter((id) => id !== currentUser._id.toString())
          .map((id) => new mongoose.Types.ObjectId(id));
        const otherMembers = await User.find({ _id: { $in: memberObjectIds } });

        const callId = uuidv4();
        const initiator = buildCallParticipant(socket);
        const call = {
          callId,
          roomID: deviceRoom,
          callType,
          isDirect,
          initiatorSocketId: socket.id,
          participants: new Map([[socket.id, initiator]]),
          ringingSocketIds: new Map(), // socketId -> userId
          status: 'ringing',
          ringTimeout: null,
        };

        otherMembers.forEach((member) => {
          member.devices?.forEach((device) => {
            if (device.socketID) call.ringingSocketIds.set(device.socketID, member._id.toString());
          });
        });

        call.ringTimeout = setTimeout(() => {
          if (activeCalls.get(callId)?.status === 'ringing') endCall(io, callId, 'no-answer');
        }, CALL_RING_TIMEOUT_MS);
        activeCalls.set(callId, call);
        roomActiveCallId.set(deviceRoom, callId);

        // Ring every device of every other member, regardless of which
        // room (or none) they currently have open.
        call.ringingSocketIds.forEach((memberUserId, socketId) => {
          io.to(socketId).emit('call:incoming', { callId, callType, roomID: deviceRoom, caller: initiator });
        });
        callback?.({ success: true, callId });
      } catch (error) {
        console.error('call:invite error:', error);
        callback?.({ success: false, message: 'Failed to start call' });
      }
    });

    socket.on('call:accept', ({ callId, forceSwitch } = {}, callback) => {
      if (!callId) return callback?.({ success: false, message: 'Missing callId' });
      joinCall(io, callId, socket, callback, { forceSwitch });
    });

    socket.on('call:decline', ({ callId } = {}) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      const decliner = buildCallParticipant(socket);
      call.ringingSocketIds.delete(socket.id);
      notifyCall(io, call, 'call:declined', { callId, by: decliner });
      if (call.isDirect && call.participants.size <= 1) endCall(io, callId, 'declined');
    });

    socket.on('call:leave', ({ callId } = {}) => {
      if (!callId) return;
      removeParticipantFromCall(io, callId, socket.id, 'left');
    });

    socket.on('call:signal', ({ callId, to, type, payload } = {}) => {
      const call = activeCalls.get(callId);
      if (!call || !to || !type) return;
      if (!call.participants.has(socket.id) || !call.participants.has(to)) return;
      io.to(to).emit('call:signal', { callId, from: socket.id, fromUser: buildCallParticipant(socket), type, payload });
    });

    socket.on('disconnect', () => {
      for (const call of Array.from(activeCalls.values())) {
        if (call.participants.has(socket.id)) {
          removeParticipantFromCall(io, call.callId, socket.id, 'disconnected');
        } else if (call.ringingSocketIds.has(socket.id)) {
          call.ringingSocketIds.delete(socket.id);
          if (call.participants.size === 0 && call.ringingSocketIds.size === 0) {
            endCall(io, call.callId, 'disconnected');
          }
        }
      }
    });
  });
}

module.exports = { registerCallEvents };
