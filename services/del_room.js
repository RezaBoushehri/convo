// services/getYesterdayMessages.js
const Message = require('../models/message');
const Room = require('../models/room');
const Log_message = require('./log')
const path = require("path")
const fs = require('fs').promises;
const uploadDir = path.join(__dirname, "../uploads");
// async function deleteFile(filePath){
//     if(!filePath) return
//     // Assuming files are saved on disk with filename stored in file.fileName
//     // Adjust the upload directory path according to your setup

//     try {
//         await fs.unlink(filePath);
//     } catch (err) {
//         if (err.code !== 'ENOENT') {
//             console.error(`Failed to delete file ${filePath}:`, err);
//         } else {
//             console.log(`File already missing (not found): ${filePath} >> ${err.message}`);
//         }
//     }

    
// }
function convertSize (size){
  const MB = 1024 * 1024
  const GB = MB * 1024
  if(size >= GB){
    return `${(size / GB).toFixed(2)} GB`
  }else{
    return `${(size / MB).toFixed(2)} MB`
  }
}
async function Folder_size(path_DIR = uploadDir){
    try {
      let size = 0;
      // 1️⃣ تمام نام فایل‌ها را از دیسک می‌خوانیم
      const diskFiles = await fs.readdir(path_DIR);
      // 2️⃣ به‌صورت متوالی (برای سادگی) هر فایل را چک می‌کنیم
      for (const fileName of diskFiles) {
        const fullPath = path.join(uploadDir,fileName)
        const stats = await fs.stat(fullPath);    
        size += stats.size
      }
      return size
    }
    catch(e){
      return 0;
    }
}
async function deleteFile(filePath) {  
  if (!filePath) return null; // مسیر نامعتبر
  const folder = path.dirname(filePath); // پوشه‌ای که فایل در آن است  
  let deletedSize = 0; // حجم فایلی که حذف می‌شود
  // 1️⃣ قبل از حذف، حجم فایل را بگیریم (اگر وجود داشته باشد)  
  try {    
    const stats = await fs.stat(filePath);    
    deletedSize = (stats?.size ?? 0);  
  } catch (err) {    
      if (err.code !== 'ENOENT') {
          console.error(`Failed to delete file ${filePath}:`, err);
      } else {
          console.log(`File already missing (not found): ${filePath} >> ${err.message}`);
          return {success:true , deletedSize} 
      }
            // اگر فایل از قبل وجود نداشته باشد، حجم حذف شده صفر می‌شود  
  }
  // 2️⃣ حذف فایل  
  try {    
    await fs.unlink(filePath);    
    console.log(`فایل حذف شد: ${filePath}`); 

    return {success:true , deletedSize} 
  } catch (err) {    
    if (err.code !== 'ENOENT') {      
      console.error(`خطا در حذف فایل ${filePath}:`, err);      
      throw err; //  
    }
  }
}

async function isFileReferenced(relativePath) {
  // findOne برمی‌گرداند: سند پیدا شده یا null
  const doc = await Message.findOne({ "file.file": relativePath }).lean();
  return doc !== null;
}

async function getOrphanFiles() {
  try {
    // 1️⃣ تمام نام فایل‌ها را از دیسک می‌خوانیم
    const diskFiles = await fs.readdir(uploadDir);   // => ['a.jpg','b.png', …]

    const orphanFiles = [];

    // 2️⃣ به‌صورت متوالی (برای سادگی) هر فایل را چک می‌کنیم
    for (const fileName of diskFiles) {
      // مسیر همان‌طور که در DB ذخیره می‌شود (مثلاً "/upload/a.jpg")
      const relativePath = `/uploads/${fileName}`;

      const existsInDb = await isFileReferenced(relativePath);

      if (!existsInDb) {
        console.log(`❌ فایل بدون رفرنس یافت شد: ${fileName}`);
        orphanFiles.push(fileName);
      } else {
        // اگر می‌خواهید لاگ موفقیت هم ببینید می‌توانید این خط را فعال کنید
        // console.log(`✅ ${fileName} در DB وجود دارد`);
      }
    }

    // 3️⃣ نمایش نهایی
    if (orphanFiles.length === 0) {
      console.log('✅ همهٔ فایل‌های پوشه به یک پیام در DB لینک دارند.');
    } else {
      console.log(`⚠️ مجموعاً ${orphanFiles.length} فایل بدون رفرنس پیدا شد.`);
    }

    return orphanFiles;
  } catch (err) {
    console.error('خطا در پردازش فایل‌ها:', err.message);
    return [];
  }
}

