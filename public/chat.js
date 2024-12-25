
// const socket = io.connect(window.location.hostname),
const production = false;
const href = production ? window.location.hostname : "172.16.28.166",
    socket = io.connect(`https://172.16.28.166:4000`, {
        transports: ['polling', "websocket"],
        secure: true,
        withCredentials: false, // Ensures cookies are sent along with requests
        rejectUnauthorized: false // Bypass SSL verification for self-signed certificates
    }),
    name = document.getElementById("dropdownMenuButton"),
    message = document.getElementById("editable-message-text"),
    output = document.getElementById("output"),
    button = document.getElementById("button"),
    feedback = document.getElementById("feedback"),
    alertTag = document.getElementById("alert"),
    chat_window = document.getElementById("chat-window"),
    joinRoomName = document.getElementById("joinRoomName"),
    fileInput = document.getElementById("file-input"),
    headTag = document.getElementById('headTag'),
    currentUser = {
        username: document.getElementById('username').value
    },
    
    options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "",
    };
let sentMessagesId=[],
    sentMessagesIdLast=[],
    loadedForClicking=false
    , hasScrolledDown = false; // Flag to track if the scroll has already occurred
    let scrolling = true;

const roomID = document.querySelector("#roomID").textContent.trim()
// Function to disable scrolling
const disableScrolling = () => {
    chat_window.removeEventListener("scroll", scrollLoader)

    // console.log("Scrolling disabled.");
};

// Function to enable scrolling
const enableScrolling = () => {
    chat_window.addEventListener("scroll", scrollLoader)

    // console.log("Scrolling enabled.");
};

if (roomID != "") {
    if(document.getElementById('loading').classList.contains('hide')){
        document.getElementById('loading').classList.remove("hide");
        document.getElementById('loading').classList.add("show");
    } 
    socket.emit("joinRoom",({ 
        roomID: roomID,
        username: currentUser.username
        })
    );
}

{/* <input type="text" id="emojiSearch" class="form-control" placeholder="Search emojis..." onkeyup="filterEmojis(${messageId})"> */}
function alerting(message,type='success'){
    $("#alert")
    .html(
        `<div class='alert alert-${type}' role='alert'>
          ${message}
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
    return;
    
}
function emoji(messageId) {
    if (document.querySelectorAll('.stickerPicker')) {
        document.querySelectorAll('.stickerPicker').forEach(el => el.remove());
    }
        const emojiDiv = `
  <div id="emoji-${messageId}" class="stickerPicker">
    <div id="emojiGrid">
        <div id="emojiContainer" >
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


// const editableDiv = document.getElementById("editable-message-text");

message.addEventListener("input", function () {
    this.style.height = "auto"; // Reset height to calculate content height
    this.style.height = `${this.scrollHeight}px`; // Set height based on content
});

document.getElementById('username').value = ''
let image = "";
let fileData ;
$("#up").html('<i class= "fa fa-arrow-up" >').hide();

//=================================================================
//input image
// document.getElementById('file-inputBtn').addEventListener("click",()=>{
//     document.getElementById('file-input').click();
// })
$("#file-input").on("change", async (e) => {
    output.innerHTML+=`
    <div id="upload-container"style="
    justify-content: flex-end;
    display: flex;
    ">
        <progress id="upload-progress" value="0" max="100" style="width: 100%; height: 20px;"></progress>
        <span id="upload-status">0% uploaded</span>
    </div>

    `;
    button.disabled = true;
    fileInput.disabled = true;

    const file = e.target.files[0]; // Use e.target for modern jQuery
    const maxSize = 10 * 1024 * 1024; // 10 MB in bytes

    if (!file) {
        alerting("No file selected.", 'warning');
        button.disabled = false;
        fileInput.disabled = false;
        return;
    }

    if (file.size > maxSize) {
        alerting("The file is too large. Maximum size allowed is 10 MB.", 'warning');
        button.disabled = false;
        fileInput.disabled = false;
        return;
    }

    try {
        let processedFile;
        // Send the file to the server with progress updates
        const formData = new FormData();
        formData.append("file", file);
        // Reset progress bar
        $("#upload-progress").val(0);
        $("#upload-status").text("0% uploaded");
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/upload", true);
    
        // Monitor progress
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                // Emit progress to the server
                socket.emit("uploadProgress", { progress: percent });
            }
        };
       
        const fileType = file.type;
        if (fileType.startsWith("image/") && fileType !== "image/gif") {
            // Handle image compression
            options.fileType = fileType;
            const compressedFile = await imageCompression(file, options);
            console.log("Compressed image:", compressedFile);
            processedFile = await setImage(compressedFile);
        } else if (fileType === "application/pdf" || fileType.startsWith("video/") || fileType === "application/x-msdownload" || fileType === "image/gif") {
            // Handle PDF, video, EXE, or GIF files
            console.log(`${fileType} file selected:`, file);
            processedFile = await setFile(file);
        } else {
            alerting("Unsupported file type. Please select an image, PDF, video, or EXE file.", 'warning');
            return;
        }

        // Simulating upload progress (you can replace this with your actual upload logic)
        const fakeProgressUpload = new Promise((resolve, reject) => {
            let progress = 0;
            const interval = setInterval(() => {
                if (progress >= 100) {
                    clearInterval(interval);
                    resolve();
                } else {
                    progress += 10;  // Increase progress (simulate upload)
                    $("#upload-progress").val(progress);
                    $("#upload-status").text(`${progress}% uploaded`);
                }
            }, 1000);  // Update every second (1 second)
        });

        // await fakeProgressUpload;

        // After upload completes
        console.log("Processed file data:", processedFile);

        // Example: Use `processedFile` to send to the server or further process
        // Example AJAX call:
        // $.post("/upload", processedFile, (response) => console.log(response));
        xhr.onload = () => {
            if (xhr.status === 200) {
                console.log("File uploaded successfully");
                alerting("Upload complete.", "success");
            } else {
                alerting("Failed to upload the file.", "danger");
            }
        };
        xhr.send(formData);
    } catch (error) {
        console.error("Error processing file:", error);
        alerting("An error occurred while processing the file.", 'danger');
    } finally {

       

     
        $("#upload-progress").hide();
        button.disabled = false;
        fileInput.disabled = false;
    }
});
const setImage = (file) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const base64File = event.target.result; // The base64-encoded file content
            fileData = {
                fileData: base64File,
                fileType: file.type,
                fileName: file.name,
            };
            console.log("Image processed:", fileData);
            resolve(fileData);
        };
        reader.onerror = (error) => {
            console.error("Error reading image file:", error);
            reject(error);
        };
    });
};
// const setImage = (file) => {
//     const reader = new FileReader();
//     reader.readAsDataURL(file);
//     reader.onload = (event) => {
//         image = event.target.result;
//         console.log(image)
//     };
// };
const setFile = (file) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const base64File = event.target.result; // The base64-encoded file content
            fileData = {
                fileData: base64File,
                fileType: file.type,
                fileName: file.name,
            };
            console.log("File processed:", fileData);
            resolve(fileData);
        };
        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            reject(error);
        };
    });
};


// $("#file-input").on("change", (e) => {
//     button.disabled = true;
//     fileInput.disabled = true;
//     const file = e.originalEvent.target.files[0];
//     if (file) {
//         if (file.type != "image/gif") {
//             options.fileType = file.type;
//             imageCompression(file, options)
//                 .then((compressedFile) => {
//                     console.log(compressedFile);
//                     setImage(compressedFile);
//                     message.focus();
//                 })
//                 .catch((error) => console.log(error));
//         } else {
//             setImage(file);
//         }
//     }
//     button.disabled = false;
//     fileInput.disabled = false;
// });



//=================================================================
//Emit Create, Join and Leave room events

socket.emit("userLoggedIn", { username: currentUser.username });

// socket.emit("applySettings", user.settings); // Send settings to client

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

