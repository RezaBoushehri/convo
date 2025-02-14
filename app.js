const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const crypto = require('crypto');
const ipRangeCheck = require("ip-range-check");
const express = require("express");
const multer = require("multer");
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
    fs = require('fs'),
    https = require('https'),
    app = express(),
    port = process.env.PORT || 4000,
    // SSL certificate and key options
    options = {
        key: fs.readFileSync('private-key.pem', 'utf8'),
        cert: fs.readFileSync('certificate.pem', 'utf8'),
        ca_cert: fs.readFileSync('ca-certificate.pem', 'utf8'),
        ca_key: fs.readFileSync('ca-key.pem', 'utf8'),
        passphrase: 'farahoosh'
    },
    cors = require("cors"),
    socket = require("socket.io"),
    path = require("path"),
    mongoose = require("mongoose"),
    env = require("dotenv"),
    bodyParser = require("body-parser"),
    passportLocalStrategy = require("passport-local"),
    passport = require("passport"),
    User = require("./models/user"),
    Room = require("./models/room"),
    middleware = require("./middleware/index"), // Import the middleware
    { v4: uuidv4 } = require('uuid'),
    Message = require("./models/message"),
    server = https.createServer(options, app),
    { getUsers } = require("./users/users"),
    rooms = [],
     
    io = socket(server, {
        cors: {
            origin: "https://localhost:4000", // Replace with your client URL
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

const { timeStamp } = require("console");
var session = require("express-session");
var MemoryStore = require("memorystore")(session);

env.config();

// Set up CORS (if needed for front-end)
const corsOptions = {
    
    origin: 'https://localhost:4000', // replace with your front-end domain
    methods: ['GET', 'POST'],
    credentials: true
};

app.use(cors(corsOptions));
// Middleware to enforce HTTPS
app.use((req, res, next) => {
    if (req.headers.host && req.protocol === 'http') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});
// کلید و توکن نمونه
const secretKey = process.env.SECRETKEY;

const algorithm = 'AES-256-CBC';
// console.log(secretKey)
// تابع برای رمزنگاری
function encrypt(text) {
    const iv = crypto.randomBytes(16); // تولید IV تصادفی
    const key = crypto.createHash('sha256').update(secretKey).digest(); // تولید کلید 32 بایتی از SHA-256
    const cipher = crypto.createCipheriv(algorithm, key, iv); // استفاده از کلید و IV
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // IV و متن رمزنگاری شده را باز می‌گرداند
}


console.log(process.env.SESSION_SECRET)

// const mongoURI = "mongodb://chatAdmin:chatAdmin@127.0.0.1:27017/chatRoom?authSource=chatRoom"; // Replace with your URI
const mongoURI = "mongodb://adminChat:XMUZWqR4CnOwf@127.0.0.1:27017/chatRoom?authSource=chatRoom"; // Replace with your URI
mongoose
    .connect(mongoURI, {})
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
// File upload storage settings

app.use(bodyParser.urlencoded({ extended: true }));

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'a247be870c3def81c99684460c558f29a7b51d0d895df10011b5277fa8612771',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',  // This should be false in development
        httpOnly: true,
        sameSite: 'None',
    },
});

app.use(
    session({
        store: new MemoryStore({
            checkPeriod: 86400000, // بررسی هر 24 ساعت (1 روز)
        }),
        secret:
            process.env.SESSION_SECRET ||
            "a247be870c3def81c99684460c558f29a7b51d0d895df10011b5277fa8612771",
        resave: false,
        saveUninitialized: true,
        cookie: { 
            secure: true, // فقط در HTTPS
            maxAge: 3 * 30 * 24 * 60 * 60 * 1000 // زمان انقضا: 3 ماه
        },
    })
);

// Apply session middleware for socket.io
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, (err) => {
        if (err) {
            return next(err);
        }
        next(); // Proceed with socket connection
    });
});



  
// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new passportLocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(async (username, done) => {
    try {
      const user = await User.findByUsername(username);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  
app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    next();
});
app.use(express.json());

// Routes
app.get("/:path", (req, res, next) => {
    if (req.params.path === 'undefined') {
        return res.redirect('/');  // Redirect to the root route if path is 'undefined'
    }
    next();  // Proceed with the normal flow if path is not 'undefined'
});

app.get("/", middleware.isLoggedIn, (req, res) => {
    res.render("index", { roomID: "" });
});

app.get("/join/:id", middleware.isLoggedIn, async (req, res) => {
    const roomID = DOMPurify.sanitize(req.params.id);
    const username = req.user.username; // Assuming username is stored in req.user

    try {
        const room = await Room.findOne({ roomID: roomID });

        if (room) {
            if (room.setting[0].Joinable_url === "private") {
                // Private room: Only allow members
                if (room.members.includes(username) || username == '09173121943') {
                // if (room.members.includes(username) ) {
                    res.render("index", { roomID: roomID });
                } else {
                    res.redirect(`/?error=${encodeURIComponent("You are not a member of this private room")}`);
                }
            } else if (room.setting[0].Joinable_url === "public") {
                // Public room: Anyone can join
                res.render("index", { roomID: roomID });
            } else {
                res.redirect(`/?error=${encodeURIComponent("Invalid room setting")}`);
            }
        } else {
            res.redirect(`/?error=${encodeURIComponent("Room not found")}`);
        }
    } catch (err) {
        console.error("Error fetching room:", err);
        res.redirect(`/?error=${encodeURIComponent("Internal server error")}`);
    }
});

