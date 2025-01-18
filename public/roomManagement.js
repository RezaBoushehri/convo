
const createRoom = () => {
    const createRoomName = document.getElementById('createRoomName');  // Make sure you're getting the correct input element
    const roomID = createRoomName.value.trim();
    
    if (!roomID) {
        alerting("Please enter a room ID.",'danger');  // Validation: Ensure the room ID is not empty
        return;
    }
    document.querySelector("#roomID").textContent= roomID
 if(document.getElementById('loading').classList.contains('hide')){
            document.getElementById('loading').classList.remove("hide");
            document.getElementById('loading').classList.add("show");
        } 
    socket.emit("createRoom", { 
        handle: currentUser.username,  // Assuming `name.textContent` contains the user's name
        roomName: roomID
    });
};

const joinRoom = () => {
    const roomID = document.getElementById('joinRoomName').value.trim();  // Ensure this matches the actual input field ID
    
    if (!roomID) {
        alerting("Please enter a room ID.",'danger');  // Validation: Ensure the room ID is not empty
        return;
    }else{
        // console.log(roomID)
    }
    document.querySelector("#roomID").textContent= roomID
     if(document.getElementById('loading').classList.contains('hide')){
            document.getElementById('loading').classList.remove("hide");
            document.getElementById('loading').classList.add("show");
        } 
    socket.emit("joinRoom",({ 
        roomID: roomID,
        username: currentUser.username
        })
    );

    // // Optionally, listen for errors from the server
    // socket.on("error", (data) => {
    //     alert.innerHTML=(data.error);  // Show the error message received from the server
    // });
};


const leaveRoom = () => {
    const roomID = document.querySelector("#roomID").textContent.trim()
    socket.emit("leaveRoom",{username : currentUser.username , roomID : roomID});
    // Leave room event

    // Success feedback
    socket.on("leftRoom", ({ roomID }) => {
        // console.log(`You have left room: ${roomID}`);
        // Update the UI to reflect the user leaving the room
    });

    // Error feedback
    socket.on("error", ({ error }) => {
        console.error("Error:", error);
    });

    // Notify other users when someone leaves
    socket.on("userLeft", ({ username, roomID }) => {
        // console.log(`${username} has left the room: ${roomID}`);
        // Update the UI to reflect the user's departure
    });
    // Notify other users when someone leaves


    document.querySelector("#roomInfo").innerHTML = "";
    document.getElementById("chat-window").style.display = "none";
    document.querySelector(".form-inline").style.display = "none";
    document.getElementById("btns").style.display = "block";
    document.querySelector("footer").style.display = "block";
    // Refresh the page after leaving the room
    window.location.reload(); // This will refresh the page and reset the UI
};

document.querySelector(".roomNameInput").addEventListener("keyup", (event) => {
    if (event.keyCode === 13) joinRoom();
});