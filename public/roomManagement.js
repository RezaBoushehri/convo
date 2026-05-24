
const createRoom = () => {
    const createRoomName = $('#createRoomName');  // Make sure you're getting the correct input element
    const createRoomMembers = $('#createRoomMembers');  // Make sure you're getting the correct input element
    const roomID = createRoomName.val().trim();
    let roomMembers = createRoomMembers.val().trim();
    
    if (!roomID) {
        showAlert("Please enter a room name.",'danger');  // Validation: Ensure the room ID is not empty
        return;
    }
    if (roomMembers && !Array.isArray(roomMembers)) {
        roomMembers = roomMembers.split(',')
            .map(num => num.trim())
            .filter(num => /^\d{11}$/.test(num));
    }    
    document.querySelector("#roomID").textContent= roomID
    $loadingElement.removeClass('d-none').addClass('show')
    socket.emit("createRoom", { 
        handle: currentUser.username,  // Assuming `name.textContent` contains the user's name
        roomName: roomID,
        roomMembers : roomMembers  
    });
};
function formatDate(date) {
  if (!date) return '';

  const now = new Date();
  date = new Date(date);
  
  // محاسبه اختلاف به میلی‌ثانیه
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffYear = now.getFullYear() - date.getFullYear();

  // فرمت‌دهی بر اساس شرایط
  if (diffHour < 24) {
    // کمتر از 1 ساعت: فقط ساعت و دقیقه
    return new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } 
  else if (diffDay < 7) {
    // کمتر از 1 هفته: "روز پیش" (مثلاً 2 روز پیش)
    // اگر می‌خواهی ساعت هم باشد، می‌توانی hour/minute را اضافه کنی
    // اما طبق درخواست شما "only day ago" یعنی فقط تعداد روز
    return `${diffDay} روز پیش`;
  } 
  else if (diffYear < 1) {
    // کمتر از 1 سال: ماه و روز
    return new Intl.DateTimeFormat('fa-IR', {
      month: 'long',
      day: '2-digit'
    }).format(date);
  } 
  else {
    // یک سال یا بیشتر: سال، ماه و روز
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    }).format(date);
  }
}
const joinRoom = () => {
    const roomID = document.getElementById('joinRoomName').value.trim(); // Ensure this matches the actual input field ID
    
    if (!roomID) {
        showAlert("Please enter a room ID.", 'danger'); // Validation: Ensure the room ID is not empty
        return;
    } else {
        // Optional logging for debugging
        console.log(`Joining room with ID: ${roomID}`);
    }

    // Update room ID on the UI (if needed)
    document.querySelector("#roomID").textContent = roomID;

    // Show loading animation if applicable
    $loadingElement.removeClass('d-none').addClass('show')
    // Redirect to the new URL with roomID
    window.location.href = `/metachat/join/${roomID}`;
};



const leaveRoom = () => {
    // const roomID = document.querySelector("#roomID").textContent.trim()
    socket.emit("leaveRoom",{username : currentUser.username , roomID : roomID});
    // // Leave room event

    const side_contact = $('#side_contact');
    side_contact.removeClass('hidden');
        $('#header_div').removeClass('hidden');
    side_contact.removeClass('d-none')
    // const data = decryptMessage(encryptedData)
    $('.modal.show').each(function () {
        const modalEl = this;
        const instance = bootstrap.Modal.getInstance(modalEl);

        if (!instance) return;
        instance.hide();
    
    });
    $('.modal-backdrop').remove();
    $("#chat-window").addClass('d-none');

    $('#file-input_res').addClass('d-none').html('')
    document.querySelector(".form-inline").style.display = "none";
    document.querySelector("footer").style.display = "block";
    // Initialize tooltips
    // 2. Construct the new URL with the existing 'side' parameter
    
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

    // Notify other users when someone leaves
    if(NEED_TO_RELOAD_ROOM_UI){
        init_page(false)
    }
    $('#roomList_ul li.bg-primary').removeClass('bg-primary').addClass('border-0')

    $("#roomInfo").addClass('d-none');
    $("#chat-window").addClass('d-none');
    $(".form-inline").addClass('d-none');
    document.querySelector("footer").style.display = "block";

    $loadingElement.removeClass('d-none').addClass('show')
    // Success feedback
    

};
socket.on("leftRoom", ({ roomID }) => {
        // console.log(`You have left room: ${roomID}`);
        // Update the UI to reflect the user leaving the room
    const side_cantact_hide =getQueryParam('side') ?? false

    roomID = ''

    const newUrl = `/metachat/${side_cantact_hide ? `?side=${side_cantact_hide}` : ''}`;
    $loadingElement.addClass('d-none').removeClass('show')

    // 3. Update the URL without reloading the page
    history.pushState({}, '', newUrl);
   
    // Refresh the page after leaving the room
    // window.location.reload(); // This will refresh the page and reset the UI
    // window.location.href = `/`;
    localStorage.removeItem('last_room_joined_MC')
});
   // Notify other users when someone leaves
socket.on("userLeft", ({ name, roomID }) => {
    // console.log(`${username} has left the room: ${roomID}`);
    // Update the UI to reflect the user's departure
    showAlert(`${name} left the chat.`,'info')
});




