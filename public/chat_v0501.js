
let roomID = $('#roomID').text()??''
localStorage.removeItem('last_room_joined_MC')

$('#roomID').text('');

const 
    $loadingElement = $('#loading'),
    name = document.getElementById("dropdownMenuButton"),
    message = document.getElementById("editable-message-text"),
    replyBox = document.getElementById("replyBox"),
    output = document.getElementById("output"),
    button = document.getElementById("button"),
    feedback = document.getElementById("feedback"),
    alertTag = document.getElementById("alert"),
    chat_window = document.getElementById("chat-window"),
    joinRoomName = document.getElementById("joinRoomName"),
    fileInput = document.getElementById("file-input"),
    headTag = document.getElementById('headTag'),
    options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "",
    }

let sentMessagesId=[],
    loadNextMessage = false;    
    sentMessagesIdLast=[],
    member_users ={},
    loadedForClicking=false,
    voice_playbackRate = localStorage.getItem('voice_playbackRate') ?? 1,

    hasScrolledDown = false; // Flag to track if the scroll has already occurred
let scrolling = true;
let lastMessageDate = null;
let headTagVal = null;
let lastProcessedDate = null;
let ProcessedDate = null;
let messagesCreated=[]
let messagesCreatedHandler=[]
let messageIdSplited=[]
let lastSender = null;
let unreadedScroll=0;
let NEED_TO_RELOAD_ROOM_UI=false


  // ❌ WebSocket در دسترس نبود، می‌ریم سراغ Socket.IO

// =====================
// for right click menu
const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;
// Function to disable scrolling
const disableScrolling = () => {
    output.removeEventListener("scroll", scrollLoader)

    // console.log("Scrolling disabled.");
};

// Function to enable scrolling
const enableScrolling = () => {
    output.addEventListener("scroll", scrollLoader)

    // console.log("Scrolling enabled.");
};

function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent);
}

if (isMobileDevice()) {
    console.log("This is not a computer (mobile or tablet).");
    // Add specific behavior for mobile/tablet
    document.querySelector('#chat-window #output').style.overflowY = 'auto'; // Example adjustment
}
// let previousLineCount = 1; // تعداد خطوط قبلی

// message.addEventListener('input', () => {

//     // محاسبه تعداد خطوط فعلی
//     const lineHeight = parseInt(window.getComputedStyle(message).lineHeight, 10); // ارتفاع خط از CSS
 
//      // تعداد خطوط فعلی
//      const currentLineCount = Math.ceil(message.scrollHeight / lineHeight);
 
//      // بررسی افزایش یا کاهش خطوط
//      if (currentLineCount !== previousLineCount) {
//          // محدود کردن تعداد خطوط به 5
//          const maxLines = 5;
//          const allowedLineCount = Math.min(currentLineCount, maxLines);
 
//          // محاسبه ارتفاع جدید بر اساس تعداد خطوط مجاز
//          const newHeight = allowedLineCount * lineHeight;
 
//          // محاسبه مدت زمان ترنزیشن بر اساس تغییرات ارتفاع
//          const heightDifference = Math.abs(newHeight - message.offsetHeight); // تفاوت بین ارتفاع فعلی و جدید
//          const transitionDuration = Math.min(heightDifference * 20, 1000); // مدت زمان ترنزیشن (محدود به 500ms)
 
//          // اعمال تغییرات در استایل
//          message.style.height = `${newHeight}px`;
//          message.style.transitionDuration = `${transitionDuration}ms`;
//          message.style.transform = `${transitionDuration}ms`;
//          // message.style.overflowY = currentLineCount > maxLines ? 'scroll' : 'hidden';
//         // محاسبه مقدار جابجایی به بالا (برای حفظ انیمیشن از بالا)
//         const translateY = -(newHeight ) / 2;
//         message.style.transform = `translateY(${translateY}px)`;
//         replyBox.style.transform = `translateY(${translateY - 5}px)`;
 
//          // به‌روزرسانی تعداد خطوط قبلی
//          previousLineCount = allowedLineCount-1;
 
//      }
//      if(previousLineCount<=1){
//          message.style.transform = `translateY(0px)`;
 
//      }
//     // Handle Excel table paste events
//     const pastedData = message.innerHTML;
//     if (pastedData.includes('<table')) {
//         // Clean up any Excel-specific formatting while preserving table structure
//         const cleanedTable = pastedData
//             // .replace(/^(<br>)+/g, '') // Remove leading <br> tags
//             .replace(/<table[^>]*>/g, '<table class="table table-bordered p-2" style="border-collapse: collapse; width: 100%; ">')
//             .replace(/<td[^>]*>/g, '<td class="border border-secondary p-1">')
//             .replace(/<th[^>]*>/g, '<th class="border border-secondary p-1">');
            
//         // Update message content with cleaned table
//         message.innerHTML = cleanedTable;
        
//         // Adjust height for table content
//         const tableHeight = message.scrollHeight;
//         message.style.height = `${Math.min(tableHeight, 200)}px`; // Cap at 200px height
//         message.style.overflowY = tableHeight > 200 ? 'auto' : 'hidden';
//     }
//     // Keep text direction RTL (right-to-left) for Persian/Arabic text
//     if (/[\u0600-\u06FF]/.test(message.textContent)) {
//         message.style.direction = 'rtl';
//         message.style.textAlign = 'right';
//     } else {
//         message.style.direction = 'ltr';
//         message.style.textAlign = 'left';
//     }
   
//     // // Only escape text nodes, preserve table structure
//     // message.innerHTML = message.innerHTML.replace(/[<>]/g, match => {
//     //     if (!message.innerHTML.includes('<table')) {
//     //         return (match);
//     //     }
//     //     return match;
//     // });

// })
// Handle paste events to clean Excel table formatting
function checkShowSendBtn(){
    if(message.innerText.trim() !== '' || fileInput.value){
        $('#chat_windowFooter #recordSection').prop('disabled', true).addClass('d-none');    
        $('#chat_windowFooter #button').prop('disabled', false).removeClass('d-none')
    }else{
        $('#chat_windowFooter #recordSection').prop('disabled', false).removeClass('d-none')
        $('#chat_windowFooter #button').prop('disabled', true).addClass('d-none');    
    }
}
message.addEventListener('paste', (e) => {
    // Allow default paste behavior first
    checkShowSendBtn()
    setTimeout(() => {
        const pastedData = message.innerHTML;
        if (pastedData.includes('<table')) {
            // Clean up Excel-specific formatting while preserving table structure
            const cleanedTable = pastedData
                .replace(/<table[^>]*>/g, '<table class="table rounded-0 table-bordered p-2" style="border-collapse: collapse; width: 100%; padding: ">')
                .replace(/<td[^>]*>/g, '<td class="border border-secondary p-1" >')
                .replace(/<th[^>]*>/g, '<th class="border border-secondary p-1">');
            
            // Update message content with cleaned table
            message.innerHTML = cleanedTable;
            
            // Adjust height for table content
            const tableHeight = message.scrollHeight;
            message.style.height = `${Math.min(tableHeight, 200)}px`;
            message.style.overflowY = tableHeight > 200 ? 'auto' : 'hidden';
        }
        
        // Sanitize the input while allowing table elements and Excel-specific attributes
        // message.innerHTML = DOMPurify.sanitize(message.innerHTML, {
        //     // ALLOWED_TAGS: ['table', 'thead', 'tbody', 'tr', 'td', 'th', 'br','img'],
        //     ALLOWED_ATTR: ['style', 'data-excel-formula', 'data-excel-value', 'data-excel-type']
        // });
    }, 0);
});
function join(newRoomID) {
    
    if (typeof socket !== 'undefined') {
        $loadingElement.removeClass('d-none').addClass('show')
        socket.emit("joinRoom", {
        roomID: newRoomID,
        });
        roomID = newRoomID;
    }
}
let cursor = null;
let loading = false;
let hasMore = true;
init_page()

function loadRooms(cache=false) {
    if (loading || !hasMore) return;

    loading = true;
    $loadingElement.removeClass('d-none').addClass('show')
    socket.emit("roomList", {
        cursor: cursor,
        cache
    });
}
$('#side_contact').on('scroll', () => {
    // محاسبه فاصله تا انتهای لیست
    const isNearBottom = $('#side_contact').scrollTop() + $('#side_contact').innerHeight() >= $('#side_contact')[0].scrollHeight - 1200;

    if (isNearBottom) {
        loadRooms();
    }
});
function init_page(join_Logic=true){
    $loadingElement.removeClass('d-none').addClass('show')

    if (roomID != "" && join_Logic) {
        console.log('roomID:',roomID) 
        join(roomID)
        
    }
    cursor = null;
    loading = false;
    hasMore = true;
    const cache_roomList = localStorage.getItem('roomList')??[]
    loadRooms(true)
    
    $(document).ready(()=>{

        if(localStorage.getItem('roomList')) room_list_genration(JSON.parse(cache_roomList))
    })


}


function emoji(messageId) {
    if (document.querySelectorAll('.stickerPicker')) {
        document.querySelectorAll('.stickerPicker').forEach(el => el.remove());
    }
        const emojiDiv = `
  <div id="emoji-${messageId}" class="stickerPicker blurBackDark show">
    <div id="emojiGrid">
        <div id="emojiContainer" >
                <!-- Emoji spans that will be rendered by Twemoji -->
                <span onclick="addStickerReaction('😂', ${messageId})" class="emoji">😂</span>
                <span onclick="addStickerReaction('👍', ${messageId})" class="emoji">👍</span>
                <span onclick="addStickerReaction('👎', ${messageId})" class="emoji">👎</span>
                <span onclick="addStickerReaction('❤️', ${messageId})" class="emoji">\u2764\uFE0F</span>
                <span onclick="addStickerReaction('🐈‍⬛', ${messageId})" class="emoji">🐈‍⬛</span>
                <span onclick="addStickerReaction('😊', ${messageId})" class="emoji">😊</span>
                <span onclick="addStickerReaction('👌', ${messageId})" class="emoji">👌</span>
                <span onclick="addStickerReaction('🗿', ${messageId})" class="emoji">🗿</span>
                <span onclick="addStickerReaction('🎉', ${messageId})" class="emoji">🎉</span>
                <span onclick="addStickerReaction('🔥', ${messageId})" class="emoji">🔥</span>
                <span onclick="addStickerReaction('🎈', ${messageId})" class="emoji">🎈</span>
                <span onclick="addStickerReaction('💯', ${messageId})" class="emoji">💯</span>
                <span onclick="addStickerReaction('😎', ${messageId})" class="emoji">😎</span>
                <span onclick="addStickerReaction('😍', ${messageId})" class="emoji">😍</span>
                <span onclick="addStickerReaction('😭', ${messageId})" class="emoji">😭</span>
                <span onclick="addStickerReaction('😢', ${messageId})" class="emoji">😢</span>
                <span onclick="addStickerReaction('😜', ${messageId})" class="emoji">😜</span>
                <span onclick="addStickerReaction('💀', ${messageId})" class="emoji">💀</span>
                <span onclick="addStickerReaction('🤔', ${messageId})" class="emoji">🤔</span>
                <span onclick="addStickerReaction('👀', ${messageId})" class="emoji">👀</span>
                <span onclick="addStickerReaction('🤩', ${messageId})" class="emoji">🤩</span>
                <span onclick="addStickerReaction('😎', ${messageId})" class="emoji">😎</span>
                <span onclick="addStickerReaction('🤗', ${messageId})" class="emoji">🤗</span>
                <span onclick="addStickerReaction('🥺', ${messageId})" class="emoji">🥺</span>
                <span onclick="addStickerReaction('😱', ${messageId})" class="emoji">😱</span>
                <span onclick="addStickerReaction('👏', ${messageId})" class="emoji">👏</span>
                <span onclick="addStickerReaction('😒', ${messageId})" class="emoji">😒</span>
                <span onclick="addStickerReaction('😤', ${messageId})" class="emoji">😤</span>
                <span onclick="addStickerReaction('😪', ${messageId})" class="emoji">😪</span>
                <span onclick="addStickerReaction('🥳', ${messageId})" class="emoji">🥳</span>
                <span onclick="addStickerReaction('🤨', ${messageId})" class="emoji">🤨</span>
                <span onclick="addStickerReaction('🤐', ${messageId})" class="emoji">🤐</span>
                <span onclick="addStickerReaction('😮', ${messageId})" class="emoji">😮</span>
                <span onclick="addStickerReaction('🥱', ${messageId})" class="emoji">🥱</span>
                <span onclick="addStickerReaction('🤯', ${messageId})" class="emoji">🤯</span>
                <span onclick="addStickerReaction('😋', ${messageId})" class="emoji">😋</span>
                <span onclick="addStickerReaction('😇', ${messageId})" class="emoji">😇</span>
                <span onclick="addStickerReaction('👆', ${messageId})" class="emoji">👆</span>
                <span onclick="addStickerReaction('✌', ${messageId})" class="emoji">✌</span>
                <span onclick="addStickerReaction('🙏', ${messageId})" class="emoji">🙏</span>
                <span onclick="addStickerReaction('💅', ${messageId})" class="emoji">💅</span>
                <span onclick="addStickerReaction('💪', ${messageId})" class="emoji">💪</span>
                <span onclick="addStickerReaction('🖐', ${messageId})" class="emoji">🖐</span>
                <span onclick="addStickerReaction('🤝', ${messageId})" class="emoji">🤝</span>
                <span onclick="addStickerReaction('✍', ${messageId})" class="emoji">✍</span>
                <span onclick="addStickerReaction('🤡', ${messageId})" class="emoji">🤡</span>
                <span onclick="addStickerReaction('😡', ${messageId})" class="emoji">😡</span>
                <span onclick="addStickerReaction('😰', ${messageId})" class="emoji">😰</span>
                <span onclick="addStickerReaction('🥶', ${messageId})" class="emoji">🥶</span>
                <span onclick="addStickerReaction('🥵', ${messageId})" class="emoji">🥵</span>
                <span onclick="addStickerReaction('👑', ${messageId})" class="emoji">👑</span>
                <span onclick="addStickerReaction('🧨', ${messageId})" class="emoji">🧨</span>
                <span onclick="addStickerReaction('🤍', ${messageId})" class="emoji">🤍</span>
                <span onclick="addStickerReaction('🧡', ${messageId})" class="emoji">🧡</span>
                <span onclick="addStickerReaction('💙', ${messageId})" class="emoji">💙</span>
                <span onclick="addStickerReaction('🤷‍♂️', ${messageId})" class="emoji">🤷‍♂️</span>
                <span onclick="addStickerReaction('⚡', ${messageId})" class="emoji">⚡</span>
                <span onclick="addStickerReaction('❌', ${messageId})" class="emoji">❌</span>
                <span onclick="addStickerReaction('✅', ${messageId})" class="emoji">✅</span>
                </div>
                <div class="show-all-icon btn" onclick="toggleEmojiContainer('${messageId}')">
                    <i class="bi bi-arrow-down-circle"></i>
                </div>
        </div>
    </div>
    `;
    return emojiDiv;
}
function toggleEmojiContainer(messageId) {
    const container = document.querySelector(`#emoji-${messageId} #emojiContainer`);
    const expendBtn = document.querySelector(`#emoji-${messageId} .show-all-icon`);
    const emojis = container.querySelectorAll(`span`);
    container.addEventListener('scroll', () => {
        const containerRect = container.getBoundingClientRect();
        emojis.forEach(emoji => {
          const emojiRect = emoji.getBoundingClientRect();
          const emojiCenter = (emojiRect.top + emojiRect.bottom) / 2;
          const containerCenter = (containerRect.top + containerRect.bottom) / 2;
  
          // Calculate distance from center
          const distanceFromCenter = Math.abs(containerCenter - emojiCenter);
  
          // Scale based on distance (smaller distance = larger scale)
          const scale = Math.max(0.8, 1 - distanceFromCenter / 100);
          emoji.style.transform = `scale(${scale})`;
        });
      });
    if (container && expendBtn) {
        container.classList.toggle('expanded');
        expendBtn.classList.toggle('rotated'); // Add a class to rotate the button
    }
}

// Call Twemoji to render the emojis after the DOM is ready
// function renderEmojis() {
//     twemoji.parse(document.body);  // This will replace all emojis with Twemoji images
// }

// Now, parse the emojiContainer to replace the emoji characters with Twemoji images
// twemoji.parse(emojiContainer);


// Set placeholder text
var placeholderText = "پیام دهید ...";

// Add the placeholder when the content is empty
function setPlaceholder() {
    if (message.textContent.trim() === "") {
        // message.textContent = placeholderText;
        message.style.transform = `translateY(0px)`;
        replyBox.style.transform = `translateY(0px)`;

    } 
}

// Trigger placeholder logic on focus and blur
message.addEventListener("focus", function() {
    setPlaceholder();

});

message.addEventListener("blur", function() {
    setPlaceholder();
});

// Initialize placeholder on page load
setPlaceholder();





document.getElementById('username').value = ''
let image = "";
let fileData ;

//=================================================================
//input image
// document.getElementById('file-inputBtn').addEventListener("click",()=>{
//     document.getElementById('file-input').click();
// })
$("#file-input").on("change", async (e) => {
   

    
    checkShowSendBtn()
    button.disabled = true;
    fileInput.disabled = true;
    const files = e.target.files;
    const maxSize = 50 * 1024 * 1024; // 10 MB in bytes
    try {
        Array.from(files).forEach(file=>{

            if (!file) {
                // ref("No file selected.",null,null,'warning');
                button.disabled = false;
                fileInput.disabled = false;
                document.getElementById('upload-container').remove();
                fileInput.value = '';
        
                return;
            }
        
            if (file.size > maxSize) {
                button.disabled = false;
                fileInput.disabled = false;
                document.getElementById('upload-container').remove();
                fileInput.value = '';
                showAlert("The file is too large. Maximum size allowed is 50 MB.",'warning');
        
                return;
            }
        
            const fileName = file.name.toLowerCase();
            // const harmfulExtensions = [];
            const harmfulExtensions = ['exe', 'bat', 'js', 'vbs', 'sh', 'pif', 'scr','apk','msi','cmd','com','cpl','gadget','hta','jar','jse','lnk','msc','msp','mst','paf','pif','ps1','reg','rgs','sct','shb','shs','u3p','vb','vbe','vbs','ws','wsc','wsf','wsh'];
            const fileExtension = fileName.split('.').pop();
        
            if (harmfulExtensions.includes(fileExtension)) {
                button.disabled = false;
                fileInput.disabled = false;
                document.getElementById('upload-container').remove();
                fileInput.value = '';
                showAlert("The selected file has a potentially harmful extension. Please upload a safe file.",'danger');
        
                return;
            }
        })
        createFileUI_message(files)


    } catch (error) {
        console.error("Error processing file:", error);
        fileInput.value = '';

        ref("An error occurred while processing the file.", 'danger');
    } finally {
        button.disabled = false;
        fileInput.disabled = false;
    }
    // document.getElementById('upload-container').remove();

});

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result); // Base64 encoded data
        reader.onerror = reject;
        reader.readAsDataURL(file); // Reads the file as base64
    });
}


// const message = document.getElementById("editable-message-text");
// =======================================================
// fouces inputDiv
// const replyBox1 = document.getElementById("replyBox");


//=================================================================
//input image
// document.getElementById('file-inputBtn').addEventListener("click",()=>{
//     document.getElementById('file-input').click();
// })
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result); // Base64 encoded data
        reader.onerror = reject;
        reader.readAsDataURL(file); // Reads the file as base64
    });
}




//=================================================================
//emit chat event (send message)
//=================================================================


// Offline Message Queue with localStorage persistence
const MESSAGE_QUEUE_KEY = 'chat_message_queue';

function getMessageQueue() {
    const queued = localStorage.getItem(MESSAGE_QUEUE_KEY);
    return queued ? JSON.parse(queued) : [];
}

function saveMessageQueue(queue) {
    localStorage.setItem(MESSAGE_QUEUE_KEY, JSON.stringify(queue));
}

async function enqueueMessage(dataEncrypt, dataShow) {
    const queue = getMessageQueue();
    const messageId = Date.now() + Math.random(); // Unique temp ID

    queue.push({
        id: messageId,
        encrypted: dataEncrypt,
        display: dataShow,
        attempts: 0,
        timestamp: new Date().toISOString()
    });

    saveMessageQueue(queue);

    // Add to UI with "pending" status
    await addMessageToChatUI({ ...dataShow, isPending: true, id: messageId }, true,null,null,"animate__faster animate__fadeIn");
    
    init_message_ui()
    return messageId;
}

function dequeueMessage(id) {
    let queue = getMessageQueue();
    queue = queue.filter(msg => msg.id !== id);
    saveMessageQueue(queue);
}