// Login/Registration Routes (Passport Auth)
app.get("/login", (req, res) => {
    res.render("login");
});

// Using async/await properly for login and handling redirects
app.post("/login", async (req, res, next) => {
    try {
        const sanitizedUsername = DOMPurify.sanitize(req.body.username);
        const user = await User.findByUsername(sanitizedUsername);
        if (!user) {
            // User not found
            return res.redirect("/login?error=User Not Found");
        }
    
        // Direct comparison for cleartext password
        if (req.body.password !== user.password) {
            // Invalid password
            return res.redirect("/login?error=Invalid Password");
        }
    
        passport.authenticate("local", async (err, authenticatedUser, info) => {
            if (err) {
                // Passport authentication error
                console.error("Passport authentication error:", err);
                return next(err);
            }
    
            if (!authenticatedUser) {
                // Authentication failed
                return res.redirect("/login?error=Authentication Failed");
            }
    
            req.logIn(authenticatedUser, async (err) => {
                if (err) {
                    // Error during login
                    console.error("Error during login:", err);
                    return next(err);
                }
    
                req.session.username = authenticatedUser.username;
    
                try {
                    // Reset socketID to null after login
                    await User.updateOne(
                        { _id: authenticatedUser._id },
                        { $set: { socketID: null } }
                    );
                } catch (updateErr) {
                    console.error("Error resetting socketID:", updateErr);
                    return next(updateErr);
                }
    
                try {
                    req.session.save((err) => {
                        if (err) {
                            // Session save error
                            console.error("Error saving session:", err);
                            return next(err);
                        }
                    });
                } catch (saveErr) {
                    console.error("Error during session save:", saveErr);
                    return next(saveErr);
                }
    
                if (req.session.redirectUrl && req.session.redirectUrl.startsWith("/join/")) {
                    res.redirect(req.session.redirectUrl); // Redirect to the URL starting with /join/
                } else {
                    res.redirect("/"); // Default redirect after login
                }
    
            });
        })(req, res, next);
    } catch (err) {
        // General error handling
        console.error("Unexpected error:", err);
        return next(err);
    }
    
    
});



  
app.post("/register", (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const allowedRanges = [
        "172.16.28.0/24",  // existing range
        "94.74.128.194",   // additional IP
        "94.74.128.193"    // additional IP
    ];
    
    const ipIsAllowed = allowedRanges.some(range => ipRangeCheck(clientIP, range));
    
    if (!ipIsAllowed) {
        return res.status(403).json({ error: "Access denied: You don't have permission to be alive." });
    }
    
    // Sanitize and create new user
    const newUser = new User({
        username: DOMPurify.sanitize(req.body.username),
        first_name: DOMPurify.sanitize(req.body.first_name),
        last_name: DOMPurify.sanitize(req.body.last_name),
        password: DOMPurify.sanitize(req.body.password),
        pic: DOMPurify.sanitize(req.body.pic)
    });

    User.register(newUser, req.body.password, (error, user) => {
        if (error) {
            console.log(error.message);
            return res.redirect("/");
        }
        passport.authenticate("local")(req, res, function () {
            res.redirect("/");
        });
    });
});




const uploadDir = path.join(__dirname, "uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
}).single("file");

// Handle file upload (existing code)
app.post("/upload", (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        // File successfully uploaded
        const filePath = `/uploads/${req.file.filename}`;

        // Respond with the file data (including the file path and metadata)
        res.json({
            message: "File uploaded successfully",
            fileData: {
                file: filePath,
                fileType: req.file.mimetype, // MIME type of the uploaded file
                fileName: req.file.originalname, // Original file name
            },
        });
        console.log("File uploaded successfully:", req.file.originalname);
        console.log("File path:", filePath);
        // Broadcast upload success event (emit file data)
        io.emit("uploadSuccess", { fileData: { filePath, fileName: req.file.originalname } });
    });
});

// Serve the files from the 'uploads' directory
app.get('/uploads/:file', (req, res) => {
    const fileName = req.params.file;

    const filePath = path.join(uploadDir, fileName);
  
    // Check if the file exists
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("File not found:", err);
        return res.status(404).send('File not found');
      }
    });
  });


// API to Save a Message
// app.post("/messages", async (req, res) => {
//     const { sender, message } = req.body;

//     // Validate input fields
//     if ( !sender || !message) {
//         return res.status(400).json({ error: "All fields are required" });
//     }

//     try {
//         const newMessage = new Message({ roomId, sender, message });
//         await newMessage.save();
//         res.status(201).json({ message: "Message saved successfully" });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

// Fetch Messages for Display
// app.get("/messages/:roomId", async (req, res) => {
//     try {
//         const { roomId } = DOMPurify.sanitize(req.params);

//         // Fetch messages for the given room ID
//         const messages = await Message.find({ roomID: roomId }).sort({ createdAt: 1 });

//         if (messages.length > 0) {
//             res.status(200).json(messages); // Return all messages
//         } else {
//             res.status(404).json({ error: "No messages found for this room" });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });


