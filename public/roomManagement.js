
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

$('#joinRoom btn.submitBtn').click(joinRoom)
$('#createRoom btn.submitBtn').click(createRoom)

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
    $('#groupList_ul li.bg-primary').removeClass('bg-primary').addClass('border-0')

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
// socket.on('roomList',async (data)=>{
//      const rooms = data.room;
//     const users = data.users;
//     const nextCursor = data.nextCursor;
//     const cache = data.cache;

//     $loadingElement.removeClass('d-none').addClass('show')
//     if (cursor == null){

//         localStorage.setItem('roomList',JSON.stringify({room : data.room.slice(0,20), users:data.users}))
//     }
//     roomList_data = data
    
//     cursor = nextCursor;
    

//     if (!nextCursor) {
//         hasMore = false;
//     }


//     loading = false;
//    await room_list_genration(data,cache)
   
// })
socket.on('roomList_newMessages', async (data) => {
    $('#loading').removeClass('d-none')
    console.log(data)
    try {
        
        const room = $(`#groupList_ul a[data-id="${data.room.roomID}"]`);
        // update counter   
        room.find('.counter_message')        
            .text(data.count)        
            .removeClass('d-none');
        room.find('.message')        
            .html(data.last_content)        
        // update last update timestamp    
        // const now = Date.now();    
        $(`#groupList_ul li#${data.room.roomID}`).attr('data-last-update', data.room.lastUpdated);
        $(`#groupList_ul li#${data.room.roomID} .position-absolute .jdate `).text(formatDate(data.room.lastUpdated));
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
    const $groupList_ul = $('#groupList_ul');
    if(clear){
        $groupList_ul.empty();
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
        $groupList_ul.append($li)
    });
    Promise
        .resolve(
            $('#groupList_ul li.bg-primary').removeClass('bg-primary').addClass('border-0'))
        .then(
            $(`#groupList_ul li#${localStorage.getItem('last_room_joined_MC')}`).addClass('bg-primary').removeClass('border-0'))
    if(clear){
        document.getElementById('groupList_ul').scrollTo({
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
    const $groupList_ul = $('#groupList_ul');

    const rooms = $groupList_ul.children('li').get();
    rooms.sort((a, b) => {        
        const dateA = new Date($(a).attr('data-last-update'));        
        const dateB = new Date($(b).attr('data-last-update'));
        return dateB - dateA; // newest first    
    });
    $groupList_ul.empty()

    $.each(rooms, function(index, room) {    
        $groupList_ul.append(room);   
    });
}
// Global variables
let privateChatsData = [];
let allUsersData = [];
let currentTab = 'groups';
let searchTimeout = null;

// Initialize private chat functionality
function initPrivateChats() {
    // Load private chats on tab show
    $('#private-tab').on('shown.bs.tab', function (e) {
        currentTab = 'private';
        loadPrivateChats();
    });
    
    $('#groups-tab').on('shown.bs.tab', function (e) {
        currentTab = 'groups';
        loadGroups();
    });
    
    // New private chat button
    $('#newPrivateChatBtn').on('click', function() {
        showUserSelectionModal();
    });
    
    // Search in private tab
    $('#search_privateList').on('input', function(e) {
        const searchTerm = e.target.value.trim();
        
        if (searchTimeout) clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            if (searchTerm.startsWith('@')) {
                // Search users
                const usernameQuery = searchTerm.substring(1);
                searchUsers(usernameQuery);
            } else if (searchTerm.length > 0) {
                // Search private chats
                filterPrivateChats(searchTerm);
            } else {
                // Show all private chats
                hideUserSearchResults();
                displayPrivateChats(privateChatsData);
            }
        }, 300);
    });
    
    // Search in groups tab
    $('#search_groupList').on('input', function(e) {
        const searchTerm = e.target.value.trim();
        filterGroups(searchTerm);
    });
}

// Load groups (existing rooms that are not private)
function loadGroups() {
    if (roomList_data && roomList_data.room) {
        const groups = roomList_data.room.filter(room => 
            !room.roomName.match(/\(PV\)Chat between/)
        );
        displayGroups(groups, roomList_data.users);
    }
    
    // Request fresh group list
    socket.emit("roomList", { cache: true });
}

// Display groups in the groups tab
function displayGroups(rooms, users) {
    const $groupListUl = $('#groupList_ul');
    $groupListUl.empty();
    
    if (!rooms || rooms.length === 0) {
        $groupListUl.html('<li class="list-group-item text-center text-muted">هیچ گروهی وجود ندارد</li>');
        return;
    }
    
    rooms.forEach(room => {
        // Skip PV chats
        if (room.roomName.match(/\(PV\)Chat between/)) return;
        
        // Count unread messages
        const unreadCount = room.newMessage || 0;
        
        const $li = $(`
            <li id="${room.roomID}" data-last-update="${(room.lastUpdated ?? room.createdAt)}" 
                class="btn btn-outline-primary border-0 list-group-item cursor-pointer row m-auto col-12" 
                onclick="joinRoomById('${room.roomID}')" role="presentation">
                <a class="nav-link" data-id="${room.roomID}">
                    <div class="row col-12">
                        <div class="col-auto">
                            <i class="bi bi-people-fill fs-4"></i>
                        </div>
                        <div class="col">
                            <span class="fs-6 fw-bold text-truncate d-block">
                                ${escapeHtml(room.roomName)}
                            </span>
                            <small class="text-muted text-truncate d-block">
                                ${room.lastMessage?.message ? escapeHtml(room.lastMessage.message.substring(0, 50)) : 'بدون پیام'}
                            </small>
                        </div>
                        <div class="col-auto text-end">
                            <small class="text-muted d-block">${formatDate(room.lastUpdated)}</small>
                            ${unreadCount > 0 ? `<span class="badge bg-danger rounded-pill mt-1">${unreadCount}</span>` : ''}
                        </div>
                    </div>
                </a>
            </li>
        `);
        $groupListUl.append($li);
    });
}

// Load private chats from server
function loadPrivateChats() {
    $loadingElement.removeClass('d-none').addClass('show');
    
    socket.emit("getPrivateChats", (response) => {
        $loadingElement.addClass('d-none').removeClass('show');
        
        if (response.success) {
            privateChatsData = response.privateChats;
            displayPrivateChats(privateChatsData);
        } else {
            showAlert(response.error, 'danger');
        }
    });
}

// Display private chats
function displayPrivateChats(privateChats) {
    const $privateListUl = $('#privateList_ul');
    $privateListUl.empty();
    
    if (!privateChats || privateChats.length === 0) {
        $privateListUl.html('<li class="list-group-item text-center text-muted">هیچ پیام خصوصی وجود ندارد</li>');
        return;
    }
    
    privateChats.forEach(chat => {
        const statusClass = chat.otherUser.status === 'online' ? 'online' : 'offline';
        const statusText = chat.otherUser.status === 'online' ? 'آنلاین' : 'آفلاین';
        
        const $li = $(`
            <li id="${chat.roomID}" data-last-update="${chat.lastUpdated || chat.createdAt}" 
                class="btn btn-outline-primary border-0 list-group-item cursor-pointer row m-auto col-12" 
                onclick="joinPrivateChatById('${chat.roomID}')" role="presentation">
                <a class="nav-link" data-id="${chat.roomID}">
                    <div class="row col-12">
                        <div class="col-auto position-relative">
                            <i class="bi bi-person-circle fs-4"></i>
                            <span class="status-dot ${statusClass} position-absolute bottom-0 end-0"></span>
                        </div>
                        <div class="col">
                            <div class="d-flex justify-content-between">
                                <span class="fs-6 fw-bold">
                                    ${escapeHtml(chat.otherUser.fullName)}
                                </span>
                                <small class="text-muted">${formatDate(chat.lastMessage?.timestamp)}</small>
                            </div>
                            <small class="text-muted d-block">
                                ${chat.lastMessage ? 
                                    (chat.lastMessage.sender === 'You' ? 'شما: ' : '') + 
                                    escapeHtml(chat.lastMessage.content) : 
                                    'شروع پیام خصوصی'}
                            </small>
                        </div>
                        <div class="col-auto text-end">
                            ${chat.unreadCount > 0 ? `<span class="badge bg-danger rounded-pill">${chat.unreadCount}</span>` : ''}
                        </div>
                    </div>
                </a>
            </li>
        `);
        $privateListUl.append($li);
    });
}

// Filter private chats by search term
function filterPrivateChats(searchTerm) {
    const filtered = privateChatsData.filter(chat => 
        chat.otherUser.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.otherUser.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayPrivateChats(filtered);
}

// Filter groups by search term
function filterGroups(searchTerm) {
    if (!roomList_data || !roomList_data.room) return;
    
    const groups = roomList_data.room.filter(room => 
        !room.roomName.match(/\(PV\)Chat between/) &&
        (room.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         room.roomID.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    displayGroups(groups, roomList_data.users);
}

// Search users by username (starts with @)
function searchUsers(query) {
    if (query.length < 2) {
        hideUserSearchResults();
        return;
    }
    
    $loadingElement.removeClass('d-none').addClass('show');
    
    socket.emit("getPrivateChatUsers", (response) => {
        $loadingElement.addClass('d-none').removeClass('show');
        
        if (response.success) {
            allUsersData = response.users;
            const filteredUsers = allUsersData.filter(user => 
                user.username.toLowerCase().includes(query.toLowerCase()) ||
                user.fullName.toLowerCase().includes(query.toLowerCase())
            );
            displayUserSearchResults(filteredUsers);
        }
    });
}

// Display user search results
function displayUserSearchResults(users) {
    const $userSearchListUl = $('#userSearchList_ul');
    const $userSearchResults = $('#userSearchResults');
    const $privateListUl = $('#privateList_ul');
    
    $userSearchListUl.empty();
    
    if (!users || users.length === 0) {
        $userSearchListUl.html('<li class="list-group-item text-center text-muted">کاربری یافت نشد</li>');
    } else {
        users.forEach(user => {
            const statusClass = user.status === 'online' ? 'online' : 'offline';
            const $li = $(`
                <li class="list-group-item list-group-item-action cursor-pointer" onclick="startOrOpenPrivateChat('${user._id}', '${user.username}')">
                    <div class="row align-items-center">
                        <div class="col-auto position-relative">
                            <i class="bi bi-person-circle fs-4"></i>
                            <span class="status-dot ${statusClass} position-absolute bottom-0 end-0"></span>
                        </div>
                        <div class="col">
                            <div class="fw-bold">${escapeHtml(user.fullName)}</div>
                            <small class="text-muted">@${escapeHtml(user.username)}</small>
                        </div>
                        <div class="col-auto">
                            ${user.hasPrivateChat ? 
                                '<i class="bi bi-chat-dots-fill text-primary"></i>' : 
                                '<i class="bi bi-plus-circle text-success"></i>'}
                        </div>
                    </div>
                </li>
            `);
            $userSearchListUl.append($li);
        });
    }
    
    $userSearchResults.removeClass('d-none');
    $privateListUl.addClass('d-none');
}

// Hide user search results
function hideUserSearchResults() {
    $('#userSearchResults').addClass('d-none');
    $('#privateList_ul').removeClass('d-none');
}

// Show user selection modal for new private chat
function showUserSelectionModal() {
    const $userSelectList = $('#userSelectList');
    $userSelectList.html('<div class="text-center p-3">در حال بارگذاری...</div>');
    
    $('#selectUserModal').modal('show');
    
    socket.emit("getPrivateChatUsers", (response) => {
        if (response.success) {
            displayUserSelectList(response.users);
        } else {
            $userSelectList.html(`<div class="text-center p-3 text-danger">${response.error}</div>`);
        }
    });
    
    // Setup search in modal
    $('#userSearchInput').off('input').on('input', function(e) {
        const term = e.target.value.toLowerCase();
        const filtered = allUsersData.filter(user => 
            user.fullName.toLowerCase().includes(term) ||
            user.username.toLowerCase().includes(term)
        );
        displayUserSelectList(filtered);
    });
}

// Display user list in modal
function displayUserSelectList(users) {
    const $userSelectList = $('#userSelectList');
    $userSelectList.empty();
    
    if (!users || users.length === 0) {
        $userSelectList.html('<li class="list-group-item text-center text-muted">کاربری یافت نشد</li>');
        return;
    }
    
    users.forEach(user => {
        const $li = $(`
            <li class="list-group-item list-group-item-action cursor-pointer" 
                onclick="startOrOpenPrivateChat('${user._id}', '${user.username}')"
                data-bs-dismiss="modal">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-person-circle me-2"></i>
                        <strong>${escapeHtml(user.fullName)}</strong>
                        <br>
                        <small class="text-muted">@${escapeHtml(user.username)}</small>
                    </div>
                    <div>
                        ${user.hasPrivateChat ? 
                            '<span class="badge bg-info">ادامه گفتگو</span>' : 
                            '<span class="badge bg-success">شروع گفتگو</span>'}
                    </div>
                </div>
            </li>
        `);
        $userSelectList.append($li);
    });
}

// Start or open existing private chat
function startOrOpenPrivateChat(userId, username) {
    $loadingElement.removeClass('d-none').addClass('show');
    
    socket.emit("startPrivateChat", { targetUserId: userId }, (response) => {
        $loadingElement.addClass('d-none').removeClass('show');
        
        if (response.success) {
            // Close any open modals
            $('#selectUserModal').modal('hide');
            $('#userSearchInput').val('');
            
            // Join the private chat
            joinPrivateChatById(response.roomID);
        } else {
            showAlert(response.error, 'danger');
        }
    });
}

// Join private chat by room ID
function joinPrivateChatById(roomID) {
    if (!roomID) {
        showAlert("شناسه اتاق معتبر نیست", 'danger');
        return;
    }
    join(roomID)

}

// Join group by room ID
function joinRoomById(roomID) {
    if (!roomID) {
        showAlert("شناسه اتاق معتبر نیست", 'danger');
        return;
    }
    join(roomID)
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Listen for private chat invites
socket.on("privateChatInvite", (data) => {
    showNotification(`${data.fromName} می‌خواهد با شما گفتگوی خصوصی کند!`, () => {
        joinPrivateChatById(data.roomID);
    });
});

// Listen for private chat created event
socket.on("privateChatCreated", (data) => {
    showNotification(`گفتگوی خصوصی جدید از ${data.fromUser.fullName}`, () => {
        joinPrivateChatById(data.roomID);
    });
});

// Update room list with new private chat
socket.on("roomList", async (data) => {
    const rooms = data.room;
    const users = data.users;
    const nextCursor = data.nextCursor;
    const cache = data.cache;
    
    $loadingElement.removeClass('d-none').addClass('show');
    
    if (cursor == null) {
        localStorage.setItem('roomList', JSON.stringify({ room: data.room.slice(0, 20), users: data.users }));
    }
    roomList_data = data;
    cursor = nextCursor;
    
    if (!nextCursor) {
        hasMore = false;
    }
    
    loading = false;
    
    // Separate groups and private chats
    const groups = rooms.filter(room => !room.roomName.match(/\(PV\)Chat between/));
    const privateRooms = rooms.filter(room => room.roomName.match(/\(PV\)Chat between/));
    
    // Display groups if groups tab is active
    if (currentTab === 'groups') {
        displayGroups(groups, users);
    }
    
    // Update private chats data if needed
    if (privateRooms.length > 0) {
        // Refresh private chats data
        socket.emit("getPrivateChats", (response) => {
            if (response.success) {
                privateChatsData = response.privateChats;
                if (currentTab === 'private' && !$('#userSearchResults').is(':visible')) {
                    displayPrivateChats(privateChatsData);
                }
            }
        });
    }
    
    $loadingElement.addClass('d-none').removeClass('show');
});

// Update room list for new messages (existing function modified)
socket.on('roomList_newMessages', async (data) => {
    $('#loading').removeClass('d-none');
    
    try {
        const room = $(`#groupList_ul a[data-id="${data.room.roomID}"]`);
        room.find('.counter_message').text(data.count).removeClass('d-none');
        room.find('.message').html(data.last_content);
        $(`#groupList_ul li#${data.room.roomID}`).attr('data-last-update', data.room.lastUpdated);
        
        // Also update in private chats if applicable
        if (data.room.roomName.match(/\(PV\)Chat between/)) {
            // Update private chat list
            socket.emit("getPrivateChats", (response) => {
                if (response.success && currentTab === 'private') {
                    privateChatsData = response.privateChats;
                    displayPrivateChats(privateChatsData);
                }
            });
        } else if (currentTab === 'groups') {
            $(`#groupList_ul li#${data.room.roomID} .position-absolute .jdate`).text(formatDate(data.room.lastUpdated));
            if (roomList_data) {
                const roomIndex = roomList_data.room.findIndex(rm => rm.roomID === data.room.roomID);
                if (roomIndex !== -1) {
                    roomList_data.room[roomIndex] = { ...roomList_data.room[roomIndex], newMessage: data.count };
                }
                displayGroups(roomList_data.room.filter(r => !r.roomName.match(/\(PV\)Chat between/)), roomList_data.users);
            }
        }
        
        sortRooms();
    } catch (error) {
        showAlert(error.message, 'danger');
    } finally {
        $loadingElement.addClass('d-none').removeClass('show');
    }
});

// Initialize when document is ready
$(document).ready(function() {
    initPrivateChats();
});

// CSS for status dots
const style = document.createElement('style');
style.textContent = `
    .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid white;
    }
    .status-dot.online {
        background-color: #4caf50;
    }
    .status-dot.offline {
        background-color: #9e9e9e;
    }
    .cursor-pointer {
        cursor: pointer;
    }
    .chat-tabs .nav-link {
        color: var(--bs-body-color);
    }
    .chat-tabs .nav-link.active {
        font-weight: bold;
    }
`;
document.head.appendChild(style);