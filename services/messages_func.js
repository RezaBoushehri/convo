// services/getYesterdayMessages.js
const Message = require('../models/message'),
    Room = require('../models/room'),
    axios = require('axios'),
    {socketDecrypt,socketEncrypt,encryptAES256_send_notif} = require('./encryption')


async function message_encryption(){
        const message_encryption = await Message.find({}).lean()
        message_encryption.map(msg=> message_encryption_map(msg))

}

async function message_encryption_map(msg){
        await Message.findOneAndUpdate({id:msg.id, encrypt: (false || null)},{$set :{message: socketEncrypt(msg.message) , encrypt:true}}).then(msg=>{
            console.log(`${msg.id} is done.`)
        })
}
function removePx(value) {
  // اگر رشته بود و px داشت، حذف کن
  if (typeof value === 'string') {
    return value.replace('px', '').trim();
  }
  // اگر عدد بود، برگردان
  return value;
}

function rgbToHex(rgb) {
    if(rgb) return null
    const match = rgb?.match(/^(\d+),\s*(\d+),\s*(\d+)$/) ?? null;
    if (!match) return rgb;
    
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
// ارسال پیام پشتیبان به PHP
async function sendBackupToPHP(Number, jsonMessage) {
    const encrypted = encryptAES256_send_notif(JSON.stringify(jsonMessage));
    try {
        await axios.get(`http://127.0.0.1/missionform/missionform/notifications/notificationUsers.php?Number=${Number}&json=${encrypted}`);
        
        console.log(`📨 پیام برای کاربر ${Number} به سرور PHP ارسال شد.`);
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
                sender: replyMessage?.sender, // رمزنگاری sender
                message: socketDecrypt(replyMessage?.message), // رمزنگاری message
                file: replyFile??null, // رمزنگاری message
            }
        }else{
            replyMessage ={
                ...replyMessage,
                sender : '',
                message : "This message has been deleted."
            }
        }
    }

    return {
        ...msg,
        message: socketDecrypt(msg?.message), // رمزنگاری message
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
                    io.to(device.socketID).emit("roomList_newMessages", { room: room ,count: newMessageCount , last_content:socketDecrypt(room?.last_content??'') });
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
async function getUnreadMessages(roomID = null, currentUser) {
    let allUnreadMessages = [];
    let totalLimit = 100; // مجموع پیام‌های نهایی

    // اگر roomID مشخص شده باشد، فقط همان یک اتاق بررسی شود
    if (roomID) {
        const roomsToCheck = [roomID];
        
        for (const currentRoomID of roomsToCheck) {
            // if (allUnreadMessages.length >= totalLimit) break;

            const room = await Room.findOne({ roomID: currentRoomID }).lean();
            if (!room) continue;

            const memberData = room?.member_data?.find(mem => mem.id === currentUser._id)??[];
            const timeToFilter = memberData ? (memberData.leaved_at ?? memberData.joined_at) : null;

            // ساخت شرط کوئری
            const filterCondition = timeToFilter 
                ? { roomID: currentRoomID, timestamp: { $lte: new Date(timeToFilter) } } 
                : { roomID: currentRoomID };

            // دریافت پیام‌ها (بدون فیلتر read در اینجا، چون می‌خواهیم همه را بررسی کنیم)
            const messages = await Message.find(filterCondition)
                .sort({ timestamp: -1 })
                .lean()
                .limit(100); // محدودیت بالا برای اطمینان از دریافت پیام‌های جدید

            // فیلتر کردن پیام‌های خوانده نشده
            const unread = messages.filter(msg => {
                if (!msg.read) return true;
                return !msg.read.some(r => r.username === currentUser.username);
            });

            // اضافه کردن به لیست نهایی (تا سقف 20)
            const remainingSlots = totalLimit - allUnreadMessages.length;
            allUnreadMessages = allUnreadMessages.concat(unread.slice(0, remainingSlots));
        }
    } else {
        // اگر roomID مشخص نیست، تمام اتاق‌های کاربر بررسی شود
        // فرض: کاربر در یک آرایه از roomIDها در دیتابیس یا متغیر دیگری ذخیره شده است
        // اگر لیست اتاق‌ها را ندارید، باید از یک کوئری مثل Room.find({ 'member_data.id': currentUser._id }) استفاده کنید
            const userRooms = await Room.aggregate([{  
                $match: { members: currentUser.username } }, 
                {  
                    $addFields: {   sortDate: { $ifNull: ["$lastUpdated", "$createdAt"] }  } }, 
                    {  $sort: { sortDate: -1 }
                }
            ]); 
        for (const room of userRooms) {
            if (allUnreadMessages.length >= totalLimit) break;

            const memberData = room?.member_data?.find(mem => mem.id === currentUser._id)??[];
            const timeToFilter = memberData ? (memberData.leaved_at ?? memberData.joined_at) : null;

            const filterCondition = timeToFilter 
                ? { roomID: room.roomID, timestamp: { $lte: new Date(timeToFilter) } } 
                : { roomID: room.roomID };

            const messages = await Message.find(filterCondition)
                .sort({ timestamp: -1 })
                .lean()
                .limit(100);

            const unread = messages.filter(msg => {
                if (!msg.read) return true;
                return !msg.read.some(r => r.username === currentUser.username);
            });

            const remainingSlots = totalLimit - allUnreadMessages.length;
            allUnreadMessages = allUnreadMessages.concat(unread.slice(0, remainingSlots));
        }
    }

    // پردازش نهایی پیام‌ها (اگر تابع processMessage نیاز است)
    const processedMessages = await Promise.all(
        allUnreadMessages.map(msg => processMessage(msg))
    );

    // تنظیم readLine برای آخرین پیام
    if (processedMessages.length > 0) {
        processedMessages[processedMessages.length - 1].readLine = true;
    }

    return { processedMessages, count: processedMessages.length };
}

async function show_message_onload(username){ 
        try {
            const user = await User.findOne({username})
            // فراخوانی تابع و دریافت نتیجه
            const result = await getUnreadMessages(null, user);
            
            // دسترسی به آرایه پیام‌ها
            const rawMessages = result.processedMessages || [];

            // تبدیل پیام‌ها به فرمت مورد نظر برای رندر
            const messages = rawMessages.map((m) => ({
                title: m.roomName || 'نام اتاق نامشخص', // اطمینان از وجود roomName
                message: socketDecrypt(m.message??''),
                roomID: m.roomID // فرض بر این است که roomID در پیام موجود است
            }));

            return {success:true,messages};
        } catch (error) {
            console.error("Error fetching messages:", error);
            return {success:false, error:"خطا در دریافت پیام‌ها"};
        }
}
module.exports = {
    message_encryption,
    message_encryption_map,
    sendBackupToPHP,
    removePx,
    rgbToHex,
    processMessage,
    getUnreadMessages,
    show_message_onload,
    count_new_msg_room};
