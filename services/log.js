const Message = require('../models/message');
const User = require('../models/room')
const Room = require('../models/room')
const {processMessage,sendBackupToPHP,count_new_msg_room} = require('./messages_func'),
    {socketEncrypt,socketDecrypt} = require('./encryption')


async function Log_message(message,files=[],roomID='npmDtEwjElmn74vqmu') {
    const timestamp = new Date()
    const username = 'Heimdall'
    const counter = await Room.findOneAndUpdate(
        { roomID: roomID },           // Use roomID as the document _id (clean & efficient)
        { $inc: { seq: 1 } },
        { 
            upsert: true,                // Create if room doesn't exist yet
            new: true,                   // Return the UPDATED document (after increment)
            setDefaultsOnInsert: true    // Optional: if you have schema defaults
        }
        );

    const messageNumber = 1000000 + counter.seq;

    id = `${roomID}-${messageNumber}`;

    const newMessage = new Message({
        id: id,  // ID format: roomID-auto-increment number
        roomID: roomID,
        sender: username,
        quote: null,
        message: socketEncrypt(message),
        file: files??null, // Map over the uploaded file to structure them correctly
        read: [{ username, time: timestamp }], // <- Mark as read by sender
        members: [username],
        encrypt: true,
        timestamp,
    });
    await newMessage.save();
    let enrichedMessage = {
        ...newMessage.toObject(),
    };
    let encryptedMessage = await processMessage(enrichedMessage)  
    // io.in(roomID).emit("chat",await encryptedMessage,{ success: true });
    const room = await Room.findOneAndUpdate({ roomID : roomID},{$set:{lastUpdated:timestamp , 
        last_content: message ? socketEncrypt(`${username}: ${message}`) : socketEncrypt(`${username}: فایل ارسال کرده است`) 
    }});
    if (!room) throw new Error("Room not found!");

    const roomMembers = room.members; // لیست اعضای اتاق
    
    // گرفتن Socket ID کاربران از دیتابیس
    const onlineUsers = await User.find({ username: { $in: roomMembers } });

    let tempMessage;
    // ارسال پیام به تمام کاربران حاضر در اتاق
    onlineUsers.forEach(async (user) => {
        if (user.username != username) {

            if (user.username) {
                
                tempMessage = {
                    title: `New Message (MetaChat): ${room.roomName}`,
                    message: `${username}: \n${newMessage.message ? socketDecrypt(newMessage.message):'Sent You amessage'}`,
                    reciver:`${user.first_name} ${user.last_name}`,
                    timestamp
                };
            
                user?.devices.forEach(device=>{

                    if (device.socketID) {
                        tempMessage={
                            ...tempMessage,
                            sender: username,
                            roomID : roomID
                        }
                        io.to(device.socketID).emit("notification", tempMessage);
                    }
                })
                count_new_msg_room(room,user)
                sendBackupToPHP(user.username, tempMessage);
            }
        }
    });
}
module.exports = Log_message;