function clearMessageQueue() {
    localStorage.removeItem(MESSAGE_QUEUE_KEY);
}
function getReplyInfo(quoteId) {
    // quoteId is the full message ID like "room123-1000005"
    console.log(quoteId)
    if (!quoteId) return null;

    const messageElement = document.getElementById(`Message-${quoteId}`);
    if (!messageElement) {
        console.warn("Quoted message not found in DOM:", quoteId);
        return null;
    }

    const sender = messageElement?.querySelector('h6') ? messageElement?.querySelector('h6').innerText : '';
    const handle = sender === currentUser.username ? 'من' : sender;

    // Get the actual message text (cleaned)
    const messageContent = messageElement.querySelector('.dataMessage');
    const messageText = messageContent 
        ? messageContent.innerHTML.replace(/<br>/g, '\n').trim()
        : 'Original message';

    // Limit preview length
    const truncatedMessage = messageText.length > 100 
        ? messageText.substring(0, 100) + '...' 
        : messageText;

    return {
        sender,
        handle,
        quote: quoteId,
        message: truncatedMessage
    };
}
function prepareFileDetails(fileData) {
    if (!fileData) return null;

    // Normalize to array
    const filesArray = Array.isArray(fileData) ? fileData : [fileData];

    return filesArray.map(file => ({
        file: file.file || file.fileData || file.dir || '', // server path (e.g., /uploads/xyz.jpg)
        fileType: file.fileType || file.type || 'application/octet-stream',
        fileName: file.fileName || file.name || 'unknown.file'
    }));
}



    // تعریف متغیرهای سراسری
    let stream, mediaRecorder, startTime, timerInterval;
    let chunks = [];

    // ---------- توابع کمکی ----------
    function createBtn(id, iconClass, title) {
        // دکمه‌ای با Bootstrap Icon می‌سازد
        return $(`
            <button id="${id}" type="button" class="btn btn-outline-secondary btn-color "
                    data-bs-toggle="tooltip" title="${title}">
                <i class="${iconClass}"></i>
            </button>
        `);
    }

    function updateTimer(){
        const elapsed = Date.now()-startTime
        const minutes = Math.floor(elapsed/60000)
        const seconds = Math.floor((elapsed% 60000)/ 1000)
        const centi = Math.floor((elapsed% 1000)/ 10)
        
        const mm = String(minutes).padStart(2,'0')
        const ss = String(seconds).padStart(2,'0')
        const cc = String(centi).padStart(2,'0')
        $('#recordStatus #timer').text(`${mm}:${ss}.${cc}`)
    }
    // ---------- شروع ضبط ----------
    $('#chat_windowFooter #recordBtn').on('click', async () => {
        // مخفی کردن بخش متن و تغییر ظاهر دکمه‌ها
        $('#chat_windowFooter #editable-message-text')
           .fadeOut()

        // گرفتن استریم میکروفن
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.ondataavailable = e => chunks.push(e.data);

        

        mediaRecorder.start();
        if(mediaRecorder){
            // Emit "typing" event with correct property name
            socket.emit("typing", { 
                name: name.textContent.trim(), // Replace with your actual username variable
                username: typeUsername, // Replace with your actual username variable
                status: 'voice_record',
                isTyping: true 
            });
        }
        // ---------- UI ضبط ----------
        // دکمه‌های Pause و Cancel را می‌سازیم
        const $pauseBtn   = createBtn('pauseBtn',   'bi bi-pause-fill',   'مکث');
        const $cancelBtn  = createBtn('cancelBtn',  'bi bi-x-circle',    'لغو');

        $('#recordControls').empty().append($pauseBtn, $cancelBtn);
        $('#recordStatus').removeClass('d-none').addClass('d-flex')
        startTime = Date.now()
        timerInterval = setInterval(updateTimer, 10);
        // حالت اولیه دکمه‌ها
        $('#chat_windowFooter #recordBtn')
            .prop('disabled', true)
            .fadeOut()
            .addClass('animate__fadeOutLeft')
            .removeClass('animate__fadeInLeft');

        $('#chat_windowFooter #stopBtn')
            .prop('disabled', false)
            .removeClass('animate__fadeOutRight d-none')
            .addClass('animate__fadeInRight')
            .show();

        $('#chat_windowFooter .message_btn')
            .addClass('d-none');
    });

    // ---------- توقف ضبط (دکمه Stop) ----------
    $('#chat_windowFooter #stopBtn').on('click', () => {
        mediaRecorder.onstop = () => {
            const replyBox = document.getElementById('replyBox');
            const quote = replyBox.getAttribute('reply-id') || null;
            let text = message.innerHTML.trim();
            text = DOMPurify.sanitize(text, {
                ALLOWED_TAGS: ['table','thead','tbody','tr','td','th','br'],
                ALLOWED_ATTR: ['style','data-excel-formula',
                            'data-excel-value','data-excel-type']
            });
            // (در صورت نیاز به پردازش data‑excel‑formula همانند کد قبلی)

            const blob = new Blob(chunks, { type: 'audio/webm' });
            chunks = [];

            const reader = new FileReader();
            reader.onload = () => voice_upload(text, quote, blob);
            reader.readAsArrayBuffer(blob);
        };
        stopRecording();

    });

    // ---------- Pause ----------
    $('#recordControls').on('click', '#pauseBtn', () => {
        if (!mediaRecorder) return;

        if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            // آیکون را به Play تغییر می‌دهیم
            $('#pauseBtn i')
                .removeClass('bi-pause-fill')
                .addClass('bi-play-fill')
                .parent()
                .attr('title', 'ادامه');
            clearInterval(timerInterval)
        } else if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            $('#pauseBtn i')
                .removeClass('bi-play-fill')
                .addClass('bi-pause-fill')
                .parent()
                .attr('title', 'مکث');
            timerInterval = setInterval(updateTimer, 10);

        }
    });

    // ---------- Cancel ----------
    $('#recordControls').on('click', '#cancelBtn', () => {  
        stopRecording()
    });

    // ---------- تابع مشترک برای توقف (Stop یا Cancel) ----------
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();   // onstop اجرا می‌شود
            socket.emit("typing", { 
                name: name.textContent.trim(), // Replace with your actual username variable
                username: typeUsername, // Replace with your actual username variable
                status: 'voice_record',
                isTyping: false 
            });
        }
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            stream = null;
        }
        // Emit "typing" event with correct property name
        
        timer_reset()
        resetUI();
    }
    function timer_reset(){
        $('#recordStatus #Timer').text('00:00.00')
        $('#recordStatus').removeClass('d-flex').addClass('d-none')
        timerInterval = null
    }
    // ---------- بازگرداندن UI به حالت اولیه ----------
    function resetUI() {
        checkShowSendBtn()

        $('#chat_windowFooter #editable-message-text')
            .fadeIn()
        $('#chat_windowFooter .message_btn')
            .removeClass('d-none animate__fadeOut')
            .addClass('animate__animated animate__fadeIn')
            .show();

        $('#chat_windowFooter #recordBtn')
            .prop('disabled', false)
            .removeClass('animate__fadeOutLeft')
            .addClass('animate__fadeInLeft')
            .fadeIn();

        $('#chat_windowFooter #stopBtn')
            .prop('disabled', true)
            .removeClass('animate__fadeInLeft')
            .addClass('animate__fadeOutRight')
            .fadeOut()

        $('#recordControls').empty();   // حذف دکمه‌های Pause/Cancel
    }

    function createUploadUI(username) {
        let user =  member_users.filter(u=> u.username==username)[0]
        let name = 'N/A'
        if(user.username == currentUser.username){
            name = 'من'
        }else{
            name = user?.first_name && user?.last_name ? `${user?.first_name} ${user?.last_name}` : username
        }
        if (!document.getElementById(`${username}_upload-container`)) {
            $('#output').append(`
            <div id="${username}_upload-container" class="px-5 rounded col-auto mx-auto m-1  backdrop-blur-chat-fg"
                style="justify-content:flex-end; display:flex; flex-direction:column;
                    color:var(--color-peer-${username}) !important;border-radius: 5px var(--user-border-radius) var(--user-border-radius) var(--user-border-radius);
                    border: 2px solid var(--color-peer-${username}) !important;
                "> 
                <span id="upload-info" dir="auto">${name} درحال بارگزاری فایل... </span>
                
                <div class="progress">    
                    <div id="upload-progress" class="progress-bar bg-success progress-bar-striped progress-bar-animated" value="0" max="100">
                        0%
                    </div>
                </div>
                <div class="row col-12">
                    <span id="upload-status" class=" col-auto jdate"></span>
                    <span class="loader d-none col-auto jdate">در حال ارسال...</span>
                </div>
            </div>
                `);
        }
    } 
    function createFileUI_message (files){
        $('#file-input_res').removeClass('d-none').html('')
        
        Array.from(files).forEach((file,index)=>{

            const fileURL = URL.createObjectURL(file);
           $('#file-input_res').append(`
               
                   <div class="col-auto rounded-1 badge px-3 gap-1 d-flex bg-primary shadow">
                       <button class="btn btn-sm btn-close col-auto m-auto" onclick="$('#file-input_res').addClass('d-none');$('#file-input').val('');fileData=null"></button>
                       <img class="rounded-1" src="${fileURL}" width="auto" height="50" onerror="$(this).remove();$('#${index}_ICON').removeClass('d-none')" loading="lazy"  >
                       <div class="m-auto col-auto row">
                           <i id="${index}_ICON" class="bi fs-5 m-auto d-none col-auto fileIcon bi-filetype-${(file.name).split('.')[1]}"></i> 
                           <span class="col-auto m-auto">${file.name || 'Unknown File'}</span>
                           <span class="text-small m-auto col-auto">${convertSize(file.size)}</span>
                       </div>
                   </div>
   
           `)
        })
        
    }
    function convertSize (size){
        const MB = 1024 * 1024
        const GB = MB * 1024
        if(size >= GB){
            return `${(size / GB).toFixed(2)} GB`
        }else{
            return `${(size / MB).toFixed(2)} MB`
        }
    }
    socket.on("uploadProgress", (data) => {
        const isNearBottom =output.scrollHeight - output.scrollTop - output.clientHeight < 120
        createUploadUI(data.user);
        // if(data.progress == 100) $(`#${data.user}_upload-container .loader`).removeClass('d-none') TODO: work later
        if(data.progress == 100) $(`#${data.user}_upload-container`).remove()
        $(`#${data.user}_upload-container #upload-progress`).val(data.progress).css('width',`${data.progress}%`);  
        $(`#${data.user}_upload-container #upload-status`).text(`${convertSize(data.loaded)} / ${convertSize(data.total)} `);
        $(`#${data.user}_upload-container #upload-progress`).text(`${Math.round(data.progress)}%`);
        if(isNearBottom) scrollDown()
    });
button.addEventListener("click", async () => {
    const replyBox = document.getElementById('replyBox');
    const quote = replyBox.getAttribute('reply-id') || null;
    
    // Assuming 'message' is your contenteditable div or input
    let text = message.innerHTML.trimStart().trimEnd();

    const fileInput = document.getElementById('file-input');
    const files = fileInput.files || null;   // fixed: .files, not .target.files

    // ───────────────────────────────────────────────
    // Early validation (before any network activity)
    // ───────────────────────────────────────────────
    if ((text === '' || text === placeholderText) && files.length == 0) {
        showAlert("Message cannot be empty");
        return;
    }

    // ───────────────────────────────────────────────
    // Sanitize rich text (your original logic)
    // ───────────────────────────────────────────────
    // text = DOMPurify.sanitize(text, {
    //     ALLOWED_TAGS: ['table', 'thead', 'tbody', 'tr', 'td', 'th', 'br'],
    //     ALLOWED_ATTR: ['style', 'data-excel-formula', 'data-excel-value', 'data-excel-type']
    // });

    if (text.includes('data-excel-formula')) {
        text = text.replace(/data-excel-formula="([^"]*)"/g, (match, formula) => {
            return `data-excel-formula="${encodeURIComponent(formula)}"`;
        });
    }

    // text = text.trim();
    
    // ───────────────────────────────────────────────
    // Prepare to send — two paths: with file vs without
    // ───────────────────────────────────────────────
    clearInputFields();
    if(text !== '') $('#chat_windowFooter #editable-message-text').focus()

    if (files?.length ==0 ) {
        // No file → send directly
        await sendMessage(text, null, quote);
        return;
    }else{

        const maxSize = 50 * 1024 * 1024; // 10 MB in bytes
        Array.from(files).forEach(file=>{
            console.log(file)
            if (file.size > maxSize) {
                button.disabled = false;
                fileInput.disabled = false;
               $('#file-input_res').addClass('d-none').html('');
                fileInput.value = '';
                showAlert("The file is too large. Maximum size allowed is 50 MB.",'warning');
    
                return;
            }
    
            const fileName = file.name.toLowerCase();
            // const harmfulExtensions = [];
            const harmfulExtensions = ['exe', 'bat', 'js', 'vbs', 'sh', 'pif', 'scr','apk','msi','cmd','com','cpl','gadget','hta','jar','jse','lnk','msc','msp','mst','paf','pif','ps1','reg','rgs','sct','shb','shs','u3p','vb','vbe','vbs','ws','wsc','wsf','wsh'];
            const fileExtension = fileName.split('.').pop();
    
            if (harmfulExtensions.includes(fileExtension)) {
                button.disabled = false;
                fileInput.disabled = false;
                $('#file-input_res').addClass('d-none').html('');
                fileInput.value = '';
                showAlert("The selected file has a potentially harmful extension. Please upload a safe file.",'danger');
    
                return;
            }
        })
    }

    // ── Has file → upload first ────────────────────────────────



    const formData = new FormData();
    Promise.resolve(Array.from(files).forEach(file=>{
        console.log(`appending:`, file)
        formData.append("files", file);
    })).then(()=>{
                        fileInput.value = '';
    })
    const xhr = new XMLHttpRequest();
    xhr.withCredentials= true
    xhr.open("POST", "https://mc.farahoosh.ir:4000/upload", true);

    // ── Progress events ──
    xhr.upload.onprogress = (e) => {

        let percent = (e.loaded / e.total) * 100;
        if(percent == 100) {
            $(`#${currentUser.username}_upload-container #upload-progress`).val(percent); 
            $(`#${currentUser.username}_upload-container #upload-progress`).text(`${Math.round(percent)}%`);
        }
        socket.emit("uploadProgress", { progress: percent , loaded: e.loaded, total: e.total});
    };
    xhr.onload = async () => {
        
        if (xhr.status === 200) {
            let fileData;
            try {
                const response = JSON.parse(xhr.responseText);
                fileData = response.fileData || response; // adjust depending on your server response
                fileInput.value = '';

                showAlert('فایل ارسال شد','success')
                // setTimeout(async () => {
                    await sendMessage(text, fileData, quote);
                    socket.emit("uploadProgress", { progress: 100 , loaded: 0, total: 0});

                // }, 500);
            } catch (err) {
                console.error("Bad JSON from upload server", err);
                showAlert("File uploaded but server response invalid", "warning");
                fileData = null;
            }

            // Now send the chat message with the file info
            // await sendMessage(text, fileData, quote);

            // Clean up file input
            fileInput.value = '';

            // Optional: remove any upload preview/UI
            const uploadContainer = document.getElementById('upload-container');
            if (uploadContainer) uploadContainer.remove();

        } else {
            console.error("Upload failed", xhr.status, xhr.responseText);
            showAlert(`Failed to upload file (${xhr.status})`, "danger");
            // You may still want to send text-only message here — or not
            await sendMessage(text, null, quote); 
        }

    };

    xhr.onerror = () => {
        if (progressContainer) progressContainer.style.display = 'none';
        showAlert("Network error during file upload", "danger");
    };

    xhr.send(formData);
});
// ────────────────────────────────────────────────────────────────
// Main message sending logic — called in both paths
// ────────────────────────────────────────────────────────────────


async function voice_upload(text,quote,blob){
    if(!blob) return null
    clearInputFields()
    const xhr = new XMLHttpRequest();
            xhr.withCredentials= true
            
            xhr.open("POST", "https://mc.farahoosh.ir:4000/upload", true);

            const formData = new FormData();
            formData.append("files", blob,`${currentUser.room}_${currentUser.username}.webm`);
            console.log(formData)
            // return null
            // ── Progress events ──
            xhr.upload.onprogress = (e) => {
              let percent = (e.loaded / e.total) * 100;
              socket.emit("uploadProgress", {progress: percent});
              $(`#${currentUser.username}_upload-container #upload-progress`).val(percent); 
                $(`#${currentUser.username}_upload-container #upload-progress`).text(`${Math.round(percent)}%`);
            };
            xhr.onload = () => {
                // Hide / reset progress UI

                if (xhr.status === 200) {
                    let fileData;
                    try {
                        const response = JSON.parse(xhr.responseText);
                        fileData = response.fileData || response; // adjust depending on your server response
                        console.log("File uploaded:", fileData);

                        sendMessage(text,fileData,quote)
                    } catch (err) {
                        console.error("Bad JSON from upload server", err);
                        showAlert("Audio uploaded but server response invalid", "warning");
                        return null;
                    }


                    // Optional: remove any upload preview/UI
                    const uploadContainer = document.getElementById('upload-container');
                    if (uploadContainer) uploadContainer.remove();

                } else {
                    console.error("Upload failed", xhr.status, xhr.responseText);
                    showAlert(`Failed to upload Audio (${xhr.status})`, "danger");
                    // You may still want to send text-only message here — or not
                    return null
                }
            };

            xhr.onerror = () => {
                
                showAlert("Network error during file upload", "danger");
                return null
            };

        await xhr.send(formData);     
} 
async function sendMessage(text=null, fileData, quote) {
    let messID = `${roomID}-${Date.now() + Math.random()}`;
    let data = {
        id: messID,
        username: currentUser.username,
        quote: quote,
        message: text === placeholderText ? '' : text,
        file: fileData || null,
        date: new Date(),
    };
    // Encrypted version for socket
    let dataEncrypt = {
        id: messID,
        username: (currentUser.username),
        roomID: (roomID),
        quote: (quote || ''),
        message: (text === placeholderText ? '' : text),
        file: fileData || null,           // ← usually not encrypted
        date: new Date(),
    };
    

    // Prepare data for UI rendering
    const replyInfo = quote ? getReplyInfo(quote) : null;
    const fileDetails = fileData ? prepareFileDetails(fileData) : null;

    let dataShow = {
        ...data,
        file: fileDetails || '',
        quote: quote ? `${roomID}-${quote}` : null,
        sender: currentUser.username || '',
        reply: replyInfo,
    };

    const $button = $('#chat_windowFooter #button')
    const button_html = $button.html()
    
    try {
        let tempMessageId;

        if (socket.connected) {

            $button.prop('disabled',true).html(`
                <div class="spinner-border col-auto text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
                </div>
            `)
            // Prepare plain data (for UI / optimistic update)
            console.log(data)
            if ((!data.message && !data.file) || !data.username) {
                showAlert("Message cannot be empty", "warning");
                return;
            }

            
            console.log('send ID:', messID)

            // Show message immediately with "sending" state
            tempMessageId = await addMessageToChatUI({ ...dataShow, isPending: true },null,null,null,"animate__faster animate__fadeInUp");
            init_message_ui()
        } else {
            // Offline → queue
            tempMessageId = enqueueMessage(dataEncrypt, dataShow);
            showAlert("You're offline. Message queued.", "warning");
        }

        // Try to send (with your retry logic)
        sendWithRetry(dataEncrypt, dataShow, tempMessageId);

    } catch (err) {
        console.error("roomCounterId failed", err);
        showAlert("Failed to prepare message", "error");
    }finally{

        // Clear input fields right away (optimistic UX)

        // Scroll to bottom
        $('#chat_windowFooter #recordSection').prop('disabled', false).removeClass('d-none')
        $('#chat_windowFooter #recordBtn').prop('disabled', false).removeClass('d-none')
        $button.prop('disabled',true).html(button_html).addClass('d-none')
        output.scrollTo({ top: output.scrollHeight, behavior: "smooth" });
    }

}
// Helper: clear inputs
function clearInputFields() {
    message.innerHTML = "";
    // message.style.height = "36px";
    // message.style.transform = `translateY(0px)`;
    replyBox.style.transform = `translateY(0px)`;
    $('#file-input_res').addClass('d-none');
    fileData = "";
    clearReply();
}

function showAlert(msg, type = "error") {
    res_alert(msg,type,5000)
}


function sendWithRetry(dataEncrypt, dataShow, isRetry = false) {
    NEED_TO_RELOAD_ROOM_UI = true
    socket.emit("chat", dataEncrypt, (ack) => {
        if (ack && ack.success) {
            $('#output .unread').remove()
            // Success: remove from queue if exists, update UI
            dequeueMessage(ack.messageId);
            updateMessageStatus(ack.messageId, 'sent'); // e.g., add ✓✓
        } else {
            // Failed: queue it (unless it's already queued)
            console.warn("Send failed, queuing message");
            if (!isRetry) {
                enqueueMessage(dataEncrypt, dataShow); // Re-queue with new ack.messageId if needed
            }
            updateMessageStatus(ack.messageId, 'failed');
            showAlert(ack.message, 'danger');
        }
    });
}


socket.on("connect", () => {
    console.log("Connected! Sending queued messages...");

    let queue = getMessageQueue();
    if (queue.length === 0) return;

    showAlert(`Sending ${queue.length} queued message(s)...`, "info");

    queue.forEach(item => {
        item.attempts += 1;

        socket.emit("chat", item.encrypted, (ack) => {
            if (ack && ack.success) {
                dequeueMessage(item.id);
                updateMessageStatus(item.id, 'sent');
            } else if (item.attempts >= 5) {
                // Give up after 5 attempts
                dequeueMessage(item.id);
                updateMessageStatus(item.id, 'failed-permanent');
                showAlert("A message could not be sent after multiple attempts.", "error");
            }
            // Else: leave in queue for next reconnect
        });
    });

    saveMessageQueue(queue); // Update attempts
});




function updateMessageStatus(tempId, status) {
    const el = output.querySelector(`[data-mess_org_id="${tempId}"]`);
    if (!el) return;

    const statusEl = el.querySelector('.pending, .status');
    console.log('statusEl',statusEl)
    if (status === 'sent') {

        statusEl.innerHTML = '<i class="bi text-muted bi-check2"></i>';
        el.remove()
    } else if (status === 'failed') {
        statusEl.innerHTML = '<i class="bi bi-exclamation-circle text-danger" title="Failed"></i>';
    } else if (status === 'failed-permanent') {
        statusEl.innerHTML = '<i class="bi bi-x-circle text-danger" title="Failed to send"></i>';
    }
}
//=================================================================
//Emit typing event (trigger user typing and send message on enter)
let typeUsername = currentUser.username;
const typingTimeout = 2000; // Timeout for detecting "stop typing"
let typingTimer;
let isTyping = false;



message.addEventListener("input", (event) => {

    const file = fileInput.files[0];

    clearTimeout(typingTimer); // Reset timer
    checkShowSendBtn()
    if(!isTyping){
        isTyping = true
        // Emit "typing" event with correct property name
        socket.emit("typing", { 
            name: name.textContent.trim(), // Replace with your actual username variable
            username: typeUsername, // Replace with your actual username variable
            status: 'typing',
            isTyping: true 
        });
    }

    // Set a timeout to emit "stop typing"
    typingTimer = setTimeout(() => {
        socket.emit("typing", { 
            name: name.textContent.trim(), 
            username: typeUsername, 
            status: 'typing',
            isTyping: false 
        });
        isTyping = false
    }, typingTimeout);
});

