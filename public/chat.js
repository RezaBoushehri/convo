
// const socket = io.connect(window.location.hostname),
const production = false;
const href = production ? window.location.hostname : "172.16.28.166:4000",
    socket = io.connect('https://172.16.28.166:4000', {
        transports: ['polling', "websocket"],
        secure: true,
        withCredentials: false, // Ensures cookies are sent along with requests
        rejectUnauthorized: false // Bypass SSL verification for self-signed certificates
    }),
    message = document.getElementById("editable-message-text"),
    output = document.getElementById("output"),
    button = document.getElementById("button"),
    feedback = document.getElementById("feedback"),
    name = document.getElementById("dropdownMenuButton"),
    alert = document.getElementById("alert"),
    chat_window = document.getElementById("chat-window"),
    joinRoomName = document.getElementById("joinRoomName"),
    fileInput = document.getElementById("file-input"),
    headTag = document.getElementById('headTag'),
    currentUser = {
        username: document.getElementById('username').value
    },
    sentMessagesId=[],

    options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/jpeg",
    };
const roomID = document.querySelector("#roomID").textContent.trim()
if (roomID != "") {
    socket.emit("joinRoom",({ 
        roomID: roomID,
        username: currentUser.username
        })
    );
}
{/* <input type="text" id="emojiSearch" class="form-control" placeholder="Search emojis..." onkeyup="filterEmojis(${messageId})"> */}

function emoji(messageId) {
    const emojiDiv = `
    <div id="emoji-${messageId}" class="stickerPicker col-md-4">
        <div id="emojiGrid">
            <div id="emojiContainer" class="g-3">
                <!-- Emoji spans that will be rendered by Twemoji -->
                <span onclick="addStickerReaction('😂', ${messageId})" class="emoji">😂</span>
                <span onclick="addStickerReaction('👍', ${messageId})" class="emoji">👍</span>
                <span onclick="addStickerReaction('👎', ${messageId})" class="emoji">👎</span>
                <span onclick="addStickerReaction('❤️', ${messageId})" class="emoji">\u2764\uFE0F</span>
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
        </div>
    </div>
    `;
    return emojiDiv;
}
// Call Twemoji to render the emojis after the DOM is ready
function renderEmojis() {
    twemoji.parse(document.body);  // This will replace all emojis with Twemoji images
}

// Now, parse the emojiContainer to replace the emoji characters with Twemoji images
// twemoji.parse(emojiContainer);


// const editableDiv = document.getElementById("editable-message-text");

message.addEventListener("input", function () {
    this.style.height = "auto"; // Reset height to calculate content height
    this.style.height = `${this.scrollHeight}px`; // Set height based on content
});

document.getElementById('username').value = ''
let image = "";
$("#up").html('<i class= "fa fa-arrow-up" >').hide();

//=================================================================
//input image

$("#file-input").on("change", (e) => {
    button.disabled = true;
    fileInput.disabled = true;
    const file = e.originalEvent.target.files[0];
    if (file) {
        if (file.type != "image/gif") {
            options.fileType = file.type;
            imageCompression(file, options)
                .then((compressedFile) => {
                    console.log(compressedFile);
                    setImage(compressedFile);
                    message.focus();
                })
                .catch((error) => console.log(error));
        } else {
            setImage(file);
        }
    }
    button.disabled = false;
    fileInput.disabled = false;
});

//=================================================================
//Emit Create, Join and Leave room events

socket.emit("userLoggedIn", { username: currentUser.username });

// socket.emit("applySettings", user.settings); // Send settings to client

const createRoom = () => {
    const createRoomName = document.getElementById('createRoomName');  // Make sure you're getting the correct input element
    const roomID = createRoomName.value.trim();
    
    if (!roomID) {
        alert.innerHTML=("Please enter a room ID.");  // Validation: Ensure the room ID is not empty
        return;
    }
    document.querySelector("#roomID").textContent= roomID

    socket.emit("createRoom", { 
        handle: currentUser.username,  // Assuming `name.textContent` contains the user's name
        roomName: roomID
    });
};

const joinRoom = () => {
    const roomID = document.getElementById('joinRoomName').value.trim();  // Ensure this matches the actual input field ID
    
    if (!roomID) {
        alert.innerHTML=("Please enter a room ID.");  // Validation: Ensure the room ID is not empty
        return;
    }else{
        console.log(roomID)
    }
    document.querySelector("#roomID").textContent= roomID
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
        console.log(`You have left room: ${roomID}`);
        // Update the UI to reflect the user leaving the room
    });

    // Error feedback
    socket.on("error", ({ error }) => {
        console.error("Error:", error);
    });

    // Notify other users when someone leaves
    socket.on("userLeft", ({ username, roomID }) => {
        console.log(`${username} has left the room: ${roomID}`);
        // Update the UI to reflect the user's departure
    });

    document.querySelector("#roomInfo").innerHTML = "";
    document.getElementById("chat-window").style.display = "none";
    document.querySelector(".form-inline").style.display = "none";
    document.getElementById("btns").style.display = "block";
    document.querySelector("footer").style.display = "block";
    // Refresh the page after leaving the room
    window.location.reload(); // This will refresh the page and reset the UI
};