async function delete_OrphanFiles() {
    (async () => {
      
    let folder_size1 = await Folder_size()
    let files_size = 0;
    const orphans = await getOrphanFiles();
    let message = 'Files had no References:\n'
    // مثال: حذف خودکار (اختیاری)
    if(orphans.length> 0){

      
      for (const f of orphans) {
        const fullPath = path.join(uploadDir,f)
        let stats;
        try{
          stats = await fs.stat(fullPath);

        } catch (err) {    
            if (err.code !== 'ENOENT') {
                console.error(`Failed to delete file ${fullPath}:`, err);
            } else {
                console.log(`File already missing (not found): ${fullPath} >> ${err.message}`);
                continue
            }
                  // اگر فایل از قبل وجود نداشته باشد، حجم حذف شده صفر می‌شود  
        }
        await fs.unlink(fullPath);
        files_size +=  stats?.size??0;
        message += `file: ${f}\n`
        console.log('🗑️ حذف شد:', f);
      }
      let folder_size2 = await Folder_size()
      
      folder_size1 = convertSize(folder_size1)
      folder_size2 = convertSize(folder_size2)
      files_size = convertSize(files_size)
      message += '🗑️ حذف شد'
      message += `\n\n${folder_size1} Folder size first,\n-${files_size} files deleted,\n${folder_size2} Folder size now.`
    }else{
      message = 'کل امور طیب.'
    }
    Log_message(message)
    
    })();
}
// ======================== deleting public rooms=======================
async function room_managament(filter){
        console.log('filter',filter)
        const room = await Room.find(filter)
        console.log('room to change',room)
        Promise.resolve(()=>{room.map(rm=> async function(){
            console.log('removing=>',rm.roomName)
           await room_delete_messages(rm)
        })}).then(async ()=>{

            await Room.deleteMany(filter)
            console.log('done')
        })
}

async function delete_messages(ids) {
  try {
    // 1️⃣ دریافت پیام‌ها به‌صورت cursor (به‌جای آرایه)
    const cursor = Message.find({ _id: { $in: ids } }).cursor();
    let total_size = 0;
    let folder_total_size = 0;
    let anyDeleted = false;

    // 2️⃣ پیمایش یکی‑یکی
    for await (const message of cursor) {
      console.log('در حال حذف پیام با زمان:', message.timestamp);

      // ---------- حذف فایل‌های مرتبط ----------
      if (Array.isArray(message.file) && message.file.length) {
        for (const fileItem of message.file) {
          if (fileItem.file) {
            // فرض می‌کنیم مسیر ذخیره شده به صورت /uploads/xxxx.ext باشد
            const fileName = fileItem.file.split('/').pop();   // آخرین بخش مسیر
            const filePath = path.join(uploadDir, fileName);
            
            const res_delete = await deleteFile(filePath)
            if(!res_delete?.success) throw new Error("Somthing went wrong.");      
            total_size += res_delete?.deletedSize    
          }
        }
      }

      // ---------- حذف خود پیام ----------
      await Message.deleteOne({ _id: message._id });
      anyDeleted = true;   // حداقل یک پیام حذف شد
    }

    if (!anyDeleted) {
      // هیچ پیام مطابقتی پیدا نشد
      console.warn('پیامی برای حذف یافت نشد.');
    }
    folder_total_size = await Folder_size()
    folder_total_size = convertSize(folder_total_size)
    total_size = convertSize(total_size)
    return {success: anyDeleted, total_size , folder_total_size};
  } catch (err) {
    console.error('خطای حذف پیام‌ها:', err.message);
    return false;
  }
}
async function room_delete_messages(rm,date=new Date()){
       const msg =  await Message.find({roomID:rm.roomID})
       if(msg.length>0){
        msg.forEach(message=>async function(){
            const messageId = message.id
            // Extract roomID from message ID (format: roomID-1000001 etc.)
            const [roomIDFromId] = messageId.split('-');
            if (roomIDFromId !== currentUser.roomID) {
                throw new Error("Message does not belong to your current room.");
            }


            // === Handle file deletion if files exist ===
            if (message.file && Array.isArray(message.file) && message.file.length > 0) {


                // Assuming files are saved on disk with filename stored in file.fileName
                // Adjust the upload directory path according to your setup
                for (const fileItem of message.file) {
                    if (fileItem.file) {
                        const filePath = path.join(uploadDir,fileItem.file.split('/')[2]);
                        const res_delete = await deleteFile(filePath)
                        if(!res_delete?.success) throw new Error("Somthing went wrong.");
                    }
                }
            }

            // === Delete the message from database ===
            await Message.deleteOne({ id: messageId });

            

        })
       }
       console.log('msg==>',msg)
}
module.exports = {
    deleteFile,
    delete_OrphanFiles,
    room_managament,
    delete_messages,
    room_delete_messages};