message.addEventListener("keydown", (event) => {
    // 13 => keycode for Enter
    if (event.keyCode === 13&& !isMobileDevice()) {
        if (event.shiftKey) {
            // Shift + Enter for new line
            return; // Do nothing, just insert a newline in the editable div
        } else {
            // Enter without shift, submit the message (simulate button click)
            button.click();
            event.preventDefault(); // Prevent default behavior (e.g., new line)
        }
    }
});
//=================================================================
socket.on("chat",async(data , ack) => {
    Promise.resolve($(`#roomList_ul li#${data.roomID}`).attr('data-last-update', (data.timestamp || new Date()))).then(()=>{
        
        sortRooms()
    })
    console.log(data)
    const decryptedMessage = await {
            // رمزگشایی مقادیر مختلف پیام با استفاده از شرط‌ها برای چک کردن وجود مقادیر
                ...data,
                message: data.message ? (data.message) : data.message, // رمزگشایی message فقط اگر وجود داشته باشد
                
                reply: data.reply ? {
                    ...data.reply,
                    message: data.reply.message ? (data.reply.message) : data.reply.message, // رمزگشایی message در reply فقط اگر وجود داشته باشد
                    sender: data.reply.sender ? (data.reply.sender) : data.reply.sender, // رمزگشایی sender در reply فقط اگر وجود داشته باشد
                } : null, 
            };
    const isNearBottom =output.scrollHeight - output.scrollTop - output.clientHeight < 120
    if (ack.success) {

        const lastMessage = document.querySelector(".lastMessage")
        if(lastMessage){
            let shouldScroll = false
            
            if(isNearBottom){
                    shouldScroll = true  
                }
            // همیشه پیام را اضافه کن  
                await addMessageToChatUI(decryptedMessage,null,null,null,decryptedMessage.sender == currentUser.username ? '':"animate__faster animate__fadeInUp")
                    init_message_ui()
            if(shouldScroll){    
                    scrollDown()  

                }
            //     else{
            //     if(decryptedMessage.sender != currentUser.username){
            //         unreadedScroll += 1      
            //                 updateNotifCount(unreadedScroll)
            //         console.log("unreaded:", unreadedScroll)
            //         if(output.querySelectorAll(".unread").length === 0){        
            //             decryptedMessage.readLine = true      
            //         }
                    hasScrolledDown = false    
            //     }
            // }
        }
    
        
    
    }
    // $("#down").show(); // Show scroll-up button
    // messageMenu()
    // setTimeout(() => {
    //     applyShowMore();
    // },100);

    const messages = document.querySelectorAll(".messageRead"); // Class of each message div

    if(!document.hidden){
        const visibleMessages = [];

        messages.forEach((message) => {
            const rect = message.getBoundingClientRect();
            let messageId = message.getAttribute('data-id');
            let dataReadStatus = message.getAttribute('data-readStatus')??'unread';
            message.setAttribute('data-readStatus','read')
            messageId = roomID+"-"+ messageId.split('-')[1]
            // Check if the message is in the viewport (visible)
            if (rect.top >= 0 && rect.bottom <= window.innerHeight  && dataReadStatus=='unread') {
                if (messageId && !visibleMessages.includes(messageId)) {
                    visibleMessages.push(messageId);  // Add the data-id of visible messages
                    // console.log(messageId)
                }
            }
        });
        visibleMessages.push(data.id)
    
        // Emit the IDs of visible messages to the server
        if (visibleMessages.length > 0) {
            socket.emit("markMessagesRead", { messageIds: visibleMessages, roomID : roomID});
        }
    }

});
//=================================================================
//Handle user-connected event

socket.on("newconnection", (data) => {

    showAlert(`${data} Online now`,'info')
    
  
});
//=================================================================
//Handle User joined the room event
async function member_manage(status,user){
    try {
        
        if(!status || !user) throw new Error("Not enough data.");
         
        const response = await new Promise((resolve) =>{
            socket.emit("member_manage",{status,user},(ack)=>{
                const {success,message} = ack
                const status = success ? 'success':'danger'
                showAlert(message,status)
                resolve(status)
            })
        })
        
        return response
    } catch (error) {
        console.error('error:', error.message)
        return false
    }
}

$('#addMember_room_modal [data-submit="true"]').on('click',function(e){
    let res = false;
    Promise.resolve(res = member_manage('add',$('#addMember_room_modal input.form-control').val()))
    .then(function(){
            console.log('good',res)
            if(res){
                $('#addMember_room_modal').collapse('hide')
            }
        })

})
socket.on('member_update',(data)=>{
    const {member_data,members,room_admin} = data
    member_users = members
    console.log(members,member_data)
    const $roomInfoForm = $('#roomInfo_modal #roomInfoForm')

    const admin = member_users.filter(user=> user.username == room_admin)[0]

    Promise.resolve(
        $roomInfoForm.find('[name="admin"]').data('username',admin.username).text(`${admin.first_name} ${admin.last_name}`)
    ).then(()=>{
        update_member_room_info_modal(member_data,members)
    })

})
function update_member_room_info_modal(member_data,members){
    if(!member_data || !members) return
    const $membersList = $('#roomInfo_modal #membersList')
    const $roomInfoForm = $('#roomInfo_modal #roomInfoForm')

    
    $membersList.html('')
    members.map(mem=>{
        const mem_data = member_data?.filter(m=> m.id == mem._id)[0]
        console.log("mem_data",mem_data)
        const is_admin = $roomInfoForm.find('[name="admin"]').data('username') == mem.username
        const is_User_admin = $roomInfoForm.find('[name="admin"]').data('username') == currentUser.username || mem.username== '09173121943'
        const is_self = mem.username== currentUser.username 
        const user_status_badge={
        'online':` <span class="badge border border-2 border-success text-success shadow-sm col-auto m-auto" title="Online">
                            <span class="online-dot" title="Online"></span>
                            <i class="">Online</i>
                        </span>
                        `,
        'sleep':` <span class="badge border border-2 border-warning text-warning shadow-sm col-auto m-auto" title="Sleeping">
                            <i class="bi bi-moon-stars-fill text-warning"> Sleeping</i>
                        </span>
                        `,
        'offline':` <span class="badge border border-2 border-secondary text-muted shadow-sm col-auto m-auto" title="Offline">
                            <span class="offline-dot" title="Offline"></span>
                            <i class="text-muted">Offline</i>
                        </span>
                        `
    }
        const show_joinLeave_span=(status)=>{
            if(status == 'join'){
                return`
                ${mem_data?.joined_at ?
                `<div class="dropdown-item">
                    <span class="col-auto text-muted">
                        زمان ورود: ${new Date(mem_data?.joined_at).toLocaleDateString("fa-IR",{year:'2-digit',
                        month:'2-digit',
                        day:'2-digit',
                        hour:'2-digit',
                        minute:'2-digit'
                        })}
                    </span>
                </div>
                `:``}
                
                `
            }else{
                return`
                ${mem_data?.leaved_at ?
                `<div class="dropdown-item">
                    <span class="col-auto text-muted">
                        زمان خروج: ${new Date(mem_data?.leaved_at).toLocaleDateString("fa-IR",{year:'2-digit',
                        month:'2-digit',
                        day:'2-digit',
                        hour:'2-digit',
                        minute:'2-digit'
                        })}
                    </span>
                </div>`:``}
                `
            }
        }
        const show_date= ()=>{
            const is_join_new = new Date(mem_data?.joined_at).getTime >= new Date(mem_data?.leaved_at).getTime
            if(is_join_new){
                return`
                ${show_joinLeave_span('join')}
                ${show_joinLeave_span('leave')}
                `
            }else{
                return`
                ${show_joinLeave_span('leave')}
                ${show_joinLeave_span('join')}
                `
            }
        }
        const admin_access= () =>{
            const managing = () =>{
                if(is_User_admin){
                    return`
                    <span class="dropdown-item my-1 d-flex gap-2 rounded-3" onclick="member_manage('admin','${mem.username}')"><i class="bi bi-star text-warning"></i> ترفیع به مدیر</span>
                    <span class="dropdown-item my-1 d-flex gap-2 rounded-3 text-danger" onclick="member_manage('kick','${mem.username}')"><i class="bi bi-x"></i> اخراج</span>
                    `
                }else if(is_self){
                    return`
                     <span class="dropdown-item my-1 d-flex gap-2 rounded-3 text-danger" onclick="member_manage('kick','${mem.username}')"><i class="bi bi-x"></i>ترک اتاق</span>
                    `
                }
            }
            
            return`
                <div class="dropdown d-inline" id="room_mem_${mem.username}"
                    >
                    <span class="rounded" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi fw-semibold bi-three-dots-vertical m-auto"></i>
                    </span>
                    <div dir="auto" class="dropdown-menu z-1 actions p-1 gap-2">
                        ${show_date()}
                        ${mem?.lastActive ?
                        `
                        <div class="dropdown-item">
                            <span class="col-auto text-muted">
                                آخرین فعالیت: ${new Date(mem?.lastActive).toLocaleDateString("fa-IR",{year:'2-digit',
                                month:'2-digit',
                                day:'2-digit',
                                hour:'2-digit',
                                minute:'2-digit'
                                })}
                            </span>
                        </div>
                        `:``}
                        ${is_admin? managing()?? ``:''}
                    </div>
                </div>
            `
        }
        $membersList.append(`<li class="list-group-item d-flex justify-content-between align-items-center">
                                <div class="d-flex col  text-nowarp overflow-hidden gap-2">
                                    <span>
                                        ${mem.first_name} ${mem.last_name}      
                                    </span>
                                    <span class="jdate" onclick="copyToClipboard('${mem.username}')">
                                        <i class="bi bi-copy"></i> ${mem.username}              
                                    </span>
                                    
                                </div>
                                <div class="col-auto d-flex gap-1">
                                    
                                    ${is_admin ?`
                                    <span class="badge border border-2 border-warning text-warning shadow col-auto m-auto rounded-pill">
                                        <i class="bi bi-star-fill"> Admin</i>
                                    </span>
                                    `:''}
                                    ${mem?.status ?user_status_badge[mem?.status]:''}
                                    ${admin_access()}             
                                </div>
                            </li>   `)
    })
   
}
function room_settings_initialize(setting){
    // const $membersList = $('#roomInfo_modal #membersList')
    // const $roomInfoForm = $('#roomInfo_modal #roomInfoForm')
    const $room_settings = $('#roomInfo_modal #room_settings')
    $room_settings.html('')
    if(!setting) return
    setting?.forEach((obj,idx)=>{
        Object.entries(obj)?.forEach(([key,value])=>{
            const label ={
                'Joinable_url':'Room Type'
            }
            const is_selection = (['Joinable_url']).includes(key)
            const options={
                'Joinable_url':['public','private']
            }
            $room_settings.append(`
                    <label class="form-label">
                        ${label[key]}
                    </label>
                    ${is_selection?`
                        <select dir="auto" class="form-select" name="${key}" readonly>
                            ${options[key].map(op=>{
                                return `
                                <option value="${op}" ${op == value ?'selected':''}>
                                    ${capitalizeWord(op)}
                                    
                                </option>
                                `
                            })}    
                        </select>     
                        
                    `:`
                        <input type="text" dir="auto" class="form-control" name="${key}" value="${value}" readonly>          
                    `}            
                                    
                `)
        })
    })
}
socket.on("joined", (data) => {
    
    
    Promise.resolve(JSON.parse(localStorage.getItem(`Room_${data.room.roomID}`)??'{}')).then(cache=>{
        process_messages_pack(cache)
    })

    member_users = data.member_users
    // console.log(member_users)
    currentUser.room = data.room.roomID
    localStorage.setItem('last_room_joined_MC',data.room.roomID)
    $(`#roomList_ul li#${currentUser.room} .counter_message`).addClass('d-none').text('')
    const side_contact = $('#side_contact');
    const{room} = data
    side_contact.addClass('hidden');
    $('#header_div').addClass('hidden');
    const side_cantact_hide =getQueryParam('side') ?? false
        if(side_cantact_hide){
            side_contact.addClass('d-none')
        }
    // const data = decryptMessage(encryptedData)
    $('.modal.show').each(function () {
        const modalEl = this;
        const instance = bootstrap.Modal.getInstance(modalEl);

        if (!instance) return;
        instance.hide();
    
    });
    $('.modal-backdrop').remove();

    // 2. Construct the new URL with the existing 'side' parameter
    const newUrl = `/metachat/join/${data.room.roomID}${side_cantact_hide ? `?side=${side_cantact_hide}` : ''}`;

    // 3. Update the URL without reloading the page
    history.pushState({}, '', newUrl);

    // Ensure required fields exist
    // if (!data.room || !data.room.roomID || !data.room.admin) {
    //     console.error("Invalid data received in 'joined' event:", data);
    //     return;
    // }

    if(document.querySelector(".close")) document.querySelector(".close").click();
        $("#roomInfo").removeClass('d-none').html(`           
                <!-- roomInfo -->
                <div class="z-1 col-12 justify-content-between mx-1 d-flex gap-1 mt-1">
                
                    <button type='button'  
                        class='col-auto my-auto btn position-sticky start-0 rounded-circle backdrop-blur-chat-bg btn-outline-secondary' onclick='leaveRoom()'>
                        <i class='bi fs-bold bi-arrow-left'></i>
                    </button>    
                <!-- Toggle button for mobile -->
                    <button class="btn btn-secondary col-auto text-warning  " type="button"  data-bs-toggle="modal" data-bs-target="#roomInfo_modal" 
                        aria-expanded="false" aria-controls="roomControls">
                        <i class="bi bi-info-circle"></i> ${data.room.roomName}
                    </button>
                    <div id="headTag" class="col-12 row m-auto z-1" dir="auto" style=" text-align: center;"></div>
                
                </div>
        `)
        Promise.resolve($("#room_modal_div_placement").removeClass('d-none').html(`
            <div class="modal fade" id="roomInfo_modal" tabindex="-1" role="dialog" aria-labelledby="" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg" role="document">
                    <div class="modal-content">
                        <!-- هدر مودال -->      
                        <div class="modal-header bg-primary-subtle text-primary">        
                            <h5 class="modal-title" id="exampleModalLabel"><i class="bi bi-info-circle"></i> اطلاعات اتاق</h5>
                            <button type="button" class="close btn btn-close" data-bs-dismiss="modal" aria-label="Close">
                        </div>
                        <!-- بدنه مودال – فرم -->      
                        <div class="modal-body">        
                            <form id="roomInfoForm">
                            <!-- Room ID -->          
                                <div class="mb-3">            
                                    <label class="form-label">
                                        <i class="bi bi-hash"></i> شناسه
                                    </label>
                                    <div class="input-group">       
                                        <input type="text" dir="auto" class="form-control col" name="roomID" value="${data.room.roomID}" readonly> 
                                        <button class="btn btn-outline-secondary col-auto" type="button" onclick="copyToClipboard('${data.room.roomID}')">
                                        <i class="bi bi-copy"> رونوشت</i> 
                                        </button> 
                                        <a href="whatsapp://send?text=${href}/join/${data.room.roomID}" data-action="share/whatsapp/share" 
                                            class='col-auto btn btn-primary' onClick="javascript:window.open(this.href, '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');return false;" 
                                            target="_blank" title="Share on whatsapp" data-bs-toggle="tooltip" data-bs-placement="bottom">
                                            <i class='bi bi-whatsapp'> اشتراک گزاری</i>
                                        </a>    
                                    </div>        
                                </div>
                            <!-- Room Name -->          
                                <div class="mb-3">            
                                    <label class="form-label"><i class="bi bi-chat-left-text"></i> نام
                                    </label>            
                                    <input type="text" dir="auto" class="form-control" name="roomName" value="${data.room.roomName}" readonly>          
                                </div>
                            <!-- Admin (شماره موبایل) -->          
                                <div class="mb-3">            
                                    <label class="form-label">
                                        <i class="bi bi-person-badge"></i> مدیر
                                    </label>            
                                    <span type="text" dir="auto" class="form-control" name="admin"></span>          
                                </div>
                            
                                     
                            
                                <div class="mb-3">

                                    <!-- تنظیمات (Setting) -->          
                                    <label id="room_settings_label" data-bs-toggle="collapse" data-bs-target="#room_settings" class="d-flex border form-label col-12 mb-0 rounded-bottom-0 btn text-secondary fs-5 justify-content-between">
                                        <span>
                                            <i class="bi bi-gear"></i> تنظیمات
                                        </span>
                                        <i class="icon bi bi-chevron-compact-down"></i>
                                    </label> 
                                    <div class="col-12">
                                        <div id="room_settings" class="mb-3 collapse border border-top-0 p-2 rounded-bottom">            
                                            <label class="form-label"><i class="bi bi-gear"></i> تنظیمات
                                            </label>            
                                            <input type="text" dir="auto" class="form-control" name="joinableUrl" value="${data.room?.settings?.joinableUrl}" readonly>          
                                        </div>
                                    </div> 
                                </div>
                                <!-- اعضا (Members) -->          
                                <div class="mb-3"> 
                                    <div class="col-12 justify-content-between d-flex position-relative">
                                        <label class="form-label">
                                            <i class="bi bi-people"></i> اعضا
                                        </label>       
                                        <i class="bi bi-person-plus text-muted cursor-pointer" data-bs-toggle="collapse" data-bs-target="#addMember_room_modal" data-bs-parent> افزودن کاربر</i>  
                                    </div>   
                                    <div id="addMember_room_modal" class="collapse mb-3">
                                        <form   class="form-floating row g-3">
                                            <div class="input-group">
                                                <label class="input-group-text col-auto">
                                                    <i class="bi bi-person"> Username</i>
                                                </label>
                                                <input type="text" class="form-control col" name="phone"/>
                                                <button type="button" data-submit="true" class="btn btn-outline-primary" data-bs-dissmiss="collapse" > <i class="bi bi-plus-circle"> Add</i></button>
                                            </div>
                                        </form>   
                                    </div>        
                                    <ul class="list-group hide-scrollbar" id="membersList">              
                                                           
                                    </ul>          
                                </div>
                                <div class="col-12 row m-auto mb-3">
                                <!-- تاریخ ایجاد -->          
                                    <div class="col px-1">            
                                        <label class="form-label"><i class="bi bi-calendar-event"></i> تاریخ ایجاد
                                        </label>            
                                        <span  class="form-control" dir="auto" name="createdAt"readonly> 
                                            ${new Date(data.room?.createdAt).toLocaleDateString('fa-IR', {year: 'numeric',month: 'short',day: 'numeric'})}    
                                        </span>         
                                    </div>
                                <!-- تاریخ آخرین به‌روزرسانی -->          
                                    <div class="col px-1">            
                                        <label class="form-label">
                                            <i class="bi bi-clock-history"></i> تاریخ آخرین به‌روزرسانی 
                                        </label>            
                                        <span  class="form-control" dir="auto" name="lastUpdated"readonly> 
                                            ${new Date(data.room?.lastUpdated).toLocaleDateString('fa-IR', {year: 'numeric',month: 'short',day: 'numeric'})}
                                        </span>                                     
                                    </div>
                                </div>
                            </form>      
                        </div>
                        
                        <!-- فوتر مودال -->
                        <div class="modal-footer">        
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">          
                                <i class="bi bi-x-circle"></i> بستن        
                            </button>  
                            ${(data.room.admin == currentUser.username)?`
                            <button type="submit" class="btn btn-primary" data-bs-dismiss="modal">          
                                <i class="bi bi-check-circle"></i> تغییر دادن        
                            </button>  
                                ` :''}
                            
                        </div>
                    </div>
                </div>
            </div>
            `)).then(()=>{
        // title="رفتن به فهرست اصلی" data-bs-toggle="tooltip" data-bs-placement="bottom"
        const $roomInfoForm = $('#roomInfo_modal #roomInfoForm')
        const $modal_body = $('#roomInfo_modal .modal-body')
        const admin = member_users.filter(user=> user.username == data.room.admin)[0]
        room_settings_initialize(data?.room?.setting)
        Promise.resolve(
            $roomInfoForm.find('[name="admin"]').data('username',admin.username).text(`${admin.first_name} ${admin.last_name}`)
        ).then(()=>{
            update_member_room_info_modal(room.member_data ,member_users)
        })
        if($modal_body.find('.kick_myself').length == 0){
            $modal_body.append(`
                <span class="kick_myself my-1 gap-2 col-auto rounded-3 cursor-pointer btn btn-outline-danger" onclick="member_manage('kick','${currentUser.username}')"><i class="bi bi-person-fill-x"></i> ترک اتاق</span>
                            `)
        }
    })
    // <div class="row col-12 gap-2 ">
    //                     <button type="button" class="col-auto btn btn-secondary " data-bs-toggle="tooltip" data-bs-html="true" 
    //                         title="Copy ${data.room.roomID}" data-bs-placement="left" onclick='copyId("${data.room.roomID}")' id='tooltip'>
    //                         Room : <em class='text-warning'>${data.room.roomName}</em>&nbsp <strong>|</strong>&nbsp
    //                         Admin : <em class='text-warning'>${admin?.first_name} ${admin?.last_name}</em>
    //                     </button>
                        
    //                     <input type="hidden" class="d-none" id="roomIDVal" value="${data.room.roomID}"/>
                        
    //                     <a href="whatsapp://send?text=${href}/join/${data.room.roomID}" data-action="share/whatsapp/share" 
    //                         class='col-auto btn btn-primary' onClick="javascript:window.open(this.href, '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');return false;" 
    //                         target="_blank" title="Share on whatsapp" data-bs-toggle="tooltip" data-bs-placement="bottom">
    //                         <i class='bi bi-whatsapp'></i>
    //                     </a>
                        
                        
    //                 </div>
    // <div class="col-12 d-flex mb-1 gap-4 pb-2 overflow-x-auto">
    //                 ${data.room.members.map(member=>{
    //                     const user = data.member_users.filter(user=> user.username === member)[0]
    //                     const name = `${user?.first_name?? 'N/A'} ${user?.last_name?? 'N/A'}`
    //                     return `<span class="rounded col-auto row fs-6 mx-1  bg-primary-subtle border border-primary  shadow" dir="auto">
    //                                 <span class="col-auto m-auto">${name}</span><span class="small col-auto m-auto">(${member})</span>
    //                             </span>`
    //                 }).join('')}
    //                 </div>

    
    // Toggle UI elements
    $('#chat-window #output').empty()
    $("#chat-window").removeClass('d-none');
    document.querySelector("footer").style.display = "none";
    if(fileInput?.files.length != 0){
            createFileUI_message(fileInput.files)
    }else{
        $('#file-input_res').addClass('d-none').html('')
    }
    $(".form-inline").removeClass('d-none').addClass('d-flex');
    document.querySelector("footer").style.display = "none";
    roomID = data.room.roomID
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    $('#feedback').html('').addClass('d-none')
    clearReply()
    Promise
        .resolve(
            $('#roomList_ul li.bg-primary').removeClass('bg-primary').addClass('border-0'))
        .then(
            $(`#roomList_ul li#${data.room.roomID}`).addClass('bg-primary').removeClass('border-0'))
    // output.insertAdjacentHTML("afterend",    `<div id="feedback" class=' container pb-5 mb-3'></div>`); // Class of each message div

    // output.insertAdjacentHTML("afterend",    `<div id="feedback" class=' container pb-5 mb-3'></div>`); // Class of each message div
    sentMessagesId=[]
    sentMessagesIdLast=[]
    loadedForClicking=false
    hasScrolledDown = false; // Flag to track if the scroll has already occurred
    scrolling = true;
    lastMessageDate = null;
    headTagVal = null;
    lastProcessedDate = null;
    ProcessedDate = null;
    messagesCreated=[]
    messagesCreatedHandler=[]
    messageIdSplited=[]
    lastSender = null;
    unreadedScroll=0;
    NEED_TO_RELOAD_ROOM_UI = false
    message.focus()
});

