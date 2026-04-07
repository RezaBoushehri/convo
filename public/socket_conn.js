let socket;

  $('#pvChatBtn').attr('disabled', 'true')
  const href = "/";
  const ioUrl = "/";

// تابع برای رمزگذاری
function encryptMessage(message) {
    const iv = CryptoJS.lib.WordArray.random(16); // تولید IV تصادفی
    const encrypted = CryptoJS.AES.encrypt(message, secretKey, { iv: iv });
    return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.ciphertext.toString(CryptoJS.enc.Hex); // ترکیب IV و متن رمزنگاری‌شده
}

// تابع برای رمزگشایی
function decryptMessage(encryptedMessage) {
    const [ivHex, encryptedHex] = encryptedMessage.split(':');
    if(typeof ivHex =='undefined'|| typeof encryptedHex =='undefined') return encryptedMessage
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const ciphertext = CryptoJS.enc.Hex.parse(encryptedHex);
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, secretKey, { iv: iv });
    return decrypted.toString(CryptoJS.enc.Utf8);
}
const secretKey = CryptoJS.enc.Hex.parse('a247be870c3def81c99684460c558f29a7b51d0d895df10011b5277fa8612771');

const currentUser = {
        username: $('#username').text().trim()
    }
  socket = io.connect(ioUrl, {
    transports: ['polling', 'websocket'], // Allows both WebSocket and Polling
    secure: false, // Ensures that the connection uses HTTPS
    withCredentials: true, // Ensure cookies are not sent with requests (set to true if needed)
    rejectUnauthorized: true, // Bypass SSL verification for self-signed certificates (use with caution)
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
  })
  // Initialize Socket.IO connection
  console.log("Initializing Socket.IO connection...");

  socket.on("connect", () => {
    console.log("Connected to metaChat via Socket.IO 🎯");

    // Emit userLoggedIn event with current user data
    // 💬 ارسال اطلاعات کاربر
    socket.emit("userLoggedIn", {
      username: currentUser.username
    });

    
  })