// services/getYesterdayMessages.js
const Room = require('../models/room');
const Message = require('../models/message');
const {delete_messages} = require('./del_room')
const Log_message = require('./log')

async function getMessagesUpToYesterday_file_delete(roomID=null,days_ago=1,only_files=true) {
    // 1️⃣ ساخت تاریخ «پایان دیروز» (23:59:59.999 دیروز)
    const endOfYesterday = new Date();

    endOfYesterday.setHours(23, 59, 59, 999);   // زمان UTC؛ اگر زمان محلی می‌خواهید setHours استفاده کنید
    endOfYesterday.setDate(endOfYesterday.getDate() - days_ago);
    let msgs ;
    let message='';
    const room = await Room.findOne({roomID})
    // 2️⃣ جستجو
    if(only_files){

        if(roomID){
    
            msgs = Message.find({
                roomID,
                timestamp: { $lte: endOfYesterday },
                "file.0":{$exists:true}
            }).sort({ timestamp: -1 }).cursor();   // اختیاری: جدیدترین‌ها اول
        }else{
            msgs = Message.find({
                timestamp: { $lte: endOfYesterday },
                "file.0":{$exists:true}
            }).sort({ timestamp: -1 }).cursor();   // اختیاری: جدیدترین‌ها اول
        }
    }else{
        if(roomID){
    
            msgs = Message.find({
                roomID,
                timestamp: { $lte: endOfYesterday },
            }).sort({ timestamp: -1 }).cursor();   // اختیاری: جدیدترین‌ها اول
        }else{
            msgs = Message.find({
                timestamp: { $lte: endOfYesterday },
            }).sort({ timestamp: -1 }).cursor();   // اختیاری: جدیدترین‌ها اول
        }
    }
    let msgIds= [];
    (async () => {
        for await (const msg of msgs) {
            msgIds.push(msg._id)
            // اینجا می‌توانید هر سند را به‌طور جداگانه پردازش کنید
            
        }
        if(msgIds.length>0){
            Promise.resolve(await delete_messages(msgIds)).then(res=>{
                console.log(res);
                message = `at ${new Date().toLocaleString('fa-IR')}
                                \nIn: ${room?.roomName??''} #${roomID}.
                                \n${msgIds.length} Messages deleted Successfuly before: ${endOfYesterday.toLocaleString('fa-IR')}
                                \nDeleted_size: ${res.total_size}
                                \nFolder_size: ${res.folder_total_size}`
                console.log(message);
                Log_message(message)
            })

        }else{
            
            message = `at ${new Date().toLocaleString('fa-IR')}\nIn: ${room?.roomName??''} #${roomID}.
                        \nNo any message to delete with file before: ${endOfYesterday.toLocaleString('fa-IR')}`
            console.log(message);
            // Log_message(message)

        }
    })();
  return msgs;
}
module.exports = getMessagesUpToYesterday_file_delete;