let roomList_data ;
socket.on('roomList',async (data)=>{
     const rooms = data.room;
    const users = data.users;
    const nextCursor = data.nextCursor;
    const cache = data.cache;

    $loadingElement.removeClass('d-none').addClass('show')
    if (cursor == null){

        localStorage.setItem('roomList',JSON.stringify({room : data.room.slice(0,20), users:data.users}))
    }
    roomList_data = data
    
    cursor = nextCursor;
    

    if (!nextCursor) {
        hasMore = false;
    }


    loading = false;
   await room_list_genration(data,cache)
   
})
socket.on('roomList_newMessages', async (data) => {
    $('#loading').removeClass('d-none')
    console.log(data)
    try {
        
        const room = $(`#roomList_ul a[data-id="${data.room.roomID}"]`);
        // update counter   
        room.find('.counter_message')        
            .text(data.count)        
            .removeClass('d-none');
        room.find('.message')        
            .html(data.last_content)        
        // update last update timestamp    
        // const now = Date.now();    
        $(`#roomList_ul li#${data.room.roomID}`).attr('data-last-update', data.room.lastUpdated);
        $(`#roomList_ul li#${data.room.roomID} .position-absolute .jdate `).text(formatDate(data.room.lastUpdated));
        if(roomList_data) roomList_data.room.filter(rm=> rm == data.room.roomID).map(rm=> rm={...rm, newMessage: data.count})
    } catch (error) {
        showAlert(error.message,'danger')
    }finally{
        sortRooms();
        $loadingElement.addClass('d-none').removeClass('show')

    }
});

document.querySelector(".roomNameInput").addEventListener("keyup", (event) => {
    if (event.keyCode === 13) joinRoom();
});


async function room_list_genration(data,clear=true){
    const $roomList_ul = $('#roomList_ul');
    if(clear){
        $roomList_ul.empty();
    }
    await data?.room.filter(room=> room.roomName.match(/\(PV\)Chat between (\d{11}) and (\d{11})/)).map(room=>{
            const room_name_pv = room.members.filter(user=> user !== currentUser.username).map(username=>{
                const user = data.users.filter(user=> user.username === username)[0]
                return `${user?.first_name?? 'N/A'} ${user?.last_name?? 'N/A'}`
            }).join('/') 
            if(room_name_pv == '') {
                const pvMatch= room.roomName.match(/\(PV\)Chat between (\d{11}) and (\d{11})/)
                const senderNumber = pvMatch[1];
                const receiverNumber = pvMatch[2];
                if([senderNumber,receiverNumber].includes(['09355568990'])) {
                    room.roomName = 'Saved Message'
                }else{
                    room.roomName =`N/A`
                }
            }else{
                room.roomName = room_name_pv
            }
    })

    data?.room.forEach(room => {
        const user = data.users.filter(user=> user.username === room?.lastMessage?.sender)[0]
        const name_sender = !user ? room?.lastMessage?.sender :`${user?.first_name?? ''} ${user?.last_name?? ''}`
        $li=(`
            <li id="${room.roomID}" data-last-update="${(room.lastUpdated ?? room.createdAt)}"  class="btn btn-outline-primary border-0 list-group-item cursor-pointer row m-auto col-12" onclick="join('${room.roomID}')" role="presentation">
                <a class="nav-link"  data-id="${room.roomID}">
                    <div class="row col-12">
                        <span class="fs-5 col-auto text-truncate">
                            ${room.roomName}
                        </span>
                        <span class="row col-12   ">
                            
                            <div class="col-auto ms-0 overflow-hidden text-truncate text-muted" style="height:2rem;">
                                ${room?.lastMessage?.message.replace(/<[^>]*>/g, '').replace(/\n/g, '') ?? ''}
                            </div>
                        </span>
                    </div>
                    <div class="row col-auto position-absolute top-0 end-0 me-1">
                        <span class="jdate col" dir="auto">${formatDate(room?.lastUpdated)}</span>
                        <span class="badge bg-danger  rounded-pill mt-2 me-1 counter_message d-none col-auto">
                            ${room.newMessage}
                        </span>
                    </div>
                </a>
            </li>

            `)
        $roomList_ul.append($li)
    });
    Promise
        .resolve(
            $('#roomList_ul li.bg-primary').removeClass('bg-primary').addClass('border-0'))
        .then(
            $(`#roomList_ul li#${localStorage.getItem('last_room_joined_MC')}`).addClass('bg-primary').removeClass('border-0'))
    if(clear){
        document.getElementById('roomList_ul').scrollTo({
            top: 0,                        // Scroll to the top
            behavior: "smooth",            // Smooth scrolling
        });
    }
    $loadingElement.addClass('d-none').removeClass('show')

}
$(`#search_roomList`).on("focus input",(e)=>{
    if(!roomList_data || e.target.value =='') room_list_genration(roomList_data)
    let {room , users } = roomList_data
    console.log(room)
    room = room.filter(room =>
                    (room.roomName && room.roomName.toLowerCase().includes((e.target.value).toLowerCase())) ||
                    (room.roomID && room.roomID.toLowerCase().includes((e.target.value).toLowerCase()))
                );
    // console.log(room)
    room_list_genration({room,users})
})
function sortRooms() {
    const $roomList_ul = $('#roomList_ul');

    const rooms = $roomList_ul.children('li').get();
    rooms.sort((a, b) => {        
        const dateA = new Date($(a).attr('data-last-update'));        
        const dateB = new Date($(b).attr('data-last-update'));
        return dateB - dateA; // newest first    
    });
    $roomList_ul.empty()

    $.each(rooms, function(index, room) {    
        $roomList_ul.append(room);   
    });
}