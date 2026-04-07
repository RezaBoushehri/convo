// services/getYesterdayMessages.js
const Message = require('../models/message'),
    Room = require('../models/room'),
    axios = require('axios'),
    {socketEncrypt,encryptAES256} = require('./encryption')


async function message_encryption(){
        const message_encryption = await Message.find({}).lean()
        message_encryption.map(msg=> message_encryption_map(msg))

}

async function message_encryption_map(msg){
        await Message.findOneAndUpdate({id:msg.id, encrypt: (false || null)},{$set :{message: socketEncrypt(msg.message) , encrypt:true}}).then(msg=>{
            console.log(`${msg.id} is done.`)
        })
}


// ارسال پیام پشتیبان به PHP
async function sendBackupToPHP(Number, jsonMessage) {
    const encrypted = encryptAES256(JSON.stringify(jsonMessage));

    try {
        await axios.get(`https://mc.farahoosh.ir/missionform/missionform/notifications/notificationUsers.php?Number=${Number}&json=${encrypted}`);
        // console.log(`📨 پیام برای کاربر ${Number} به سرور PHP ارسال شد.`);
    } catch (err) {
        console.error(`❌ خطا در ارسال پیام به سرور PHP برای کاربر ${Number}:`, err.message);
    }
}

async function processMessage(msg) {
    const readUsers = await Promise.all(
        (msg.read || []).map(async (readEntry) => {
            return {
                
                username: (readEntry?.username), // رمزنگاری username
                reaction: readEntry?.reaction ??'', // رمزنگاری reaction
                voice_heared: readEntry?.voice_heared , // رمزنگاری reaction
                time: readEntry?.time.toString(), // رمزنگاری time
            };
        })
    );

    let replyMessage;
    if (msg.quote !== null) {
        replyMessage = await Message.findOne({ id: msg.quote }).select("sender message file").lean();
        if(replyMessage) {
            const replyFile =  replyMessage.file && replyMessage.file!==null ? replyMessage.file.map(file => file.fileType)[0] :  null ;
            replyMessage = {
                ...replyMessage,
                sender: socketEncrypt(replyMessage.sender), // رمزنگاری sender
                message: replyMessage.message, // رمزنگاری message
                file: replyFile??null, // رمزنگاری message
            }
        }else{
            replyMessage ={
                ...replyMessage,
                sender : '',
                message : socketEncrypt("This message has been deleted.")
            }
        }
    }

    return {
        ...msg,
        message: msg.message, // رمزنگاری message
        // voice: msg?.voice ? socketDecrypt(msg.voice): null, // رمزنگاری message
        reply: replyMessage || null,
        readUsers,
        readLine: false, // Mark unread messages with a readLine
    };
}
async function count_new_msg_room(room,user){
    if(!room || !user) return
    const u_data =  room?.member_data?.filter(m=> m.id == user._id)[0] ?? null
    const dateTofilter = u_data?.leaved_at??u_data?.joined_at
    if(dateTofilter){

        Message.find({ roomID: room.roomID ,timestamp: { $gte: new Date(dateTofilter) }}).sort({ timestamp: -1 }).then(messages => {
            let newMessageCount = 0
            newMessageCount = messages.filter(msg =>
                !msg.read.some(r => r.username === user.username) // Check if the user has NOT read it
            ).length;
            if(newMessageCount>0){
                user?.devices.forEach(device=>{
                    io.to(device.socketID).emit("roomList_newMessages", { room: room ,count: newMessageCount });
                })
    
            }
        })
    }else{
        Message.find({ roomID: room.roomID}).sort({ timestamp: -1 }).then(messages => {
            let newMessageCount = 0
            newMessageCount = messages.filter(msg =>
                !msg.read.some(r => r.username === user.username) // Check if the user has NOT read it
            ).length;
            if(newMessageCount>0){
                user?.devices.forEach(device=>{
                    io.to(device.socketID).emit("roomList_newMessages", { room: room ,count: newMessageCount });
                })
    
            }
        })

    }
}
async function getUnreadMessages(roomID, currentUser) {
    const room = await Room.findOne({roomID}).lean()
    const member_data_u = room?.member_data.filter(mem => mem.id == currentUser._id)[0] ?? null
    const time_toFilter = member_data_u ? member_data_u?.leaved_at ?? member_data_u?.joined_at : null
    const rawMessages = time_toFilter
                    ? await Message.find({ roomID , timestamp: { $lte: new Date(time_toFilter) }}).sort({ timestamp: -1 }).lean().limit(100)
                    : await Message.find({ roomID}).sort({ timestamp: -1 }).lean().limit(100)
    // Filter unread messages for the user
    const unreadMessages = rawMessages.filter((msg) => {
        const isUnread = !msg.read || !msg.read.some((r) => r.username === currentUser.username);
        return isUnread;
    });

    // Process unread messages
    const processedMessages = await Promise.all(unreadMessages.map((msg) => processMessage(msg)));

    // If there are any unread messages, set readLine:true for the last one
    if (processedMessages.length > 0) {
        processedMessages[processedMessages.length - 1].readLine = true; // Set readLine to true for the last message
    }

    return {processedMessages , count: processedMessages.length};
}
module.exports = {
    message_encryption,
    message_encryption_map,
    sendBackupToPHP,
    processMessage,
    getUnreadMessages,
    count_new_msg_room};