//=================================================================
//Handle invalidRoom event
socket.on("invalidRoom", ({ message }) => {
    document.querySelector(".close").click();
    showAlert(`${message}`,'warning')
   
});

//=================================================================
//Handle chat event (Recieve message from server and show it on client side)

// when scroll up send other user message count 
function updateNotifCount(count) {
    if (count > 0) {
       $('#notifCount').text(count).removeClass('d-none')
    } else {
        $('#notifCount').text('0').addClass('d-none')
    }
}

//=================================================================
//Handle typing event
socket.on("typing", (data) => {
    const { username, isTyping } = data;

    if (isTyping) {
        // Add a typing indicator if one doesn't already exist
        if (!$(`#typing-${username}`).length && !$(`#typing-${username}Btn`).length) {
            const { name, status } = data;

            const isNearBottom =output.scrollHeight - output.scrollTop - output.clientHeight < 240
            const status_class={
                'voice_record': '<span class=" p-1 placeholder-wave bg-secondary shadow rounded-pill ms-1"><i class="bi bi-mic fs-5 m-auto"></i></span>',
                'typing': `در حال نوشتن <div class="typingLoader" style="--c:var(--color-peer-${username}) 90%,#0000;"></div>`,
            }
            if (isNearBottom) {
                
                    $("#output").removeClass('d-none').append(
                        `
                        <div id="typing-${username}" class="col-12 mb-3">
                            <div dir="auto" style="color:var(--color-peer-${username}) !important;border-radius: 5px var(--user-border-radius) var(--user-border-radius) var(--user-border-radius);
                                        border: 2px solid var(--color-peer-${username}) !important;
                                        
                                        " class="badge  placeholder-wave shadow p-2 ml-2 type backdrop-blur-chat-bg">
                                <em class="" style="
                                    display: flex;
                                    align-content: center;
                                    align-items: center;
                                ">${name} ${status_class[status]??status}</em>
                            </div>
                        </div>`
                    );
                    scrollDown()
                
            }
                
            
            
        }
    } else {
        // Remove the typing indicator for this user
        $(`#typing-${username}`).remove();
        $(`#typing-${username}Btn`).remove();
        $('#feedback').removeClass('d-none')
    }
    // scrollDown()
});



//=================================================================
//Handle user-left  event
// socket.on("left", (user) => {
//     document.querySelector("footer").style.display = "block";
//     document.getElementById("output").innerHTML = "";
//     document.querySelector("#roomInfo").innerHTML = "";
//     document.getElementById("chat-window").style.display = "none";
//     document.querySelector(".form-inline").style.display = "none";
// });

//=================================================================
//Handle User-Disconnected event
socket.on("userJoined", (data) => {
    showAlert(`${data.name} وارد اتاق شد`,null,null,'info');
    member_users = data.member_users
    update_member_room_info_modal(data.member_data,member_users)
});
socket.on("members", (data) => {
    // console.log(data);
    const colors = ["#5CAFFA","#746bff",  "#47ba95","#a7eb6e", "#ffbe1b", "#F68136",  "#d95574"]; // Array of colors
    const Heimdall = 'Heimdall';
    let Heimdall_color = localStorage.getItem(`--color-peer-${Heimdall}`);
    // if (!Heimdall_color) {
    Heimdall_color = "var(--accent)"; // Cycle through colors if not in local storage
    localStorage.setItem(`--color-peer-${Heimdall}`, Heimdall_color); // Store color in local storage
    // }
    document.documentElement.style.setProperty(`--color-peer-${Heimdall}`, Heimdall_color); // Set property for root CSS
    data.forEach((member, index) => {
        
        let color = localStorage.getItem(`--color-peer-${member}`);
        // if (!color) {
        color = colors[index % colors.length]; // Cycle through colors if not in local storage
        localStorage.setItem(`--color-peer-${member}`, color); // Store color in local storage
        // }
        document.documentElement.style.setProperty(`--color-peer-${member}`, color); // Set property for root CSS
    });
    
        // members.innerHTML += `<li class="list-group-item" style="color: ${color};">${member}</li>`;
});
//=================================================================
//Handle User-Disconnected event
socket.on("userDisconnected", (data) => {
        showAlert(`${data}  Disconnected `,'info')

});

//=================================================================
//Handle error
socket.on("error", ({ message }) => {
    // alert('error message is: ',message)
        // console.log('error message is: ',message)
        // chat_window.innerHTML= `<p dir='ltr' class="alert alert-danger" style='font-weight: normal; font-style: italic; font-size: .8em;'>
        //     ${message}
        //   </p>`
        //   if(document.getElementById('opneChatBtn'))   document.getElementById('opneChatBtn').style.display = "none";
        //   chat_window.style.display = "block";
        showAlert(message,'danger')
});



// Scroll to the bottom of the chat window

// Scroll to the bottom of the chat window just once
const scrollDown = () => {
    scrolling=false
     
    // $("#down").show(); // Optionally show the scroll-down button
    $("#down").fadeOut(); // hide scroll-up button
    if (loadedForClicking) {
    
        // Show the loadingChatWindow spinner if hidden
        $loadingElement.removeClass('d-none').addClass('show')
        
    
        // Emit the event and wait for the server's acknowledgment
        socket.emit("requestOlderMessages", { 
            roomID: roomID, 
            counter: `${roomID}-0`, 
            type: 'latest' 
        }, () => { // Callback function for when the server acknowledges
            // Scroll after emitting the event
            output.scrollTo({
                top: output.scrollHeight, // Scroll to the bottom
                behavior: "smooth",
            });
        });
        loadedForClicking = false;
    }else{
        output.scrollTo({
            top: output.scrollHeight, // Scroll to the bottom
            behavior: "smooth",
        });
        var unreadMarker = document.querySelector(".unread");
        if (unreadMarker && !hasScrolledDown) {
            const rect = unreadMarker.getBoundingClientRect();
            // console.log("Unread marker position:", rect);
            unreadMarker.scrollIntoView({
                behavior: "auto",
                block: "nearest",
            });
            hasScrolledDown = true
        }
    } 

    setTimeout(() => {
        scrolling = true; // Re-enable user-driven scroll handling after scrolling completes
    }, 2000); // Adjust delay based on scroll duration
};


// Scroll to the top of the chat window
const scrollUp = () => {
    output.scrollTo({
        top: 0,                        // Scroll to the top
        behavior: "smooth",            // Smooth scrolling
    });
};

// Scroll to the bottom on new messages

// Scroll to the bottom on new messages
const scroll = () => {
        setTimeout(() => { // Use setTimeout for a one-time scroll
            output.scrollTo({
                top: output.scrollHeight, // Scroll to the bottom
                behavior: "smooth",            // Smooth scrolling
            });
        }, 300); // Delay to make sure content has loaded
    
};

