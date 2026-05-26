// ========================================================
// notification content

function refToast(data, toastContainerId = 'toastContainer') {


    const toastContainer = document.getElementById(toastContainerId);
    if (!toastContainer) {
        console.error(`Toast container with ID '${toastContainerId}' not found.`);
        return;
    }


    let toastFooter = '';
    const link_action=()=>{
        if(data?.roomID && typeof join !=='undefined'){
            return`join('${data?.roomID.trim()}')`
        }
        return`
        `
    }
    toastFooter = data?.roomID ? `<div class="toast-footer overflow-hidden ">
        <a class="col-12 btn btn-link text-center" 
            onclick="
                    ${link_action()}
                "
            ${typeof join ==='undefined'? `href="/join/${data?.roomID}"`:''}
            >
            <i class="bi bi-link-45deg">دیدن</i>
        </a>
        </div>` : '';

    const toast = document.createElement('div');
    toast.classList.add('toast', 'zindexH', 'animate__animated', 'animate__lightSpeedInRight','overflow-hiiden');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="toast-header  text-meta d-flex gap-2">
            <img src="https://mc.farahoosh.ir/metachat/svg/logo.svg" height="15px" width="15px" class="rounded col-auto" alt="...">
            <strong class=" col" dir="auto">${data.title}</strong>
        <button type="button" class="btn-close col-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body overflow-auto h-30rem">
        ${data.message}
        </div>
        ${toastFooter}
    `;

    toastContainer.appendChild(toast);
    const toastInstance = new bootstrap.Toast(toast);
    toastInstance.show();
}
const audio_notification_sound = document.getElementById('notification_sound');
audio_notification_sound.volume = 0.5; // 0.5 یعنی ۵۰ درصد صدا. عدد بین 0 تا 1 رو می‌تونی بذاری.

function playNotificationSound(sound_id="message_sound") {
        const sound = document.getElementById(sound_id);
        sound.currentTime = 0; // Reset to the beginning in case it's already playing
        sound.play().catch((error) => {
            console.error("Failed to play notification sound:", error);
        });
   
}

// Function to show browser notification
function showBrowserNotification(sender,messageContent,roomID) {
    const href = ''
    if (document.hidden) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                const notification = new Notification(`${sender}:`, {
                    body: messageContent,
                    icon: "https://mc.farahoosh.ir/metachat/svg/logo.svg"  // آیکون نوتیفیکیشن
                });
        
                // اضافه کردن قابلیت باز کردن لینک هنگام کلیک
                notification.onclick = () => {
                    let chatTab = null;
    
                    // بررسی همه تب‌های باز برای پیدا کردن تب چت
                    for (let i = 0; i < window.length; i++) {
                        if (window[i].location.href.includes(`/join/${roomID}`)) {
                            chatTab = window[i];
                            break;
                        }
                    }
    
                    // اگر تب چت پیدا شد، به آن سوییچ کن؛ در غیر این‌صورت، یک تب جدید باز کن
                    if (chatTab) {
                        chatTab.focus();
                    } else {
                        window.open(`${href}/join/${roomID}`, "_blank");
                    }
                };
            }
        });
        
        playNotificationSound('notification_sound')
    }else{
        const last_room_joined_MC = localStorage.getItem('last_room_joined_MC')??''
        if(last_room_joined_MC != roomID){
            const data={
                title:sender,
                message:messageContent,
                roomID
            }
            refToast(data)
            playNotificationSound('notification_sound')
            return
        }
        playNotificationSound('message_sound')
    }
}


if(typeof socket !== 'undefined'){
    socket.on("notification",async(data , ack) => {
        NEED_TO_RELOAD_ROOM_UI = true
        if(data.sender != currentUser?.username){
            showBrowserNotification(data.title,data.message,data.roomID)
        }
    })
}