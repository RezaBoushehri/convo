// Webhook ingestion for an external device (the original names it
// "Heimdall") that posts encrypted messages — ported from app.js's
// POST /upload_rtsp + services/log.js's Log_message(). Not a
// browser/session flow: auth is IP-allowlist + a shared encrypted-payload
// secret, matching the original.
//
// Simplified from the original Log_message(): drops the legacy PHP
// notification-backup call (sendBackupToPHP) — that pipeline is out of
// scope for this rewrite, same as elsewhere. The message is still written
// to Mongo and broadcast live to anyone with the target room open here.
const multer = require('multer');
const mongoose = require('mongoose');
const Message = require('../../../../models/message');
const Room = require('../../../../models/room');
const User = require('../../../../models/user');
const { socketEncrypt, decrypt } = require('../../../../services/encryption');
const { uploadDir } = require('./fileStore');
const { processMessage } = require('./processMessage');

const SECRET_KEY_RTSP = process.env.SECRETKEY_RTSP;
const RTSP_ROOM_ID = process.env.RTSP_ROOM_ID || 'npmDtEwjElmn74vqmu'; // matches services/log.js's default
const RTSP_USERNAME = process.env.RTSP_USERNAME || 'Heimdall';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/\s+/g, '_');
    cb(null, safeName);
  },
});
const upload = multer({ storage }).array('files');

async function logRtspMessage(io, message, files) {
  const timestamp = new Date();
  const counter = await Room.findOneAndUpdate(
    { roomID: RTSP_ROOM_ID },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const id = `${RTSP_ROOM_ID}-${1000000 + counter.seq}`;

  const newMessage = new Message({
    id,
    roomID: RTSP_ROOM_ID,
    sender: RTSP_USERNAME,
    quote: null,
    message: socketEncrypt(message || ''),
    file: files && files.length ? files : null,
    read: [{ username: RTSP_USERNAME, time: timestamp }],
    encrypt: true,
    timestamp,
  });
  await newMessage.save();

  const room = await Room.findOneAndUpdate(
    { roomID: RTSP_ROOM_ID },
    { $set: { lastUpdated: timestamp, last_content: socketEncrypt(`${RTSP_USERNAME}: ${message || 'sent a file'}`) } },
    { new: true }
  );
  if (!room) throw new Error('RTSP room not found');

  const enriched = await processMessage(newMessage.toObject());
  io.in(RTSP_ROOM_ID).emit('chat', enriched);

  const memberObjectIds = (room.members || []).map((id) => new mongoose.Types.ObjectId(id));
  const members = await User.find({ _id: { $in: memberObjectIds } }).select('devices').lean();
  members.forEach((user) => {
    (user.devices || []).forEach((device) => {
      if (device.socketID) {
        io.to(device.socketID).emit('notification', {
          sender: RTSP_USERNAME,
          title: `New message (MetaChat): ${room.roomName || RTSP_USERNAME}`,
          message: `${RTSP_USERNAME}: ${message || 'sent a file'}`,
          roomID: RTSP_ROOM_ID,
          timestamp,
        });
      }
    });
  });
}

function registerRtspRoute(app, io) {
  app.post('/rtsp/upload', (req, res) => {
    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.body.payload && (!req.files || !req.files.length)) {
        return res.status(400).json({ error: 'No message' });
      }
      try {
        const json = decrypt(req.body.payload, SECRET_KEY_RTSP);
        if (!json?.message) return res.status(401).json({ error: 'No message' });

        const savedFiles = (req.files || []).map((f) => ({
          file: `/uploads/${f.filename}`,
          fileName: Buffer.from(f.originalname, 'latin1').toString('utf8'),
          fileType: f.mimetype,
        }));

        await logRtspMessage(io, json.message, savedFiles);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('RTSP upload error:', error.message);
        res.status(400).json({ error: error.message });
      }
    });
  });
}

module.exports = { registerRtspRoute };