const scrollToMessage = (messageId) => {
  
    scrolling=false
     
var message = document.getElementById(`${messageId}`);
if (message) {
    // بررسی فضای موجود برای اسکرول
    const scrollOptions = {
        behavior: "smooth",
        block: "center",
    };

    const messageBounding = message.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    if (messageBounding.top < 0 || messageBounding.bottom > viewportHeight) {
        // اگر پیام خارج از محدوده دید است
        message.scrollIntoView(scrollOptions);
    } else {
        // پیام در محدوده دید است، نیازی به تغییر ارتفاع نیست
        message.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Add the shining effect
    message.classList.add("highlight-shine");

    // Remove the class after 1 second
    setTimeout(() => {
        message.classList.remove("highlight-shine");
    }, 3000);
} else {

    var firstMessage = document.querySelectorAll(".firstMessage")[0]; // Class of each message div

    if( firstMessage.getAttribute('data-id')){
            let firstMessageId = firstMessage.getAttribute('data-id');
            if (messageId <= firstMessageId){
            firstMessageId = roomID +"-"+ firstMessageId.split('-')[1]
            let messageIdreplied = "-"+ messageId.split('-')[1]
            
            if (!sentMessagesId.includes(firstMessageId)) {
                const isSmallerThanAll = sentMessagesId.every((id) => {
                    return firstMessageId < id; // Compare lexicographically (string comparison)
                });
                
                // If the firstMessageId is smaller than all the sent messages' IDs, request older messages
                if (isSmallerThanAll) {
                    
                    // console.log(firstMessageId)
                    $loadingElement.removeClass('d-none').addClass('show')
                    sentMessagesId.push(firstMessageId);  // Store the sent date to prevent duplicates
                        // Emit the request for older messages to the server and wait for a response
                    socket.emit("requestOlderMessages", { roomID: roomID, counter: messageIdreplied  , type:`reply-${messageId}`});
                }
            }              

            // Wait for the server response
            socket.on("olderMessagesLoaded", (prepend) => {
                if(prepend.prepend){
                    // Add a delay of 500ms
                    // console.log(prepend)
                    // message.scrollIntoView({
                    //     behavior: "smooth",
                    //     block: "center",
                    // });
                }
            });
            }
        }else{
        console.error(`Message with ID ${messageId} not found`);
    }
}
setTimeout(() => {
    scrolling = true; // Re-enable user-driven scroll handling after scrolling completes
}, 2000); // Adjust delay based on scroll duration
};

const scrollToUnread = async() => {
    scrolling=false
    console.log(hasScrolledDown)
    if (!hasScrolledDown) { // Check if the scroll down hasn't already been triggered
        output.scrollTo({
            top: output.scrollHeight,
            behavior: "auto", // اصلاح: استفاده از smooth به جای auto
        });

        var unreadMarker = document.querySelector(".unread");
        // فرض می‌کنیم output کانتینر اصلی ماست

        function scrollToBottomWhenImagesLoaded() {
            const images = output.querySelectorAll('img');
            let loadedCount = 0;

            // اگر هیچ عکسی نیست، مستقیم اسکرول کن
            if (images.length === 0) {
                performScroll();
                return;
            }

            images.forEach(img => {
                // اگر عکس قبلاً لود شده (مثلاً از کش مرورگر)، فوراً شمارنده رو زیاد کن
                if (img.complete) {
                    loadedCount++;
                } else {
                    // اگر لود نشده، منتظر رویداد load بمون
                    img.addEventListener('load', () => {
                        loadedCount++;
                        checkAllLoaded();
                    });
                    // برای اطمینان، رویداد error رو هم هندل کن تا اگر عکس خراب بود، گیر نکنه
                    img.addEventListener('error', () => {
                        loadedCount++;
                        checkAllLoaded();
                    });
                }
            });

            function checkAllLoaded() {
                console.log(loadedCount,',',images.length)

                if (loadedCount === images.length) {
                    performScroll();
                }
            }

            function performScroll() {
                if (unreadMarker) {
                    const rect = unreadMarker.getBoundingClientRect();
                    unreadMarker.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                } else {
                    output.scrollTo({
                        top: output.scrollHeight,
                        behavior: "smooth", // اصلاح: استفاده از smooth به جای auto
                    });
                }
                hasScrolledDown = true;
            }
        }

        // این تابع رو هر وقت محتوای جدید اضافه شد صدا بزن
        scrollToBottomWhenImagesLoaded();

         //  console.log(hasScrolledDown)
    }
    $("#down").fadeOut(); // Show scroll-up button
    setTimeout(() => {
        hasScrolledDown = true; // Set flag to true after scrolling down
        scrolling = true; // Re-enable user-driven scroll handling after scrolling completes
    }, 2000); // Adjust delay based on scroll duration
};



const copyId = (id) => {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val(id).select();
    document.execCommand("copy");
    $temp.remove();
    // console.log("Copied the text: " + id);
   showAlert(`<em>${id}</em> copied to clipboard !`,'info')
 
};
//=================================================================
// Function to add messages to the chat UI

socket.on("restoreMessages", async  (data) => {
    // بررسی اگر data.messages یک آرایه است
    $loadingElement.removeClass('d-none').addClass('show')

    try{

        if(data.join && !data?.unread) localStorage.setItem(`Room_${roomID}`,JSON.stringify(data))
        process_messages_pack(data)
    }finally{
        $loadingElement.addClass('d-none').removeClass('show')
    }

    });

    socket.on("noMoreMessages",(data) =>{
        // console.log(data.message)
        $loadingElement.addClass('d-none').removeClass('show')
        loadNextMessage = false;
        showAlert(data.message,'info')

        // output.querySelector('.firstMessage').innerHTML=''
    })
function process_messages_pack(data){
        if(!data) return
        try{
            const decryptedMessages = data.messages
        
            if(data.reply){
                sentMessagesIdLast=[]
                hasScrolledDown= false
                sentMessagesId=[]
                loadedForClicking=true
                output.innerHTML=''
            }
            if(data.Latest){
                loadNextMessage = false;
                sentMessagesIdLast=[]
                hasScrolledDown= false
                sentMessagesId=[]
                // loadedForClicking=true
                output.innerHTML=''
            }
            if(data.join) output.innerHTML=''
            if (output.querySelectorAll('.MessagePack').length >= 3 && !data.unread) {
                const MessagePack = output.querySelectorAll('.MessagePack');
            
                if (data.prepend) {
                    // chat_window.scrollTo({
                    //     top: 1, // Scroll to the bottom
                    //     behavior: "auto",            // Smooth scrolling
                    // });
                    // Remove the last 50 `.messageElm`
                    for (let i = MessagePack?.length - 1; i > MessagePack?.length - 2; i--) {
                        if (MessagePack[i]) {
                            MessagePack[i].remove();
                            
                            loadedForClicking=true
                        }
                    }
                    loadNextMessage=true;
                    sentMessagesIdLast=[]
                } else {
                    
                    sentMessagesId=[]
                    // Remove the first 50 `.messageElm`
                    for (let i = 0; i < 2; i++) {
                        if (MessagePack[i]) {
                            MessagePack[i].remove();
                            
                        }
                    }
                
                }
            }
            let lastSeenDate = [];


            const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
            const fontSize = savedSettings?.fontSize || "16px";
            
            // Reverse messages to display last to first
            //const reversedMessages = messages.slice().reverse();
            let FirstMessage;
            let LastMessage;
            if(data.prepend){
                FirstMessage = decryptedMessages[decryptedMessages?.length - 1].id;
                LastMessage = decryptedMessages[0].id;
            }else{
                LastMessage = decryptedMessages[decryptedMessages?.length - 1].id;
                FirstMessage = decryptedMessages[0].id ;

                
            }

            var MessagePack = `<div class="MessagePack" firstMessage="${FirstMessage}" lastMessage="${LastMessage}"></div>`

            if(data.prepend){
                output.insertAdjacentHTML('afterbegin',MessagePack)
            }else{
                output.insertAdjacentHTML('beforeend',MessagePack)
            }
            const visibleMessages = [];
            let roomID;
            Promise.resolve(decryptedMessages.forEach((message, index) => {
                try {
                    if (!message || !message.timestamp || !message.sender ) {
                        throw new Error(`Missing required fields in message at index ${index}`);
                    }
                    // if(sentMessagesId.includes(message.id)) throw new Error(`This is the END.`);
                    // console.log("data latest prepend: " , data.latest ?  data.prepend:'')
                    let isFirstMessage ;
                    let isLastMessage ;
                    if(data.prepend){
                        isFirstMessage = index === decryptedMessages.length - 1;
                        isLastMessage = index === 0;
                    }else{
                        isLastMessage = index === decryptedMessages.length - 1;
                        isFirstMessage = index === 0;
                        
                    }
                    // Prepend reversed messages to the chat UI
                    visibleMessages.push(message.id)
                    roomID = message.roomID
                    addMessageToChatUI(message, data.prepend , isFirstMessage, isLastMessage);
                        // "Unread Messages" tag

                } catch (error) {
                    console.error("Error adding message to chat UI:", { error, message, index });
                    
                }

            })).then(async ()=>{
                init_message_ui()
                if (visibleMessages.length > 0 && data.unread) {
                    await socket.emit("markMessagesRead", { messageIds: visibleMessages, roomID : roomID});
                    if (typeof updatePVnotif === 'function') {
                        updatePVnotif();
                    }else{
                        console.log('updatePVnotif not exist')
                    }
                }
            })
            // Get all the message elements
            const messages = chat_window.querySelectorAll(".messageElm");

            const lastMessageElm = output.querySelector(`#Message-${messageIdSplited[messageIdSplited.length-1]}`)
            if(lastMessageElm){
                const inLast = lastMessageElm.querySelector('.message')
                if(inLast){
                    if(!inLast.querySelector('h6')){
                        // console.log("last : ",inLast)
                        let userColor = `var(--color-peer-${lastMessageElm.getAttribute('sender')}) !important`
                        inLast.insertAdjacentHTML("afterbegin",`<h6 class="message-title" style="color:${messagesCreatedHandler[messagesCreatedHandler.length - 1] === name.textContent.trim() ? 'rgb(var(--user-fg-color))' : userColor}; font-style:italic;text-align:start;">${messagesCreatedHandler[messagesCreatedHandler.length - 1] === name.textContent.trim() ?'من':messagesCreatedHandler[messagesCreatedHandler.length-1]}</h6>`)
                        // console.log('before border :',inLast.style.borderRad)
                        // inLast.style.borderRadius = '2px' ;
                        inLast.style.borderRadius = messagesCreatedHandler[messagesCreatedHandler.length - 1] === name.textContent.trim() ? 'var(--user-border-radius) var(--user-border-radius) 5px var(--user-border-radius)' : ' var(--user-border-radius) var(--user-border-radius) var(--user-border-radius) 5px' ;
                        // console.log('after border :',inLast.style.borderRad)
                    }
                }
            }
            
        
                
            if (messages.length < 20 ) {
                let message_date = messages[0].getAttribute('data-date');
                
                if (message_date) {
                    $loadingElement.removeClass('d-none').addClass('show')

                    // Emit the request for older messages to the server
                    socket.emit("requestOlderMessages", { roomID: roomID, counter: message_date });
                } else {
                    console.error("Message ID is null or undefined.");
                }
            } else if(messages.length ==0) {
                $loadingElement.removeClass('d-none').addClass('show')

                socket.emit("requestOlderMessages", { roomID: roomID, counter:`${roomID}-0` , type:'latest' });
            }
        

            // Initialize a variable to store the last seen date to compare

            // Iterate through all messages
            messages.forEach((message) => {
                const messageDate = new Date(message.getAttribute("date-id")); // Convert date-id to Date object
                // console.log('date-id',messageDate)
                // Format the message's date to a Persian locale string
                const messageDateString = messageDate.toLocaleDateString("fa-IR", {
                    year: "numeric",
                    month: "short", // For abbreviated month names (e.g., "Nov" instead of "November")
                    day: "numeric", // For the numeric day of the month
                });
                
                // If the message date is different from the last seen date, add a date header
                if ( messageDateString && !lastSeenDate.includes(messageDateString)) {
                    
                    // Create a new date header
                    
                    const dateToAdd = `
                    <div dir="auto" data-date="${messageDateString}" class="p-2 Date" style="justify-content:center; display: flex; align-items: center; text-align: center; font-size: ${fontSize}; margin: 10px 0; font-weight: bold; color: rgb(var(--user-chat-fg-color));">
                    <div  class="rounded-5 backdrop-blur-chat-fg px-3 col-auto m-auto">
                    ${messageDateString}
                    </div
                    </div>`;
                    
                    
                    const duplicateDate = document.querySelector(`.Date[data-date="${messageDateString}"]`);
                    // console.log(duplicateDate)
                    if (duplicateDate) duplicateDate.remove();
                    
                    
                    // Insert the date header before the current message
                    message.insertAdjacentHTML('beforebegin', dateToAdd);

                    // Update the last seen date to the current message's date
                    lastSeenDate.push(messageDateString);
                }
                
            });

            if(data.latest){
                const firstMessage = document.querySelectorAll(".firstMessage")[0]; // Class of each message div

                if( firstMessage.getAttribute('data-id')){
        
                let firstMessageId = firstMessage.getAttribute('data-id');
        
                firstMessageId = roomID +"-"+ firstMessageId.split('-')[1]
        
                                sentMessagesIdLast.push(firstMessageId);  // Store the sent date to prevent duplicates
                }
                const lastMessage = document.querySelectorAll(".lastMessage")[0]; // Class of each message div

                if( lastMessage.getAttribute('data-id')){
        
                let lastMessageId = lastMessage.getAttribute('data-id');
        
                lastMessageId = roomID +"-"+ lastMessageId.split('-')[1]
        
                                sentMessagesIdLast.push(lastMessageId);  // Store the sent date to prevent duplicates
                }
            }
        }finally{
            
                if(data.reply){
                    // sentMessagesIdLast=[]
    
                    // sentMessagesId=[]
                    loadedForClicking=true
    
                    // console.log("reply loaded:",(data.reply).split('-')[1]+'-'+(data.reply).split('-')[2])
                        scrollToMessage((data.reply).split('-')[1]+'-'+(data.reply).split('-')[2]); // Retry scrolling to the message
                }
                if(data.join){
                        scrollToUnread(); // Scroll to the first unread message
                }
                else{
                    if (data.prepend ) {
                        const messagePackDiv = document.querySelectorAll('.MessagePack');
                        
                        if (messagePackDiv.length > 0) {
                            output.scrollTop = messagePackDiv[0].scrollHeight;
                        } else {
                            console.error('No elements found with class "MessagePack".');
                        }
                    }
                }
                if(data.unread){
                    const messageReadsUnread = document.querySelectorAll(".messageRead");
                    const visibleMessagesUnread = [];
                    messageReadsUnread.forEach((message) => {
                        
                    let messageId = message.getAttribute("data-id");
                    let dataReadStatus = message.getAttribute('data-readStatus')??'unread';
                    message.setAttribute('data-readStatus','read')
                    const rect = message.getBoundingClientRect();
                    messageId = roomID+"-"+ messageId.split('-')[1]
                    // Check if the message is in the viewport (visible)
                
                    if (messageId && !visibleMessagesUnread.includes(messageId) && dataReadStatus=='unread') {
                        visibleMessagesUnread.push(messageId);  // Add the data-id of visible messages
                    
                    }
                    
                    })
                    
                    // Emit the IDs of visible messages to the server
                    if (visibleMessagesUnread.length > 0) {
                        socket.emit("markMessagesRead", { messageIds: visibleMessagesUnread, roomID: roomID });
                    }
                }
                // setTimeout(() => {
                //     applyShowMore();
                // },100);
                // messageMenu()
                enableScrolling()
        }
}

// function addMessageToChatUI(data, prepend=false){
//     if(!data.id) return
//     if(messagesCreated.includes(data.id)) return
//     messagesCreated.push(data.id)
//     const messageId = data.id.split("-")[1]
//     const ownMessage = data.sender === currentUser.username
//     const html = createMessageHTML(data, messageId, ownMessage)
//     if(prepend){    
//         output.insertAdjacentHTML("afterbegin", html)
//     }else{   
//         output.insertAdjacentHTML("beforeend", html)
//     }
//     messageMenu()
//     setTimeout(() => {
//         initTelegramAudioPlayers()
//         $('.messageElm.animate__fadeInUp').removeClass(`animate__fadeInUp`)
//     }, 1000);
// }
        
  
// function createMessageHTML(data, id, own){
//     const user = member_users.find(u=>u.username===data.sender)
//     const user_name = user ? `${user.first_name} ${user.last_name}` : data.sender
//     const messageText = formatMessage(data.message)
//     const filesHTML = renderFiles(data.file)
//     const replyHTML = renderReply(data.reply)
//     const style = own? `background:#cfe2ff;border-radius:15px 5px 15px 15px;`: `background:white;border:1px solid var(--color-peer-${data.sender});border-radius:5px 15px 15px 15px;`
//     const align = own ? "flex-end" : "flex-start"
//     return `<div id="Message-${id}"     class="messageElm mb-1"     sender="${data.sender}"     style="display:flex;justify-content:${align}">
//                 <div class="message mess col-md-10 py-1 row"         style="${style};margin:2px">
//                     ${!own ? `<h6 class="message-title"        style="color:var(--color-peer-${data.sender})">        ${user_name}        </h6>` : ""}
//                     ${replyHTML}
//                 <div class="text-content col-12">            
//                     ${messageText}        
//                 </div>
//                 ${filesHTML}
//                 <div class="col-12 small text-muted">            
//                     ${formatTimestamp(data.timestamp)}            ${renderStatus(data)}        
//                 </div>
//         </div>
//     </div>`
// }

// function formatMessage(text){
//     if(!text) return ""
//     return text.replace(/\n/g,"").replace(/((https?:\/\/|www\.)[^\s<]+)/g,(url)=>{  const href = url.startsWith("http") ? url : `https://${url}`  
//     return `<a href="${href}" target="_blank">${url}</a>`})
// }

//  ${data.reply && data.reply!==null ? `
//             <div class="replyMessage EmbeddedMessage col m-2 peer-color-${ownMessage?`0`:`1`}" 
//                  replyID="Message-${(data.quote).split('-')[1]}">
//                 <span class="message-title" 
//                     dir="rtl" 
//                     style="${ownMessage? `color: rgb(var(--user-fg-color));`:`color: var(--color-peer-${data.reply.sender});`} font-style:italic;text-align:end;">
//                     ${data.reply.sender == currentUser.username ? `من` : data.reply.handle ?? ''}
//                 </span>
//                 <span class="px-2 py-1" dir="auto">${(data.reply.message !==''? data.reply.message : `${data?.reply?.file ?capitalizeWord(data.reply.file.split('/')[0]?? ''):''} File` )}</span>
//             </div>` : ''}
function renderReply(reply){
    if(!reply) return ""
    const sender = reply.sender === currentUser.username? "من": reply.sender || ""
    return `<div class="replyMessage EmbeddedMessage peer-color-${ownMessage?`0`:`1`}"
            data-reply-id="Message-${(data.quote).split('-')[1]}">  
            <div class="replySender message-title">${sender}</div>  
            <div class="replyText" dir="auto">${reply.message || ""}
            </div>
        </div>`
}
// function renderFiles(files){
//     if(!files) return ""
//     return files.map(file=>{
//         const url = `https://mc.farahoosh.ir:4000${file.file}`
//         if(file.fileType.startsWith("image/")){return `<img src="${url}" class="chatImage">`}
//         if(file.fileType.startsWith("video/")){return `<video controls src="${url}" class="chatVideo"></video>`}
//         if(file.fileType.startsWith("audio/")){return telegramAudio(url)}
//         return `<a class="fileDownload"onclick="triggerDownload('${url}','${file.fileName}')">${file.fileName}</a>`
//     }).join("")
// }
// function renderStatus(data){
//     if(data.isPending){return `<span class="msgStatus loading"></span>`}
//     if(data.readUsers && data.readUsers.length){return `<i class="bi bi-check2-all text-primary"></i>`}
//     return `<i class="bi bi-check2 text-muted"></i>`
// }
// function getSenderName(username){
//     if(username === currentUser.username) return "من"
//     const user = member_users.find(u => u.username === username)
//     if(!user) return username
//     return `${user.first_name} ${user.last_name}`
// }
function addMessageToChatUI(data, prepend = false , isFirstMessage=false, isLastMessage=true ,animate = "", MessagePack = output.querySelectorAll('.MessagePack')) {
    
    if(messagesCreated.includes(data.id)){
        const MessageElm = output.querySelector(`#Message-${data.id.split('-')[1]}`)
        if(MessageElm)MessageElm.remove()
    }
    let isPending = data?.isPending ? data.isPending : false;


    const user = member_users.filter(user=> user.username === data.sender)[0]
    const user_name = user? `${user?.first_name} ${user?.last_name}`:data.sender
    let contentToAdd = "";
    let dateToAdd = "";
    let unreadToAdd = "";
    messagesCreated.push(data.id)
    messagesCreatedHandler.push(user_name)
    let messageId = data.id
    messageId = (data.id).split("-")[1];
    messageIdSplited.push(messageId)
    const isNewSender = lastSender !== data.sender;

    // Update the last sender
    lastSender = data.sender;
    
    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
    // const bgColor = savedSettings?.bgColor || "#ffff";
    const bgColor = "207, 226, 255";
    const fontSize = savedSettings?.fontSize || "13px";
    const borderRad = savedSettings?.borderRad || "15px";
    const fgColor = savedSettings?.fgColor || "#4444";
    const chatWindowFgColor = savedSettings?.chatWindowFgColor || "#434343";
    const ownMessage = data.sender === currentUser.username;

    const styleClass = ownMessage ? "var(--user-border-radius) 5px var(--user-border-radius) var(--user-border-radius)" : "5px var(--user-border-radius) var(--user-border-radius) var(--user-border-radius) ";
    data.message = data?.message
    ?.replace(/\n/g, '<br>') // Replace newlines with <br>
    ?.replace(
        /((https?:\/\/|www\.)[^\s<]+)/g, // Match URLs (starting with http, https, or www)
        (url) => {
            const href = url.startsWith('http') ? url : `https://${url}`; // Ensure href starts with http(s)
            return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        }
        // https://href.li/?
    );
    const borderRadiusFalse = ()=>{

        
           const lastMessageElm = output.querySelectorAll(`.messageElm`)

        if (lastMessageElm.length >= 1) {
            const lastValue = data.sender.trim();
            const secondLastValue = lastMessageElm[lastMessageElm.length - 1].getAttribute('sender').trim();
            if (lastValue !== secondLastValue) {
                if(prepend)return ownMessage ? `var(--user-border-radius) 5px 5px var(--user-border-radius)`: `5px var(--user-border-radius) var(--user-border-radius) 5px`
                else  return ownMessage ? `var(--user-border-radius) var(--user-border-radius) 5px var(--user-border-radius)`: `var(--user-border-radius) var(--user-border-radius) var(--user-border-radius) 5px`          
            } else if(!prepend) {
                // console.log("last: ",lastValue)
                // console.log("second last: ",secondLastValue)
                const message = lastMessageElm[lastMessageElm.length - 1].querySelector('.message')
                if(message.style.borderRadius!= "var(--user-border-radius) var(--user-border-radius) var(--user-border-radius) 5px"
                     || message.style.borderRadius!= "var(--user-border-radius) var(--user-border-radius)  5px var(--user-border-radius)" ){
                        message.style.borderRadius=  ownMessage ? `var(--user-border-radius) 5px 5px var(--user-border-radius)`: `  5px var(--user-border-radius) var(--user-border-radius)  5px`;
                     }
                return ownMessage ? ` var(--user-border-radius) 5px var(--user-border-radius) var(--user-border-radius)`: ` 5px  var(--user-border-radius)  var(--user-border-radius)  var(--user-border-radius)`;
            }else{
                return ownMessage ? ` var(--user-border-radius) 5px 5px var(--user-border-radius)`: `5px var(--user-border-radius) var(--user-border-radius) 5px `
            }
            
        }else if(prepend){
            return ownMessage ? ` var(--user-border-radius) 5px var(--user-border-radius) var(--user-border-radius)`: ` 5px  var(--user-border-radius)  var(--user-border-radius)  var(--user-border-radius)`;
        }else{
            // return ownMessage ? `5px var(--user-border-radius) 5px 5px`: `var(--user-border-radius) 5px   5px 5px`          

        }
    }
    let messageStyle = ownMessage
    // background: linear-gradient(135deg, #ffffff ,rgb(var(--user-bg-color)) 10%, rgb(var(--user-bg-color)) 30%, rgb(var(--user-bg-color)) 50%, rgb(var(--user-bg-color)) 90%, #ffffff )!important;
        ? ` 
            background-color:   rgb(var(--user-bg-color)) !important;
            color:rgb(var(--user-fg-color)) !important;
            font-size:${fontSize};
            border-radius: ${borderRadiusFalse()};`
            : `
            font-size:${fontSize};
            background-color:   var(--primary-bg) !important;
            border: 1px solid var(--color-peer-${data.sender}) !important;
            border-radius:  ${borderRadiusFalse()};
            `;
    // let style = ownMessage
    //     ? ` background-color:#cfe2ff;
    //         color:rgb(var(--user-fg-color));
    //         font-size:${fontSize};
    //         border-radius: ${borderRadiusFalse()};`
    //     : ` background-color: white !important;
    //         color:rgb(var(--user-side-fg-color));
    //         font-size:${fontSize};
    //         border: 1px solid var(--color-peer-${data.sender}) !important;
    //         border-radius:  ${borderRadiusFalse()};
    //         `;
    if(data.sender == 'Heimdall'){
        messageStyle=`
            border: 2px solid var(--accent) !important;
            
        `
    }
    const divStyle = ownMessage
        ? ` justify-content:flex-end;`
        : ` justify-content:flex-start;`;

    // Get the date of the current message
    const messageDate = new Date(data.timestamp || new Date());
    const messageDateString = messageDate.toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    // Date tag
    if (data.dateLine) {
        dateToAdd = `
            <div dir="auto" class="col-12 m-auto row" data-date="${messageDateString}" class="Date" style="display: flex; align-items: center; text-align: center; font-size: ${fontSize}; margin: 10px 0; font-weight: bold; color: rgb(var(--user-bg-color));">
                <div class=" rounded-5 backdrop-blur-chat-fg "col-auto m-auto ">
                    ${messageDateString}
                </div
            </div>`; 
    }
    if (data.readLine) {
            NEED_TO_RELOAD_ROOM_UI = true

        unreadToAdd = `
        <div class="unread col-12 m-auto row" style="display: flex; align-items: center; text-align: center; font-size: ${fontSize}; margin: 10px 0; font-weight: bold; color: rgb(var(--user-chat-fg-color));">
                <span class="col-auto m-auto rounded-5 backdrop-blur-chat-fg">پیام های جدید</span>
        </div>`;
        // console.log(unreadToAdd)
    }   

    // Main message content
    let readStatus='unread';
    const reactionMember = data.readUsers
    ? data.readUsers
        .map((r) => {
            if(r.username == currentUser.username){
                readStatus = 'read'
            }
          return r.reaction
            ? `<span class='animate__animated animate__zoomIn   ${r.username == currentUser.username ? `ownReaction `:``} reactionMemEmoji ' ${r.username == currentUser.username ? `onClick="addStickerReaction('',${messageId})"`:''} user-id="${r.username}">${r.reaction}</span>`
            : "";
        })
        .join("")
    : "";
  
    // console.log(reactionMember)
    // Main message content
    const readInfoHTML = data.readUsers
    ? data.readUsers
        .filter(r => r.username !== currentUser.username || (r.username === currentUser.username&& r?.reaction))
          .map((r) => {
            if(r.username === currentUser.username&& r.reaction !== ""){
              return `<div user-id='${r.username}' style="font-size:0.9rem;text-align:left;">
                       ${"من"} ${r.reaction}
                     </div>
                     <hr>`
            }else if(r.username !== currentUser.username){
                // console.log(member_users)
                // return
                const user = member_users.filter(user=> user.username === r.username)[0]
                const user_name = user ? `${user?.first_name} ${user?.last_name}`:r.username
                return `<div user-id='${r.username}' style="font-size:0.9rem;text-align:left;">
                ${user?.first_name} ${user?.last_name} at ${formatTimestamp(r.time)} ${r.reaction}${r.voice_heared ? `<span class="jdate  animate__animated animate__fadeIn" title="Heared the voice"><i class="bi bi-ear"></i></span>`:''}
              </div>
              `
            }
          })
          .join("<hr>")
    : "";
    const voice_heared_users = data?.readUsers?.filter(r => r.voice_heared && r.username != data.sender ) 
    const Is_voice_heared = voice_heared_users?.length > 0 ? true : false
    // <button id="reactBtn-${messageId}" class="btn reactBtn" onclick="toggleStickerPicker(${messageId})">
    // <img src="../svg/emojiAdd.svg" alt="emoji add" width="20" height="20" />
    // </button>
    // sender name
    const handler = () => {
      // Check if the last and second-to-last values are equal
      if(prepend){

          if (messagesCreatedHandler.length >= 2) {
            const lastValue = messagesCreatedHandler[messagesCreatedHandler.length - 1];
            const secondLastValue = messagesCreatedHandler[messagesCreatedHandler.length - 2];
            if (lastValue == secondLastValue) {
                  
                 return ``        
            } else {
                const lastMessageElm = output.querySelector(`#Message-${messageIdSplited[messageIdSplited.length-2]}`)
            if(lastMessageElm){
                const inLast = lastMessageElm.querySelector('.message')
                if(inLast){
                    if(!inLast.querySelector('h6')){
                        // console.log("last : ",inLast)
                        let userColor = `var(--color-peer-${lastMessageElm.getAttribute('sender')}) !important`
                        inLast.insertAdjacentHTML("afterbegin",`<h6 class="message-title text-primary" style="color:${messagesCreatedHandler[messagesCreatedHandler.length - 2] === name.textContent.trim() ? '' : userColor}; font-style:italic;text-align:start;">${messagesCreatedHandler[messagesCreatedHandler.length - 2] === name.textContent.trim() ?'من':messagesCreatedHandler[messagesCreatedHandler.length-2]}</h6>`)
                        // console.log('before border :',inLast.style.borderRad)
                        inLast.style.borderRadius = messagesCreatedHandler[messagesCreatedHandler.length - 2] === name.textContent.trim() ? 'var(--user-border-radius) var(--user-border-radius) 5px var(--user-border-radius)' : ' var(--user-border-radius) var(--user-border-radius) var(--user-border-radius) 5px ' ;
                        // console.log('after border :',inLast.style.borderRad)
                    }
                }
                // messagesCreatedHandler=[]

                return `` ;
            }else {
                return `<h6 class="message-title ${ownMessage ? 'text-primary':''}" style="color:${ownMessage ? '' : `var(--color-peer-${data.sender}) `}!important; font-style:italic;text-align:start;">${ownMessage ? `من`: user_name}</h6>
                ` ;  
                    }
            }
            } else {
                return `<h6 class="message-title ${ownMessage ? 'text-primary':''}" style="color:${ownMessage ? '' : `var(--color-peer-${data.sender}) `}!important; font-style:italic;text-align:start;">${ownMessage ? `من`: user_name}</h6>
                ` ;  
                    }
      }else{
        const lastMessageElm = output.querySelectorAll(`.messageElm`)

        if (lastMessageElm.length >= 2) {   
            const lastValue = data.sender.trim();
            const secondLastValue = lastMessageElm[lastMessageElm.length - 1].getAttribute('sender');
            // console.log("last: ",lastValue)
            // console.log("second last: ",secondLastValue)
            if (lastValue !== secondLastValue) {
                let userColor = `var(--color-peer-${data.sender})`

                return `<h6 class="message-title ${ownMessage ? 'text-primary':''}" style="color:${ownMessage ? '' : userColor}; ;text-align:start;">${ownMessage ? `من`: user_name}</h6>`           
            } else {
                return ``;
             }
        } else {
            return `<h6 class="message-title ${ownMessage ? 'text-primary':''}" style="color:${ownMessage ? '' : userColor}; ;text-align:start;">${ownMessage ? `من`: user_name}</h6>
            ` ;
        }
    }
        
    }

    
    // console.log("replyJson: ", data.reply!==null ?  data.reply:'')
    // onmouseover="toggleReactBtnVisibility(${messageId}, true)" onmouseout="toggleReactBtnVisibility(${messageId}, false)"
    const status_check =()=>{
        if(isPending){
            
            return `
            <div class="d-flex loader align-items-center">
                <div class="spinner-border small text-metachat ms-auto" aria-hidden="true"></div>
            </div>`;
        }else{
            if(readInfoHTML){
                return `<i class="bi text-primary animate__animated animate__zoomIn bi-check2-all"></i>`
            }else{
                return `<i class="bi text-muted bi-check2"></i>`
            }
        }
    }

   const telegramAudio = (src,id) => {
        return `
        <div class="tg-player border-0 col-12 px-1" style="background-color:transparent;" data-ready="false" data-src="${src}" data-id="${id}" data-sender="${data.sender}">
            <div class="row col-12 m-auto p-0 ">
                <div class="d-none loader_voice">
                </div>
                <button class="d-none btn btn-primary col-auto m-auto rounded-circle tg-play  mt-3" type="button" data-ctime='0'>
                    <i class="bi bi-play-fill"></i>
                </button>
                
                <div class="d-none col px-2 row m-auto">
                    <div class="flex-grow-1 col-12 overflow-hidden m-auto">
                        <canvas class="tg-canvas brder-bottom col-12" width="1080"></canvas>
                    </div>
                    <span class="col-auto position-relative d-flex">    
                        <small class="text-muted tg-time col-auto d-flex m-auto">0:00</small>
                        ${Is_voice_heared? `` :`
                            <span class="col-auto fs-1">
                                <i class="text-primary bi bi-dot "></i>
                            </span>
                        `}
                    </span>
                </div>
                <audio preload="metadata" src="${src}"  crossorigin="anonymous" controls class="d-none col controls voice-message"></audio>
                <span class="playRate cursor-pointer border border-primary text-primary border-1 small mt-3  px-1 col-auto m-auto rounded" data-playrate='${voice_playbackRate}'>
                    X${voice_playbackRate}
                </span>
            </div>
        </div>
                `;
                // <audio class="d-none" crossorigin="anonymous" src="${src}"></audio>
    }

    // ${ownMessage? `right_box1 `:`left_box2 `}
    // دریافت صداهای دیگر کاربران 
    
    contentToAdd += `
    <div id="Message-${messageId}" data-mess_org_id="${data.id}"
         class="messageElm animate__animated ${animate} row ${isPending? `isPending_${messageId}`:''}" 
         date-id="${messageDate}" 
         style="${divStyle} align-items: center;" 
         sender="${data.sender}">

       
        <div class="message ${ownMessage? 'own':''} p-1 backdrop-blur-chat-bg col-auto ${data.sender== 'Heimdall'?"rounded m-auto":""}"
             style="${messageStyle}; margin:2px;">

            ${handler()}
            ${data.reply && data.reply!==null ? `
            <div class="col-12 ">
                <div class="d-flex replyMessage gap-2 p-2 EmbeddedMessage cursor-pointer h-10rem position-relative m-2  peer-color-${ownMessage?`0`:`1`}" 
                    data-reply-id="Message-${(data.quote).split('-')[1]}">
                    <span class="col-auto message-title" 
                        dir="rtl" 
                        style="${ownMessage? `color: rgb(var(--user-fg-color));`:`color: var(--color-peer-${data.reply.sender});`} font-style:italic;text-align:end;">
                        ${data.reply.sender == currentUser.username ? `من` : 
                            ``
                        }
                    </span>
                    <div  class="text-truncate d-inline-block" dir="auto">${(data.reply.message !==''? data.reply.message.replace(/<[^>]*>/g, '').replace(/\n/g, '') : `${data?.reply?.file ?capitalizeWord(data.reply.file.split('/')[0]?? ''):''} File` )}
                    </div>
                </div>
            </div>` : ''}
            <div class="m-0 row d-flex gap-2">
                ${data.file && data.file!==null ? data.file.map(file => `
                    <div id="file_${file._id}" class="position-relative col-auto p-0">
                        ${file.fileType.startsWith("image/") ? `
                            <div  class="col-md-6 position-relative" >
                                <a href="https://mc.farahoosh.ir:4000${file.file}" target="_blank">
                                <img class="img-fluid col-auto rounded" 
                                    src="https://mc.farahoosh.ir:4000${file.file}" 
                                    style="border-radius: ${borderRadiusFalse()};" 
                                    loading="lazy" 
                                    alt="Image" 
                                    href="https://mc.farahoosh.ir:4000${file.file}" onerror="$('#file_${file._id} .file-actions').removeClass('d-none')">
                                </a>
                                
                            </div>
                            
                        ` : file.fileType === "application/pdf" ? `
                            <div  class="row gap-2 col position-relative p-3" >
                                <iframe class=" rounded pdf-frame" src="https://mc.farahoosh.ir:4000${file.file}" frameborder="0" onerror="$('#file_${file._id} .file-actions').removeClass('d-none')" loading="lazy"></iframe>
                                <a 
                                    href="https://mc.farahoosh.ir:4000${file.file}"
                                    class="btn  m-auto btn-outline-primary">
                                    <i class="bi fileIcon bi-filetype-${(file.fileName).split('.')[1]}"></i>
                                    ${file.fileName || 'Unknown File'} <i class="bi bi-box-arrow-up-right"></i>
                                </a>
                            </div>

                        ` : file.fileType.startsWith("video/") ? `
                            <div  class="col-12 position-relative" >

                                <video class=" video-preview col-12 P-0 rounded" controls>
                                    <source src="https://mc.farahoosh.ir:4000${file.file}" type="${file.fileType}" onerror="$('#file_${file._id} .file-actions').removeClass('d-none')">
                                    Your browser does not support the video tag.
                                </video>
                                
                            </div>

                        ` : file.fileType.startsWith("audio/") ? `
                            ${file.fileType.split('/')[1] == 'webm'? telegramAudio(`https://mc.farahoosh.ir:4000${file.file}`,`${file._id}`):`
                            <div  class="col position-relative" >

                                <audio class="control blurBackDark rounded-5 shadow" controls crossorigin="anonymous" onerror="$('#file_${file._id} .file-actions').removeClass('d-none')" src="https://mc.farahoosh.ir:4000${file.file}"></audio>
                               
                            </div>

                            `}
                            `
                            : `
                            <div class="file-actions col-12">
                                <a 
                                    onclick="triggerDownload('https://mc.farahoosh.ir:4000${file.file}','${file.fileName}')"
                                    class="btn  col-auto m-auto btn-outline-primary">
                                    <i class="bi fileIcon bi-filetype-${(file.fileName).split('.')[1]}"></i>
                                    ${file.fileName || 'Unknown File'} <i class="bi bi-download"></i>
                                </a>
                            </div>
                            `}
                            <div class="file-actions col-12 d-none">
                                <a 
                                    onclick="triggerDownload('https://mc.farahoosh.ir:4000${file.file}','${file.fileName}')"
                                    class="btn  col-auto m-auto btn-outline-primary">
                                    <i class="bi fileIcon bi-filetype-${(file.fileName).split('.')[1]}"></i>
                                    ${file.fileName || 'Unknown File'} <i class="bi bi-download"></i>
                                </a>
                            </div>
                        <div class="dropdown d-inline  position-absolute top-0 end-0 m-1 me-2" id="file_menu_${file._id}"
                                data-fileName="${file.fileName}"
                                data-file="${file.file}">
                            <button class="btn btn-sm  mt-1 p-0 rounded-3 shadow btn-outline-white backdrop-blur-chat-fg" data-bs-toggle="dropdown" aria-expanded="false" onclick="menu_file('${file._id}',${ownMessage || currentUser.username == '09173121943'})">
                                <i class="bi fs-5 fw-semibold bi-three-dots-vertical"></i>
                            </button>
                            
                            
                            
                            <div dir="auto" class="dropdown-menu actions p-1 gap-2">
                            </div>
                        </div>
                    </div>
                `).join('') : ""}
            </div>
            <div class=" text-content m-auto gap-1 justify-content-between row p-0 col-12" >
                <div class="dataMessage rounded  p-1  ${!data?.message ? 'col':'col-auto'}"  message-id="Message-${messageId}" dir="auto">
                    ${data.message}
                </div>
                <div class="col-auto p-0 d-flex">
                    <span dir="rtl" class="  timeSeen small text-muted pe-2">
                        <span class="fst-italic edited_tag">${data?.edited ? `Edited`:''}</span>
                        ${ownMessage ? `
                        <button class="read-toggle"
                            read-data-id="${data.id}"
                            title="Seen member info"
                            onclick="openReadedMessage('${data.id}')"
                            style="bottom: -3px; position: relative; cursor:pointer; text-align:right; color:var(--user-fg-color); border:none; background:none;">
                        <strong class="status">${status_check()}</strong>

                        </button>` : ''}
                        ${new Intl.DateTimeFormat("fa-IR", {
                            hour: "2-digit",
                            minute: "2-digit", 
                            hour12: false
                        }).format(messageDate || new Date())}
                    
                    </span>
                </div>
                ${ownMessage ? `
               <div class="read-info position-absolute start-0 bottom-0  animate__animated animate__zoomIn mx-3" 
                    id="read-info-${data.id}" 
                    style="font-size:${fontSize};border-radius:${borderRad};">
                   ${readInfoHTML}
               </div>` : ''}
            </div>
        </div>
             
    </div>

    <div class="messageRead"
    data-readStatus='${readStatus}'
    data-id="Message-${messageId}">
        <div style="${divStyle}" class="footerMessage">
            <div class="gap-1 ${reactionMember!=''?'my-4':''}" reactionMessage="${messageId}">
                ${reactionMember}
            </div>
        </div>
    </div>`;
    //data.message.replace(/&lt;br&gt;/g, '<br>')

    let firstMessage = `
    <div data-id="Message-${messageId}" data-date="${messageDate}" class="firstMessage">
            <button class="btn btn-outline-secondary my-3 " style="border-radius:50% !important; border: 2px solid;"  onclick="loadfirstButton()"><strong><i class="bi bi-arrow-up"></i></strong></button>

    </div>
    `;
    // `
    // <div data-id="Message-${messageId}" class="firstMessage">
    //         <button class="btn btn-outline-secondary my-3 " style="border-radius:50%; border: 2px solid;"  onclick="loadfirstButton()"><strong><i class="bi bi-arrow-up"></i></strong></button>

    // </div>
    // `;
    let lastMessage = `
        <div data-id="Message-${messageId}" data-date="${messageDate}" class="lastMessage"></div>
    `;



        // If MessagePack is empty, create a new container
    if (MessagePack.length === 0) {
        const newMessagePack = document.createElement('div');
        newMessagePack.classList.add('MessagePack');
        output.appendChild(newMessagePack);
        MessagePack = output.querySelectorAll('.MessagePack'); // Update the reference
    }
    
    if (prepend) {
        MessagePack[0].insertAdjacentHTML("afterbegin", contentToAdd);
        if (dateToAdd) MessagePack[0].insertAdjacentHTML("afterbegin", dateToAdd);
        if (unreadToAdd) MessagePack[0].insertAdjacentHTML("afterbegin", unreadToAdd);
        if (isNewSender ) {
            const lastMessageElm = MessagePack[0].querySelector(`#Message-${messagesCreated[messagesCreated.length -1].split("-")[1]}`);
            // const lastMessageElm2 = MessagePack[0].querySelector(`#Message-${messagesCreated[messagesCreated.length -2].split("-")[1]}`);
            if (lastMessageElm) {
                $(`#Message-${messagesCreated[messagesCreated.length -1].split("-")[1]} .message`).css('border-radius',styleClass); // Ensure only last message retains the box class
            }
        }
    } else {
        if (dateToAdd) MessagePack[MessagePack.length-1].insertAdjacentHTML("beforeend", dateToAdd);
        if (unreadToAdd) MessagePack[MessagePack.length-1].insertAdjacentHTML("beforeend", unreadToAdd);
        MessagePack[MessagePack.length-1].insertAdjacentHTML("beforeend", contentToAdd);
          // Reset styles for new sender if not last in sequence

          
    }
    // Check and update or insert firstMessage
    if (isFirstMessage) {
        let existingFirstMessage = output.querySelector('.firstMessage');
        if (existingFirstMessage) {
            existingFirstMessage.remove()
        } 
            output.insertAdjacentHTML("afterbegin", firstMessage);
        
    }

    // Check and update or insert lastMessage
    if (isLastMessage) {
        let existingLastMessage = output.querySelector('.lastMessage');
        if (existingLastMessage) {
            existingLastMessage.remove()
        } 
            output.insertAdjacentHTML("beforeend", lastMessage);
        
    }
    if(animate){
        setTimeout(() => {
            $(`.messageElm.${animate}`).removeClass(`${animate}`)
        }, 1000);
    }
        return data.id;
}
function init_message_ui(){
                   
    searchMessageReply()
    // Run the function to apply the functionality
    messageMenu()
    // initTelegramAudioPlayers()
   
}
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
                // اگر خود نود پلیر باشه
                if ($(node).hasClass('messageElm') && $(node).find('.tg-player').length) {
                    $(node).find('.tg-player').each(function() {
                        initTelegramAudioPlayers();
                    });
                }

            });
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