//=================================================================
//emit chat event (send message)
button.addEventListener("click", () => {
    const replyBox = document.getElementById('replyBox')
    let quote = replyBox.getAttribute('reply-id') || null;
    let text = message.innerText; // Get the HTML content

    // Sanitize the input to remove potentially dangerous content
    text = DOMPurify.sanitize(text);
    
    // Replace <br> and other elements if needed
    text = escapeHtml(text)
    
    // console.log(text);
    
    if(text == 'message ...'&& !fileData){
        $("#alert")
        .html(
            `<div class='alert alert-danger' role='alert'>
            message cannot be empty
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
    return;
    }
    const data = {
        username: currentUser.username,
        handle: name.textContent.trim(),
        roomID: roomID,
        quote:quote,
        message: text == 'message ...' ?' ': text,
        file: fileData || null,
        date: new Date(),
    };
    // console.log(quote)

    
    if ((!data.message && !data.file) || !data.username ) {
        $("#alert")
                .html(
                    `<div class='alert alert-danger' role='alert'>
                       message cannot be empty
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
        return;
    }
   // Display "sending" message in UI
    const sendingPlaceholder =`
    <div id="sending" style="display: flex; justify-content: flex-end; "> 
        <div class="spinner"></div>
    </div>
        `;
        const reply = (quote) => {
            if (quote) {
                const replyMessageElm = document.getElementById('replyBox');
                if (!replyMessageElm) {
                    console.error('Reply box element not found.');
                    return null; // Safeguard if the element doesn't exist
                }
                
                const sender = replyMessageElm.querySelector('h6')?.textContent.trim() || '';
                const message = document.getElementById('messageReplied')?.innerText || '';
                
                return {
                    sender: sender,
                    quote: quote,
                    handle: sender,
                    message: message,
                };
            }
            return null; // Return null if no quote
        };
        let fileDetails = null;

        if (data.file !== null && data.file !== undefined) {
            // Ensure data.file is an array (whether single data.file or array of data.file)
            const filesArray = Array.isArray(data.file) ? data.file : [data.file];
        
            // Conditionally map over the file if there are any
            fileDetails = filesArray.length > 0
                ? filesArray.map(file => ({
                    file: file.fileData,  // Assuming fileData contains base64 data or a URL
                    fileType: file.fileType,
                    fileName: file.fileName || null,  // Default to null if fileName is not present
                }))
                : null;  // If no file, return null
        
            // console.log(fileDetails);
        }else{
            fileDetails=''
            // console.error("erorr : ",file);
        }
        
        
        const dataShow = {
            ...data,
            file: fileDetails||'',
            quote: `${roomID}-${quote}`,
            sender: currentUser.username || '',
            reply: quote ? reply(quote) : null // Ensure it's an array if quote is defined
        };
        
    console.log(dataShow)
    // Send message to server
    addMessageToChatUI(dataShow)
    

  // Clear input fields
  message.innerHTML = "";
  message.style.height = "36px";
  
  fileData = "";
  clearReply()

    const lastMessageElm = output.querySelector(`#Message-${messageIdSplited[messageIdSplited.length-1]}`)
    
    const inLast = lastMessageElm.querySelector('.message')
    // console.log(inLast.innerHTML)
    if(inLast){
        const footerSending= inLast.querySelector(`.read-toggle`)
        if(footerSending){
            footerSending.innerHTML=`<strong>${sendingPlaceholder}</strong>`
        }
    }
    // output.insertAdjacentHTML("beforeend",sendingPlaceholder);
    
    
    chat_window.scrollTo({
        top: chat_window.scrollHeight, // Scroll to the bottom
        behavior: "auto",
    });
    if(document.querySelector('.unread')) document.querySelector('.unread').remove()

    socket.emit("chat", data, (ack) => {
        // Callback is triggered when the server acknowledges receipt
        
        // Remove the "sending" placeholder
        var placeholder = output.querySelector("#sending");
        // console.log(placeholder)
        if (ack.success) {
            if (placeholder) {
                
                placeholder.insertAdjacentHTML('afterend', `<i class="bi bi-check2"></i>`);
                placeholder.remove();
                
            }
            

            // // Display the sent message in the UI
            // output.innerHTML += `<div style="display:flex;justify-content:flex-end;color:black;">
            //     ${data.message}
            // </div>`;
        } else {
            // Handle failure (e.g., show an error message)
            output.innerHTML += `<div style="display:flex;justify-content:flex-end;color:red;">
                Failed to send message
            </div>`;
        }
     
      
    });
  
    // Add listener for server acknowledgment
    socket.on("chat", (response) => {
        if (response.error) {

            alerting(response.error,'danger');
            return;
        }

        // // Add the message to the UI
        // addMessageToChatUI(response);
    });
    // Remove "sending" placeholder once the message is successfully added to the UI
    if(document.getElementById("sending-placeholder"))document.getElementById("sending-placeholder").remove()
        setTimeout(() => {
            applyShowMore();
            },100);
})
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
    // console.log("User joined room:", data);

    // Ensure required fields exist
    // if (!data.room || !data.room.roomID || !data.room.admin) {
    //     console.error("Invalid data received in 'joined' event:", data);
    //     return;
    // }

    document.querySelector(".close").click();
    document.querySelector("#roomInfo").innerHTML = `
        <div class="mx-3">
            <button type="button" class="btn btn-secondary" data-toggle="tooltip" data-html="true" 
                title="Copy ${data.room.roomID}" data-placement="left" onclick='copyId("${data.room.roomID}")' id='tooltip'>
                Room : <em class='text-warning'>${data.room.roomName}</em>&nbsp <strong>|</strong>&nbsp
                Admin : <em class='text-warning'>${data.name}</em>
            </button>
            <input type="hidden" id="roomIDVal" value="${data.room.roomID}"/>
            <a href="whatsapp://send?text=${href}/join/${data.room.roomID}" data-action="share/whatsapp/share" 
                class='btn btn-primary' onClick="javascript:window.open(this.href, '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');return false;" 
                target="_blank" title="Share on whatsapp" data-toggle="tooltip" data-placement="bottom">
                <i class='bi bi-whatsapp'></i>
            </a>
            <button type='button' title="Leave the room" data-toggle="tooltip" data-placement="bottom" class='btn btn-danger ml-1' onclick='leaveRoom()'>
                <i class='bi bi-door-closed'></i>
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

// when scroll up send other user message count 
let unreadedScroll=0;
function updateNotifCount(count) {
    const notifCount = document.getElementById('notifCount');
    if (count > 0) {
        notifCount.textContent = count;
        notifCount.style.display = 'inline'; // Show the badge
    } else {
        notifCount.style.display = 'none'; // Hide the badge if count is 0
    }
}

socket.on("chat",(data , ack) => {
    if (ack.success) {
   
        
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
   
    const lastMessage = document.querySelectorAll(".lastMessage")[0]; // Class of each message div

    const roomID = document.getElementById('roomIDVal').value;

    if(lastMessage){

        if( lastMessage.getAttribute('data-id')){
            let lastMessageId = lastMessage.getAttribute('data-id');
            lastMessageId = roomID +"-"+ lastMessageId.split('-')[1]
            const threshold = 100; // Proximity in pixels to the top of the viewport
            let rect = lastMessage.getBoundingClientRect()

            if (rect.bottom >= -threshold 
                &&rect.top <= window.innerHeight+threshold) {
                if(data.sender != currentUser.username){
                    addMessageToChatUI(data)
                    // console.log(data.sender)
                }
                scrollDown()

                }else{
                    unreadedScroll += 1;
                    updateNotifCount(unreadedScroll)
                    console.log('unreaded:',unreadedScroll)
                    if(data.sender != currentUser.username){
                        if(output.querySelectorAll('.unread').length == 0){
                            data = {
                                ...data,
                                readLine:true
                            }
                        }else{
                            
                            // console.log(output.querySelectorAll('.unread'))
                        }
                        addMessageToChatUI(data)
                        hasScrolledDown = false
                    }
                }
            }
    }
    
    }
    // $("#down").show(); // Show scroll-up button
    messageMenu()
    setTimeout(() => {
        applyShowMore();
    },100);
    if(data.sender != currentUser.username){
        showBrowserNotification(data.handle,data.message)
        playNotificationSound()
    }

});

//=================================================================
//Handle typing event
socket.on("typing", (data) => {
    const { name,username, isTyping } = data;

    if (isTyping) {
        // Add a typing indicator if one doesn't already exist
        if (!$(`#typing-${username}`).length && !$(`#typing-${username}Btn`).length) {
           
            const lastMessage = document.querySelectorAll(".lastMessage")[0]; // Class of each message div

            const roomID = document.getElementById('roomIDVal').value;

            if(lastMessage){

                if( lastMessage.getAttribute('data-id')){
                    let lastMessageId = lastMessage.getAttribute('data-id');
                    lastMessageId = roomID +"-"+ lastMessageId.split('-')[1]
                    const threshold = 100; // Proximity in pixels to the top of the viewport
                    let rect = lastMessage.getBoundingClientRect()

                    if (rect.bottom >= -threshold 
                        &&rect.top <= window.innerHeight+threshold) {
                       
                            $("#feedback").append(
                                `<p id="typing-${username}" style="border-radius: 5px var(--user-border-radius) var(--user-border-radius) var(--user-border-radius);" class="badge p-2 ml-2 type">
                                    <em>${name} is typing ....</em>
                                </p>`
                            );
                        }else{
                            $("#down").fadeIn()

                            $("#chat_windowFooter").append( `<p id="typing-${username}Btn" class="badge p-2 ml-2 type typeScrollDownBtn">
                                <em>${name} is typing ....</em>
                                </p>`
                            );
                        }
                    }
            }
            
        }
    } else {
        // Remove the typing indicator for this user
        $(`#typing-${username}`).remove();
        $(`#typing-${username}Btn`).remove();
    }
    // scrollDown()
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
socket.on("userJoined", (data) => {
    alerting(`${data} has join the room`);
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
    scrolling=false
     
    // $("#down").show(); // Optionally show the scroll-down button
    $("#down").fadeOut(); // hide scroll-up button

    if (loadedForClicking) {
        const roomID = document.querySelector("#roomID").textContent.trim();
    
        // Show the loading spinner if hidden
        const loadingElement = document.getElementById('loading');
        if (loadingElement.classList.contains('hide')) {
            loadingElement.classList.remove("hide");
            loadingElement.classList.add("show");
        }
    
        // Emit the event and wait for the server's acknowledgment
        socket.emit("requestOlderMessages", { 
            roomID: roomID, 
            counter: `${roomID}-0`, 
            type: 'latest' 
        }, () => { // Callback function for when the server acknowledges
            // Scroll after emitting the event
            chat_window.scrollTo({
                top: chat_window.scrollHeight, // Scroll to the bottom
                behavior: "auto",
            });
        });
    
        loadedForClicking = false;
    }else{
        chat_window.scrollTo({
            top: chat_window.scrollHeight, // Scroll to the bottom
            behavior: "auto",
        });
        var unreadMarker = document.querySelector(".unread");
        if (unreadMarker && !hasScrolledDown) {
            const rect = unreadMarker.getBoundingClientRect();
            // console.log("Unread marker position:", rect);
            unreadMarker.scrollIntoView({
                behavior: "auto",
                block: "center",
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
    chat_window.scrollTo({
        top: 0,                        // Scroll to the top
        behavior: "smooth",            // Smooth scrolling
    });
};

// Scroll to the bottom on new messages

// Scroll to the bottom on new messages
const scroll = () => {
        setTimeout(() => { // Use setTimeout for a one-time scroll
            chat_window.scrollTo({
                top: chat_window.scrollHeight, // Scroll to the bottom
                behavior: "smooth",            // Smooth scrolling
            });
        }, 300); // Delay to make sure content has loaded
    
};

const scrollToMessage = (messageId) => {
  
    scrolling=false
     
var message = document.getElementById(`${messageId}`);
if (message) {
    // Scroll to the message
    message.scrollIntoView({
        behavior: "smooth",
        block: "center",
    });

    // Add the shining effect
    message.classList.add("highlight-shine");

    // Remove the class after 1 second
    setTimeout(() => {
        message.classList.remove("highlight-shine");
    }, 1000);
} else {

    var firstMessage = document.querySelectorAll(".firstMessage")[0]; // Class of each message div

    if( firstMessage.getAttribute('data-id')){
            let firstMessageId = firstMessage.getAttribute('data-id');
            if (messageId <= firstMessageId){
            firstMessageId = roomID +"-"+ firstMessageId.split('-')[1]
            let messageIdreplied = roomID +"-"+ messageId.split('-')[1]
            
            if (!sentMessagesId.includes(firstMessageId)) {
            const isSmallerThanAll = sentMessagesId.every((id) => {
                return firstMessageId < id; // Compare lexicographically (string comparison)
            });
            
            // If the firstMessageId is smaller than all the sent messages' IDs, request older messages
            if (isSmallerThanAll) {
                
                // console.log(firstMessageId)
                if(document.getElementById('loading').classList.contains('hide')){
                    document.getElementById('loading').classList.remove("hide");
                    document.getElementById('loading').classList.add("show");
                } 
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

const scrollToUnread = () => {
    scrolling=false

    if (!hasScrolledDown) { // Check if the scroll down hasn't already been triggered

    var unreadMarker = document.querySelector(".unread");
    if (unreadMarker) {
        const rect = unreadMarker.getBoundingClientRect();
        // console.log("Unread marker position:", rect);
        unreadMarker.scrollIntoView({
            behavior: "auto",
            block: "center",
        });
    }else{
        chat_window.scrollTo({
            top: chat_window.scrollHeight, // Scroll to the bottom
            behavior: "auto",            // Smooth scrolling
        });
    }
         hasScrolledDown = true; // Set flag to true after scrolling down
        //  console.log(hasScrolledDown)
    }
    $("#down").fadeOut(); // Show scroll-up button
    setTimeout(() => {
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
    if(document.getElementById('loading').classList.contains('hide')){
        document.getElementById('loading').classList.remove("hide");
        document.getElementById('loading').classList.add("show");
    } 
    if(data.reply){
        sentMessagesIdLast=[]
        hasScrolledDown= false
        sentMessagesId=[]
        loadedForClicking=true
        output.innerHTML=''
    }
    if(data.Latest){
        sentMessagesIdLast=[]
        hasScrolledDown= false
        sentMessagesId=[]
        // loadedForClicking=true
        output.innerHTML=''
    }
    const roomID = document.querySelector("#roomID").textContent.trim()
    if (output.querySelectorAll('.MessagePack').length >= 3 && !data.unread) {
        var MessagePack = output.querySelectorAll('.MessagePack');
    
        if (data.prepend) {
            // chat_window.scrollTo({
            //     top: 1, // Scroll to the bottom
            //     behavior: "auto",            // Smooth scrolling
            // });
            // Remove the last 50 `.messageElm`
            for (let i = MessagePack.length - 1; i > MessagePack.length - 2; i--) {
                if (MessagePack[i]) {
                    MessagePack[i].remove();
                    
                    loadedForClicking=true
                }
            }
           
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

    // console.log("last",sentMessagesIdLast)
    // console.log("first",sentMessagesId)
    // output.innerHTML=''
   
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
    let FirstMessage;
    let LastMessage;
    if(data.prepend){
        FirstMessage = data.messages[data.messages.length - 1].id ;
        LastMessage = data.messages[0].id;
    }else{
        LastMessage = data.messages[data.messages.length - 1].id;
        FirstMessage = data.messages[0].id ;

        
    }

    var MessagePack = `<div class="MessagePack" firstMessage="${FirstMessage}" lastMessage="${LastMessage}"></div>`

    if(data.prepend){
    output.insertAdjacentHTML('afterbegin',MessagePack)
    }else{
    output.insertAdjacentHTML('beforeend',MessagePack)
    }
    data.messages.forEach((message, index) => {
        try {
            if (!message || !message.timestamp || !message.sender ) {
                throw new Error(`Missing required fields in message at index ${index}`);
            }
            // if(sentMessagesId.includes(message.id)) throw new Error(`This is the END.`);
            // console.log("data latest prepend: " , data.latest ?  data.prepend:'')
            let isFirstMessage ;
            let isLastMessage ;
            if(data.prepend){
                 isFirstMessage = index === data.messages.length - 1;
                 isLastMessage = index === 0;
            }else{
                isLastMessage = index === data.messages.length - 1;
                isFirstMessage = index === 0;
                
            }
            // Prepend reversed messages to the chat UI
            addMessageToChatUI(message, data.prepend , isFirstMessage, isLastMessage);
        } catch (error) {
            console.error("Error adding message to chat UI:", { error, message, index });
            
        }

    });
    
    if (output.innerHTML==""|| data.messages.length < 50) {
        
        if (roomID) {
    
            // Ensure there are messages in the DOM before trying to access them
            const messages = document.querySelectorAll(".messageRead"); // Class of each message div
            
            if (messages.length > 0) {
                let messageId = messages[0].getAttribute('data-id');
                
                if (messageId) {
                    if(document.getElementById('loading').classList.contains('hide')){
                        document.getElementById('loading').classList.remove("hide");
                        document.getElementById('loading').classList.add("show");
                    } 
                    messageId = roomID +"-"+ messageId.split('-')[1]
                    // Emit the request for older messages to the server
                    socket.emit("requestOlderMessages", { roomID: roomID, counter: messageId });
                } else {
                    console.error("Message ID is null or undefined.");
                }
            } else {
                if(document.getElementById('loading').classList.contains('hide')){
                    document.getElementById('loading').classList.remove("hide");
                    document.getElementById('loading').classList.add("show");
                } 
                socket.emit("requestOlderMessages", { roomID: roomID, counter:`${roomID}-0` , type:'latest' });
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
                <div dir="auto" data-date="${messageDateString}" class="p-2 Date" style="justify-content:center; display: flex; align-items: center; text-align: center; font-size: ${fontSize}; margin: 10px 0; font-weight: bold; color: rgb(var(--user-chat-fg-color));">
                   <div class="backdrop-blur px-3">
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
        if(document.getElementById('loading').classList.contains('show')){
            document.getElementById('loading').classList.remove("show");
            document.getElementById('loading').classList.add("hide");
        }
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
        if(data.reply){
            // sentMessagesIdLast=[]

            // sentMessagesId=[]
            loadedForClicking=true

            // console.log("reply loaded:",(data.reply).split('-')[1]+'-'+(data.reply).split('-')[2])
            setTimeout(() => {
                scrollToMessage((data.reply).split('-')[1]+'-'+(data.reply).split('-')[2]); // Retry scrolling to the message
            },1500); // Adjust delay time if necessary
        }
        if(data.join){
            setTimeout(() => {
                scrollToUnread(); // Scroll to the first unread message
            },500); // Adjust delay time if necessary
        }
       
        messageMenu()
        if (data.prepend) {
            const messagePackDiv = document.querySelectorAll('.MessagePack');
    
            if (messagePackDiv.length > 0) {
                chat_window.scrollTop = messagePackDiv[0].scrollHeight;
            } else {
                console.error('No elements found with class "MessagePack".');
            }
        }

        setTimeout(() => {
            applyShowMore();
        },100);
        enableScrolling()
    });
    socket.on("noMoreMessages",(data) =>{
        console.log(data.message)
        if(document.getElementById('loading').classList.contains('show')){
            document.getElementById('loading').classList.remove("show");
            document.getElementById('loading').classList.add("hide");
        }
        
        // output.querySelector('.firstMessage').innerHTML=''
    })
// -----------------setting----------------
document.addEventListener("DOMContentLoaded", () => {
    // renderEmojis()
    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
    const bgColor = savedSettings?.bgColor || "255, 255, 255";
    const fontSize = savedSettings?.fontSize || "16px";
    const borderRad = savedSettings?.borderRad || "5px";
    const fgColor = savedSettings?.fgColor || "67, 67, 67";
    const chatWindowBgColor = savedSettings?.chatWindowBgColor || "67, 67, 67";
    const chatWindowFgColor = savedSettings?.chatWindowFgColor || "255, 255, 255";
    document.getElementById("chat-window").style.backgroundColor = chatWindowBgColor
    document.getElementById("chat-window").style.color = chatWindowFgColor
    // document.getElementById("editable-message-text").style.backgroundColor = bgColor
    // document.getElementById("editable-message-text").style.color = fgColor
    // document.getElementById("editable-message-text").style.borderRadius = borderRad
    headTag.style.fontSize = fontSize+"px"
    headTag.style.color = chatWindowFgColor
    headTag.style.borderRadius = borderRad
    headTag.style.border = `1px solid var(--user-bg-color)`

    if (savedSettings) {
        document.documentElement.style.setProperty("--user-font-size", savedSettings.fontSize);
        document.documentElement.style.setProperty("--user-bg-color", savedSettings.bgColor);
        document.documentElement.style.setProperty("--user-fg-color", savedSettings.fgColor);
        document.documentElement.style.setProperty("--user-chat-bg-color", savedSettings.chatWindowBgColor);
        document.documentElement.style.setProperty("--user-chat-fg-color", savedSettings.chatWindowFgColor);
        document.documentElement.style.setProperty("--user-font-size", savedSettings.fontSize);
        document.documentElement.style.setProperty("--user-border-radius", savedSettings.borderRad);
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

    alerting("Settings saved successfully!");
    document.getElementById("settingsPanel").style.display = "none"; // Close panel
    window.location.reload(); // This will refresh the page and reset the UI

});
socket.on("applySettings", (settings) => {

    localStorage.setItem("userSettings", JSON.stringify(settings));
    document.documentElement.style.setProperty("--user-bg-color", settings.bgColor);
    document.documentElement.style.setProperty("--user-fg-color", settings.fgColor);
    document.documentElement.style.setProperty("--user-chat-bg-color", settings.chatWindowBgColor);
    document.documentElement.style.setProperty("--user-chat-fg-color", settings.chatWindowFgColor);
    document.documentElement.style.setProperty("--user-font-size", settings.fontSize);
    document.documentElement.style.setProperty("--user-border-radius", settings.borderRad);
});
document.getElementById("resetSettings").addEventListener("click", () => {
    if(confirm("Are u sure ? (It may delete all customized setting.)")){
        const userSettings = {
            marginLeft: "10%",
            marginRight: "%10",
            chatWindowBgColor: "67, 67, 67",
            chatWindowFgColor: "255, 255, 255",
            bgColor: "51, 133, 255", // Assuming a background color picker exists
            fgColor: "255, 255, 255", // Assuming a background color picker exists
            fontSize: "12px", // Get font size from range input
            borderRad: "15px", // Get font size from range input
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
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
    
    if (savedSettings) {
        document.documentElement.style.setProperty("--user-font-size", savedSettings.fontSize);
        document.documentElement.style.setProperty("--user-bg-color", savedSettings.bgColor);
        document.documentElement.style.setProperty("--user-fg-color", savedSettings.fgColor);
        document.documentElement.style.setProperty("--user-chat-bg-color", savedSettings.chatWindowBgColor);
        document.documentElement.style.setProperty("--user-chat-fg-color", savedSettings.chatWindowFgColor);
        document.documentElement.style.setProperty("--user-font-size", savedSettings.fontSize);
        document.documentElement.style.setProperty("--user-border-radius", savedSettings.borderRad);
    }
});

let lastMessageDate = null;
let headTagVal = null;
let lastProcessedDate = null;
let ProcessedDate = null;
let messagesCreated=[]
let messagesCreatedHandler=[]
let messageIdSplited=[]
let lastSender = null;

function addMessageToChatUI(data, prepend = false , isFirstMessage=false, isLastMessage=true , MessagePack = output.querySelectorAll('.MessagePack')) {
    if(messagesCreated.includes(data.id)){
        const MessageElm = output.querySelector(`#Message-${data.id.split('-')[1]}`)
        if(MessageElm)MessageElm.remove()
    }
    if(!data.id){
        const MessageElm = output.querySelectorAll(`.messageElm`)

        if (MessageElm.length > 0) {
            const lastMessageIdStr = MessageElm[MessageElm.length - 1].id.split('-')[1];
            if (!isNaN(lastMessageIdStr)) {
                data.id = roomID+"-"+ (parseInt(lastMessageIdStr, 10) + 1); // Increment the last numeric id
            } else {
                console.error("Invalid ID format. Ensure message IDs are in the correct format, e.g., 'Message-123'.");
            }
        }
        // console.log("Next message ID:", data.id);
    }
    let contentToAdd = "";
    let dateToAdd = "";
    let unreadToAdd = "";
    messagesCreated.push(data.id)
    messagesCreatedHandler.push(data.handle)
    let messageId = data.id
    messageId = (data.id).split("-")[1];
    messageIdSplited.push(messageId)
    const isNewSender = lastSender !== data.sender;

    // Update the last sender
    lastSender = data.sender;
    
    const savedSettings = JSON.parse(localStorage.getItem("userSettings"));
    const bgColor = savedSettings?.bgColor || "#ffff";
    const fontSize = savedSettings?.fontSize || "13px";
    const borderRad = savedSettings?.borderRad || "15px";
    const fgColor = savedSettings?.fgColor || "#4444";
    const chatWindowFgColor = savedSettings?.chatWindowFgColor || "#434343";
    const ownMessage = data.sender === currentUser.username;
    const styleClass = ownMessage ? "var(--user-border-radius) 5px var(--user-border-radius) var(--user-border-radius)" : "5px var(--user-border-radius) var(--user-border-radius) var(--user-border-radius) ";
    data.message = data.message
    .replace(/\n/g, '<br>') // Replace newlines with <br>
    .replace(
        /((https?:\/\/|www\.)[^\s<]+)/g, // Match URLs (starting with http, https, or www)
        (url) => {
            const href = url.startsWith('http') ? url : `https://${url}`; // Ensure href starts with http(s)
            return `<a href="https://href.li/?${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        }
    );
    const borderRadiusFalse = ()=>{

        
           const lastMessageElm = output.querySelectorAll(`.messageElm`)

        if (lastMessageElm.length >= 1) {
            const lastValue = data.handle.trim();
            const secondLastValue = lastMessageElm[lastMessageElm.length - 1].getAttribute('sender').trim();
            if (lastValue !== secondLastValue) {
                if(prepend)return  ownMessage ? ` var(--user-border-radius) var(--user-border-radius) 5px var(--user-border-radius)`: ` 5px var(--user-border-radius) var(--user-border-radius)  5px`
                else  return ownMessage ? `var(--user-border-radius) var(--user-border-radius) 5px var(--user-border-radius)`: `var(--user-border-radius) var(--user-border-radius) var(--user-border-radius) 5px`          
            } else if(!prepend) {
                console.log("last: ",lastValue)
                console.log("second last: ",secondLastValue)
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
    const style = ownMessage
        ? `background-color:rgb(var(--user-bg-color));color:rgb(var(--user-fg-color));font-size:${fontSize};border-radius: ${borderRadiusFalse()}  ;`
        : `background-color:#333;color:white;font-size:${fontSize};border-radius:  ${borderRadiusFalse()};`;
    const divStyle = ownMessage
        ? `display:flex;justify-content:flex-end;`
        : `display:flex;justify-content:flex-start;`;

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
            <div dir="auto" data-date="${messageDateString}" class="Date" style="display: flex; align-items: center; text-align: center; font-size: ${fontSize}; margin: 10px 0; font-weight: bold; color: rgb(var(--user-bg-color));">
                <span style="flex: 1; height: 1px; background-color:  rgb(var(--user-bg-color)); margin: 0 10px;"></span>
                <div class="backdrop-blur">
                    ${messageDateString}
                </div
                <span style="flex: 1; height: 1px; background-color:  rgb(var(--user-bg-color)); margin: 0 10px;"></span>
            </div>`; 
               }

    // "Unread Messages" tag
    if (data.readLine) {
        unreadToAdd = `
            <div class="unread" style="display: flex; align-items: center; text-align: center; font-size: ${fontSize}; margin: 10px 0; font-weight: bold; color: rgb(var(--user-chat-fg-color));">
                <span style="flex: 1; height: 1px; background-color:  rgb(var(--user-chat-bg-color)); margin: 0 10px;"></span>
                    New Messages
                <span style="flex: 1; height: 1px; background-color:  rgb(var(--user-chat-bg-color)); margin: 0 10px;"></span>
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
              return `<div user-id='${r.username}' style="font-size:0.9rem;text-align:left;">
                       ${"you"} ${r.reaction}
                     </div>
                     <hr>`
            }else if(r.name !== name.textContent.trim().normalize('NFC')){
                return `<div user-id='${r.username}' style="font-size:0.9rem;text-align:left;">
                ${r.name} at ${formatTimestamp(r.time)} ${r.reaction}
              </div>
              <hr>`
            }
          })
          .join("")
    : "";

    const emojiDiv = `
    ${emoji(messageId)}
    
    `
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
            //   messagesCreatedHandler=[]
              if (lastValue == secondLastValue) {
                  
                  return ``        
                } else {
                  const lastMessageElm = output.querySelector(`#Message-${messageIdSplited[messageIdSplited.length-2]}`)
                  if(lastMessageElm){
                    const inLast = lastMessageElm.querySelector('.message')
                    if(inLast){
                        if(!inLast.querySelector('h6')){
                            inLast.insertAdjacentHTML("afterbegin",`<h6 class="message-title" style="${messagesCreatedHandler[messagesCreatedHandler.length - 2] === name.textContent.trim() ? `color: rgb(var(--user-fg-color));`:''} font-style:italic;text-align:start;">${messagesCreatedHandler[messagesCreatedHandler.length - 2] === name.textContent.trim() ?'You':messagesCreatedHandler[messagesCreatedHandler.length-2]}</h6>`)
                            // console.log('before border :',inLast.style.borderRad)
                            inLast.style.borderRadius = messagesCreatedHandler[messagesCreatedHandler.length - 2] === name.textContent.trim() ? 'var(--user-border-radius) var(--user-border-radius) 5px var(--user-border-radius)' : ' var(--user-border-radius) var(--user-border-radius) var(--user-border-radius) 5px ' ;
                            // console.log('after border :',inLast.style.borderRad)
                        }
                    }
                    return ``;
                    }
                  else return ``;
                }
            } else {
              return ``
          }
      }else{
        const lastMessageElm = output.querySelectorAll(`.messageElm`)

        if (lastMessageElm.length >= 2) {
            const lastValue = data.handle.trim();
            const secondLastValue = lastMessageElm[lastMessageElm.length - 1].getAttribute('sender');
            console.log("last: ",lastValue)
            console.log("second last: ",secondLastValue)
            if (lastValue !== secondLastValue) {
                return `<h6 class="message-title" style="${ownMessage? `color: rgb(var(--user-fg-color));`:''} font-style:italic;text-align:start;">${ownMessage ? `You`: data.handle}</h6>`           
            } else {
                return ``;
             }
        } else {
            return `<h6 class="message-title" style="${ownMessage? `color: rgb(var(--user-fg-color));`:''} font-style:italic;text-align:start;">${ownMessage ? `You`: data.handle}</h6>
            ` ;
        }
    }
        
    }

    
// console.log("replyJson: ", data.reply!==null ?  data.reply:'')
// onmouseover="toggleReactBtnVisibility(${messageId}, true)" onmouseout="toggleReactBtnVisibility(${messageId}, false)"

// ${ownMessage? `right_box1 `:`left_box2 `}
    contentToAdd += `

    <div id="Message-${messageId}" class="messageElm" date-id="${messageDate}" style="${divStyle}     align-items: center;"  sender="${data.handle}">
        ${ownMessage?`
            
            <div class="read-info mx-3"  id="read-info-${data.id}" style="font-size:${fontSize};border-radius:${borderRad};">
              ${readInfoHTML}
            </div>`
            :''}
             
        <div style="${style}; margin:2px" class=" message mess py-1 mr-1  col-md-6">

            ${handler()}
                ${data.reply && data.reply!==null ? `<div class="replyMessage EmbeddedMessage my-1 p-2 peer-color-${ownMessage?`0`:`1`}" replyID="Message-${(data.quote).split('-')[1]}">
                    <h6 class="message-title" dir="rtl" style="${ownMessage? `color: rgb(var(--user-fg-color));`:''} font-style:italic;text-align:end;">
                        ${data.reply.sender == currentUser.username ? `You` : data.reply.handle}
                    </h6>
                    <span class="px-2" dir="auto">${(data.reply.message)}</span>
                    </div>`:''}
                
                ${data.file && data.file!==null ? data.file.map(file => `
                    <!-- Thumbnail Display -->
                    ${file.fileType.startsWith("image/") ? `
                        <!-- Thumbnail Image -->
                        <img class="img-fluid m-1" src="${file.file}" style="border-radius:  ${borderRadiusFalse()};" loading="lazy" alt="Image" onclick="openImage('${file.file}')">
                        
                        <!-- Modal for Enlarged Image -->
                        <div id="imageModal" class="imageModal">
                            <span class="close" onclick="closeModal()">&times;</span>
                            <img id="modalImage" class="imageModal-content" src="${file.file}" alt="Enlarged Image">
                            <div class="imageModal-caption">
                                <a id="downloadLink" href="${file.file}" download="${file.fileName || 'image.jpg'}" class="download-btn">Download</a>
                            </div>
                        </div>
                    ` : file.fileType === "application/pdf" ? `
                        <!-- PDF Display -->
                    <div class="file-actions" >
                            <iframe class=" m-1 pdf-frame" src="${file.file}" frameborder="0" loading="lazy"></iframe>
                            <div class="overlay" onClick="triggerDownload('${file.file}','${file.fileName}')"></div>
                        </div>
                    ` : file.fileType.startsWith("video/") ? `
                        <!-- Video Display -->
                        <video class=" m-1 video-preview" controls>
                            <source src="${file.file}" type="${file.fileType}">
                            Your browser does not support the video tag.
                        </video>
                        <div class="file-actions">
                            <a id="downloadLink" href="${file.file}" download="${file.fileName || 'video.mp4'}" class="download-btn">Download Video</a>
                        </div>
                    ` : `
                        <!-- Generic File Display -->
                        <div class="m-1 file-info">
                            <p>File: ${file.fileName || 'Unknown File'}</p>
                        </div>
                        <div class="file-actions">
                            <a id="downloadLink" href="${file.file}" download="${file.fileName || 'file'}" class="download-btn">Download File</a>
                        </div>
                    `}
                `).join('') : ""}
                
                            <div style="display: flex ;justify-content: space-between;}" >

                    <div class="dataMessage " message-id="Message-${messageId}" dir="auto">
                    
                        ${(data.message)}
                    </div>
                        <div class=" ml-2 mr-0" style="margin-right=0% !important; justify-content: flex-end;display: flex;align-items: flex-end;font-size: calc(var(--user-font-size) - 0.1rem);;">
                            
                        <div class="backdrop-blur" style="display: flex;flex-direction: row;align-items: center;">
                            <span class="px-1" style="white-space: nowrap;">${new Intl.DateTimeFormat("en-US", {
                                hour: "numeric",
                                minute: "numeric",
                                hour12: false, // This ensures 24-hour format

                            }).format(messageDate || new Date())}
                            </span>
                        ${ownMessage
                                ? `
                                <button 
                                    class="read-toggle" 
                                    read-data-id="${data.id}" 
                                    title="Seen member info" 
                                    onclick="openReadedMessage('${data.id}')" 
                                    style="cursor:pointer;text-align:right;color:var(--user-fg-color);border:none;background:none;">
                                    <strong>${readInfoHTML ? `<i class="bi bi-check2-all"></i>` : `<i class="bi bi-check2"></i>`}</strong>
                                </button>
                                                `
                        : ''}
                    </div>
                </div>
            </div>
            </div>
            </div>
            <div class="messageRead" data-id="Message-${messageId}"  >
                <div  style="${divStyle}"  class=" footerMessage" >
                    <div class="${reactionMember!=''?'my-3':''}" reactionMessage = "${messageId}">
                    ${reactionMember}
                    </div>
                </div>
            </div>
            
    `;
    let firstMessage = `
    <div data-id="Message-${messageId}" class="firstMessage">
            <button class="btn btn-outline-secondary my-3 " style="border-radius:50%; border: 2px solid;"  onclick="loadfirstButton()"><strong><i class="bi bi-arrow-up"></i></strong></button>

    </div>
    `;
    let lastMessage = `
        <div data-id="Message-${messageId}" class="lastMessage"></div>
    `;



  
    if (prepend) {
        MessagePack[0].insertAdjacentHTML("afterbegin", contentToAdd);
        if (dateToAdd) MessagePack[0].insertAdjacentHTML("afterbegin", dateToAdd);
        if (unreadToAdd) MessagePack[0].insertAdjacentHTML("afterbegin", unreadToAdd);
        if (isNewSender ) {
            const lastMessageElm = MessagePack[0].querySelector(`#Message-${messagesCreated[messagesCreated.length -1].split("-")[1]}`);
            // const lastMessageElm2 = MessagePack[0].querySelector(`#Message-${messagesCreated[messagesCreated.length -2].split("-")[1]}`);
            if (lastMessageElm) {
                const div = lastMessageElm.querySelector(`.mess`);
                // lastMessageElm2.style.borderRadius= ownMessage ? `var(--user-border-radius) 5px 5px var(--user-border-radius)`: `5px var(--user-border-radius) var(--user-border-radius) 5px`;
                div.style.borderRadius = (styleClass); // Ensure only last message retains the box class
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
    // Reset file input and image
    $("file-input").val("");
    image = "";
    searchMessageReply()
    // Run the function to apply the functionality

}

// Function to check and apply "more..." for all messages
function applyShowMore() {
    const messages = document.querySelectorAll('.dataMessage');

    messages.forEach((message) => {
        // const showMoreButton = message.querySelector('.show-more');
        const messageId= message.getAttribute('message-id');
        // Calculate the height of one line of text
        const lineHeight = parseFloat(getComputedStyle(message).lineHeight);
        const maxVisibleHeight = lineHeight * 5; // Maximum height for 5 lines

        // Check if the text exceeds 5 lines
        // console.log('id :',message.getAttribute('message-id')," height :" , message.scrollHeight)
        if (message.scrollHeight > maxVisibleHeight) {
            message.style.maxHeight = `${maxVisibleHeight}px`; // Limit to 5 lines
            // showMoreButton.style.display = 'inline';
            message.insertAdjacentHTML('afterend',`<span class="backdrop-blur p-1 show-more"  style="display: inline;" onclick="showMore('${messageId}')" message-id="${messageId}">more...</span>`)
        }

        // // Add event listener for the "more..." button
        // showMoreButton.addEventListener('click', () => {
        //     message.style.maxHeight = 'none'; // Expand to show full text
        //     showMoreButton.style.display = 'none';
        // });
    });
}
function showMore(messageId) {
    // Get the specific message element by its ID
    const messageElm = output.querySelector(`#${messageId}`);
    const message = output.querySelector(`.dataMessage[message-id="${messageId}"]`);

    if (message) {
        // Expand the message by removing the height and text-overflow restrictions
        message.style.whiteSpace = 'normal';
        // message.style.overflow = 'visible';
        message.style.textOverflow = 'clip';
        message.style.maxHeight = 'none';

        // Hide the "more..." button
        const showMoreButton = messageElm.querySelector(`span[message-id="${messageId}"]`);
        if (showMoreButton) {
            showMoreButton.style.display = 'none';
        }
    } else {
        console.warn(`Message with ID "${messageId}" not found.`);
    }
}

function triggerDownload(src,fileName) {
    // Extract the filename from the URL (you can adjust this if the file name is provided directly)

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
    
    var stickerPicker = chat_window.querySelector(`#emoji-${messageId}`);
    stickerPicker.style.left = `${pageX}px`; // Position menu at cursor's X position
    stickerPicker.style.top = `${pageY}px`;  // Position menu at cursor's Y position
    if (stickerPicker.classList.contains("show")) {
        stickerPicker.classList.remove("show");
        stickerPicker.classList.add("hide");
    } else {
        stickerPicker.classList.remove("hide");
        stickerPicker.style.display = "block";
        
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
                // console.log(userRect)
                userRect.remove()

            }
            // Debug: After updating
            // console.log(`After update: ${userRect.innerHTML}`);
        } else {
            // console.log(`No existing reaction found for username: ${username}. Creating a new one.`);
            // userRect.innerHTML = `<span class='${username == currentUser.username ? `ownReaction `:``} reactionMemEmoji mx-1' user-id="${username}">${reaction}</span>`;

            // Create a new reaction element
          memberReaction.innerHTML += `<span class='${username == currentUser.username ? `ownReaction `:``} reactionMemEmoji m-1' ${username == currentUser.username ? `onClick="addStickerReaction('',${spiltedId})"`:''} user-id="${username}">${reaction}</span>`
    
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
        toggleBtn.innerHTML=`<i class="bi bi-check2-all"></i>`
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
    messageMenu()
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


$(document).ready(function () {
    let lastScrollTop = 0; // Keeps track of the last scroll position
    let isScrolling = false; // Tracks if the chat window is currently scrolling
    let scrollTimeout; // Timer to ensure scrolling is complete

    // Attach scroll event listener to the chat window
    $(chat_window).on("scroll", function () {
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

    // Function to smoothly scroll to the bottom
    function scrollToBottom() {
        var chatHeight = $(chat_window)[0].scrollHeight;
        $(chat_window).animate({ scrollTop: chatHeight }, "slow");
    }
});

function scrollLoader(){
    const visibleMessages = [];
    const messages = document.querySelectorAll(".messageRead"); // Class of each message div
    const firstMessage = document.querySelectorAll(".firstMessage")[0]; // Class of each message div
    const lastMessage = document.querySelectorAll(".lastMessage")[0]; // Class of each message div
    const Dates = document.querySelectorAll(".Date"); // Class of each date div
    const rectheadTag = headTag.getBoundingClientRect(); // Get the head tag's position
    const roomID = document.getElementById('roomIDVal').value;
    // if(!scrolling) console.log('scrolling locked')

if(scrolling){
    // console.log('scrolling unlocked')
    // if (chat_window.scrollHeight > chat_window.clientHeight) {
    //     $("#down").fadeIn(); // Show scroll-up button
    // }else{
        
    //     $("#down").fadeOut(); // Show scroll-up button
    //     // $("#down").show(); // Optionally show the scroll-down button
    // };
   
    // Iterate through Dates to check if they are in view
    
    if(firstMessage){

        if( firstMessage.getAttribute('data-id')){
            let firstMessageId = firstMessage.getAttribute('data-id');
            firstMessageId = roomID +"-"+ firstMessageId.split('-')[1]
            const threshold = 50; // Proximity in pixels to the top of the viewport

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
                        if(document.getElementById('loading').classList.contains('hide')){
                            document.getElementById('loading').classList.remove("hide");
                            document.getElementById('loading').classList.add("show");
                            disableScrolling()
                        } 
                        socket.emit("requestOlderMessages", { roomID: roomID, counter: firstMessageId });
                    }
                }
            
            }
        }  
    }

    if(lastMessage){
        if( lastMessage.getAttribute('data-id')){
            let lastMessageId = lastMessage.getAttribute('data-id');
            lastMessageId = roomID +"-"+ lastMessageId.split('-')[1]
            // console.log("before scroll:", lastMessageId)
            const threshold = 50; // Proximity in pixels to the top of the viewport
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
                        if(document.getElementById('loading').classList.contains('hide')){
                            document.getElementById('loading').classList.remove("hide");
                            document.getElementById('loading').classList.add("show");
                            disableScrolling()
                        } 
                        socket.emit("requestOlderMessages", { roomID: roomID, counter: lastMessageId, type: 'last' });
                    }
                }
            
            }
        }
    }
}
}
function loadfirstButton(){
    const firstMessage = document.querySelectorAll(".firstMessage")[0]; // Class of each message div

    const roomID = document.getElementById('roomIDVal').value;

    let firstMessageId = firstMessage.getAttribute('data-id');
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
                if(document.getElementById('loading').classList.contains('hide')){
                    document.getElementById('loading').classList.remove("hide");
                    document.getElementById('loading').classList.add("show");
                    disableScrolling()
                } 
                socket.emit("requestOlderMessages", { roomID: roomID, counter: firstMessageId });
            }
        }
}

chat_window.addEventListener("scroll", () => {
    
    const visibleMessages = [];
    const messages = document.querySelectorAll(".messageRead"); // Class of each message div
    const firstMessage = document.querySelectorAll(".firstMessage")[0]; // Class of each message div
    const lastMessage = document.querySelectorAll(".lastMessage")[0]; // Class of each message div
    const Dates = document.querySelectorAll(".Date"); // Class of each date div
    const rectheadTag = headTag.getBoundingClientRect(); // Get the head tag's position
    const roomID = document.getElementById('roomIDVal').value;
    // if(!scrolling) console.log('scrolling locked')
        $("#down").fadeIn();

        Dates.forEach((dateElem) => {
            const rectDate = dateElem.getBoundingClientRect();
    
            // If the bottom of the date element is at or above the top of the head tag
            if (rectDate.bottom <= rectheadTag.top) {
                // console.log(dateElem.innerHTML); // Log the date when it reaches the top
                headTag.innerHTML = dateElem.innerHTML; // Set the head tag's content to the current date element
            }
        });
    // Iterate through messages to find visible ones (if needed)
    messages.forEach((message) => {
        const rect = message.getBoundingClientRect();
        let messageId = message.getAttribute('data-id');
        messageId = roomID +"-"+ messageId.split('-')[1]
        // Check if the message is in the viewport (visible)
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            if (messageId && !visibleMessages.includes(messageId)) {
                visibleMessages.push(messageId);  // Add the data-id of visible messages
                // console.log(messageId)
            }
        }
    });

    // Emit the IDs of visible messages to the server
    if (visibleMessages.length > 0) {
        socket.emit("markMessagesRead", { messageIds: visibleMessages, username: currentUser.username });
    }
      
});
// _______________reply____________________
function replyMessage(messageId) {
    // Select the message element
    const messageElement = document.querySelector(`#Message-${messageId}`);
    
    // Extract sender and message content
    const sender = messageElement.getAttribute(`sender`);
    const messageContent = escapeHtml(messageElement.querySelector('.dataMessage').innerHTML);

    // Construct the reply box content
    const replyBox = document.getElementById('replyBox');
    replyBox.innerHTML = `
        <h5 style="font-style: italic; font-size: 0.6rem;"><i class="bi bi-reply"></i> Reply message to ${sender} : </h5>

        <div class="mx-2 replyMessage p-2 peer-color-0"style='display: flex;flex-direction: row; margin-right: 3em !important ;   justify-content: space-between;' replyid="Message-${messageId}">
            <p dir="auto" id="messageReplied" style="flex: 1;text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                ${(messageContent)}
            </p>
            </div>
            <button onclick="clearReply()" class="btn replyClose btn-sm btn-danger"><i class="bi bi-x-square"></i></button>
        <hr>

    `;
    replyBox.setAttribute('reply-id', messageId);
    // Apply styling for blur background
    replyBox.style.display = 'flex';
    replyBox.style.alignItems = 'center';
    replyBox.style.justifyContent = 'space-between';
    replyBox.style.padding = '10px';
    replyBox.style.borderRadius = '8px';
    // replyBox.style.background = 'rgba(0, 0, 0, 0.1)';
    // replyBox.style.backdropFilter = 'blur(5px)';
    toggleReplyBox(true);
    searchMessageReply()

}


function clearReply() {
    const replyBox = document.getElementById("replyBox");
    replyBox.removeAttribute('reply-id');

    toggleReplyBox(false)
    setTimeout(() => {
        replyBox.innerHTML = ""; // Clear innerHTML after 300ms (adjust the time as needed)
    }, 300);  // This delay should match your CSS transition time    
    // replyBox.style.display = 'none';

    delete replyBox.dataset.replyId; // Remove the reply id
}
function toggleReplyBox(isVisible) {
    const replyBox = document.getElementById('replyBox');
    
    if (isVisible) {
        replyBox.classList.remove('hide');
        replyBox.classList.add('show');
    } else {
        replyBox.classList.remove('show');
        replyBox.classList.add('hide');
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

// =========================================================================
// message menu
function messageMenu() {
    const elements = output.querySelectorAll(".messageElm");
    const menu = document.getElementById("messageMenu");
    const header = menu.querySelector('.messageMenuHeader')
    const body = menu.querySelector('.messageMenubody')
    let longPressTimeout;
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    
    elements.forEach(element => {
        // Add click and right-click event listeners
        element.addEventListener("click", (event) => {
            openMenu(event, menu, element); // Pass the clicked element's ID
        });
    
        element.addEventListener('touchstart', (e) => {
            // Start long-press detection
            isDragging = true;

            longPressTimeout = setTimeout(() => {
                const touch = e.touches[0];
                element.classList.add('long-press-effect'); // Add animation class
                                isDragging = true;

                openMenu(touch, menu, element); // Open menu
            }, 500); // Long press duration (500ms)
        });
    
        element.addEventListener('touchend', (event) => {
            clearTimeout(longPressTimeout); // Cancel long-press timer
            element.classList.remove('long-press-effect'); // Remove animation class
    
            // Hide menu if touch ends outside it
            // if (!menu.contains(event.target)) {
            //     menu.style.display = "none";
            // }

            isDragging = false;
            const deltaX = currentX - startX;
            // console.log(deltaX,", slm ; ",element.id.split('-')[1])
            if (-deltaX >= 30) { // Trigger reply if swipe is far enough
                replyMessage(element.id.split('-')[1])
                
            }
            if(element.querySelector('#replyIcon')){
                element.querySelector('#replyIcon').remove()
            }
            element.style.transform = '';
        });
    
        element.addEventListener('touchmove', (event) => {
            clearTimeout(longPressTimeout); // Cancel long-press timer
            element.classList.remove('long-press-effect'); // Remove animation class
    
            // Hide menu if user swipes away from the target
            if (!menu.contains(event.target)) {
                menu.style.display = "none";
            }
            if (!isDragging) return;
            currentX = event.touches[0].clientX;
            const deltaX = currentX - startX;
            
            if (-deltaX > 0 && -deltaX <= 70) { // Only handle right swipe
                if(!element.querySelector('#replyIcon')){
                element.insertAdjacentHTML("beforeend",`<div id="replyIcon"><i style="font-size: xx-large;" class="bi bi-reply"></i></div>`)
                }

                element.style.transform = `translateX(${deltaX}px)`;
            }
        });
    
        element.addEventListener("contextmenu", (event) => {
            event.preventDefault(); // Prevent default right-click context menu
            openMenu(event, menu, element); // Open custom menu
        });
    });
    

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
        menu.insertAdjacentHTML("afterend",emoji(messageId))
        let emojiDiv = `
        
        <button id="reactBtn-${messageId}" class="btn reactBtn visible col-md-12" onclick="toggleStickerPicker(${messageId},${event.pageX} , ${event.pageY })">
        <img src="../svg/emojiAdd.svg" alt="emoji add" width="20" height="20" />
        Add reaction
        </button>
        `
        body.innerHTML=`
         <button dir="auto" id="reply-${messageId}" class="btn visible col-md-12" >
            <i class="bi bi-reply"></i>
            Reply message
        </button>
         <button dir="auto" id="copyMessage-${messageId}" class="btn visible col-md-12" >
            <i class="bi bi-copy"></i>
            Copy message
        </button>
        `
        body.innerHTML+=emojiDiv
        document.getElementById(`reply-${messageId}`).addEventListener("click",()=>{
            // Copy the innerHTML to the clipboard
            replyMessage(messageId);
        })
        document.getElementById(`copyMessage-${messageId}`).addEventListener("click",()=>{
            // Copy the innerHTML to the clipboard
            console.log(element.querySelector('.dataMessage').innerHTML)
            copyToClipboard(element.querySelector('.dataMessage').innerHTML);

            // Optional: Provide user feedback (e.g., show a success message)
            alerting("Message copied to clipboard!");
        })
        menu.addEventListener("click",()=>{
            menu.style.display = "none";
        })
        menu.style.display = "block";
        menu.style.left = `${event.pageX}px`; // Position menu at cursor's X position
        menu.style.top = `${event.pageY}px`;  // Position menu at cursor's Y position
        // console.log("Clicked element ID:", element.id); // Log the clicked element's ID
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
    // Create a temporary textarea element to copy the HTML content
    const textarea = document.createElement('textarea');
    
    // Set the value of the textarea to the HTML content you want to copy
    textarea.value = text;

    // Append the textarea to the body (it's required for copy command to work)
    document.body.appendChild(textarea);

    // Select the content in the textarea
    textarea.select();

    // Execute the copy command to copy the selected content
    try {
        // Use the Clipboard API to copy the content to clipboard
        document.execCommand('copy');
    } catch (err) {
        console.error('Error copying text: ', err);
    }

    // Remove the temporary textarea element from the DOM
    document.body.removeChild(textarea);
}

function escapeHtml(input) {
    // Temporarily replace <br> tags with a placeholder
    input = input.replace(/<br>/g, "__BR__");

    // Escape the rest of the HTML characters
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
    var replyMessages = document.querySelectorAll('.replyMessage'); // Select all reply messages
    replyMessages.forEach(reply => {
        reply.addEventListener('click', () => {
            const replyID = reply.getAttribute('replyID'); // Get the replyID attribute
            if (replyID) {
                scrollToMessage(replyID); // Call the scrollToMessage function
                reply.classList.add('long-press-effect')
                reply.classList.remove('long-press-effect')
            } else {
                console.error('No replyID found for this reply');
            }
        });
    });
}


// ========================================================
// notification content

function playNotificationSound() {
        const sound = document.getElementById("notification-sound");
        sound.currentTime = 0; // Reset to the beginning in case it's already playing
        sound.play().catch((error) => {
            console.error("Failed to play notification sound:", error);
        });
   
}

// Function to show browser notification
function showBrowserNotification(sender,messageContent) {
    if (document.hidden) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                const notification = new Notification(`New Message from ${sender} :`, {
                    body: messageContent,
                    icon: "/svg/logo.svg"  // Optional: Set a notification icon
                });
            }
        });
        playNotificationSound()
    }else{
        console.log(Notification.permission)
    }
}