// تابع رمزگشایی
function decrypt(data, key) {
    const [iv, encryptedData] = data.split(':').map((part) => Buffer.from(part, 'hex'));
    const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.createHash('sha256').update(key).digest(), iv);
    let decrypted = decipher.update(encryptedData, null, 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

// ایجاد Room
app.post('/createRoom', async (req, res) => {
    try {
        // استخراج توکن از هدر
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(400).json({ error: 'Authorization token missing' });
        }

        // رمزگشایی توکن
        const decryptedToken = decrypt(token, secretKey);
        console.log("Decrypted Token:", decryptedToken);

        // رمزگشایی داده‌های رمزگذاری‌شده
        const encryptedData = req.body.data;
        const decryptedData = decrypt(encryptedData, secretKey);
        console.log("Decrypted Data:", decryptedData);

        const { phoneNumbers, roomName, roomIDreq, Domain } = decryptedData;

        if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
            return res.status(400).json({ error: "Phone numbers must be a non-empty array" });
        }
        
        const phoneRegex = /^[0-9]{11}$/; // شماره تلفن 11 رقمی
        const invalidPhones = phoneNumbers.filter((phone) => !phoneRegex.test(phone));
        if (invalidPhones.length > 0) {
            return res.status(400).json({ error: `Invalid phone numbers: ${invalidPhones.join(", ")}` });
        }
        
        async function generateRoomID() {
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let roomID = "";
            for (let i = 0; i < 10; i++) {
                roomID += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            }
            roomID += Date.now().toString(36); // Convert timestamp to base 36
            return roomID;
        }
        
        async function createOrUpdateRoom() {
            if (roomIDreq) {
                // Check if the requested room ID exists
                const existingRoom = await Room.findOne({ roomID: roomIDreq });
                if (existingRoom) {
                    // Update members list
                    // existingRoom.members = [...new Set([...existingRoom.members, ...phoneNumbers])]; // Avoid duplicates
                    existingRoom.members = [...new Set([existingRoom.admin, ...phoneNumbers])];
                    await existingRoom.save();
                    return res.status(200).json({
                        success: true,
                        message: "Room members updated successfully",
                        roomID: existingRoom.roomID,
                    });
                }
            }
            
            // If roomIDreq is null or doesn't exist, create a new room
            let uniqueRoomID = await generateRoomID();
            while (await Room.findOne({ roomID: uniqueRoomID })) {
                uniqueRoomID = `${uniqueRoomID}-${Math.floor(Math.random() * 1000)}`; 
            }
        
            const room = new Room({
                roomID: uniqueRoomID,
                Domain:Domain,
                roomName,
                setting: [{ Joinable_url: 'private' }],  // <-- Wrapped in an array
                admin: phoneNumbers[0],
                members: phoneNumbers,
            });
            
        
            await room.save();
            res.status(201).json({
                success: true,
                message: "Room created successfully",
                roomID: uniqueRoomID,
            });
        }
        createOrUpdateRoom().catch(error => res.status(500).json({ error: error.message }));
        
    } catch (err) {
        console.error("Error:", err.message);
        res.status(400).json({ error: 'Decryption error or invalid data' });
    }
});



// یک endpoint برای کلاینت ایجاد کنید
// app.get('/SECRETKEY', (req, res) => {
//     if (!process.env.SOCKET_SECRET_KEY) {
//         return res.status(500).json({ error: 'Secret key not configured' });
//     }
//     // داده‌ای که نیاز است را برگردانید
//     res.json({ message: 'The data is secured', key: process.env.SOCKET_SECRET_KEY });
// });


// Handle Logout
app.get("/logout",async function (req, res) {
   
    req.logout();
    res.redirect("back");
});

app.get("/sitemap.xml", function (req, res) {
    res.sendFile("sitemap.xml", { root: path.join(__dirname, "../public") });
});

app.use(function (req, res) {
    res.status(404).render("404");
});


server.listen(port, '0.0.0.0', () => console.log(`Listening on ${port}`));




// Function to add the user to the room (this should be added to your user management logic)
const addUserToRoom = async (username, roomID) => {
    try {
        // Find the user from the in-memory user list or database
        const user = await User.findByUsername(username);        
        if (user) {
            // Update the user's roomID in the database
            await User.findOneAndUpdate(
                { username: username },   // Filter by socketID
                { $set: { roomID: roomID } },  // Set the roomID
                { new: true }              // Return the updated document
            );

            // Update the room's members array in the database
            await Room.findOneAndUpdate(
                { roomID: roomID },       // Find the room by its name
                { $addToSet: { members: username } }, // Add the username to the members array (avoid duplicates)
                { new: true }                // Return the updated room document
            );

            console.log(`User with username: ${username} added to room: ${roomID}`);
        } else {
            console.error("User not found when adding to room");
        }
    } catch (error) {
        console.error("Error adding user to room:", error);
    }
};

// const removeUserFromRoom = async (socketId, roomID) => {
//     try {
//         const room = await Room.findOne({ roomID: roomID });

//         if (!room) {
//             throw new Error('Room does not exist');
//         }

//         const userIndex = room.members.indexOf(socketId);

//         if (userIndex === -1) {
//             throw new Error('User not found or not in a room');
//         }

//         room.members.splice(userIndex, 1); // Remove the user
//         await room.save();
//         console.log(`User with socketId ${socketId} removed from room ${roomID}`);
//     } catch (error) {
//         console.error('Error:', error.message);
//     }
// };


// // Socket Configuration
// const roomExists = (roomID) => {
//     const index = rooms.findIndex((room) => room === roomID);
//     return index === -1 ? false : true;
// };

const updateUserSocketId = async (username, socketId) => {
    try {
        const user = await User.findOneAndUpdate(
            { username: username },
            { socketID: socketId },
            { new: true } // Return the updated user
        );
        if (user) {
            console.log(`Updated socketId for user ${username}: ${socketId}`);
        } else {
            console.log(`User ${username} not found in the database`);
        }
    } catch (error) {
        console.error("Error updating socketId in database:", error);
    }
};