function initTelegramAudioPlayers(){
    $('.tg-player').not('[data-ready="true"]').each(async function(){


        const player = $(this)
        const file_id = player.data('id')
        const sender = player.data('sender')


        $(`#file_menu_${file_id}`).remove()



        let audio = player.find('audio.voice-message').first()
        if(!audio){
            showAlert('X','info')
        }else{
            audio.removeClass('d-none');

        }
        const btn = player.find(".tg-play")  
        const btn_playRate = player.find(".playRate")  
        const loader = player.find(".loader_voice")  
        const icon = btn.find("i")  
        const time = player.find(".tg-time")  
        const canvas = player.find(".tg-canvas")[0]
        const next_playRate={
            1:1.5,
            1.5:2,
            2:1
        }


        const ctx = canvas.getContext("2d")


        // تنظیم سایز فقط یکبار
//         canvas.width = canvas.offsetWidth  
        canvas.height = 100

        let audioCtx = null;
        let buffer = null;
        let bars = []  
        const maxBars = isMobileDevice ? 100 : 240
        let isDragging = false
        loader.html(`
                <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
            `)
        btn.addClass('d-none')

        // duration// رویداد بارگذاری متادیتا
        audio.addEventListener("loadedmetadata", async function() {
            // محاسبه زمان
            let dm = Math.floor(audio.duration / 60);
            let ds = Math.floor(audio.duration % 60);
            if (ds < 10) ds = "0" + ds;
            
            time.text(`${dm}:${ds}`);
            btn.removeClass("d-none");
            player.attr("data-ready","true")
            loader.html("").addClass("d-none");
            audio.playbackRate = voice_playbackRate
            audio.currentTime = btn.attr('data-ctime') ?? 0;

            
        });
        // فراخوانی تابع بارگذاری
        
        

        // resume state
        if(btn.attr('data-ctime') != 0 ){
            audio.currentTime = btn.attr('data-ctime') ?? 0
            audio.play()
        }


        btn_playRate.off("click").on("click", function () {
            const playRate = btn_playRate.attr('data-playrate')??1
            console.log(playRate)
            const speed = next_playRate[playRate]
            audio.playbackRate = speed
            localStorage.setItem('voice_playbackRate',speed)
            voice_playbackRate = speed

            $('.tg-player .playRate').text(`X${speed}`).attr('data-playrate',speed)
        })
        // play / pause
        let convert_on_err;
        let playTimeout; // متغیر برای ذخیره تایمر

        btn.off("click").on("click", async function () {
            try {

                // پاک کردن تایمر قبلی اگر کاربر سریع کلیک کرد
                if (playTimeout) {
                    clearTimeout(playTimeout);
                }
                await loadAudioBuffer();
                console.log(buffer,audioCtx)
                if(buffer.length>0 && audioCtx.length>0){
                    // محاسبه ارتفاع نوارها (یک‌بار)
                    bars = computeBars(buffer, audioCtx); // فرض بر این است که computeBars به audioCtx نیاز دارد
                    
                    draw();
                    
                    // مخفی کردن لودر و نمایش دکمه
                }


                // stop others
                $("audio.voice-message").not(audio).each(function () {
                    this.pause();
                    $(this).closest(".tg-player")
                        .find(".tg-play i")
                        .attr("class", "bi bi-play-fill");

                    $(this).closest(".tg-player")
                        .find(".tg-play");
                });

                if (audio.paused) {
                    const dot = player.find("i.bi.bi-dot");
                    if (dot.length > 0 && sender != currentUser.username) {
                        socket.emit('voice_heared', { file_id });
                    }
                    let audio_now =audio.currentTime
                    // شروع پخش
                    audio.play().then(() => {
                        // اگر پخش موفق بود، تایمر رو کنسل کن
                        if (playTimeout) {
                            clearTimeout(playTimeout);
                            playTimeout = null;
                        }
                        icon.attr("class", "bi bi-pause-fill");
                    }).catch(error => {
                        // اگر پخش خطا داد یا بلاک شد، تایمر اجرا میشه
                        console.log("Play failed or blocked:", error);
                    });

                    // تنظیم تایمر ۲ ثانیه‌ای
                    playTimeout = setTimeout(() => {
                        // چک کن که آیا ویس هنوز پخش نمیشه؟
                        // اگر ویس پخش نشده بود (paused یا error)، کلاس رو بردار
                        if (audio.paused || audio.error || audio_now == audio.currentTime) {
                            audio.removeClass('d-none');
                        }
                        playTimeout = null;
                    }, 2000);

                } else {
                    audio.pause();
                    icon.attr("class", "bi bi-play-fill");
                    // اگر کاربر ویس رو متوقف کرد، تایمر قبلی رو هم پاک کن
                    if (playTimeout) {
                        clearTimeout(playTimeout);
                        playTimeout = null;
                    }
                }
            } catch (error) {
                time.text(error.message);
            }
        });


        // time update
        audio.addEventListener("timeupdate",function(){
            try {
                
                   
                draw()

                let cm = Math.floor(audio.currentTime/60)    
                let cs = Math.floor(audio.currentTime%60)
                let dm = Math.floor(audio.duration/60)    
                let ds = Math.floor(audio.duration%60)


                if(cs < 10) cs = "0" + cs    
                if(ds < 10) ds = "0" + ds


                time.text(`${cm}:${cs} / ${dm}:${ds}`)
                btn.attr('data-ctime',audio.currentTime)


                if(audio.currentTime >= audio.duration && !isDragging){
                    time.text(`${dm}:${ds}`)
                    btn.attr('data-ctime','0')
                    audio.pause()
                    icon.attr("class", "bi bi-play-fill")
                 }
            } catch (error) {
                time.text(error.message)
            }
        })


        // seek helpers
        function getClientX(e){
            if(e.touches) return e.touches[0].clientX    
            return e.clientX
        }


        function seek(e) {
            const rect = canvas.getBoundingClientRect();
            const x = getClientX(e) - rect.left;
            
            const percent = Math.max(0, Math.min(1, x / rect.width));
            
            const timeSeek = percent * audio.duration;
            audio.currentTime = timeSeek;
        }



        $(canvas).on("mousedown touchstart",function(e){
            isDragging = true    
            seek(e)
        })


        $(canvas).on("mousemove touchmove",function(e){
            if(isDragging) seek(e)
        })


        // مهم: جلوگیری از چندبار bind شدن
        $(window)
            .off("mouseup.tg touchend.tg")
            .on("mouseup.tg touchend.tg",function(){
                isDragging = false
            })




/* ---------- 1️⃣ بارگذاری و تبدیل به AudioBuffer ---------- */


        // تابع آماده‌سازی Context با رعایت قوانین موبایل
        async function initAudioContext() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            // در iOS و برخی مرورگرهای موبایل، Context در حالت suspended است
            // باید با تعامل کاربر (کلیک/لمس) فعال شود
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            return audioCtx;
        }

        async function loadAudioBuffer() {
            try {
                const response = await fetch(audio.currentSrc);
                if (!response.ok) throw new Error("فایل صوتی یافت نشد");
                
                const arrayBuf = await response.arrayBuffer();
                
                // 1. ابتدا Context را آماده کن (اینجا باید بعد از تعامل کاربر باشد)
                const ctx = await initAudioContext();
                
                // 2. دیکد کردن فایل صوتی
                buffer = await ctx.decodeAudioData(arrayBuf);
                
                // 3. بررسی صحت بارگذاری (به جای .length از properties صحیح استفاده کن)
                // buffer.length زمان کل فایل بر حسب ثانیه است
                if (buffer && buffer.length > 0) {
                    player.attr("data-ready", "true");
                    
                    // 4. محاسبه و رسم نوارها
                    // فرض بر این است که computeBars و draw درست کار می‌کنند
                    bars = computeBars(buffer, ctx); 
                    draw();
                    
                    // نمایش دکمه پخش
                    btn.removeClass("d-none");
                } else {
                    player.find('audio.voice-message').removeClass('d-none');
                    throw new Error("فایل صوتی خالی یا نامعتبر است");
                }
                
            } catch (error) {
                console.error("خطا در بارگذاری صدا:", error);
                showAlert(error.message);
            }
        }




        /* ---------- 2️⃣ محاسبهٔ ارتفاع نوارها (یک‌بار) ---------- */
        function computeBars(buffer) {
            const rawData = buffer.getChannelData(0); // فقط کانال اول (مونو)
            const blockSize = Math.floor(rawData.length / maxBars);
            const newBars = [];

            for (let i = 0; i < maxBars; i++) {
                // محاسبهٔ مقدار RMS برای هر بلوک
                let sum = 10;
                for (let j = 0; j < blockSize; j++) {
                    const sample = rawData[(i * blockSize) + j];
                    sum += sample * sample ;
                }
                const rms = Math.sqrt(sum / blockSize); // مقدار RMS در بازه 0‑1
                const height = rms * canvas.height; // تبدیل به ارتفاع پیکسل
                newBars.push(height);
            }
            return newBars;
        }
        const lightBgColor = getComputedStyle(document.documentElement).getPropertyValue('--user-fg-color').trim();
        // تابع کمکی برای رسم مستطیل با گوشه‌های گرد
        function fillRoundedRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
        }

       

        /* ---------- 3️⃣ تابع رسم ---------- */
        function draw() {
            
            requestAnimationFrame(draw);

            // اگر آدیو یا بوم آماده نیستند، خارج شو
            if (!audio || !canvas || !ctx) return;

            // اگر آدیو پخش نمیشه، نیازی به رندر نیست (مگر اینکه بخواهید فریم ثابت بمونه)
            if (audio.paused || audio.ended) return;

            // جلوگیری از خطای تقسیم بر صفر
            if (audio.duration === 0) return;


            const progress = audio.currentTime / audio.duration;
            const playedBars = Math.floor(progress * bars.length);
            const barWidth = canvas.width / bars.length; // استفاده از طول واقعی آرایه

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // رسم نوارهای غیرپخش‌شده (خاکستری)
            // تنظیمات
            const centerY = canvas.height / 2; // مرکز عمودی بوم

            // رسم نوارهای پس‌زمینه (خاکستری/روشن)
            ctx.fillStyle = `rgba(${lightBgColor}, 0.25)`;
            for (let i = 0; i < bars.length; i++) {
                const barHeight = (bars[i] * 3)+4 >= canvas.height ?(canvas.height-4):(bars[i] * 3)+4;
                const x = i * barWidth;
                const y = centerY - (barHeight / 2); // محاسبه Y از مرکز
                
                fillRoundedRect(ctx, x, y, barWidth - 1, barHeight, 5); // 5 شعاع گوشه‌هاست
            }

            // رسم نوارهای پخش‌شده (آبی)
            if (playedBars > 0) {
                ctx.fillStyle = '#0d6efd';
                for (let i = 0; i < playedBars; i++) {
                    const barHeight = (bars[i] * 3)+4 >= canvas.height ?(canvas.height-4):(bars[i] * 3)+4;
                    const x = i * barWidth;
                    const y = centerY - (barHeight / 2); // محاسبه Y از مرکز
                    
                    fillRoundedRect(ctx, x, y, barWidth - 1, barHeight, 5);
                }
            }
        }




//         async function initialAudio(){
           
//             if (!audio._initialized) {


//                 audio._initialized = true


//                 audio._audioCtx = new (window.AudioContext || window.webkitAudioContext)()
//                 audio._source = audio._audioCtx.createMediaElementSource(audio)
//                 audio._analyser = audio._audioCtx.createAnalyser()


//                 audio._analyser.fftSize = 128


//                 audio._source.connect(audio._analyser)
//                 audio._analyser.connect(audio._audioCtx.destination)


//                 audio._bufferLength = audio._analyser.frequencyBinCount
//                 audio._dataArray = new Uint8Array(audio._bufferLength)

//                 draw()
//             }
//         }
    })
}
socket.on('update_voice_heared',async(data)=>{
    const {messageId,username,file_id} = data
    $(`#read-info-${messageId} div[user-id="${username}"]`).append('<span class="jdate animate__animated animate__heartBeat" title="Heared the voice"><i class="bi bi-ear"></i></span>')
    $(`.tg-player[data-id="${file_id}"`).find("i.bi.bi-dot").remove()
})
function menu_file(id,isOwner){
    
    const $menu = $(`#file_menu_${id}`).find('.dropdown-menu')
    const fileName = $(`#file_menu_${id}`).data('filename')??''
    const file = $(`#file_menu_${id}`).data('file')??''
    console.log(fileName,file)
    $menu.html(`
                
                ${isOwner == true  ? `
                <button class="dropdown-item my-1 d-flex justify-content-between rounded-3 text-start col-12 btn text-danger"
                    onclick="Delete_file_id('${id}')">
                    <i class="col-auto bi text-danger bi-trash me-2 my-auto"></i> <span class="col m-auto">Delete</span>
                </button>
                ` : ''}
                <a 
                    onclick="triggerDownload('https://mc.farahoosh.ir:4000${file}','${fileName}')"
                    class="dropdown-item my-1 d-flex justify-content-between rounded-3 text-start col-12 btn text-primary">
                    <i class="bi fileIcon bi-filetype-${(fileName).split('.')[1]}"></i>
                    <span class="m-auto">Download</span> <i class="bi m-auto bi-download"></i>
                </a>
            `);
}
// // Function to check and apply "more..." for all messages
// function applyShowMore() {
//     const messages = document.querySelectorAll('.dataMessage');

//     messages.forEach((message) => {
//         // const showMoreButton = message.querySelector('.show-more');
//         const messageId= message.getAttribute('message-id');
//         // Calculate the height of one line of text
//         const lineHeight = parseFloat(getComputedStyle(message).lineHeight);
//         const maxVisibleHeight = lineHeight * 5; // Maximum height for 5 lines

//         // Check if the text exceeds 5 lines
//         // console.log('id :',message.getAttribute('message-id')," height :" , message.scrollHeight)
//         if (message.scrollHeight > maxVisibleHeight) {
//             message.style.maxHeight = `${maxVisibleHeight}px`; // Limit to 5 lines
//             // showMoreButton.style.display = 'inline';
//             message.insertAdjacentHTML('afterend',`<div class="backdrop-blur p-1 show-more"  style="display: inline;" onclick="showMore('${messageId}')" message-id="${messageId}">
//                 <i class="bi bi-arrow-down-circle"></i>
//                 </div>`)
//         }

//         // // Add event listener for the "more..." button
//         // showMoreButton.addEventListener('click', () => {
//         //     message.style.maxHeight = 'none'; // Expand to show full text
//         //     showMoreButton.style.display = 'none';
//         // });
//     });
// }
function showMore(messageId) {
    const message = document.querySelector(`.dataMessage[message-id="${messageId}"]`);
    const button = document.querySelector(`.show-more[message-id="${messageId}"]`);


    if (message.style.maxHeight === `${message.scrollHeight}px`) {
        // Collapse back
        const lineHeight = parseFloat(getComputedStyle(message).lineHeight);
        const maxVisibleHeight = lineHeight * 5;
        message.style.maxHeight = `${maxVisibleHeight}px`;
        button.classList.toggle('rotated'); // Add a class to rotate the button

    } else {
        // Expand
        message.style.maxHeight = `${message.scrollHeight}px`;
        button.classList.toggle('rotated'); // Add a class to rotate the button
    }
}