//=================================================================
//emit chat event (send message)
button.addEventListener("click", () => {
    let text = message.innerText.trim();

    // Replace block elements (e.g., paragraphs, divs, etc.) with newlines
    // text = text.replace(/<\/?p>/g, '\n');  // Replace <p> and </p> with newline
    // text = text.replace(/<\/?div>/g, '\n');  // Replace <div> and </div> with newline
    // text = text.replace(/<br\s*\/?>/g, '\n');  // Replace <br> tags with newline

    const data = {
        username: currentUser.username,
        handle: name.textContent,
        roomID: roomID,
        message: text,
        date: new Date(),
        image: image || null,
    };

    
    if (!data.message && !data.username && !data.image) {
        alert.innerHTML = "Room ID, sender, and message cannot be empty";
        return;
    }
    // Display "sending" message in UI
    output.innerHTML += `<div id="sending-placeholder" style="display:flex;justify-content:flex-end;color:gray;">
    Sending
    <img src="../svg/threeDotsLoopTransparency.svg" alt="Sending..." style="width:24px;height:24px;margin-right:10px;" />
    </div>`;
    scrollDown()
    // Send message to server
    socket.emit("chat", data);

    // Clear input fields
    message.innerHTML = "";
    image = "";

    // Add listener for server acknowledgment
    socket.on("chat", (response) => {
        if (response.error) {
            alert(response.error);
            document.getElementById("sending-placeholder").remove(); // Remove placeholder if there's an error
            return;
        }

        // Remove "sending" placeholder once the message is successfully added to the UI
        document.getElementById("sending-placeholder").remove();

        // // Add the message to the UI
        // addMessageToChatUI(response);
    });
});


//=================================================================
//Emit typing event (trigger user typing and send message on enter)
let typeUsername = currentUser.username;
const typingTimeout = 1000; // Timeout for detecting "stop typing"
let typingTimer;



message.addEventListener("input", (event) => {
    clearTimeout(typingTimer); // Reset timer

    // Emit "typing" event with correct property name
    socket.emit("typing", { 
        name: name.textContent.trim(), // Replace with your actual username variable
        username: typeUsername, // Replace with your actual username variable
        isTyping: true 
    });

    // Set a timeout to emit "stop typing"
    typingTimer = setTimeout(() => {
        socket.emit("typing", { 
            name: name.textContent.trim(), 
            username: typeUsername, 
            isTyping: false 
        });
    }, typingTimeout);
});