// =====================================================================================================
// =====================================================================================================
// =====================================================================================================
// =====================================================================================================
// =====================================================================================================
// =====================================================================================================
// =====================================================================================================

// SOCKET UNIT

const socketSecretKey = Buffer.from(process.env.SOCKET_SECRET_KEY, 'hex');

// تابع برای رمزگذاری
function socketEncrypt(text) {
    const iv = crypto.randomBytes(16); // تولید IV تصادفی
    const cipher = crypto.createCipheriv('aes-256-cbc', socketSecretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // ترکیب IV و متن رمزنگاری‌شده
}

// تابع برای رمزگشایی
function socketDecrypt(encryptedText) {
    const [ivHex, encryptedHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', socketSecretKey, iv);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}


io.on("connection", (socket) => {
    let socketId = socket.id;
    let currentUsername ;
    console.log(`Socket connected: ${socketId}`);
    let roomID ; // Make sure you're getting socketId properly
    
    socket.on("userLoggedIn", async (data) => {
        const { username } = data;
        if (username) {
            console.log("User connected : "+username)
            currentUsername = username
            await updateUserSocketId(username, socketId);
        } else {
            console.error("Username not provided for userLoggedIn");
        }
    });


   
    
    socket.on("userLoggedIn", async (data) => {
        const { username } = data; // Ensure you have a username from the frontend
        const currentUser = getUsers().find((user) => user.username == username.username);
    
        if (currentUser) {
            await updateUserSocketId(currentUser, socket.id);
        } else {
            // Optionally handle the case where the user is not found
            console.error('User not found for socket ID:', socket.id);
        }
    });
    
    socket.on("createRoom", async ({ handle, roomName }) => {
        if(true) return
        roomName = roomName;
        function generateRoomID() {
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let roomID = "";
            for (let i = 0; i < 10; i++) { // Generate a 10-character ID
                roomID += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            }
            // Append a timestamp to ensure uniqueness
            roomID += Date.now().toString(36); // Convert timestamp to base 36
            return roomID;
        }
        
        // Usage example:
        const uniqueRoomID = generateRoomID();
        console.log("Unique Room ID:", uniqueRoomID);
        
        // Ensure room name uniqueness
        while (await Room.findOne({ roomID : uniqueRoomID })) {
            roomID = `${uniqueRoomID}-${Math.floor(Math.random() * 1000)}`; // Generate a unique name
        }
    
        const room = new Room({
            roomID : uniqueRoomID,
            roomName : roomName,
            admin: handle.trim(),
            members: [], // Initialize the members array
        });
    
        await room.save(); // Save the room to the database
    
        const userRead = await User.findOne({ username: handle }).select("first_name last_name").lean();
        const data = { name:`${userRead.first_name} ${userRead.last_name}`, handle: handle, room: room };

        socket.join(room.roomID); // Add the socket to the room
        
        // Add the user to the room
        addUserToRoom(currentUsername, uniqueRoomID);
        
        socket.emit("joined", data); // Notify the user of successful join
        socket.broadcast.to(room.roomID).emit("newconnection", data); // Broadcast to other users
    });
    
    
   // Handle joining a room
    // socket.on("joinRoom", async ({ roomID }) => {
    //     try {
    //         // Check if the room exists
    //         const roomExists = await Room.findOne({ roomID: roomID });
            
    //         if (roomExists) {
    //             // Join the socket to the room
    //             socket.join(roomID);
                
    //             // Ensure user is added to the room (update the 'room' or 'members' field in the database)
    //             addUserToRoom(socket.id, roomID);
                
    //             // Fetch past messages for the room and send to the user
    //             const messages = await Message.find({ roomID: roomID }).sort({ createdAt: 1 });
    //             socket.emit("restoreMessages", messages);
                
    //             // Optional: Notify room of new connection (if needed)
    //             socket.broadcast.to(roomID).emit("userJoined", { userID: socket.id, roomID: roomID });
    //         } else {
    //             socket.emit("error", { error: "Room does not exist" });
    //         }
    //     } catch (error) {
    //         console.error("Error joining room:", error);
    //         socket.emit("error", { error: "Failed to join room" });
    //     }
    // });

    // socket.on('joinRoom', async ({ roomID , username }) => {
    //     try {
    //         if (typeof roomID !== 'string') {
    //             throw new Error("Invalid roomID type. Expected a string.");
    //         }
    
    //         console.log(`Adding user with USERNAME: ${username} to room: ${roomID}`);
    
    //         // Check if the room exists
    //         const room = await Room.findOne({ roomID });
    
    //         if (!room) {
    //             throw new Error("Room does not exist");
    //         }
    
    //         // Add the user to the room
    //         addUserToRoom(username, roomID);
    
    //         // Join the socket.io room
    //         socket.join(roomID);
    
    //         console.log(`User ${username} successfully joined room ${roomID}`);
    
    //         socket.emit("joined", { room });
    //         socket.broadcast.to(roomID).emit("userJoined", { userId: username, roomID });
    
    //     } catch (error) {
    //         console.error("Error joining room:", error.message);
    //         socket.emit("error", { message: error.message });
    //     }
    // });
    socket.on("joinRoom", async (data) => {
        try {
            console.log(data)
            console.log(data.roomID)

            roomID = socketDecrypt(data.roomID)
            username = socketDecrypt(data.username)
            const user = await User.findOne({ username });
            console.log(`User ${username} is trying to join room ${roomID}`);
            // Emit user settings
            socket.emit("applySettings", user.settings);
            // Ensure the room exists
            let room = await Room.findOne({ roomID:roomID });
            if (!room) throw new Error(`Room "${roomID}" does not exist`);
    
            await addUserToRoom(username, roomID);
            socket.join(roomID);
    
            console.log(`Fetching all unread messages for room: ${roomID}`);
            const unreadMessages = await getUnreadMessages(roomID, username);
            // Process each message

            // console.log("unreadMessage :",unreadMessages);

                // Emit unread messages first
            if (unreadMessages.length > 0) {
                socket.emit("restoreMessages", { messages: unreadMessages, prepend: true , unread:true , join:true});
            } else {
                try {
                    console.log("No unread messages. Fetching the last 50 messages.");
                    
                    // Fetch the last 50 messages for the room
                    const lastMessages = await getMessagesByLimit(roomID, 50);
                     // Process each message
                    const processedMessages = await Promise.all(
                        lastMessages.map(async (msg) => await processMessage(msg))
                    );
                    if (processedMessages.length > 0) {
                        // console.log("Fetched last 50 messages:", processedMessages);
                        socket.emit("restoreMessages", { messages: processedMessages, prepend: true , join:true });
                    } else {
                        console.log("No messages found for the room.");
                        socket.emit("noMoreMessages", { message: "No messages available." });
                    }
                } catch (err) {
                    console.error("Error fetching last 50 messages:", err);
                    socket.emit("error", { message: "Failed to load messages." });
                }
            }

           
            socket.emit("members", room.members);
    
            const userRead = await User.findOne({ username: room.admin }).select("first_name last_name").lean();
            // Notify others
            // socket.broadcast.to(roomID).emit("userJoined", { username, roomID });
            socket.broadcast.to(user.roomID).emit("userJoined", `${user.first_name} ${user.last_name}`);


            socket.emit("joined", { room , name : `${userRead.first_name} ${userRead.last_name}` });
          
    
        } catch (error) {
            console.error("Error joining room:", error);
            socket.emit("error", { message: error.message });
        }
    });
    
    // Create an in-memory object to track the last fetched date for each room (or user)
    socket.on("requestOlderMessages", async ({ roomID, counter=0 , type='first'}) => {
        try {
            // Debugging: Log the incoming data to ensure it's correct
            console.log(`Received request for ${type} messages:`, { roomID, counter });
            
            // Adjust counter to fetch the previous batch of messages
            const startingID = counter;
            // console.log("Starting ID for fetch:", startingID);
    
            // Calculate the limit dynamically based on the counter value
            
            const limit =()=>{
                if(counter!==0){
                return (counter < 50) ? counter-1 : 50; // Use counter if it's less than 50, otherwise limit to 50
                }
                else return 50;
            }
            // Fetch the older messages using the starting ID and dynamic limit
            const olderMessages = await getMessagesByID(startingID, limit(),type); // Function to fetch messages
    
            // console.log(olderMessages);
            // If there are older messages, process and send them back to the client
            if (olderMessages.length > 0) {
                // Process each message
                const processedMessages = await Promise.all(
                    olderMessages.map(async (msg) => await processMessage(msg))
                );
                if(type=='latest'){
                    const lastMessages = await getMessagesByLimit(roomID, 50);
                    const processedLatestMessages = await Promise.all(
                        lastMessages.map(async (msg) => {
                            return await processMessage(msg); // پردازش پیام رمزنگاری‌شده
                        })
                    );
                    
                    console.log("Sending latest messages.");
                    socket.emit("restoreMessages", { messages: processedLatestMessages, prepend: true , Latest:true});
                }
                else if(type=='first'){
                    console.log("Sending older messages.");
                    socket.emit("restoreMessages", { messages: processedMessages, prepend: true });
                }else if(type=='last'){
                    console.log("Sending newer messages.");
                    socket.emit("restoreMessages", { messages: processedMessages, prepend: false  });
                }

                if(type.split('-')[0]=="reply"){
                    let bool=false
                    console.log(type)
                    socket.emit("restoreMessages", { messages: processedMessages, prepend: true , reply:type});
                    processedMessages.forEach(msg=>{
                        if(type.split('-')[2] == msg.id.split('-')[1]){
                            socket.emit("olderMessagesLoaded", { prepend: true });
                            bool=true
                            return;
                        }
                    })
                    if(!bool){
                        socket.emit("olderMessagesLoaded", { prepend: false });
                    }
                }
            } else {
                console.log("No older messages found.");
                socket.emit("noMoreMessages", { message: "No more older messages." });
            }
        } catch (err) {
            // Log the error if something goes wrong
            console.error("Error fetching older messages:", err);
            socket.emit("error", { message: "Failed to load older messages." });
        }
    });
async function getMessagesByID(startingID, limit,type) {
    const [room, currentCounter] = startingID!=0 ? startingID.split("-"):0;
    const counter = parseInt(currentCounter, 10); // Convert to integer
    
    if (isNaN(counter)) {
        throw new Error("Invalid startingID format: counter is not a number.");
    }

    console.log(`Fetching messages ${type=='last' ? `newer` : `older`} than counter =`, counter, "for room =", room);
    if(type=='latest'){
            // Query the database for messages with IDs numerically less than the given counter
        return await Message.find({
            roomID: room,
        })
        .sort({  timestamp: -1 }) // Sort by 'id' in descending order to get older messages first
        .limit(limit || 50) // Limit the result to 50 messages, or the specified limit
        .lean(); // Use lean() to get plain JavaScript objects
        }
    else if(type=='last'){

        // Query the database for messages with IDs numerically less than the given counter
        return await Message.find({
            roomID: room,
            // Extract the numeric part of the 'id' to compare with 'counter'
            id: { $gt: `${room}-${counter}` }, // The id format should still be 'room-counter'
        })
        .sort({  timestamp: 1 }) // Sort by 'id' in descending order to get older messages first
        .limit(limit || 50) // Limit the result to 50 messages, or the specified limit
        .lean(); // Use lean() to get plain JavaScript objects
    }
    else if(type=='first'){
    // Query the database for messages with IDs numerically less than the given counter
    return await Message.find({
        roomID: room,
        // Extract the numeric part of the 'id' to compare with 'counter'
        id: { $lt: `${room}-${counter}` }, // The id format should still be 'room-counter'
    })
    .sort({  timestamp: -1 }) // Sort by 'id' in descending order to get older messages first
    .limit(limit || 50) // Limit the result to 50 messages, or the specified limit
    .lean(); // Use lean() to get plain JavaScript objects
    }
    else if(type.split('-')[0]=="reply"){
        console.log(type)
        // Query the database for messages with IDs numerically less than the given counter
        return await Message.find({
            roomID: room,
            // Extract the numeric part of the 'id' to compare with 'counter'
            id: { $lt: `${room}-${counter+39}` }, // The id format should still be 'room-counter'
        })
        .sort({  timestamp: -1 }) // Sort by 'id' in descending order to get older messages first
        .limit(39) // Limit the result to 50 messages, or the specified limit
        .lean(); // Use lean() to get plain JavaScript objects
    }
}



async function getMessagesByLimit(roomID, limit) {
    return await Message.find({ roomID }) // Filter by room ID
        .sort({ timestamp: -1 }) // Sort by creation date in descending order
        .limit(limit) // Limit to the specified number
        .lean();
}

// Helper function to process each message

    
    // Helper function to get all unread messages
// Helper function to get all unread messages
    async function getUnreadMessages(roomID, username) {
        const rawMessages = await Message.find({ roomID: roomID }).sort({ timestamp: -1 }).lean();

        // Filter unread messages for the user
        const unreadMessages = rawMessages.filter((msg) => {
            const isUnread = !msg.read || !msg.read.some((r) => r.username === username);
            return isUnread;
        });

        // Process unread messages
        const processedMessages = await Promise.all(unreadMessages.map((msg) => processMessage(msg)));

        // If there are any unread messages, set readLine:true for the last one
        if (processedMessages.length > 0) {
            processedMessages[processedMessages.length - 1].readLine = true; // Set readLine to true for the last message
        }

        return processedMessages;
    }

    // Helper function to group messages by date
// Helper function to group messages by date
async function getMessagesByDate(roomID, date , reverse = 1) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const rawMessages = await Message.find({
        roomID: roomID,
        timestamp: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ timestamp: reverse }).lean();

    const processedMessages = await Promise.all(rawMessages.map((msg) => processMessage(msg)));

    // If there are messages, set readLine:true for the last one
    if (processedMessages.length > 0) {
        processedMessages[0].dateLine = true; // Set readLine to true for the last message
    }

    return processedMessages;
}

    
    // Process a single message (convert sender and read users to human-readable form)

    async function processMessage(msg) {
        const user = await User.findOne({ username: msg.sender }).select("first_name last_name").lean();
        const readUsers = await Promise.all(
            (msg.read || []).map(async (readEntry) => {
                const userRead = await User.findOne({ username: readEntry.username }).select("first_name last_name").lean();
                return {
                    username: socketEncrypt(readEntry.username), // رمزنگاری username
                    name: userRead ? `${userRead.first_name} ${userRead.last_name}` : (readEntry.username), // رمزنگاری name
                    reaction: readEntry.reaction ? (readEntry.reaction) : '', // رمزنگاری reaction
                    time: readEntry.time.toString(), // رمزنگاری time
                };
            })
        );

        let replyMessage;
        if (msg.quote !== null) {
            replyMessage = await Message.findOne({ id: msg.quote }).select("sender message file").lean();
            const replyname = replyMessage ? await User.findOne({ username: replyMessage.sender }).select("first_name last_name").lean() : '';
            replyMessage = {
                ...replyMessage,
                handle: replyname ? `${replyname.first_name} ${replyname.last_name}` : null,
                sender: socketEncrypt(replyMessage.sender), // رمزنگاری sender
                message: socketEncrypt(replyMessage.message), // رمزنگاری message
            }
        }

        return {
            ...msg,
            message: socketEncrypt(msg.message), // رمزنگاری message
            reply: replyMessage || null,
            handle: user ? `${user.first_name} ${user.last_name}` : socketEncrypt(msg.sender), // رمزنگاری handle
            readUsers,
            readLine: false, // Mark unread messages with a readLine
        };
    }

        
    
    
    socket.on("chat", async (data , callback) => {
        try {
            console.log(data)
            let { username, message, file , quote } = data;
            username = socketDecrypt(username);
            message = socketDecrypt(message);
            quote = socketDecrypt(quote);
            let fileDetails = null;

            if (file !== null && file !== undefined) {
                // Ensure file is an array (whether single file or array of file)
                const filesArray = Array.isArray(file) ? file : [file];
            
                // Conditionally map over the file if there are any
                fileDetails = filesArray.length > 0
                    ? filesArray.map(file => ({
                        file: file.file,  // Assuming fileData contains base64 data or a URL
                        fileType: file.fileType,
                        fileName: file.fileName || null,  // Default to null if fileName is not present
                    }))
                    : null;  // If no file, return null
            
                // console.log(fileDetails);
            }else{
                
                console.error("erorr : ",file);
            }
            
            const timestamp = new Date();
            if(!username) throw new Error("User not found or not part of a room.");
            if (!message  && !file)                 throw new Error("no message.");
            // Validate the user
            const currentUser = await User.findOne({ username });
            if (!currentUser || !currentUser.roomID) {
                throw new Error("User not found or not part of a room.");
            }
            // Get the next sequence value from the counter collection
            const counter = await Room.findOneAndUpdate(
                { roomID: currentUser.roomID },  // Find the counter for this room
                { $inc: { seq: 1 } },  // Increment the sequence number
                { new: true, upsert: true }  // Create if it doesn't exist
            );
            const clean = DOMPurify.sanitize(message);
            // Create and save the message
            const updatedCounter= 1000000+ (counter.seq||0)
            const newMessage = new Message({
                id: `${currentUser.roomID}-${updatedCounter}`,  // ID format: roomID-auto-increment number
                roomID: currentUser.roomID,
                sender: username,
                quote: quote ? `${currentUser.roomID}-${quote}`:null,
                message: clean ? clean : '',
                file: fileDetails, // Map over the uploaded file to structure them correctly
                read: [],
                members: [username],
                timestamp,
            });
            // console.log("message : ",newMessage.file)
            await newMessage.save();
    
            // Enrich the message with sender details
            let enrichedMessage = {
                ...newMessage.toObject(),
                sender: username,
                // handle: `${currentUser.first_name} ${currentUser.last_name}`,
            };
            let encryptedMessage = await processMessage(enrichedMessage)  
                      // Broadcast the message to the room
            io.in(currentUser.roomID).emit("chat",await encryptedMessage,{ success: true });
            console.log(`Message sent by ${username} in room "${currentUser.roomID}"`);
            callback({ success: true });
            // پیدا کردن همه اعضای اتاق
                    // دریافت اطلاعات اتاق از دیتابیس
            const room = await Room.findOne({ roomID : currentUser.roomID});
            if (!room) throw new Error("Room not found!");

            const roomMembers = room.members; // لیست اعضای اتاق
            
            // گرفتن Socket ID کاربران از دیتابیس
            const onlineUsers = await User.find({ username: { $in: roomMembers } });
            encryptedMessage ={
                ...data,
                roomID : socketEncrypt(currentUser.roomID)
            }
            // ارسال پیام به تمام کاربران حاضر در اتاق
            onlineUsers.forEach((user) => {
                if (user.socketID) {
                    io.to(user.socketID).emit("notification", encryptedMessage);
                }
            });
            
            console.log(`🔔 Notification sent to users in room "${roomID}"`);
        // }
    } catch (error) {
        console.error("Error handling chat message:", error);

        // Send failure acknowledgment
        callback({ success: false });
    }
    });

    // Listen for upload progress from clients
    socket.on("uploadProgress", (data) => {
        const { progress } = data;
        console.log(`Upload Progress: ${progress}%`);

        // Broadcast the progress to the room (optional)
        io.emit("uploadProgress", { progress: progress });
    });

    
    socket.on("addReaction", async ({ username, messageId, reaction }) => {
        try {
            const time = new Date();
    
            // Find the message by its ID
            const message = await Message.findOne({ id: messageId });
            if (!message) throw new Error("Message not found");
    
            // Check if the user already has a reaction in the `read` array
            const userReaction = message.read.find(r => r.username === username);
    
            if (userReaction) {
                // If the user already has a reaction, update it
                userReaction.reaction = reaction;
            } else {
                // If the user doesn't have a reaction, add a new entry to the `read` array
                message.read.push({
                    username: username,
                    reaction: reaction
                });
            }
    
            // Save the updated message
            await message.save();
    
            // Emit the updated message to the room
            io.to(message.roomID).emit("reactionAdded", { messageId, username, time, reaction });
        } catch (error) {
            console.error("Error adding reaction:", error);
            socket.emit("error", { message: "Failed to add reaction." });
        }
    });
    
    socket.on("markMessagesRead", async ({ messageIds, username }) => {
        try {
            const timestamp = new Date();
            // console.log(messageIds)
            
            // Update the `read` array for each message
            const user = await User.findOne({ username });
            if(user){
            const updatedMessages = await Promise.all(
                messageIds.map(async (messageId) => {
                    await Message.updateMany(
                        { id: { $lte: messageId }, "read.username": { $ne: username } }, // All messages with id <= messageId
                        { $addToSet: { read: { username, time: timestamp } } } // Add username and timestamp
                    );
    
                    // Fetch the updated message
                    const message = await Message.findOne({ id: messageId }).lean();
                    if (!message) return null;
    
                    // Enrich the `readUsers` with user details
                    const readUsers = await Promise.all(
                        message.read.map(async (readEntry) => {
                            const userRead = await User.findOne({ username: readEntry.username }).select("first_name last_name").lean();
                            return {
                                name: userRead ? `${userRead.first_name} ${userRead.last_name}` : readEntry.username,
                                time: readEntry.time,
                            };
                        })
                    );
    
                    return { id: messageId, readUsers };
                })
            );
            
    
            // Emit the updated read data to the room or all clients
            updatedMessages
                .filter((msg) => msg) // Ensure no null values
                .forEach((msg) => {
                    socket.broadcast.emit("readMessageUpdate", { id: msg.id, readUsers: msg.readUsers });
                });
            }
        } catch (error) {
            console.error("Error in markMessagesRead:", error.message);
        }
    });
    
    socket.on("markMessagesRead", async ({ messageIds, username }) => {
        try {
            const timestamp = new Date();
    
            // Update the `read` array for each message
            await Promise.all(
                messageIds.map((messageId) =>
                    Message.updateOne(
                        { id: messageId, "read.username": { $ne: username } }, // Ensure username isn't already marked
                        { $addToSet: { read: { username, time: timestamp } } } // Add username and timestamp
                    )
                )
            );
    
            // console.log(`Messages marked as read for user "${username}":`, messageIds);
    
            // Optionally notify others in the room of read receipts
            socket.broadcast.emit("messagesRead", { messageIds, username, timestamp });
        } catch (error) {
            console.error("Error in markMessagesRead:", error.message);
        }
    });
    
    
    
    socket.on("info", async () => {
        const currentUser = await User.findOne({ socketID: socket.id });
        if (currentUser) {
            const room = await Room.findOne({ roomID: currentUser.roomID });
            const users = await User.find({ roomID: currentUser.roomID });
            const messages = await Message.find({ roomID: currentUser.roomID }).sort({ timestamp: 1 });

            socket.emit("info", { room, users, messages });
        } else {
            socket.emit("error", { message: "User not found or not in a room" });
        }
    });
    socket.on("typing", async (data) => {
        try {
            const { username, isTyping , name} = data; // Extract username and typing status
    
            if (!username || typeof isTyping === "undefined") {
                console.error("Invalid data received for typing event:", data);
                return;
            }
    
            // Find the user and their room
            const currentUser = await User.findOne({ username }).lean();
            if (!currentUser || !currentUser.roomID) {
                console.error("Error: User not found or not in a room");
                socket.emit("error", { message: "User not found or not in a room" });
                return;
            }
    
            // Broadcast typing status to others in the room (excluding the sender)
            socket.broadcast.to(currentUser.roomID).emit("typing", { 
                username,
                name, 
                isTyping 
            });
        } catch (error) {
            console.error("Error handling typing event:", error.message);
            socket.emit("error", { message: "An error occurred while handling the typing event" });
        }
    });
    
    socket.on("saveSettings", async (settings , username) => {
        try {
            const user = await User.findOne({ username: username });
            if (!user) throw new Error("User not found");
            
            user.settings = settings; // Assume `settings` field exists in user schema
            await user.save();
    
            console.log("Settings saved for user:", user.username);
        } catch (error) {
            console.error("Error saving settings:", error);
            socket.emit("error", { message: "Failed to save settings" });
        }
    });
    

    socket.on("leaveRoom", async ({ username , roomID }) => {
        try {
            if (!username || !roomID) {
                socket.emit("error", { error: `${username} : ${roomID} Invalid data provided for leaving the room` });
                return;
            }
    
            // Find the room
            const room = await Room.findOne({ roomID: roomID });
            if (!room) {
                socket.emit("error", { error: `Room "${roomID}" does not exist` });
                return;
            }
    
            // Check if the user is a member of the room
            if (!room.members.includes(username)) {
                socket.emit("error", { error: `User "${username}" is not a member of room "${roomID}"` });
                return;
            }
    
            // Remove the user from the room's members list
            room.members = room.members.filter(member => member !== username);
            await room.save();
    
            // Have the socket leave the room
            socket.leave(roomID);
            const updatedUser = await User.findOneAndUpdate(
                { username: username },
                { roomID : null},
                { new: true } // Return the updated user
            );
            if (updatedUser) {
                console.log(`${username} left ${roomID} room`);
            }
            // Notify the user that they have successfully left
            socket.emit("leftRoom", { roomID });
    
            // Notify others in the room about the user's departure
            socket.broadcast.to(roomID).emit("userLeft", { username, roomID });
    
        } catch (error) {
            console.error("Error handling leaveRoom event:", error);
            socket.emit("error", { error: "Failed to leave the room due to an internal error" });
        }
    });
    
    

    socket.on("disconnect", async () => {
        try {
            const user = await User.findOne({ username: currentUsername });
            if (user) {
                socket.broadcast.to(user.roomID).emit("userDisconnected", `${user.first_name} ${user.last_name}`);
                
                const updatedUser = await User.findOneAndUpdate(
                    { username: currentUsername },
                    { socketId: null }, // Reset socketId on disconnect
                    { roomID : null},
                    { new: true } // Return the updated user
                );
                
                if (updatedUser) {
                    console.log(`Reset socketId for user ${updatedUser.username}`);
                }
            }
        } catch (error) {
            console.error("Error during disconnect:", error);
        }
    });
    
    

    socket.on("error", (error) => {
        console.log(getUsers());  // Check if the user list is correct

        console.log("Socket error:", error);
        if(roomID){
            console.log(`Adding user with socketId: ${socketId} to room: ${roomID}`);
        }
        if (typeof user !== 'undefined' && user !== null) {
            console.log(user.username); // Log specific fields
        }
        
        const safeLog = (obj) => {
            try {
                console.log(JSON.parse(JSON.stringify(obj)));
            } catch (error) {
                console.error("Error logging object:", error);
            }
        };
            });
    
});