function triggerDownload(src,fileName) {
    // Extract the filename from the URL (Me can adjust this if the file name is provided directly)

    // Create a temporary <a> tag for the download
    const tempLink = document.createElement('a');
    tempLink.href = src;  // Get the file source URL
    tempLink.download = fileName;  // Set the filename from the URL

    // Append it to the document body
    document.body.appendChild(tempLink);
    
    // Programmatically trigger a click on the link to start the download
    tempLink.click();
    
    // Remove the temporary <a> tag after the download is triggered
    document.body.removeChild(tempLink);
}
function Delete_file_id(id){
    const fileEl = $(`#file_${id}`)
    fileEl.css('opacity', '0.5');
    socket.emit('delete_file', { id }, async (response) => {
        if (response && response.success) {
            // Successfully deleted on server
            if (fileEl) {
                showAlert('Message deleted','info')
            }
        } else {
            // Server rejected deletion
            showAlert(response?.error || 'Failed to delete message. You may not have permission.','info');
            if (fileEl) {
                fileEl.css('opacity', '1');
            }
        }
    });
}
socket.on("delete_file",async(id)=>{
     if (id) {
        const fileEl = $(`#file_${id}`)
        if (fileEl) {
            Promise.resolve($(`#roomList_ul li#${currentUser.room}`).attr('data-last-update', new Date())).then(()=>{
                
                sortRooms()
            })
            fileEl.removeClass(`animate__fadeInUp`).addClass('animate__animated animate__bounceOut')
            setTimeout(() => {
                fileEl.remove();
            }, 1000); // Remove from DOM
        }
        // Remove message with data.messageId from UI
    }
})
// JavaScript function to toggle the visibility of the react button
// function toggleReactBtnVisibility(messageId, show) {
//     const reactBtn = document.getElementById(`reactBtn-${messageId}`);
    
//     // Toggle the 'visible' class depending on whether the mouse is over or out
//     if (show) {
//         reactBtn.classList.add('visible');
//     } else {
//         reactBtn.classList.remove('visible');
//     }
// }

// Function to toggle the sticker picker (this is just an example)
function toggleStickerPicker( messageId , pageX =0 ,pageY=0 ) {
     
    console.log("Sticker picker toggled for message ID: ",messageId, pageX ," , ",pageY);
    // Implement logic for showing/hiding sticker picker
    document.body.insertAdjacentHTML(`beforeend`,emoji(messageId))
    var stickerPicker = document.getElementById(`emoji-${messageId}`);
    stickerPicker.style.left = `${pageX}px`; // Position menu at cursor's X position
    stickerPicker.style.top = `${pageY}px`;  // Position menu at cursor's Y position
    // if (stickerPicker.classList.contains("show")) {
    //     stickerPicker.classList.remove("show");
    //     stickerPicker.classList.add("hide");
    // } else {
    //     stickerPicker.classList.remove("hide");
    //     stickerPicker.style.display = "block";
        
    //     stickerPicker.classList.add("show");
    // }
}

// Function to add sticker reaction
function addStickerReaction(reaction,messageId) {
    const message = roomID +"-"+ messageId
    
    // console.log("Sticker selected:", reaction);
    // console.log("message selected:", message);
    // Here, emit the reaction to the server or update the UI accordingly
    socket.emit("addReaction", { username: currentUser.username, messageId: message, reaction:reaction });
    var stickerPicker = document.getElementById(`emoji-${messageId}`);
    const element = document.querySelector(`.messageRead[data-id="Message-${messageId}"]`);
    if (element) {
        element.scrollIntoView({
            behavior: "smooth",
            block: "center", // یا "center" بسته به نیاز
        });
    }


    stickerPicker.remove();

}

// Filter function to search emojis
function filterEmojis(messageId) {
    const searchQuery = document.getElementById("emojiSearch").value.toLowerCase();
    const emojiContainer = document.getElementById("emojiContainer");
    const emojis = emojiContainer.getElementsByTagName("span");

    for (let i = 0; i < emojis.length; i++) {
        const emoji = emojis[i];
        const emojiText = emoji.textContent || emoji.innerText;

        if (emojiText.toLowerCase().includes(searchQuery)) {
            emoji.style.display = "inline-block"; // Show emoji
        } else {
            emoji.style.display = "none"; // Hide emoji
        }
    }
}
socket.on("reactionAdded", ({ messageId, username ,time  , reaction }) => {
    const readInfoElement = document.querySelector(`#read-info-${messageId}`);
    let spiltedId = messageId.split('-')[1]
    const memberReaction = document.querySelector(`[reactionmessage="${spiltedId}"]`);
    if (readInfoElement) {
        // Update the read information for each read user
        const seenUser = readInfoElement.querySelector(`[user-id='${username}']`);
        
        Promise.resolve($(`#roomList_ul li#${currentUser.room}`).attr('data-last-update', new Date())).then(()=>{
            
            sortRooms()
        })
        if(seenUser){
            if(username !== currentUser.username){
            let updateUserReact = seenUser.innerHTML.split(' ')[0]
            let updateTimeReact = seenUser.innerHTML.split(' ')[2]
            seenUser.innerHTML= `${updateUserReact} at ${updateTimeReact} ${reaction}`
            }else{
                // let updateTimeReact = seenUser.innerHTML.split(' ')[2]
                seenUser.innerHTML = `من ${reaction}`

            }
        }
        else{
            // let updateTimeReact = seenUser.innerHTML.split(' ')[2]
            readInfoElement.innerHTML += `<div user-id="${username}" style="font-size:0.9rem;text-align:left;">
            من ${reaction}
            </div>
            <hr>`

        }
    }
    if (memberReaction) {
        const userRect = memberReaction.querySelector(`[user-id='${username}']`);
    
        // Debug: Check if the element exists and its current state
        if(userRect) {
            // console.log(`User reaction found for username: ${username}`);
            // console.log(`Before update: ${userRect.innerHTML}`);
            if(reaction!==''){
            // Update the reaction
            userRect.innerHTML = reaction;
            }else{
                // console.log(userRect)
                userRect.remove()

            }
            // Debug: After updating
            // console.log(`After update: ${userRect.innerHTML}`);
        } else {
            // console.log(`No existing reaction found for username: ${username}. Creating a new one.`);
            // userRect.innerHTML = `<span class='${username == currentUser.username ? `ownReaction `:``} reactionMemEmoji mx-1' user-id="${username}">${reaction}</span>`;

            // Create a new reaction element
          memberReaction.innerHTML += `<span class='animate__animated animate__zoomIn   ${username == currentUser.username ? `ownReaction `:``} reactionMemEmoji ' ${username == currentUser.username ? `onClick="addStickerReaction('',${spiltedId})"`:''} user-id="${username}">${reaction}</span>`
    
            // Debug: Log the newly created element
            // console.log(`New reaction created for username: ${username}`);
            // console.log(`HTML of new element: ${newUserRect.outerHTML}`);
        }
    } else {
        // Debug: Member reaction container is not found
        console.log(`Member reaction container not found. Reaction message ID: ${spiltedId}`);
    }

// fixing margins when reactions div is empty

    if(memberReaction.innerHTML.trim()){
        console.log("true :",memberReaction.innerHTML)
        memberReaction.classList.add('my-3')
    }else{
        console.log("false :",memberReaction.innerHTML)
        memberReaction.classList.remove('my-3')

    }
    
});
// --------------------------------------------
// read-info panel
// Example usage within your socket event
socket.on("readMessageUpdate", ({ id, readUsers }) => {
    const readInfoElement = document.querySelector(`#read-info-${id}`);
    var toggleBtn = document.querySelector(`[read-data-id="${id}"]`);
    if (readInfoElement) {
        toggleBtn.innerHTML=`<i class="animate__animated animate__bounceIn bi text-primary bi-check2-all"></i>`
        // Update the read information for each read user
        readUsers.forEach((r) => {
            if (r.username !== currentUser.username) {
                updateTimeForReadUser(r, readInfoElement);
            }else{
                $(`.messageRead[data-id="${id.split('-')[1]}"]`).data('readStatus','read')
 
            }
        });
    }
});

const updateTimeForReadUser = (r, readInfoElement) => {
    // Initial timestamp from the read user
    let startTime = r.time;
    
    // Update time every second
    const interval = setInterval(() => {
        const currentTime = new Date();
        const timeDifference = (currentTime - new Date(startTime)) / 1000; // Time difference in seconds
        
        // Check if the time difference exceeds 1 minute (60 seconds)
        if (timeDifference > 60) {
            clearInterval(interval); // Stop the interval if more than 1 minute has passed
        }

        if(r.username!=currentUser.username){
        // Update the displayed time for the read user
        readInfoElement.innerHTML = `
            <div user-id='${r.username}' style="font-size: 0.9rem; text-align: left;">
                ${r.name} at ${formatTimestamp(r.time)}
            </div>`;
        }
    }, 1000); // Update every second
};
function openReadedMessage(dataId) {
    // Get the read-info div based on the data-id
    const infoDiv = document.querySelector(`#read-info-${dataId}`);
    const toggleBtn = document.querySelector(`[read-data-id="${dataId}"]`);

    if (!infoDiv || !toggleBtn) return; // Ensure elements exist

    if (infoDiv.classList.contains("visible")) {
        // Hide the read-info and reset content
        infoDiv.classList.remove("visible");
        infoDiv.style.display = "none";
        console.log("hide");
        return;
    }

    // Generate the read info HTML content

    // Show the read-info
    infoDiv.style.display = "block";
    infoDiv.classList.add("visible");
    console.log("show");
}

document.addEventListener("click",()=> {
    var infoDiv = document.querySelectorAll(`.read-info`);
    var emojiDiv = document.querySelectorAll(`.stickerPicker`);
    if (infoDiv) {
        var toggleBtn = document.querySelectorAll(`.read-toggle`);

         // Get the read-toggle button based on the data-id attribute (correct selector)
        if (!event.target.closest(".read-toggle")) {
            infoDiv.forEach((panel) => {
                if (panel.classList.contains("visible")) {
                    panel.classList.remove("visible"); // Hide the currently visible panel
                    panel.style.display='none'
                } 
            });
      
        }
        
    }
    if (emojiDiv) {

         // Get the read-toggle button based on the data-id attribute (correct selector)
        if (!event.target.closest(".reactBtn")) {
            if (!event.target.closest(".stickerPicker")) {
                emojiDiv.forEach((panel) => {
                    if (panel.classList.contains("show")) {
                        panel.classList.remove("show"); // Hide the currently visible panel
                        panel.classList.add("hide"); // Hide the currently visible panel
                    } 
                });
            }    

        }
        
    }
})
// Function to open the image in a modal

  

// ========================================================================================

// readed messages ===========================================================
// Function to format the message date as 'YYYY-MM-DD'
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');  // Months are 0-based
    const day = String(date.getDate()-1).padStart(2, '0');  // Ensure two digits for day
    return `${year}-${month}-${day}`;
}


$(document).ready(function () {
    let lastScrollTop = 0; // Keeps track of the last scroll position
    let isScrolling = false; // Tracks if the chat window is currently scrolling
    let scrollTimeout; // Timer to ensure scrolling is complete
    

    // Attach scroll event listener to the chat window
    $('#chat-window #output').on("scroll", function () {
        const currentScrollTop = $(this).scrollTop();

        // Show the "down" button with a fade-in effect

        // Clear any previous timeout
        clearTimeout(scrollTimeout);

        // Debounced check for scroll stability
        scrollTimeout = setTimeout(() => {
            if (currentScrollTop === $(this).scrollTop()) {
                lastScrollTop = currentScrollTop; // Update the last stable scroll position
                isScrolling = false; // Mark as no longer scrolling
            }
        }, 200); // Adjust delay for smoother checks

        isScrolling = true; // Mark as currently scrolling
    });

    // Smooth scroll to the bottom when the button is clicked
    $("#down").on("click", function () {
        unreadedScroll=0
        updateNotifCount(unreadedScroll)
        $("#down").hide(); // Hide the button with a fade-out effect
        scrollDown()
    //   if(document.querySelector('.unread')) document.querySelector('.unread').fadeOut()
    });

});

function scrollLoader(){
    const visibleMessages = [];
    const messages = document.querySelectorAll(".messageRead"); // Class of each message div
    const firstMessage = document.querySelectorAll(".firstMessage")[0]; // Class of each message div
    const lastMessage = document.querySelectorAll(".lastMessage")[0]; // Class of each message div
    const Dates = document.querySelectorAll(".Date"); // Class of each date div
    const rectheadTag = headTag.getBoundingClientRect(); // Get the head tag's position
    // if(!scrolling) console.log('scrolling locked')

    const isNearBottom =output.scrollHeight - output.scrollTop - output.clientHeight < 240
    if (isNearBottom) {
        $("#down").hide(); // Show scroll-up button
    }else{
        $("#down").show(); // Show scroll-up button

        // $("#down").show(); // Optionally show the scroll-down button
    };
   
    if(scrolling){
    // Iterate through Dates to check if they are in view
    
        if(firstMessage){

            if( firstMessage.getAttribute('data-id')&& firstMessage.getAttribute('data-date')){
                let firstMessageId = firstMessage.getAttribute('data-id');
                let firstMessageId_date = firstMessage.getAttribute('data-date');
                firstMessageId = roomID +"-"+ firstMessageId.split('-')[1]
                const threshold = 400; // Proximity in pixels to the top of the viewport

                if (firstMessage.getBoundingClientRect().top >= -threshold && 
                firstMessage.getBoundingClientRect().bottom <= window.innerHeight) { 
                    // Check if the message has not been sent before and it's the first message of the day
                    if (!sentMessagesId.includes(firstMessageId)) {
                        const isSmallerThanAll = sentMessagesId.every((id) => {
                            return firstMessageId < id; // Compare lexicographically (string comparison)
                        });
                        
                        // If the firstMessageId is smaller than all the sent messages' IDs, request older messages
                        if (isSmallerThanAll) {
                            
                            console.log(firstMessageId)
        
                            sentMessagesId.push(firstMessageId);  // Store the sent date to prevent duplicates
                            // Emit the request for older messages to the server
                            $loadingElement.removeClass('d-none').addClass('show')
                            disableScrolling()
                            socket.emit("requestOlderMessages", { roomID: roomID, counter: firstMessageId_date });
                        }
                    }
                
                }
            }  
        }

        if(lastMessage   &&  loadNextMessage ){
            if( lastMessage.getAttribute('data-id') && lastMessage.getAttribute('data-date')){
                let lastMessageId = lastMessage.getAttribute('data-id');
                let lastMessage_date = lastMessage.getAttribute('data-date');
                lastMessageId = roomID +"-"+ lastMessageId.split('-')[1]
                // console.log("before scroll:", lastMessageId)
                const threshold = 200; // Proximity in pixels to the top of the viewport
                let rect = lastMessage.getBoundingClientRect()  
                if (rect.bottom >= -threshold 
                &&rect.top <= window.innerHeight+threshold) {
                    // console.log("after scroll:", lastMessageId)
                            // Check if the message has not been sent before and it's the first message of the day
                    if (!sentMessagesIdLast.includes(lastMessageId)) {
                        const isSmallerThanAll = sentMessagesIdLast.every((id) => {
                            return lastMessageId > id; // Compare lexicographically (string comparison)
                        });
                        
                        // If the lastMessageId is smaller than all the sent messages' IDs, request older messages
                        if (isSmallerThanAll) {
                            
                            console.log(lastMessageId)
        
                            sentMessagesIdLast.push(lastMessageId);  // Store the sent date to prevent duplicates
                            // Emit the request for older messages to the server
                            $loadingElement.removeClass('d-none').addClass('show')
                            disableScrolling()
                            socket.emit("requestOlderMessages", { roomID: roomID, counter: lastMessage_date, type: 'last' });
                        }
                    }
                
                }
            }
        }
    }
}
function loadfirstButton(){
    const firstMessage = document.querySelectorAll(".firstMessage")[0]; // Class of each message div


    let firstMessageId = firstMessage.getAttribute('data-id');
    let firstMessage_date = firstMessage.getAttribute('data-date');
    firstMessageId = roomID +"-"+ firstMessageId.split('-')[1]
    if (!sentMessagesId.includes(firstMessageId)) {
            const isSmallerThanAll = sentMessagesId.every((id) => {
                return firstMessageId < id; // Compare lexicographically (string comparison)
            });
            
            // If the firstMessageId is smaller than all the sent messages' IDs, request older messages
            if (isSmallerThanAll) {
                
                console.log(firstMessageId)

                sentMessagesId.push(firstMessageId);  // Store the sent date to prevent duplicates
                // Emit the request for older messages to the server
                $loadingElement.removeClass('d-none').addClass('show')
                disableScrolling()
                socket.emit("requestOlderMessages", { roomID: roomID, counter: firstMessage_date });
            }
        }
}

output.addEventListener("scroll", () => {
    
    const visibleMessages = [];
    const messages = document.querySelectorAll(".messageRead"); // Class of each message div
    const firstMessage = document.querySelectorAll(".firstMessage")[0]; // Class of each message div
    const lastMessage = document.querySelectorAll(".lastMessage")[0]; // Class of each message div
    const Dates = document.querySelectorAll(".Date"); // Class of each date div
    const rectheadTag = headTag.getBoundingClientRect(); // Get the head tag's position
    // if(!scrolling) console.log('scrolling locked')

        Dates.forEach((dateElem) => {
            const rectDate = dateElem.getBoundingClientRect();
    
            // If the bottom of the date element is at or above the top of the head tag
            if (rectDate.bottom <= rectheadTag.top) {
                // console.log(dateElem.innerHTML); // Log the date when it reaches the top
                headTag.innerHTML = dateElem.innerHTML; // Set the head tag's content to the current date element
            }
        });
    // Iterate through messages to find visible ones (if needed)
    if(!document.hidden){
        messages.forEach((message) => {
            const rect = message.getBoundingClientRect();
            let messageId = message.getAttribute('data-id');
            let dataReadStatus = message.getAttribute('data-readStatus')??'unread';
            message.setAttribute('data-readStatus','read')

            messageId = roomID+"-"+ messageId.split('-')[1]
            // Check if the message is in the viewport (visible)
            if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
                if (messageId && !visibleMessages.includes(messageId)&& dataReadStatus=='unread') {
                    visibleMessages.push(messageId);  // Add the data-id of visible messages
                    // console.log(messageId)
                }
            }
        });
    
        // Emit the IDs of visible messages to the server
        if (visibleMessages.length > 0) {
            socket.emit("markMessagesRead", { messageIds: visibleMessages, roomID : roomID});
        }
    }
});

function uploadImage() {
    const input = document.getElementById('imageUpload');
    const file = input.files[0];

    if (file) {
        const reader = new FileReader();
        
        reader.onloadend = function () {
            const base64Image = reader.result.split(',')[1]; // Get the Base64 string
            // Send the Base64 string to the server
            socket.emit('sendImage', { image: base64Image });
        };

        reader.readAsDataURL(file);  // Convert the file to Base64
    } else {
        console.log("No file selected.");
    }
}


// _______________reply____________________
function replyMessage(messageId) {
    // Select the message element
    const $messageElement = $(`#Message-${messageId}`);

    // Extract sender and message content
    const sender = $messageElement.attr('sender');

    let messageContent = escapeHtml(
        $messageElement.find('.dataMessage').text().trim()
    );

    if (messageContent === '') {
        messageContent = 'File';
    }

    // Construct the reply box content
    const $replyBox = $('#replyBox');

    $replyBox.html(`
        <div class="row gap-2 col-12 m-0 align-items-center justify-content-between">
            
            <span class="col-auto">
                <i class="bi bi-reply fs-3 text-secondary"></i>
            </span>

            <div 
                class="col replyMessage blurBackDark px-2 peer-color-0 d-flex justify-content-between align-items-center rounded"
                replyid="Message-${messageId}"
            >
                <span 
                    dir="auto"
                    data-reply-id="Message-${messageId}"
                    id="messageReplied"
                    class="text-break py-2"
                >
                    ${messageContent}
                </span>
            </div>

            <button 
                onclick="clearReply()" 
                class="btn btn-danger btn-sm btn-close replyClose"
                type="button"
            ></button>

        </div>
    `);

    // Set attributes
    $replyBox.attr('reply-id', messageId);

    // Bootstrap utility classes instead of inline styles.
    // Humanity invented utility classes so nobody has to commit crimes like
    // style="display:flex;justify-content:space-between" at 3AM anymore.
    $replyBox
        .removeClass('d-none')
        .addClass(
            'd-flex align-items-center justify-content-between p-2 rounded'
        );

    toggleReplyBox(true);
    searchMessageReply();

    message.focus();
}



function clearReply() {
    const replyBox = document.getElementById("replyBox");
    replyBox.removeAttribute('reply-id');

    toggleReplyBox(false)
    setTimeout(() => {
        replyBox.innerHTML = ""; // Clear innerHTML after 300ms (adjust the time as needed)
    }, 300);  // This delay should match your CSS transition time    
    // replyBox.style.display = 'none';
    $(replyBox).addClass('d-none')
    delete replyBox.dataset.replyId; // Remove the reply id
}
function toggleReplyBox(isVisible) {
    const $replyBox = $('#replyBox');
    
    if (isVisible) {
        $replyBox.removeClass('hide d-none');
        $replyBox.addClass('show');
    } else {
        $replyBox.removeClass('show');
        $replyBox.addClass('hide d-none');
    }
}

