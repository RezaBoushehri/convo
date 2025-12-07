
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
    const roomID = document.getElementById('joinRoomName').value.trim(); // Ensure this matches the actual input field ID
    
    if (!roomID) {
        alerting("Please enter a room ID.", 'danger'); // Validation: Ensure the room ID is not empty
        return;
    } else {
        // Optional logging for debugging
        console.log(`Joining room with ID: ${roomID}`);
    }

    // Update room ID on the UI (if needed)
    document.querySelector("#roomID").textContent = roomID;

    // Show loading animation if applicable
    if (document.getElementById('loading').classList.contains('hide')) {
        document.getElementById('loading').classList.remove("hide");
        document.getElementById('loading').classList.add("show");
    }

    // Redirect to the new URL with roomID
    window.location.href = `/join/${roomID}`;
};



const leaveRoom = () => {
    // const roomID = document.querySelector("#roomID").textContent.trim()
    // socket.emit("leaveRoom",{username : currentUser.username , roomID : roomID});
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
    // socket.on("userLeft", ({ username, roomID }) => {
    //     // console.log(`${username} has left the room: ${roomID}`);
    //     // Update the UI to reflect the user's departure
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

document.querySelector(".roomNameInput").addEventListener("keyup", (event) => {
    if (event.keyCode === 13) joinRoom();
});

// Function to get URL parameters
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Check for 'error' in URL and show alert
const errorMessage = getQueryParam('error');
if (errorMessage) {
    Swal.fire({
        icon: 'error',
        title: 'Oops!',
        text: errorMessage,
        confirmButtonColor: '#d33',
        customClass: {
            popup: 'backdrop-blur-chat-bg userFg-color' // Add custom class here
        }
    });
}