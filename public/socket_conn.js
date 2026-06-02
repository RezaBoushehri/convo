// Fixed client code
$('#pvChatBtn').attr('disabled', 'true');
const href = "/";
const ioUrl = "https://mc.farahoosh.ir/";

const currentUser = {
    _id: $('#_id').text().trim(),
    username: $('#username').text().trim()
};
// $('#_id').remove()
// Initialize Socket.IO with better configuration
const socket = io(ioUrl, {
    transports: ['websocket', 'polling'], // WebSocket first for better performance
    path: '/metachat/socket.io',
    secure: true,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true
});

console.log("Initializing Socket.IO connection...");

// Connection event handlers
socket.on("connect", () => {
    console.log("Connected to metaChat via Socket.IO 🎯");
    console.log("Socket ID:", socket.id);
    // $('#output').empty();
    
    // Emit userLoggedIn event with current user data
    socket.emit("userLoggedIn", {
        username: currentUser.username,
        socketId: socket.id,
        timestamp: new Date().toISOString()
    });
});

// Handle connection errors
socket.on("connect_error", (error) => {
    console.error("Connection error:", error.message);
    console.log("Attempting to reconnect...");
});

socket.on("disconnect", (reason) => {
    console.log("Disconnected from server:", reason);
    if (reason === "io server disconnect") {
        // Reconnect manually if server disconnected
        socket.connect();
    }
});

socket.on("reconnect", (attemptNumber) => {
    console.log("Reconnected successfully after", attemptNumber, "attempts");
    // Re-emit user info after reconnection
    socket.emit("userLoggedIn", {
        username: currentUser.username,
        socketId: socket.id,
        reconnected: true
    });
});

socket.on("reconnect_attempt", (attemptNumber) => {
    console.log("Reconnection attempt:", attemptNumber);
});

socket.on("reconnect_error", (error) => {
    console.error("Reconnection error:", error);
});

socket.on("reconnect_failed", () => {
    console.error("Reconnection failed");
    // Handle failed reconnection (e.g., show user notification)
});