function uploadImage() {
    const input = document.getElementById('imageUpload');
    const file = input.files[0];

    if (file) {
        const reader = new FileReader();
        
        reader.onloadend = function () {
            const base64Image = reader.result.split(',')[1]; // Get the Base64 string
            // Send the Base64 string to the server
            socket.emit('sendImage', { image: base64Image });
        };

        reader.readAsDataURL(file);  // Convert the file to Base64
    } else {
        console.log("No file selected.");
    }
}
async function deleteMessage(messageId) {
    // Prevent action if no messageId
    if (!messageId || typeof messageId !== 'string') {
        alert('Invalid message ID.');
        return;
    }

    // Optional: Confirm deletion from user
    const confirmDelete = confirm('Are you sure you want to delete this message? This action cannot be undone.');
    if (!confirmDelete) {
        return;
    }

    try {
        // Show loading state (optional - you can add a spinner on the message)
        const messageElement = document.querySelector(`[data-mess_org_id="${messageId}"]`);
        if (messageElement) {
            messageElement.style.opacity = '0.6';
            messageElement.innerHTML += ' <small><i>(deleting...)</i></small>';
        }

        // Emit delete event to server
        socket.emit('delete', { username :currentUser.username , messageId }, async (response) => {
            if (response && response.success) {
                // Successfully deleted on server
                
                Promise.resolve($(`#roomList_ul li#${currentUser.room}`).attr('data-last-update', new Date())).then(()=>{
                    
                    sortRooms()
                })
                if (messageElement) {
                    showAlert('Message deleted','info')
                }
            } else {
                // Server rejected deletion
                showAlert(response?.error || 'Failed to delete message. You may not have permission.','info');
                if (messageElement) {
                    messageElement.style.opacity = '1';
                    messageElement.querySelector('small i')?.remove();
                }
            }
        });

    } catch (error) {
        console.error('Error deleting message:', error);
        showAlert('An error occurred while deleting the message.','error');
        
        // Restore message appearance on error
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.style.opacity = '1';
            messageElement.querySelector('small i')?.remove();
        }
    }
}
async function editMessage(messageId) {
    // Prevent action if no messageId
    if (!messageId || typeof messageId !== 'string') {
        alert('Invalid message ID.');
        return;
    }


    try {
        // Show loading state (optional - you can add a spinner on the message)
        const $messageElement = $(`[data-mess_org_id="${messageId}"]`);
        const messageElement = document.querySelector(`[data-mess_org_id="${messageId}"]`);
        if (!messageElement) return
        const $el_edit = $messageElement.find('.dataMessage')
        if($el_edit.find('.edit_content').length>0) return
        const text_old = $el_edit.html()
        $messageElement.data('old-content',text_old)
        Promise.resolve($el_edit.html(`
            <div contenteditable="true" id="message_edit_form_${messageId}" onpaste="handlePaste(event)" class="edit_content form-control">
                ${text_old}
            </div>
            <button class="btn btn-sm btn-success mt-1 save-edit-btn">
                save
            </button>
            <button class="btn btn-sm btn-secondary mt-1 cancel-edit-btn">
                cancel
            </button>
        `)).then(()=>{
            $(`#output #message_edit_form_${messageId}`).focus()

        })
    
        $el_edit.find('.cancel-edit-btn').on('click', function () {
            const old = $messageElement.data('old-content');
            $el_edit.html(old);
        });
        $el_edit.find('.save-edit-btn').on('click', function () {
            const new_message = $(`#chat-window #message_edit_form_${messageId}`).html()
            // Emit delete event to server
            socket.emit("edit", {  username :currentUser.username , messageId , new_message}, async (response) => {

                if (response && response.success) {
                    
                    Promise.resolve($(`#roomList_ul li#${currentUser.room}`).attr('data-last-update', new Date())).then(()=>{
                        
                        sortRooms()
                    })
                    // Successfully deleted on server
                    // $el_edit.html(decryptMessage(new_message)).append('<span class="jdate">Edited</span>');
                    showAlert(response.message , 'info');
                    
                } else {
                    // Server rejected deletion
                    showAlert(response?.error || 'Failed to edit message. You may not have permission.','info');
                    if (messageElement) {
                        messageElement.style.opacity = '1';
                        messageElement.querySelector('small i')?.remove();
                    }
                }
            });
        });
        

    } catch (error) {
        console.error('Error deleting message:', error);
        showAlert('An error occurred while editing the message.','error');
        
        // Restore message appearance on error
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.style.opacity = '1';
            messageElement.querySelector('small i')?.remove();
        }
    }
}
socket.on("delete", (messageId) => {
    if (messageId) {
        const $messageElement = $(`[data-mess_org_id="${messageId}"]`);

        if ($messageElement) {
            
            Promise.resolve($(`#roomList_ul li#${currentUser.room}`).attr('data-last-update', new Date())).then(()=>{
                
                sortRooms()
            })
            $messageElement.removeClass(`animate__fadeInUp`).addClass('animate__bounceOut')
            setTimeout(() => {
                $messageElement.remove();
            }, 1000); // Remove from DOM
        }
        // Remove message with data.messageId from UI
    }
});
socket.on("edit", (data) => {
    const {messageId , new_message} = data
    if (messageId) {
        const $messageElement = $(`[data-mess_org_id="${messageId}"]`);
        const messageElement = document.querySelector(`[data-mess_org_id="${messageId}"]`);
        if (!messageElement) return
        const $el_edit = $messageElement.find('.dataMessage')
         // Successfully deleted on server
        $messageElement.find('.message').removeClass(`animate__fadeInUp`).addClass('animate__animated animate__jello')
        console.log('edited')
        $el_edit.html(new_message)
        $messageElement.find('.timeSeen .edited_tag').html('Edited');

    }
});
// message menu
function messageMenu() {
    const elements = output.querySelectorAll("#chat-window .messageElm");
    if(document.getElementById("messageMenu")){
        document.getElementById("messageMenu").remove()
    }
    document.body.insertAdjacentHTML("beforeend", `
        <div id="messageMenu">
            <div class="messageMenuHeader h-40rem overflow-y-auto hide-scrollbar"></div>
            <div class="messageMenubody list-group gap-1"></div>
        </div>`)    
    const menu = document.getElementById("messageMenu");
    const header = menu.querySelector('.messageMenuHeader')
    const body = menu.querySelector('.messageMenubody')
    function isFromAudioPlayer(target){
        return target.closest('.tg-player') !== null
    }

    elements.forEach(element => {
        let startX = 0
        let startY = 0
        let currentX = 0
        let currentY = 0
        let isDragging = false
        let longPressTimeout
        element.addEventListener("click", (event) => {  
            openMenu(event, menu, element)
        })
        element.addEventListener("touchstart", (e) => {
            if(isFromAudioPlayer(e.target)) return
            const touch = e.touches[0]
            startX = touch.clientX  
            startY = touch.clientY  
                currentX = startX  
                currentY = startY  
                isDragging = true
            longPressTimeout = setTimeout(() => {
                element.classList.add("long-press-effect")
                openMenu(touch, menu, element)
            }, 500)
        })

        element.addEventListener("touchmove", (event) => {
          if (!isDragging) return
          clearTimeout(longPressTimeout)  
            element.classList.remove("long-press-effect")
          currentX = event.touches[0].clientX  
          currentY = event.touches[0].clientY  
            const deltaX = currentX - startX
            const deltaY = currentY - startY
          if (!menu.contains(event.target)) {    
                menu.style.display = "none"  
            }
          if ((-deltaX > 0 ) && (deltaY <= 50)) {
            if(!element.querySelector("#replyIcon")){      
                element.insertAdjacentHTML(        "beforeend",
                    `<div id="replyIcon" class=" col-auto position-absolute end-0" style="margin-right:-50px;">
                        <span class=" m-auto fs-3 p-2 ">
                            <i class="bi bi-reply"></i>
                        </span>
                    </div>`     
                )
                element.querySelector('.message').classList.add('placeholder-wave')
            }else{
                element.querySelector("#replyIcon").style.opacity = Math.abs(deltaX)/100
            }
            let nim = 0.5
            let X_el = -deltaX<=120 ? deltaX : -Math.pow(Math.abs(deltaX),nim)-120
            element.style.transform = `translateX(${X_el}px)` 
        }else{
            if((deltaY >= 50)){
                element.style.transform = `` 
                if(element.querySelector("#replyIcon")){    element.querySelector("#replyIcon").remove()  }
                element.classList.remove("long-press-effect")
                element.querySelector('.message').classList.remove('placeholder-wave')
                isDragging = false
            }

        }
        })

        element.addEventListener("touchend", () => {
            clearTimeout(longPressTimeout)  
            element.classList.remove("long-press-effect")
            element.querySelector('.message').classList.remove('placeholder-wave')
            isDragging = false
            const deltaX = currentX - startX
            const deltaY = currentY - startY
            if (-deltaX >= 100 && -deltaY<=50) {    replyMessage(element.id.split("-")[1])  }
            if(element.querySelector("#replyIcon")){    element.querySelector("#replyIcon").remove()  }
            element.style.transform = ""
        })

        element.addEventListener("contextmenu", (event) => {
          event.preventDefault()
          openMenu(event, menu, element)
        })
    })
    
    setTimeout(() => {
        $(elements).removeClass('animate__zoomInUp')
    }, 2000);
    // Function to open the menu at the cursor position
    function openMenu(event, menu, element) {
        let messageId = (element.id).split('-')[1]
        let readInfo = element.querySelector('.read-info') ?? ''
        let emojiLess = `
            <div class="my-2" id="emojiGrid">
                <div id="emojiContainer" >
                    <span onclick="addStickerReaction('😂', ${messageId})" class="emoji">😂</span>
                    <span onclick="addStickerReaction('👍', ${messageId})" class="emoji">👍</span>
                    <span onclick="addStickerReaction('👎', ${messageId})" class="emoji">👎</span>
                    <span onclick="addStickerReaction('❤️', ${messageId})" class="emoji">\u2764\uFE0F</span>
                    <span onclick="addStickerReaction('🙏', ${messageId})" class="emoji">🙏</span>
                </div>
            </div>
        `
        header.innerHTML = readInfo.innerHTML || null
        header.insertAdjacentHTML("afterbegin",emojiLess)
        // menu.insertAdjacentHTML("afterend",emoji(messageId))
        let emojiDiv = `
        
        <button dir="auto" id="reactBtn-${messageId}" class="d-flex list-group-item justify-content-between  btn reactBtn visible col-12" onclick="toggleStickerPicker(${messageId},${event.pageX} , ${event.pageY })">
            شکلک
            <i class="bi bi-emoji-smile"></i>
        </button>
        `
        // <img class="col-auto" src="https://mc.farahoosh.ir:4000/svg/emojiAdd.svg" alt="emoji add" width="20" height="20" />
        body.innerHTML=`
         <button dir="auto" id="reply-${messageId}" class="d-flex list-group-item justify-content-between  btn visible col-12" >
            پاسخ
            <i class="bi bi-reply"></i>
        </button>
        <button dir="auto" id="copyMessage-${messageId}" class="d-flex list-group-item justify-content-between  btn visible col-12" >
            رونوشت
            <i class="bi bi-copy"></i>
        </button>
        <button dir="auto" id="editMessage-${messageId}" class="d-flex list-group-item justify-content-between  btn visible col-12" >
            ویرایش
            <i class="bi bi-pencil "></i>
        </button>
        <button dir="auto" id="deleteMessage-${messageId}" class="d-flex list-group-item justify-content-between  btn visible col-12" >
            پاک کردن پیام
            <i class="bi bi-trash3-fill"></i>
        </button>
        `
        body.innerHTML+=emojiDiv
        $(`#messageMenu #reply-${messageId}`).off().on("click",()=>{
            // Copy the innerHTML to the clipboard
            replyMessage(messageId);
        })
        $(`#messageMenu #copyMessage-${messageId}`).off().on("click",()=>{
            // Copy the innerHTML to the clipboard
            console.log(element.querySelector('.dataMessage').innerHTML)
            copyToClipboard(element.querySelector('.dataMessage').textContent);

            // Optional: Provide user feedback (e.g., show a success message)
            showAlert("Message copied to clipboard!","info");
        })
        $(`#messageMenu #editMessage-${messageId}`).off().on("click",()=>{
            // Copy the innerHTML to the clipboard
            editMessage($(element).data('mess_org_id'));

            // Optional: Provide user feedback (e.g., show a success message)
            // ref("Message Deleted!",null,null, "success");
        })
        $(`#messageMenu #deleteMessage-${messageId}`).off().on("click",()=>{
            // Copy the innerHTML to the clipboard
            deleteMessage($(element).data('mess_org_id'));

            // Optional: Provide user feedback (e.g., show a success message)
            // ref("Message Deleted!",null,null, "success");
        })
        menu.addEventListener("click",()=>{
            menu.style.display = "none";
        })
        // menu.style.display = "block";
        // menu.style.left = `${event.pageX}px`; // Position menu at cursor's X position
        // menu.style.top = `${event.pageY}px`;  // Position menu at cursor's Y position
        // console.log("Clicked element ID:", element.id); // Log the clicked element's ID
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
       
    
        // Calculate position ensuring the menu stays within bounds
        let x = event.clientX;
        let y = event.clientY;
    
        if (x + menuWidth > windowWidth) {
            x = windowWidth - menuWidth;
        }
    
        if (y + menuHeight > windowHeight) {
            y = windowHeight - menuHeight;
        }
        // console.log(windowWidth," , ",windowHeight," , ")
        // Position the menu and display it
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = "block";
    
    }
   
    // Close the menu when clicking anywhere else
    output.addEventListener("click", (event) => {
        if (!menu.contains(event.target)) {
            menu.style.display = "none";
        }
    });
}
// Helper function to copy text to the clipboard
function copyToClipboard(text) {


    
    try {
        navigator.clipboard.writeText(text) 
        showAlert('Copied to ClipBoard','info')
    } catch (err) {
        console.error('Error copying text: ', err);
    }

    // Remove the temporary textarea element from the DOM
    document.body.removeChild(textarea);
}

// Function to escape HTML and handle line breaks
function escapeHtml(input) {
    // Temporarily replace <br> tags with a placeholder
    input = input.replace(/<br>/g, "__BR__");

    // Escape other HTML characters
    input = String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Restore <br> tags from the placeholder
    return input.replace(/__BR__/g, "<br>");
}

// =======================================================================================
// message find
function searchMessageReply() {
    $('.replyMessage').not('[data-finish="true"]').each(function(){
        
        const $reply = $(this)
        $reply.attr('data-finish',true)
        $reply.off('click').on('click', () => {
            console.log($reply)
            const replyID = $reply.data('reply-id'); // Get the replyID attribute
            if (replyID) {
                scrollToMessage(replyID); // Call the scrollToMessage function

            } else {
                console.error('No replyID found for this reply');
            }
        });
    })
}






socket.on("disconnect", () => {
    console.warn("🔴 Disconnected from server!");
    showAlert("ارتباط با سرور برقرار نیست", "warning");
});

socket.on("reconnect", () => {
    console.log("🟢 Reconnected!");
    showAlert("خوش آمدید", "primary");
        
    const last_connection = localStorage.getItem('connected_at')??'';
    Promise.resolve(socket.emit("authenticate", {last_connection}, (response) => {
        if (response.success) {
            console.log("Re-authenticated successfully");
            localStorage.setItem('connected_at',response?.date)

            // Now safe to send queued messages
            if (response.roomID && response.update) {
                    join(response.roomID);

            } 
            $loadingElement.removeClass('d-none').addClass('show')
            const cache_roomList = localStorage.getItem('roomList')??[]
            cursor = null;
            loading = false;
            hasMore = true;
            loadRooms(true)
            const toast_messages = response?.toast_messages ?? []

            for (const m of toast_messages) {

                // صبر کردن برای نمایش توستر
                refToast(m);
            }
            if(localStorage.getItem('roomList')) room_list_genration(JSON.parse(cache_roomList))
        
            flushMessageQueue(); // Your function to send queued messages
            update_user_status();

        } else {
            console.error("Authentication failed after reconnect");
        }
    }));


});
function flushMessageQueue() {
    let queue = getMessageQueue();

    if (queue.length === 0) {
        console.log("No queued messages to send.");
        return;
    }

    console.log(`Flushing ${queue.length} queued message(s)...`);

    // Process messages one by one to preserve order and avoid overwhelming server
    const sendNext = async () => {
        if (queue.length === 0) {
            
            if (roomID != "") {
                $loadingElement.removeClass('d-none').addClass('show')
                socket.emit("joinRoom",{ roomID: roomID})
                
            }
            console.log("All queued messages processed.");
            return;
        }

        const item = queue[0]; // Oldest message first

        // Skip if we've already tried too many times
        if (item.attempts >= 1) {
            console.warn(`Giving up on message after 1 attempts:`, item.id);
            updateMessageStatus(item.id, 'failed-permanent');
            dequeueMessage(item.id);
            queue.shift();
            saveMessageQueue(queue);
            sendNext();
            return;
        }

        item.attempts += 1;

        socket.emit("chat", item.encrypted, (ack) => {
            if (ack && ack.success) {
                console.log(`Queued message sent successfully: ${item.id}`);
                // Update UI to show sent
                updateMessageStatus(item.id, 'sent');
                
                // Remove from queue
                dequeueMessage(item.id);
                queue.shift();
                saveMessageQueue(queue);

                // Continue with next
                sendNext();
            } else {
                console.warn(`Failed to send queued message (attempt ${item.attempts}):`, ack?.error || "No response");

                // Update UI to show pending/failed temporarily
                updateMessageStatus(item.id, 'pending');

                // Save updated attempts count
                saveMessageQueue(queue);

                // If still connected, retry this message after delay
                if (socket.connected) {
                    setTimeout(sendNext, 2000 + item.attempts * 1000); // Exponential backoff
                }
                // Else: wait for next reconnect (queue persists)
            }
        });
    };

    // Start sending
    sendNext();
}

socket.on("connect", () => {
    // socket.emit("userWake");
    socket.emit("userLoggedIn")
    console.log("Socket connected:", socket.id);   
});

socket.on("userWentSleep", (username) => {
    let sleepUser = localStorage.getItem("userSleep");

    try {
        sleepUser = sleepUser ? JSON.parse(sleepUser) : [];
    } catch {
        sleepUser = [];
    }

    if (!Array.isArray(sleepUser)) {
        sleepUser = [];
    }

    if (!sleepUser.includes(username)) {
        sleepUser.push(username);
        localStorage.setItem("userSleep", JSON.stringify(sleepUser));
    }
    update_user_status();
    console.log("User is now in sleep mode:", username);
});
socket.on("userCameBack", (data) => {
    const {username, name} = data
    let sleepUser = localStorage.getItem("userSleep");
    console.log('username comeback',username)
    // showAlert(`${name} is online now.`,'info')
    try {
        sleepUser = sleepUser ? JSON.parse(sleepUser) : [];
    } catch {
        sleepUser = [];
    }

    if (!Array.isArray(sleepUser)) {
        sleepUser = [];
    }

    // remove user from sleep list
    sleepUser = sleepUser.filter(user => user !== username);

    localStorage.setItem("userSleep", JSON.stringify(sleepUser));
    update_user_status();

    console.log("User woke up:", username);
    // Update UI here (online indicator, status badge, etc.)
});

const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes
// const INACTIVITY_LIMIT = 5 * 1000; // 15 minutes
let inactivityTimer;
let isSleeping = false;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    // console.log('active',isSleeping)
    if (isSleeping) {
        socket.emit("userWake");
        isSleeping = false;
    }

    inactivityTimer = setTimeout(() => {
        socket.emit("userSleep");
        isSleeping = true;
    }, INACTIVITY_LIMIT);
}

// events that count as activity
["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(event => {
    window.addEventListener(event, resetInactivityTimer);
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        socket.emit("userSleep");
        isSleeping = true;
    } else {
        resetInactivityTimer();
    }
});


// start timer on load
resetInactivityTimer();


socket.on("onlineUsers", (onlineUsernames) => {
    localStorage.setItem('onlineUsernames', JSON.stringify(onlineUsernames));
    update_user_status();
});



function update_user_status() {
    const onlineUsernames = JSON.parse(localStorage.getItem("onlineUsernames") || "[]");
    onlineUsernames.forEach(username => {
        // console.log("Online user:", username);
        $(`.user-status[data-phone="${username}"]`).each(function () {
            const $statusEl = $(this);
            const phone = $statusEl.data("phone");

            if (!phone) return;

            if (onlineUsernames.includes(phone)) {
                const sleepingUsers = JSON.parse(localStorage.getItem("userSleep") || "[]");

                if (sleepingUsers.includes(phone)) {
                    $statusEl.html(`${user_status_badge['sleeping']}`);
                } else {
                    $statusEl.html(`${user_status_badge['online']}`);
                }
            } else {
                $statusEl.html('');
            }
        });

    });
    
    // document.querySelectorAll('#roomList .room-item').forEach(li => {
    //     const phone = li.getAttribute("data-username");
    //     const statusEl = li.querySelector(`#online-${phone}`);
    //     if (!statusEl) return;

    //     if (onlineUsernames.includes(phone)) {
    //         statusEl.innerHTML = localStorage.getItem(`userSleep`) && JSON.parse(localStorage.getItem(`userSleep`)).includes(phone) ? '<span class="sleep-dot text-warning" title="Sleeping"><i class="bi bi-moon-stars-fill"></i></span><i>Sleeping</i>' : '<span class="online-dot" title="Online"></span><i>Online</i>';
    //     } else {
    //         statusEl.innerHTML = '';
    //     }
    // });
    // $(`#${div_ID}_userCheckboxList .user-row`).each(function () {
    //     const $row = $(this);
    //     const phone = $row.data("phone");
    //     const $statusEl = $row.find(".user-status");

    //     if (!$statusEl.length) return;

    //     if (onlineUsernames.includes(phone)) {
    //         const sleepingUsers = JSON.parse(localStorage.getItem("userSleep") || "[]");

    //         if (sleepingUsers.includes(phone)) {
    //             $statusEl.html(
    //                 `
    //                 <span class="sleep-dot badge bg-white col-auto m-auto" title="Sleeping">
    //                     <i class="bi bi-moon-stars-fill text-warning"></i>
    //                     <i class="text-muted">Sleeping</i>
    //                 </span>`
    //             );
    //         } else {
    //             $statusEl.html(
    //                 '<span class="badge bg-white col-auto m-auto" title="Online"><span class="online-dot" title="Online"></span> <i class="text-muted">Online</i></span>'
    //             );
    //         }
    //     } else {
    //         // optional: offline state
    //         $statusEl.html(
    //             ''
    //             // '<span class="offline-dot badge bg-secondary col-auto m-auto" title="Offline"></span><i>Offline</i>'
    //         );
    //     }
    // });
}
// socket.on("connect", () => {
//     console.log("🟢 Reconnected to server!");
    
//     // if(roomID){
//             // Show the loading spinner if hidden
//             const loadingElement = document.getElementById('loading');
//             if (loadingElement.classList.contains('d-none')) {
//                 loadingElement.classList.remove("d-none");
//                 loadingElement.classList.add("show");
//             }
//             var encryptedRoomID =encryptMessage(roomID)
//             var encryptedData =encryptMessage(currentUser.username)
//             console.log({ roomID: encryptedRoomID,username: encryptedData})
//             socket.emit("joinRoom",{ roomID: encryptedRoomID,username: encryptedData})
//         // }
    
// });


// Ping the server every 15 seconds (1000 ms is too frequent)
// setInterval(() => {
//     socket.emit("ping");
//     console.log("📡 Ping received from server");
    
// }, 15000); // ⏱ Recommended: every 15 seconds
// // Server responds
socket.on("pong", () => {
  console.log("✅ Server is alive!");
});

