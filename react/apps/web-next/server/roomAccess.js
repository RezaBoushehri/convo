const Room = require('../../../../models/room');

async function authenticateRoom(roomID, uid) {
  const room = await Room.findOne({ roomID });
  if (!room) return false;
  if (!room?.setting?.[0]?.Joinable_url) return true;
  if (room.setting[0].Joinable_url === 'private' && !room.members.includes(uid)) return false;
  return true;
}

module.exports = { authenticateRoom };
