
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
    $loadingElement.removeClass('d-none')
    socket.emit("createRoom", { 
        handle: currentUser.username,  // Assuming `name.textContent` contains the user's name
        roomName: roomID,
        roomMembers : roomMembers  
    });
};

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
    $loadingElement.removeClass('d-none')
    // Redirect to the new URL with roomID
    window.location.href = `/join/${roomID}`;
};



const leaveRoom = () => {
    // const roomID = document.querySelector("#roomID").textContent.trim()
    socket.emit("leaveRoom",{username : currentUser.username , roomID : roomID});
    // // Leave room event

    // // Success feedback
    // socket.on("leftRoom", ({ roomID }) => {
    //     // console.log(`You have left room: ${roomID}`);
    //     // Update the UI to reflect the user leaving the room
    // });

    // // Error feedback
    // socket.on("error", ({ error }) => {
    //     console.error("Error:", error);
    // });

 
    // // Notify other users when someone leaves


    // document.querySelector("#roomInfo").innerHTML = "";
    // document.getElementById("chat-window").style.display = "none";
    // document.querySelector(".form-inline").style.display = "none";
    // document.getElementById("btns").style.display = "block";
    // document.querySelector("footer").style.display = "block";
    // // Refresh the page after leaving the room
    // window.location.reload(); // This will refresh the page and reset the UI
    window.location.href = `/`;

};
   // Notify other users when someone leaves
socket.on("userLeft", ({ name, roomID }) => {
    // console.log(`${username} has left the room: ${roomID}`);
    // Update the UI to reflect the user's departure
    showAlert(`${name} left the chat.`,'info')
});
let roomList_data ;
socket.on('roomList',async (data)=>{
    $loadingElement.removeClass('d-none')
    localStorage.setItem('roomList',JSON.stringify({room : data.room.slice(0,20), users:data.users}))
    roomList_data = data
   await room_list_genration(data)
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
        // update last update timestamp    
        // const now = Date.now();    
        room.attr('data-last-update', data.room.lastUpdated);
        if(roomList_data) roomList_data.room.filter(rm=> rm == data.room.roomID).map(rm=> rm={...rm, newMessage: data.count})
    } catch (error) {
        showAlert(error.message,'danger')
    }finally{
        sortRooms();
        $loadingElement.addClass('d-none')

    }
});

document.querySelector(".roomNameInput").addEventListener("keyup", (event) => {
    if (event.keyCode === 13) joinRoom();
});


async function room_list_genration(data){
    const $roomList_ul = $('#roomList_ul');

    $roomList_ul.empty();
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

        $li=(`
            <li class="list-group-item row col-12 ms-1 text-white bg-dark" role="presentation" >
                <a class="nav-link" href="/join/${room.roomID}" data-last_update="${room.lastUpdated ?? room.createdAt}" data-id="${room.roomID}">
                <span class="fs-5 col-auto">
                    ${room.roomName}
                </span>
                <span class="badge bg-danger col-auto rounded-pill position-absolute end-0 mt-1 me-1 counter_message d-none">
                    ${room.newMessage}
                </span>
                
                </a>
            </li>
            `)
        $roomList_ul.append($li)
    });
    $loadingElement.addClass('d-none')

}
$(`#btns #search_roomList`).on("focus input",(e)=>{
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
    // $roomList_ul.empty()
    const rooms = $roomList_ul.children('a').get();
    rooms.sort((a, b) => {        
        const dateA = new Date($(a).attr('data-last-update'));        
        const dateB = new Date($(b).attr('data-last-update'));
        return dateB - dateA; // newest first    
    });
    $.each(rooms, function(index, room) {        
        $roomList_ul.append(room);   
    });
}