message.addEventListener("keydown", (event) => {
    // 13 => keycode for Enter
    if (event.keyCode === 13) {
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
document.querySelector(".roomNameInput").addEventListener("keyup", (event) => {
    if (event.keyCode === 13) joinRoom();
});
//=================================================================
//Handle user-connected event

socket.on("connect", () => {
    socket.emit("newconnection", name.textContent);
});
socket.on("newconnection", (data) => {
    $("#alert")
        .html(
            `<div class='alert alert-success' role='alert'>
                ${data.handle} joined the chat
            </div>`,
        )
        .hide();
    $("#alert").slideDown(500);
    window.setTimeout(function () {
        $(".alert")
            .fadeTo(500, 0)
            .slideUp(500, function () {
                $(this).remove();
            });
    }, 3000);
});
//=================================================================
//Handle User joined the room event
socket.on("joined", (data) => {
    console.log("User joined room:", data);

    // Ensure required fields exist
    if (!data.room || !data.room.roomID || !data.room.admin) {
        console.error("Invalid data received in 'joined' event:", data);
        return;
    }

    document.querySelector(".close").click();
    document.querySelector("#roomInfo").innerHTML = `
        <div>
            <button type="button" class="btn btn-secondary" data-toggle="tooltip" data-html="true" 
                title="Copy ${data.room.roomID}" data-placement="left" onclick='copyId("${data.room.roomID}")' id='tooltip'>
                Room : <em class='text-warning'>${data.room.roomName}</em>&nbsp <strong>|</strong>&nbsp
                Admin : <em class='text-warning'>${data.room.admin}</em>
            </button>
            <input type="hidden" id="roomIDVal" value="${data.room.roomID}"/>
            <a href="whatsapp://send?text=${href}/join/${data.room.roomID}" data-action="share/whatsapp/share" 
                class='btn btn-primary' onClick="javascript:window.open(this.href, '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');return false;" 
                target="_blank" title="Share on whatsapp" data-toggle="tooltip" data-placement="bottom">
                <i class='fa fa-whatsapp'></i>
            </a>
            <button type='button' class='btn btn-danger ml-1' onclick='leaveRoom()'>
                <i class='fa fa fa-sign-out'></i>
            </button>
        </div>`;
    
    // Toggle UI elements
    document.getElementById("btns").style.display = "none";
    document.getElementById("chat-window").style.display = "block";
    document.querySelector(".form-inline").style.display = "flex";
    document.querySelector("footer").style.display = "none";
    
    // Initialize tooltips
    $('[data-toggle="tooltip"]').tooltip();
});

//=================================================================
//Handle invalidRoom event
socket.on("invalidRoom", ({ message }) => {
    document.querySelector(".close").click();
    $("#alert")
        .html(
            "<div class='alert alert-warning' role='alert'>" +
                message +
                "</div>",
        )
        .hide();
    $("#alert").slideDown(500);
    window.setTimeout(function () {
        $(".alert")
            .fadeTo(500, 0)
            .slideUp(500, function () {
                $(this).remove();
            });
    }, 3000);
});

//=================================================================
//Handle chat event (Recieve message from server and show it on client side)
socket.on("chat", (data) => {
    // let style,
    //     bg,
    //     color,
    //     users = "";

    // if (data.handle === name.textContent) {
    //     style = "display:flex;justify-content:flex-end";
    //     data.users.forEach((item) => {
    //         if (item.name.trim() !== data.handle.trim())
    //             users += `${item.name} , `;
    //     });
    //     users = users.slice(0, users.length - 3);
    //     if (users !== "") {
    //         output.innerHTML += `<div style=${style}><div class='bg-success seen pl-2 pr-2 p-1 mr-2 rounded col-md-8 '><strong><em>Seen by ${users} </em></strong></div></div>`;
    //     }
    //     $(".spinner-border")
    //         .parent()
    //         .append("<i class='fa fa-check text-warning'></i>");
    //     $(".spinner-border").remove();
    // } else {
    //     style = "display:flex;justify-content:flex-start";
    //     bg = `bg-dark mess p-2 mr-1 m-2 rounded col-md-8 `;
    //     color = `text-success text-capitalize`;
    //     output.innerHTML += `<div style=${style} ><div class='${bg}'><h6 class= ${color}>${
    //         data.handle
    //     }</h6><div>${
    //         data.message
    //     }</div><img class="img-fluid rounded mb-2" src='${
    //         data.image
    //     }'/><div style="text-align:right;font-size:2vmin"> 
    // ${new Intl.DateTimeFormat("fa-IR", {
    //     hour: "numeric",
    //     minute: "numeric",
    // }).format(new Date(data.date))}&nbsp &nbsp</div></div></div>`;
    // }
    // $("file-input").val("");
    // image = "";
    // socket.emit("typing", "stop");
    // showUp();
    // scroll();
    addMessageToChatUI(data)
    scrollDown()
});

//=================================================================
//Handle typing event
socket.on("typing", (data) => {
    const { name,username, isTyping } = data;

    if (isTyping) {
        // Add a typing indicator if one doesn't already exist
        if (!$(`#typing-${username}`).length) {
            $("#feedback").append(
                `<p id="typing-${username}" class="badge badge-info p-2 ml-2 type">
                    <em>${name} is typing ....</em>
                </p>`
            );
        }
    } else {
        // Remove the typing indicator for this user
        $(`#typing-${username}`).remove();
    }
    scroll()
});



//=================================================================
//Handle user-left  event
socket.on("left", (user) => {
    document.getElementById("btns").style.display = "block";
    document.querySelector("footer").style.display = "block";
    document.getElementById("output").innerHTML = "";
    document.getElementById("up").remove();
    document.querySelector("#roomInfo").innerHTML = "";
    document.getElementById("chat-window").style.display = "none";
    document.querySelector(".form-inline").style.display = "none";
});

//=================================================================
//Handle User-Disconnected event
socket.on("userDisconnected", (data) => {
    $("#alert")
        .html(
            "<div class='alert alert-danger' role='alert'>" +
                data +
                " has left the chat" +
                "</div>",
        )
        .hide();
    $("#alert").slideDown(500);
    window.setTimeout(function () {
        $(".alert")
            .fadeTo(500, 0)
            .slideUp(500, function () {
                $(this).remove();
            });
    }, 3000);
});

//=================================================================
//Handle error
socket.on("error", ({ message }) => {
    $("#alert")
        .html(
            `<div class='alert alert-danger' role='alert'>
                ${message}</div>`,
        )
        .hide();
    $("#alert").slideDown(500);
    window.setTimeout(function () {
        $(".alert")
            .fadeTo(500, 0)
            .slideUp(500, function () {
                $(this).remove();
            });
    }, 3000);
});

//=================================================================
// Show the "scroll up" button when the chat window is scrollable
const showUp = () => {
    if (chat_window.scrollHeight > chat_window.clientHeight) {
        $("#up").show(); // Show scroll-up button
    }else{
    
        // $("#down").show(); // Optionally show the scroll-down button
    };
}

// Scroll to the bottom of the chat window

// Scroll to the bottom of the chat window just once
const scrollDown = () => {
        chat_window.scrollTo({
            top: chat_window.scrollHeight, // Scroll to the bottom
            behavior: "smooth",            // Smooth scrolling
        }); 
};


// Scroll to the top of the chat window
const scrollUp = () => {
    chat_window.scrollTo({
        top: 0,                        // Scroll to the top
        behavior: "smooth",            // Smooth scrolling
    });
};

// Scroll to the bottom on new messages
let hasScrolledDown = false; // Flag to track if the scroll has already occurred

// Scroll to the bottom on new messages
const scroll = () => {
    if (!hasScrolledDown) { // Check if the scroll down hasn't already been triggered
        setTimeout(() => { // Use setTimeout for a one-time scroll
            chat_window.scrollTo({
                top: chat_window.scrollHeight, // Scroll to the bottom
                behavior: "smooth",            // Smooth scrolling
            });
        }, 300); // Delay to make sure content has loaded

        hasScrolledDown = true; // Set flag to true after scrolling down
    }
};

const scrollToUnread = () => {
    if (!hasScrolledDown) { // Check if the scroll down hasn't already been triggered

    var unreadMarker = document.querySelector(".unread");
    if (unreadMarker) {
        const rect = unreadMarker.getBoundingClientRect();
        console.log("Unread marker position:", rect);
        unreadMarker.scrollIntoView({
            behavior: "auto",
            block: "center",
        });
    }else{
        chat_window.scrollTo({
            top: chat_window.scrollHeight, // Scroll to the bottom
            behavior: "auto",            // Smooth scrolling
        });     }
        hasScrolledDown = true; // Set flag to true after scrolling down
    }
    
};


const setImage = (file) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        image = event.target.result;
    };
};
const copyId = (id) => {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val(id).select();
    document.execCommand("copy");
    $temp.remove();
    console.log("Copied the text: " + id);
    $("#alert")
        .html(
            `<div class='alert alert-info' role='alert'>
	            Room-id: <em>${id}</em> copied to clipboard !</div>`,
        )
        .hide();
    $("#alert").slideDown(300);
    window.setTimeout(function () {
        $(".alert")
            .fadeTo(500, 0)
            .slideUp(500, function () {
                $(this).remove();
            });
    }, 1500);
};
//=================================================================
// Function to add messages to the chat UI

socket.on("restoreMessages", (data) => {
    const roomID = document.querySelector("#roomID").textContent.trim()

    chat_window.scrollTo({
        top: 2, // Scroll to the bottom
        behavior: "auto",            // Smooth scrolling
    });
    let lastSeenDate = [];


    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
    const bgColor = savedSettings?.bgColor || "#ffff";
    const fontSize = savedSettings?.fontSize || "16px";
    const borderRad = savedSettings?.borderRad || "5px";
    const fgColor = savedSettings?.fgColor || "#4444";
    const chatWindowBgColor = savedSettings?.chatWindowBgColor || "#434343";
    const chatWindowFgColor = savedSettings?.chatWindowFgColor || "#434343";
    // if (!Array.isArray(messages,prepend)) {
    //     console.error("Invalid messages received:", messages);
    //     return;
    // }

    // Reverse messages to display last to first
    //const reversedMessages = messages.slice().reverse();
    data.messages.forEach((message, index) => {
        try {
            if (!message || !message.timestamp || !message.sender || !message.message) {
                throw new Error(`Missing required fields in message at index ${index}`);
            }
            // if(sentMessagesId.includes(message.id)) throw new Error(`This is the END.`);
            // console.log(message)
            const isLastMessage = index === data.messages.length - 1;
            // Prepend reversed messages to the chat UI
            addMessageToChatUI(message,data.prepend , isLastMessage);
        } catch (error) {
            console.error("Error adding message to chat UI:", { error, message, index });
        }
    });
    
    if (output.innerHTML==""|| data.messages.length < 20) {
        
        if (roomID) {
    
            // Ensure there are messages in the DOM before trying to access them
            const messages = document.querySelectorAll(".messageRead"); // Class of each message div
            
            if (messages.length > 0) {
                let messageId = messages[0].getAttribute('data-id');
                
                if (messageId) {
                    
                    messageId = roomID +"-"+ messageId.split('-')[1]
                    // Emit the request for older messages to the server
                    socket.emit("requestOlderMessages", { roomID: roomID, counter: messageId });
                } else {
                    console.error("Message ID is null or undefined.");
                }
            } else {
                console.error("No messages found in the DOM.");
            }
        } else {
            console.error("Element with id 'roomIDVal' not found.");
        }
    } 
    // Initialize a variable to store the last seen date to compare

        // Get all the message elements
        const messages = document.querySelectorAll(".messageElm");

        // Iterate through all messages
        messages.forEach((message) => {
            const messageId = message.getAttribute("data-id");
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
                <div dir="auto" data-date="${messageDateString}" class="Date" style="display: flex; align-items: center; text-align: center; font-size: ${fontSize}; margin: 10px 0; font-weight: bold; color: ${chatWindowFgColor};">
                    <span style="flex: 1; height: 1px; background-color:  ${chatWindowFgColor}; margin: 0 10px;"></span>
                    ${messageDateString}
                    <span style="flex: 1; height: 1px; background-color:  ${chatWindowFgColor}; margin: 0 10px;"></span>
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

        setTimeout(() => {
            scrollToUnread(); // Scroll to the first unread message
        },100); // Adjust delay time if necessary
        });
// -----------------setting----------------
document.addEventListener("DOMContentLoaded", () => {
    renderEmojis()
    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
    const bgColor = savedSettings?.bgColor || "#ffff";
    const fontSize = savedSettings?.fontSize || "16px";
    const borderRad = savedSettings?.borderRad || "5px";
    const fgColor = savedSettings?.fgColor || "#4444";
    const chatWindowBgColor = savedSettings?.chatWindowBgColor || "#434343";
    const chatWindowFgColor = savedSettings?.chatWindowFgColor || "#434343";
    document.getElementById("chat-window").style.backgroundColor = chatWindowBgColor
    document.getElementById("chat-window").style.color = chatWindowFgColor
    document.getElementById("editable-message-text").style.backgroundColor = bgColor
    document.getElementById("editable-message-text").style.color = fgColor
    document.getElementById("editable-message-text").style.borderRadius = borderRad
    headTag.style.fontSize = fontSize+"px"
    headTag.style.color = chatWindowFgColor
    headTag.style.borderRadius = borderRad
    headTag.style.border = `1px solid ${chatWindowFgColor}`

    if (savedSettings) {
        document.documentElement.style.setProperty("--user-bg-color", savedSettings.bgColor);
        document.documentElement.style.setProperty("--user-font-size", savedSettings.fontSize);
    }
});
document.getElementById("settingsButton").addEventListener("click", () => {
    const panel = document.getElementById("settingsPanel");
    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
    const bgColor = savedSettings?.bgColor || "#ffff";
    const chatWindowBgColor = savedSettings?.chatWindowBgColor || "#434343";
    const chatWindowFgColor = savedSettings?.chatWindowFgColor || "#434343";
    const fgColor = savedSettings?.fgColor || "#cccc";
    const fontSize = savedSettings?.fontSize || "16px";
    panel.style.display = panel.style.display === "block" ? "none" : "block";
    document.getElementById("bgColorPicker").value = bgColor
    document.getElementById("fgColorPicker").value = fgColor
    document.getElementById("chatWindowBg-color").value = chatWindowBgColor
    document.getElementById("chatWindowFg-color").value = chatWindowFgColor
    fontSizeValue.textContent = fontSize;
    // Initialize with default preview
    updatePreview();

});
document.getElementById("saveSettings").addEventListener("click", () => {
    const panel = document.getElementById("settingsPanel");

    panel.style.display = panel.style.display === "block" ? "none" : "block";

    // Save settings locally
    const userSettings = {
        marginLeft: document.getElementById('margin-left').value,
        marginRight: document.getElementById('margin-right').value,
        chatWindowBgColor: document.getElementById('chatWindowBg-color').value,
        chatWindowFgColor: document.getElementById('chatWindowFg-color').value,
        bgColor: document.getElementById("bgColorPicker").value, // Assuming a background color picker exists
        fgColor: document.getElementById("fgColorPicker").value, // Assuming a background color picker exists
        fontSize: `${fontSizeRange.value}px`, // Get font size from range input
        borderRad: `${borderRadRange.value}px`, // Get font size from range input
    };
    localStorage.setItem("userSettings", JSON.stringify(userSettings));

    // Optionally save settings to the server
    socket.emit("saveSettings", userSettings , currentUser.username);

    alert("Settings saved successfully!");
    document.getElementById("settingsPanel").style.display = "none"; // Close panel
    window.location.reload(); // This will refresh the page and reset the UI

});
socket.on("applySettings", (settings) => {

    localStorage.setItem("userSettings", JSON.stringify(settings));
    document.documentElement.style.setProperty("--user-bg-color", settings.bgColor);
    document.documentElement.style.setProperty("--user-font-size", settings.fontSize);
});
document.getElementById("resetSettings").addEventListener("click", () => {
    if(confirm("Are u sure ? (It may delete all customized setting.)")){
        const userSettings = {
            marginLeft: "10%",
            marginRight: "%10",
            chatWindowBgColor: "#434343",
            chatWindowFgColor: "#ffffff",
            bgColor: "#99ff85", // Assuming a background color picker exists
            fgColor: "#000000", // Assuming a background color picker exists
            fontSize: "16px", // Get font size from range input
            borderRad: "5px", // Get font size from range input
        };
        localStorage.setItem("userSettings", JSON.stringify(userSettings));

        // Optionally save settings to the server
        socket.emit("saveSettings", userSettings , currentUser.username);
    
        alert("Settings saved successfully!");
        document.getElementById("settingsPanel").style.display = "none"; // Close panel
        window.location.reload(); // This will refresh the page and reset the UI

    }
})
// ----------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));

    if (savedSettings) {
        document.documentElement.style.setProperty("--user-bg-color", savedSettings.bgColor);
        document.documentElement.style.setProperty("--user-font-size", savedSettings.fontSize);
    }
});

let lastMessageDate = null;
let headTagVal = null;
let lastProcessedDate = null;
let ProcessedDate = null;
const messagesCreated=[]
function addMessageToChatUI(data, prepend = false , isLastMessage=false) {
    if(messagesCreated.includes(data.id)) return
    let contentToAdd = "";
    let dateToAdd = "";
    let unreadToAdd = "";
    messagesCreated.push(data.id)
    let messageId = data.id
    messageId = (data.id).split("-")[1];
    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
    const bgColor = savedSettings?.bgColor || "#ffff";
    const fontSize = savedSettings?.fontSize || "16px";
    const borderRad = savedSettings?.borderRad || "5px";
    const fgColor = savedSettings?.fgColor || "#4444";
    const chatWindowFgColor = savedSettings?.chatWindowFgColor || "#434343";
    const ownMessage = data.handle.normalize('NFC') === name.textContent.trim().normalize('NFC');

    const style = ownMessage
        ? `background-color:${bgColor};color:${fgColor};font-size:${fontSize};border-radius:${borderRad};`
        : `background-color:#333;color:white;font-size:${fontSize};border-radius:${borderRad};`;
    const divStyle = ownMessage
        ? `display:flex;justify-content:flex-end;`
        : `display:flex;justify-content:flex-start;`;

    // Get the date of the current message
    const messageDate = new Date(data.timestamp);
    const messageDateString = messageDate.toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    // Date tag
    if (data.dateLine) {
        dateToAdd = `
            <div dir="auto" data-date="${messageDateString}" class="Date" style="display: flex; align-items: center; text-align: center; font-size: ${fontSize}; margin: 10px 0; font-weight: bold; color: ${chatWindowFgColor};">
                <span style="flex: 1; height: 1px; background-color:  ${chatWindowFgColor}; margin: 0 10px;"></span>
                    ${messageDateString}
                <span style="flex: 1; height: 1px; background-color:  ${chatWindowFgColor}; margin: 0 10px;"></span>
            </div>`; 
               }

    // "Unread Messages" tag
    if (data.readLine) {
        unreadToAdd = `
            <div class="unread" style="display: flex; align-items: center; text-align: center; font-size: ${fontSize}; margin: 10px 0; font-weight: bold; color: ${chatWindowFgColor};">
                <span style="flex: 1; height: 1px; background-color:  ${chatWindowFgColor}; margin: 0 10px;"></span>
                    New Messages
                <span style="flex: 1; height: 1px; background-color:  ${chatWindowFgColor}; margin: 0 10px;"></span>
            </div>`;
            // console.log(unreadToAdd)
    }

    // Main message content
    const reactionMember = data.readUsers
    ? data.readUsers
        .map((r) => {
          return r.reaction
            ? `<span class='${r.username == currentUser.username ? `ownReaction `:``} reactionMemEmoji mx-1' ${r.username == currentUser.username ? `onClick="addStickerReaction('',${messageId})"`:''} user-id="${r.username}">${r.reaction}</span>`
            : "";
        })
        .join("")
    : "";
  
    // console.log(reactionMember)
    // Main message content
    const readInfoHTML = data.readUsers
    ? data.readUsers
          .map((r) => {
            if(r.name === name.textContent.trim().normalize('NFC')&& r.reaction !== ""){
              return`<div user-id='${r.username}' style="font-size:0.9rem;text-align:left;">
                       ${"you"} ${r.reaction}
                     </div>
                     <hr>`
            }else if(r.name !== name.textContent.trim().normalize('NFC')){
                return`<div user-id='${r.username}' style="font-size:0.9rem;text-align:left;">
                ${r.name} at ${formatTimestamp(r.time)} ${r.reaction}
              </div>
              <hr>`
            }
          })
          .join("")
    : "";
        const emojiDiv = `
        ${emoji(messageId)}
        <button id="reactBtn-${messageId}" class="btn reactBtn" onclick="toggleStickerPicker(${messageId})">
        <img src="../svg/emojiAdd.svg" alt="emoji add" width="20" height="20" />
        </button>
        `

    contentToAdd += `
    <div style="${divStyle}">
    </div>
    <div id="Message-${messageId}" class="messageElm" date-id="${messageDate}" style="${divStyle}" onmouseover="toggleReactBtnVisibility(${messageId}, true)" onmouseout="toggleReactBtnVisibility(${messageId}, false)">
        ${ownMessage?`
            
            <div class="read-info"  id="read-info-${data.id}" style="font-size:${fontSize};border-radius:${borderRad};">
                ${readInfoHTML}
            </div>`
            :''}
             
        <div style="${style}" class="message mess p-2 mr-1 m-2 col-md-6">
            <h6 style="font-style:italic;text-align:end;">${data.handle}</h6>
            ${data.file ? `<!-- Thumbnail Image -->
                        <img class="img-fluid rounded mb-2" src="${data.file}" loading="lazy" alt="Image" onclick="openImage('${data.file}')">

                        <!-- Modal for Enlarged Image -->
                        <div id="imageModal" class="imageModal">
                        <span class="close" onclick="closeModal()">&times;</span>
                        <img id="modalImage" class="imageModal-content" src="" alt="Enlarged Image">
                        <div class="imageModal-caption">
                            <a id="downloadLink" href="#" download="image.jpg" class="download-btn">Download</a>
                        </div>
                        </div>
                        ` : ""}
            <div dir="auto">${data.message}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;">
            ${ownMessage
                    ? `
            <button class="read-toggle" read-data-id="${data.id}" onclick="openReadedMessage('${data.id}')" style="cursor:pointer;text-align:right;font-size:0.8rem;color:${fgColor};border:none;background:none;">
                <i class="bi bi-arrow-90deg-up"></i> Last seen
            </button>`
            : ''}
           
        <div style="text-align:left;">
        ${new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "numeric",
        }).format(messageDate)}
        </div>
        </div>
        </div>
        </div>
        <div   style="${divStyle}">
        <div data-id="Message-${messageId}" style="${divStyle}" onmouseover="toggleReactBtnVisibility(${messageId}, true)" onmouseout="toggleReactBtnVisibility(${messageId}, false)" class="messageRead footerMessage" >
        
        ${ ownMessage ? `
            ${emojiDiv} 
            <div class="mx-2" reactionMessage = "${messageId}">
                ${reactionMember}
            </div>`:
        `
            <div class="mx-2" reactionMessage = "${messageId}">
                ${reactionMember}
            </div>
          ${emojiDiv}`
        }
        </div>
        </div>

    `;
    let firstMessgae = `
        <div data-id="Message-${messageId}" class="firstMessgae"></div>

    ` 
    // Insert content into chat UI
    if (prepend) {
        output.insertAdjacentHTML("afterbegin", contentToAdd);
        if (isLastMessage) output.insertAdjacentHTML("afterbegin", firstMessgae);
        if (dateToAdd) output.insertAdjacentHTML("afterbegin", dateToAdd);
        if (unreadToAdd) output.insertAdjacentHTML("afterbegin", unreadToAdd);
    } else {
        if (dateToAdd) output.insertAdjacentHTML("beforeend", dateToAdd);
        if (unreadToAdd) output.insertAdjacentHTML("beforeend", unreadToAdd);
        output.insertAdjacentHTML("beforeend", contentToAdd);
            setTimeout(() => {
                scrollDown(); // Scroll to the first unread message
            }, 500); // Adjust delay time if necessary
    }

    // Reset file input and image
    $("file-input").val("");
    image = "";

}

// JavaScript function to toggle the visibility of the react button
function toggleReactBtnVisibility(messageId, show) {
    const reactBtn = document.getElementById(`reactBtn-${messageId}`);
    
    // Toggle the 'visible' class depending on whether the mouse is over or out
    if (show) {
        reactBtn.classList.add('visible');
    } else {
        reactBtn.classList.remove('visible');
    }
}

// Function to toggle the sticker picker (this is just an example)
function toggleStickerPicker(messageId) {
    console.log("Sticker picker toggled for message ID:", messageId);
    // Implement logic for showing/hiding sticker picker
}
// Function to toggle the emoji picker visibility
function toggleStickerPicker(messageId) {
    const stickerPicker = document.getElementById(`emoji-${messageId}`);
    if (stickerPicker.classList.contains("show")) {
        stickerPicker.classList.remove("show");
        stickerPicker.classList.add("hide");
    } else {
        stickerPicker.classList.remove("hide");
        stickerPicker.classList.add("show");
    }
}

// Function to add sticker reaction
function addStickerReaction(reaction,messageId) {
    const roomID = document.getElementById('roomID').textContent.trim()
    const message = roomID +"-"+ messageId
    
    // console.log("Sticker selected:", reaction);
    // console.log("message selected:", message);
    // Here, emit the reaction to the server or update the UI accordingly
    socket.emit("addReaction", { username: currentUser.username, messageId: message, reaction:reaction });
    toggleStickerPicker(messageId);  // Close the sticker picker after selection
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
        if(seenUser){
            if(username !== currentUser.username){
            let updateUserReact = seenUser.innerHTML.split(' ')[0]
            let updateTimeReact = seenUser.innerHTML.split(' ')[2]
            seenUser.innerHTML= `${updateUserReact} at ${updateTimeReact} ${reaction}`
            }else{
                // let updateTimeReact = seenUser.innerHTML.split(' ')[2]
                seenUser.innerHTML = `You ${reaction}`

            }
        }
        else{
            // let updateTimeReact = seenUser.innerHTML.split(' ')[2]
            readInfoElement.innerHTML += `<div user-id="${username}" style="font-size:0.9rem;text-align:left;">
            You ${reaction}
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
                userRect.remove()
            }
            // Debug: After updating
            // console.log(`After update: ${userRect.innerHTML}`);
        } else {
            // console.log(`No existing reaction found for username: ${username}. Creating a new one.`);
            // userRect.innerHTML = `<span class='${username == currentUser.username ? `ownReaction `:``} reactionMemEmoji mx-1' user-id="${username}">${reaction}</span>`;

            // Create a new reaction element
          memberReaction.innerHTML += `<span class='${username == currentUser.username ? `ownReaction `:``} reactionMemEmoji mx-1' ${username == currentUser.username ? `onClick="addStickerReaction('',${spiltedId})"`:''} user-id="${username}">${reaction}</span>`
    
            // Debug: Log the newly created element
            // console.log(`New reaction created for username: ${username}`);
            // console.log(`HTML of new element: ${newUserRect.outerHTML}`);
        }
    } else {
        // Debug: Member reaction container is not found
        console.log(`Member reaction container not found. Reaction message ID: ${spiltedId}`);
    }
    

});
// --------------------------------------------
// read-info panel
// Example usage within your socket event
socket.on("readMessageUpdate", ({ id, readUsers }) => {
    const readInfoElement = document.querySelector(`#read-info-${id}`);

    if (readInfoElement) {
        // Update the read information for each read user
        readUsers.forEach((r) => {
            if (r.name !== name.textContent.trim().normalize('NFC')) {
                updateTimeForReadUser(r, readInfoElement);
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

        // Update the displayed time for the read user
        readInfoElement.innerHTML = `
            <div user-id='${r.username}' style="font-size: 0.9rem; text-align: left;">
                ${r.name} at ${formatTimestamp(r.time)}
            </div>`;
    }, 1000); // Update every second
};
function openReadedMessage(dataId) {
    // Get the read info div based on the data-id (used as read-info-${dataId})
    var infoDiv = document.querySelector(`#read-info-${dataId}`);

    // Get the read-toggle button based on the data-id attribute (correct selector)
    var toggleBtn = document.querySelector(`[read-data-id="${dataId}"]`);

    if (infoDiv && toggleBtn) {
        // Check if the read info is visible and toggle it
        if (!infoDiv.classList.contains("visible")) {
            infoDiv.classList.add("visible");  // Show the read info
            toggleBtn.innerHTML = `<i class="bi bi-x-lg"></i> Hide here`;  // Change button text
            console.log('show')
            
        } else {
            infoDiv.classList.remove("visible"); // Hide the currently visible panel
            toggleBtn.innerHTML = `<i class="bi bi-arrow-90deg-up"></i> Last seen`;  // Change button text
            console.log('hide')
        }
    }
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
                } 
            });
            
            toggleBtn.forEach((toggleBtn) => {
                toggleBtn.innerHTML = `<i class="bi bi-arrow-90deg-up"></i> Last seen`;  // Change button text
            })
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
function openImage(imageSrc) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const downloadLink = document.getElementById("downloadLink");
  
    // Set the source of the modal image and the download link
    modalImg.src = imageSrc;
    downloadLink.href = imageSrc; // This will allow the image to be downloaded
  
    // Display the modal
    modal.style.display = "block";
  }
  
  // Function to close the modal
  function closeModal() {
    const modal = document.getElementById("imageModal");
    modal.style.display = "none";
  }
  
  // Close the modal when clicking outside the image
  window.onclick = function(event) {
    const modal = document.getElementById("imageModal");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  }
  

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
chat_window.addEventListener("scroll", () => {
    const visibleMessages = [];
    const messages = document.querySelectorAll(".messageRead"); // Class of each message div
    const firstMessage = document.querySelectorAll(".firstMessgae")[0]; // Class of each message div
    const Dates = document.querySelectorAll(".Date"); // Class of each date div
    const rectheadTag = headTag.getBoundingClientRect(); // Get the head tag's position
    const roomID = document.getElementById('roomIDVal').value;

    // Iterate through Dates to check if they are in view
    Dates.forEach((dateElem) => {
        const rectDate = dateElem.getBoundingClientRect();

        // If the bottom of the date element is at or above the top of the head tag
        if (rectDate.bottom <= rectheadTag.top) {
            // console.log(dateElem.innerHTML); // Log the date when it reaches the top
            headTag.innerHTML = dateElem.innerHTML; // Set the head tag's content to the current date element
        }
    });
    
        let firstMessageId = firstMessage.getAttribute('data-id');
        firstMessageId = roomID +"-"+ firstMessageId.split('-')[1]
        const threshold = 50; // Proximity in pixels to the top of the viewport

        if (firstMessage.getBoundingClientRect().top >= -threshold && 
            firstMessage.getBoundingClientRect().bottom <= window.innerHeight + threshold) {
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
                        socket.emit("requestOlderMessages", { roomID: roomID, counter: firstMessageId });
                    }
                }
            
            }
    
    // Iterate through messages to find visible ones (if needed)
    messages.forEach((message) => {
        const rect = message.getBoundingClientRect();
        let messageId = message.getAttribute('data-id');
        messageId = roomID +"-"+ messageId.split('-')[1]
        // Check if the message is in the viewport (visible)
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            if (messageId && !visibleMessages.includes(messageId)) {
                visibleMessages.push(messageId);  // Add the data-id of visible messages
            }
        }
    });

    // Emit the IDs of visible messages to the server
    if (visibleMessages.length > 0) {
        socket.emit("markMessagesRead", { messageIds: visibleMessages, username: currentUser.username });
    }
      
});
// _______________reply____________________


function clearReply() {
    const replyBox = document.getElementById("replyBox");
    replyBox.innerHTML = ""; // Clear the reply preview
    delete replyBox.dataset.replyId; // Remove the reply id
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

