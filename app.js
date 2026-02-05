const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const crypto = require('crypto');
const ipRangeCheck = require("ip-range-check");
const express = require("express");
const multer = require("multer");
const axios = require('axios');
const jwt = require('jsonwebtoken');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
    fs = require('fs'),
    https = require('https'),
    app = express(),
    port = process.env.PORT || 4000,
    // SSL certificate and key options
    options = {
        // key: fs.readFileSync('private-key.pem', 'utf8'),
        // cert: fs.readFileSync('certificate.pem', 'utf8'),
        // ca_cert: fs.readFileSync('ca-certificate.pem', 'utf8'),
        // ca_key: fs.readFileSync('ca-key.pem', 'utf8'),
        // passphrase: 'farahoosh'
        key: fs.readFileSync('/etc/letsencrypt/live/mc.farahoosh.ir/privkey.pem', 'utf8'),
        cert: fs.readFileSync('/etc/letsencrypt/live/mc.farahoosh.ir/fullchain.pem', 'utf8'),
         
        
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
    
    origin:  ['https://portal.mellicloud.com', 'https://mc.farahoosh.ir'], // replace with your front-end domain
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

const AES_SECRET_KEY = '56ca69fbace71736c278a4e47137a9be'; // دقیقا 32 بایت
const AES_IV = crypto.randomBytes(16); // Initialization Vector

// رمزنگاری AES-256
function encryptAES256(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), AES_IV);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return AES_IV.toString('hex') + ':' + encrypted.toString('hex');
}

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
        pic: DOMPurify.sanitize(req.body.pic),
        settings : {
                marginLeft: "10%",
                marginRight: "%10",
                chatWindowBgColor: "245, 245, 245",
                chatWindowFgColor: "33, 33, 33",
                bgColor: "204, 238, 191", // Assuming a background color picker exists
                fgColor: "0, 0, 0", // Assuming a background color picker exists
                sideBgColor: "242, 242, 242", // Assuming a background color picker exists
                sideFgColor: "33, 33, 33", // Assuming a background color picker exists
                fontSize: "16px", // Get font size from range input
                borderRad: "17px", // Get font size from range input
            }
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
        const safeFileName = Buffer.from(file.originalname, "latin1").toString("utf8"); // Ensure UTF-8
        cb(null, Date.now() + "_" + safeFileName.replace(/\s+/g, "_")); // Avoid spaces
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 10 MB max
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
                fileName:  Buffer.from(req.file.originalname, "latin1").toString("utf8"), // Original file name
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
                    // console.log('decryptedData=>',decryptedData)
                    console.log(existingRoom.members)
                    if(decryptedData.append==1){
                        existingRoom.members = [...new Set([...existingRoom.members, ...phoneNumbers])]; // Avoid duplicates
                    }else if(decryptedData.append=='delete'){
                        // Remove phoneNumbers from members
                        existingRoom.members = existingRoom.members.filter(member => !phoneNumbers.includes(member));
                        
                    }else{
                        existingRoom.members = [...new Set([existingRoom.admin, ...phoneNumbers])];
                    }
                    console.log(existingRoom.members)
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
                setting: [{ Joinable_url: decryptedData.privacy === 'public' ? 'public' : 'private' }],  // Check privacy setting
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


// auto from domains login

// API برای ورود از دامنه‌های مختلف
// app.post('/5ecd285c5bac42c33f903e8332cb01d3dcba3fc4ac2fd8a9c6273ef23387f989', async (req, res, next) => {
//     try {
//         // استخراج توکن از هدر
//         const token = req.headers['authorization']?.split(' ')[1];
//         const secret = '12425cb7d8ce5b125e9279ad233ecb079ec57ec9f050c9af5ac8856a2d21f65c';
//         if (!token) {
//             return res.status(400).json({ error: 'Authorization token missing' });
//         }

//         // رمزگشایی توکن
//         const decryptedToken = decrypt(token, secret);
//         console.log("Decrypted Token:", decryptedToken);

//         // رمزگشایی داده‌های رمزگذاری‌شده
//         const encryptedData = req.body.data;
//         const decryptedData = decrypt(encryptedData, secret);
//         console.log("Decrypted Data:", decryptedData);

//         const { phoneNumber, Domain } = decryptedData;

//         const sanitizedUsername = DOMPurify.sanitize(phoneNumber);

//         // پیدا کردن کاربر
//         const user = await User.findOne({ username: sanitizedUsername });
        
//         if (!user) {
//             return res.status(400).json({ error: "User not found" });
//         }

//         // به‌روزرسانی دامنه برای کاربر
//         // const updatedUser = await User.findOneAndUpdate(
//         //     { username: sanitizedUsername },
//         //     { 
//         //         $setOnInsert: { Domain: [Domain] },  // اگر Domain وجود نداشت، اضافه می‌شود
//         //         $addToSet: { Domain } // در صورت وجود، به مجموعه اضافه می‌شود
//         //     },
//         //     { lean: false } // upsert به معنای ایجاد کاربر جدید است اگر پیدا نشد
//         // );
        
//         // console.log("Updated user:", updatedUser);
//         let superSECRET =encrypt(secretKey)
//         // تولید توکن JWT برای ورود کاربر
//         const jwtToken = jwt.sign(
//             { id: user._id, username: user.username },
//             superSECRET,
//             { expiresIn: "24h" } // توکن 1 ساعت معتبر است
//         );

//         // توکن JWT را به سایت دیگر ارسال می‌کنیم
//         res.json({ success: true, token: jwtToken });

//         // عملیات احراز هویت با Passport
//         passport.authenticate("local", async (err, authenticatedUser, info) => {
//             if (err) {
//                 console.error("Passport authentication error:", err);
//                 return next(err);
//             }

//             if (!authenticatedUser) {
//                 return res.status(400).json({ error: "Authentication failed" });
//             }

//             req.logIn(authenticatedUser, async (err) => {
//                 if (err) {
//                     console.error("Error during login:", err);
//                     return next(err);
//                 }

//                 try {
//                     // تنظیم socketID به null پس از ورود
//                     await User.updateOne(
//                         { _id: authenticatedUser._id },
//                         { $set: { socketID: null } }
//                     );
//                 } catch (updateErr) {
//                     console.error("Error resetting socketID:", updateErr);
//                     return next(updateErr);
//                 }

//                 try {
//                     req.session.save((err) => {
//                         if (err) {
//                             console.error("Error saving session:", err);
//                             return next(err);
//                         }
//                     });
//                 } catch (saveErr) {
//                     console.error("Error during session save:", saveErr);
//                     return next(saveErr);
//                 }

//                 res.status(200).json({ success: "User Login successful" });
//             });
//         })(req, res, next);
//     } catch (err) {
//         console.error("Error:", err.message);
//         res.status(400).json({ error: 'Decryption error or invalid data' });
//     }
// });


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
    // res.status(404).render("404");
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



// ارسال پیام پشتیبان به PHP
async function sendBackupToPHP(Number, jsonMessage) {
    const encrypted = encryptAES256(JSON.stringify(jsonMessage));
    // console.log(encrypted)

    try {
        await axios.get(`https://portal.mellicloud.com/missionform/notifications/notificationUsers.php?Number=${Number}&json=${encrypted}&&email=BB`);
        // console.log(`📨 پیام برای کاربر ${Number} به سرور PHP ارسال شد.`);
    } catch (err) {
        console.error(`❌ خطا در ارسال پیام به سرور PHP برای کاربر ${Number}:`, err.message);
    }
}
const onlineUsersServer = new Map(); // socket.id => username


io.on("connection", (socket) => {
    let socketId = socket.id;
    let currentUsername ;
    console.log(`Socket connected: ${socketId}`);
    let roomID ; // Make sure you're getting socketId properly
    
    socket.on("userLoggedIn", async (data) => {
        const { username } = data;
        if (!username) {
            return console.error("Username not provided for userLoggedIn");
        }

        const currentUser = await User.findOne({ username });
        if (!currentUser) {
            return console.error("User not found for socket ID:", socket.id);
        }

        currentUsername = username;
        onlineUsersServer.set(socket.id, username); // Track online

        await updateUserSocketId(username, socket.id);

        socket.emit("onlineUsers", Array.from(onlineUsersServer.values())); // Send online usernames
    });
    socket.on("userSleep", async () => {
        const username = onlineUsersServer.get(socket.id);
        if (!username) return;

        // mark user as inactive
        await User.updateOne(
            { username },
            { status: "sleep", lastActive: new Date() }
        );

        onlineUsersServer.delete(socket.id);
        socket.broadcast.emit("userWentSleep", username);
        socket.emit("onlineUsers", Array.from(onlineUsersServer.values())); // Send online usernames

    });

    socket.on("userWake", async () => {
        const user = await User.findOne({ socketID: socket.id });
        const username = user.username
        if (!username) return;

        await User.updateOne(
            { username },
            { status: "online", lastActive: new Date() }
        );

        // add back to online list
        onlineUsersServer.set(socket.id, username);
        socket.emit("onlineUsers", Array.from(onlineUsersServer.values())); // Send online usernames
        socket.broadcast.emit("userCameBack", username);
    });


    socket.on("ping", () => {
        console.log("📡 Ping received from client");

        socket.emit("pong");
        socket.emit("onlineUsers", Array.from(onlineUsersServer.values())); // Send online usernames
    });

    console.log("Socket connected:", socket.id);

    // Listen for authentication / identification from client
    socket.on("authenticate", async (encryptedUsername, callback) => {
        try {
            const username = socketDecrypt(encryptedUsername); // Your decrypt function

            const user = await User.findOneAndUpdate(
                { username },
                { $set: { socketID: socket.id, online: true, lastSeen: new Date() } },
                { new: true }
            );

            if (!user) {
                return callback({ success: false, message: "User not found" });
            }

            // Join the user's room if they have one
            if (user.roomID) {
                socket.join(user.roomID);
                console.log(`${username} joined room ${user.roomID}`);
            }

            callback({ success: true, roomID: user.roomID });
            console.log(`User authenticated and socketID updated: ${username} -> ${socket.id}`);
        } catch (err) {
            console.error("Authentication error:", err);
            callback({ success: false, message: "Authentication failed" });
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
            console.log('socket', socket.id);

            roomID = socketDecrypt(data.roomID);
            let user = await User.findOne({ socketID: socket.id });

            if (!user) {
                user = await User.findOne({ username: socketDecrypt(data.username) });
                if (!user) {
                    throw new Error("User not found or not part of a room.");
                }
            }

            const username = user.username;

            const lastroom = user.roomID;
            if (lastroom && lastroom !== roomID) {
                console.log(`User ${username} is leaving previous room: ${lastroom}`);
                socket.leave(lastroom);

                // Optional: notify others in previous room
                socket.broadcast.to(lastroom).emit("userLeft", { username, roomID: lastroom });

                // Clear previous room reference
                await User.findOneAndUpdate(
                    { username },
                    { roomID: null }
                );
            }

            // Check if target room exists
            let room = await Room.findOne({ roomID });
            if (!room) throw new Error(`Room "${roomID}" does not exist`);

            // Permission check for private rooms
            if (room.setting[0].Joinable_url === "private" && !room.members.includes(username)) {
                io.to(socket.id).emit("error", { message: "You are not a member of this private room" });
                return;
            }

            // Join the new room
            socket.join(roomID);
            await addUserToRoom(username, roomID);

            // Update user's roomID
            await User.findOneAndUpdate({ username }, { roomID });

            console.log(`User ${username} joined room ${roomID}`);

            // Send settings, messages, and members
            socket.emit("applySettings", user.settings);

            const unreadMessages = await getUnreadMessages(roomID, username);
            if (unreadMessages.length > 0) {
                socket.emit("restoreMessages", { messages: unreadMessages, prepend: true, unread: true, join: true });
            } else {
                const lastMessages = await getMessagesByLimit(roomID, 20);
                if(lastMessages.length>0){
                    const processedMessages = await Promise.all(lastMessages.map(msg => processMessage(msg)));
                    socket.emit("restoreMessages", { messages: processedMessages, prepend: true, join: true });
                }else{
                    socket.emit("noMoreMessages", { message: "No more older messages." });
                }
            }

            socket.emit("members", room.members);
            socket.emit("joined", { room, name: `${user.first_name} ${user.last_name}` });

        } catch (error) {
            console.error("Error joining room:", error.message);
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
                return (counter < 20) ? counter-1 : 20; // Use counter if it's less than 20, otherwise limit to 20
                }
                else return 20;
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
                    const lastMessages = await getMessagesByLimit(roomID, 20);
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
        .limit(limit || 20) // Limit the result to 50 messages, or the specified limit
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
        .limit(limit || 20) // Limit the result to 50 messages, or the specified limit
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
    .limit(limit || 20) // Limit the result to 50 messages, or the specified limit
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

    socket.on("roomCounterId", async (userRoomID ,callback)=>{
                    // Get the next sequence value from the counter collection
            const counter = await Room.findOneAndUpdate(
                { roomID: userRoomID },  // Find the counter for this room
                // { $inc: { seq: 1 } },  // Increment the sequence number
                // { new: true, upsert: true }  // Create if it doesn't exist
            );
            // Create and save the message
            if(counter){
                const updatedCounter= 1000000+ (counter.seq||0) + 1
                callback({ success: true , messageId: `${userRoomID}-${updatedCounter}`});
            }else{
                callback({ success: false , message : error});

            }

    })  
    
    
    socket.on("chat", async (data , callback) => {
        try {
            let { username: encryptedUsername,roomID, message, file, quote } = data;

            const username = socketDecrypt(encryptedUsername);
            const userRoomID = socketDecrypt(roomID);

            // Find user by username AND update socketID if needed
            const currentUser = await User.findOneAndUpdate(
                { username },
                { $set: { socketID: socket.id } }, // Always update socketID
                { new: true }
            );

            if (!currentUser || !userRoomID) {
                throw new Error("User not found or not in a room.");
            }

            // Ensure socket is in the room
            socket.join(userRoomID);

            // Proceed with message processing...
            message = socketDecrypt(message);
            message = DOMPurify.sanitize(message, {
                ALLOWED_TAGS: ['table', 'thead', 'tbody', 'tr', 'td', 'th', 'br'],
                ALLOWED_ATTR: ['style', 'data-excel-formula', 'data-excel-value', 'data-excel-type'] 
            });
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
            
            // Get the next sequence value from the counter collection
            const counter = await Room.findOneAndUpdate(
                { roomID: userRoomID },  // Find the counter for this room
                { $inc: { seq: 1 } },  // Increment the sequence number
                { new: true, upsert: true }  // Create if it doesn't exist
            );
            // Create and save the message
            const updatedCounter= 1000000+ (counter.seq||0)
            const clean = DOMPurify.sanitize(message);
            const newMessage = new Message({
                id: `${userRoomID}-${updatedCounter}`,  // ID format: roomID-auto-increment number
                roomID: userRoomID,
                sender: username,
                quote: quote ? `${userRoomID}-${quote}`:null,
                message: clean ? clean : '',
                file: fileDetails, // Map over the uploaded file to structure them correctly
                read: [{ username, time: timestamp }], // <- Mark as read by sender
                members: [username],
                timestamp,
            });
            // console.log("message : ",newMessage.file)
            await newMessage.save();
            // Update room's last update timestamp
            let timeUp = await Room.findOneAndUpdate(
                { roomID: userRoomID },
                { $set: { lastUpdated: timestamp } }
            );
            console.log("updated : ",timeUp)
            // Enrich the message with sender details
            let enrichedMessage = {
                ...newMessage.toObject(),
                sender: username,
                // handle: `${currentUser.first_name} ${currentUser.last_name}`,
            };
            let encryptedMessage = await processMessage(enrichedMessage)  
            // Broadcast the message to the room
            io.in(userRoomID).emit("chat",await encryptedMessage,{ success: true });
            // console.log(`Message sent by ${username} in room "${userRoomID}"`);
            callback({ success: true , messageId: `${userRoomID}-${updatedCounter}`});
            // پیدا کردن همه اعضای اتاق
                    // دریافت اطلاعات اتاق از دیتابیس
            const room = await Room.findOne({ roomID : userRoomID});
            if (!room) throw new Error("Room not found!");

            const roomMembers = room.members; // لیست اعضای اتاق
            
            // گرفتن Socket ID کاربران از دیتابیس
            const onlineUsers = await User.find({ username: { $in: roomMembers } });
            encryptedMessage ={
                ...data,
                roomID : socketEncrypt(userRoomID),
                title : socketEncrypt(room.roomName)
            }
            const selfSender = await User.findOne({ username });


            // console.log(encryptedMessage)
            // ارسال پیام به تمام کاربران حاضر در اتاق
            onlineUsers.forEach(async (user) => {
                if (user.username != username) {

                    if (user.username) {
                        const taskMatch = room.roomName.match(/\(#(\d+)\)/);
                        const pvMatch = room.roomName.match(/\(PV\)Chat between (\d{11}) and (\d{11})/);
                        let tempMessage;
                        
                        if (pvMatch) {
                            const senderNumber = pvMatch[1];
                            const receiverNumber = pvMatch[2];
                            tempMessage = {
                                title: 'New private message (MetaChat)',
                                message: `<i>${selfSender.first_name} ${selfSender.last_name}</i> said: <br>${newMessage.message}`,
                                reciver:`<i>${user.first_name} ${user.last_name}`,
                                timestamp
                            };
                        } else if (taskMatch) {
                            const taskID = taskMatch[1];
                            tempMessage = {
                                title: 'New comment (MetaChat): '+room.roomName,
                                message: `<br><i>${selfSender.first_name} ${selfSender.last_name}</i> Commented: <br>${newMessage.message}`,
                                taskID:taskID,
                                link: "/view?TaskID=" + taskID,
                                reciver:`<i>${user.first_name} ${user.last_name}`,
                                timestamp
                            };
                        } else {
                            tempMessage = {
                                title: `New Message (MetaChat): ${room.roomName}`,
                                message: `<b><i>${selfSender.first_name} ${selfSender.last_name}</i></b>: <br>${newMessage.message}`,
                                reciver:`<i>${user.first_name} ${user.last_name}`,
                                timestamp
                            };
                        }
                        
                        if (user.socketID) {
                            tempMessage={
                                ...tempMessage,
                                roomID : userRoomID
                            }
                            io.to(user.socketID).emit("notification", tempMessage);
    
                        }
                        await Promise.all(onlineUsers.map(user => sendBackupToPHP(user.username, tempMessage)));
                    }
                }
            });
            
            // console.log(`🔔 Notification sent to users in room "${roomID}"`);
        // }
    } catch (error) {
        console.error("Error handling chat message:", error);

        // Send failure acknowledgment
        callback({ success: false , messageId: `${userRoomID}-${updatedCounter}`, message : error});
    }
    });
    socket.on("delete", async (data, callback) => {
        try {
            const { messageId } = data;

            if (!messageId || typeof messageId !== "string") {
                throw new Error("Invalid or missing messageId.");
            }

            // Find the current user by socket ID
            const currentUser = await User.findOne({ socketID: socket.id });
            if (!currentUser || !currentUser.roomID) {
                throw new Error("User not authenticated or not in a room.");
            }

            const username = currentUser.username;

            // Find the message
            const message = await Message.findOne({ id: messageId });
            if (!message) {
                throw new Error("Message not found.");
            }

            // Extract roomID from message ID (format: roomID-1000001 etc.)
            const [roomIDFromId] = messageId.split('-');
            if (roomIDFromId !== currentUser.roomID) {
                throw new Error("Message does not belong to your current room.");
            }

            // Authorization: Only the sender can delete their own message
            if (message.sender !== username) {
                throw new Error("You can only delete your own messages.");
            }

            // === Handle file deletion if files exist ===
            if (message.file && Array.isArray(message.file) && message.file.length > 0) {
                const fs = require('fs').promises;
                const path = require('path');

                // Assuming files are saved on disk with filename stored in file.fileName
                // Adjust the upload directory path according to your setup
                for (const fileItem of message.file) {
                    if (fileItem.file) {
                        const filePath = path.join(uploadDir,fileItem.file.split('/')[2]);
                        try {
                            await fs.unlink(filePath);
                            console.log(`Deleted file: ${filePath}`);
                        } catch (err) {
                            if (err.code !== 'ENOENT') {
                                console.error(`Failed to delete file ${filePath}:`, err);
                            } else {
                                console.log(`File already missing (not found): ${filePath}`);
                            }
                        }
                    }
                }
            }

            // === Delete the message from database ===
            await Message.deleteOne({ id: messageId });

            // === Update room's lastUpdated timestamp ===
            await Room.findOneAndUpdate(
                { roomID: currentUser.roomID },
                { $set: { lastUpdated: new Date() } }
            );

            // === Broadcast deletion to all clients in the room ===


            io.in(currentUser.roomID).emit("delete", messageId);

            // Optional: Send notification to others that a message was deleted
            const room = await Room.findOne({ roomID: currentUser.roomID });
            if (room) {
                const onlineUsers = await User.find({ username: { $in: room.members } });

                onlineUsers.forEach((user) => {
                    if (user.username !== username && user.socketID) {
                        io.to(user.socketID).emit("notification", {
                            title: `Message deleted (MetaChat): ${room.roomName}`,
                            message: `<i>${currentUser.first_name} ${currentUser.last_name}</i> deleted a message.`,
                            roomID: currentUser.roomID,
                            timestamp: new Date()
                        });
                    }
                });
            }

            // Success callback
            if (typeof callback === "function") {
                callback({ success: true });
            }

            console.log(`Message ${messageId} deleted by ${username}`);

        } catch (error) {
            console.error("Error deleting message:", error);
            if (typeof callback === "function") {
                callback({ success: false, error: error.message });
            }
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
            const timestamp = new Date();
            const currentUser = await User.findOne({ socketID: socket.id });
            if (!currentUser || !currentUser.roomID) {
                throw new Error("User not found or not part of a room.");
            }
            const username = currentUser.username;
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
            const room = await Room.findOne({ roomID : currentUser.roomID});
            if (!room) throw new Error("Room not found!");

            const roomMembers = room.members; // لیست اعضای اتاق
            
            // گرفتن Socket ID کاربران از دیتابیس
            const onlineUsers = await User.find({ username: { $in: roomMembers } });
            
            const selfSender = await User.findOne({ username });
            
            const axios = require('axios');

            const AES_SECRET_KEY = '56ca69fbace71736c278a4e47137a9be'; // دقیقا 32 بایت
            const AES_IV = crypto.randomBytes(16); // Initialization Vector

 
           

            // console.log(encryptedMessage)
            // ارسال پیام به تمام کاربران حاضر در اتاق
            onlineUsers.forEach(async (user) => {
                if (user.username != username && user.username == message.sender) {

                    if (user.username) {
                        const taskMatch = room.roomName.match(/\(#(\d+)\)/);
                        const pvMatch = room.roomName.match(/\(PV\)Chat between (\d{11}) and (\d{11})/);
                        let tempMessage;
                        
                        if (pvMatch) {
                            const senderNumber = pvMatch[1];
                            const receiverNumber = pvMatch[2];
                            tempMessage = {
                                title: 'New private message (MetaChat)',
                                message: `<b>Private Chat</b><br><i>${selfSender.first_name} ${selfSender.last_name}</i> said: <br>Reacted to your message`,
                                timestamp
                            };
                        } else if (taskMatch) {
                            const taskID = taskMatch[1];
                            tempMessage = {
                                title: 'New comment (MetaChat)',
                                message: `<b>In ${room.roomName}</b><br><i>${selfSender.first_name} ${selfSender.last_name}</i> Commented: <br>Reacted to your message`,
                                link: "/view?TaskID=" + taskID,
                                timestamp
                            };
                        } else {
                            tempMessage = {
                                title: 'New Message (MetaChat)',
                                message: `<b><i>${selfSender.first_name} ${selfSender.last_name}</i></b>: <br>Reacted to your message`,
                                timestamp
                            };
                        }
                        

                        await Promise.all(onlineUsers.map(user => sendBackupToPHP(user.username, tempMessage)));
                    }
                }
            });
            
            console.log(`🔔 Notification sent to users in room "${roomID}"`);
        } catch (error) {
            console.error("Error adding reaction:", error);
            socket.emit("error", { message: "Failed to add reaction." });
        }
    });
    
//    socket.on("markMessagesRead", async ({ messageIds ,roomID}) => {
//         try {
//             const currentUser = await User.findOne({ socketID: socket.id });
//             if (!currentUser || !currentUser.roomID) {
//                 throw new Error("User not found or not part of a room.");
//             }

//             const username = currentUser.username;
//             const timestamp = new Date();
//             // console.log(messageIds)
//             // let roomFromMess= roomID;
//             // const room = await Room.findOne({ roomID: roomFromMess });
//             // if (!room) throw new Error("Room not found!");

//             // const roomMembers = room.members;

//             // // Adjust this check if `room.members` is a list of objects
//             // const isMember = Array.isArray(roomMembers)
//             //     ? roomMembers.some(m => typeof m === 'string' ? m === username : m.username === username)
//             //     : false;

//             // if (!isMember) {
//             //     throw new Error("User is not a member of this room!");
//             // }

//             const updatedMessages = await Promise.all(
//                 messageIds.map(async (messageId) => {
//                     const messagebyroomID = `${messageId}`;
//                     console.log(`${username}_____${messagebyroomID} unreaded`);

//                     await Message.updateMany(
//                         {
//                             id: { $lte: messagebyroomID },
//                             "read.username": { $ne: username }
//                         },
//                         {
//                             $addToSet: { read: { username, time: timestamp } }
//                         }
//                     );

//                     const message = await Message.findOne({ id: messagebyroomID }).lean();
//                     if (!message) return null;

//                     const readUsers = await Promise.all(
//                         message.read.map(async (readEntry) => {
//                             const userRead = await User.findOne({ username: readEntry.username })
//                                 .select("first_name last_name")
//                                 .lean();
//                             return {
//                                 name: userRead ? `${userRead.first_name} ${userRead.last_name}` : readEntry.username,
//                                 time: readEntry.time,
//                             };
//                         })
//                     );

//                     return { id: messagebyroomID, readUsers };
//                 })
//             );

//             updatedMessages
//                 .filter(msg => msg)
//                 .forEach((msg) => {
//                     // Send only to others in the room
//                     socket.to(currentUser.roomID).emit("readMessageUpdate", {
//                         id: msg.id,
//                         readUsers: msg.readUsers
//                     });
//                 });

//         } catch (error) {
//             console.error("Error in markMessagesRead:", error.message);
//         }
//     });

    
    // socket.on("markMessagesRead", async ({ messageIds, username }) => {
    //     try {
    //         const timestamp = new Date();
    
    //         // Update the `read` array for each message
    //         await Promise.all(
    //             messageIds.map((messageId) =>
    //                 Message.updateOne(
    //                     { id: messageId, "read.username": { $ne: username } }, // Ensure username isn't already marked
    //                     { $addToSet: { read: { username, time: timestamp } } } // Add username and timestamp
    //                 )
    //             )
    //         );
    
    //         // console.log(`Messages marked as read for user "${username}":`, messageIds);
    
    //         // Optionally notify others in the room of read receipts
    //         socket.broadcast.emit("messagesRead", { messageIds, username, timestamp });
    //     } catch (error) {
    //         console.error("Error in markMessagesRead:", error.message);
    //     }
    // });
    
    socket.on("markMessagesRead", async ({ messageIds, roomID }) => {
        try {
            const currentUser = await User.findOne({ socketID: socket.id });

            if (!currentUser) {
                throw new Error("User not found.");
            }

            if (!roomID) {
                throw new Error("No room provided.");
            }

            // ✅ Validate room membership
            const room = await Room.findOne({ roomID }).lean();
            if (!room) {
                throw new Error("Room not found!");
            }

            const isMember = room.members?.some(m =>
                typeof m === 'string'
                    ? m === currentUser.username
                    : m.username === currentUser.username
            );

            if (!isMember) {
                throw new Error("User is not a member of this room!");
            }

            const timestamp = new Date();
            const username = currentUser.username;

            // ✅ Update all messages in parallel
            const updatedMessages = await Promise.all(
                messageIds.map(async (messageId) => {
                    await Message.updateMany(
                        {
                            id: { $lte: messageId },
                            roomID,
                            "read.username": { $ne: username }
                        },
                        {
                            $addToSet: { read: { username, time: timestamp } }
                        }
                    );

                    const message = await Message.findOne({ id: messageId })
                        .select("id read")
                        .lean();
                    if (!message) return null;

                    // Resolve read user names
                    const readUsers = await Promise.all(
                        message.read.map(async (entry) => {
                            const user = await User.findOne({ username: entry.username })
                                .select("first_name last_name")
                                .lean();
                            return {
                                name: user ? `${user.first_name} ${user.last_name}` : entry.username,
                                time: entry.time
                            };
                        })
                    );

                    return { id: messageId, readUsers };
                })
            );

            // ✅ Emit updates only to other users in the room
            updatedMessages
                .filter(Boolean)
                .forEach((msg) => {
                    socket.to(roomID).emit("readMessageUpdate", msg);
                });

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
    socket.on("countNewMessage", async(username, roomID, callback) => {
       
        // Fetch messages from the database (adjust this based on your database query)
        Message.find({ roomID: roomID }) // Get all messages in the room
            .then(messages => {
                let newMessageCount = messages.filter(msg =>
                    !msg.read.some(r => r.username === username) // Check if the user has NOT read it
                ).length;
    
                // Send back the count
                callback(newMessageCount);
            })
            .catch(error => {
                console.error("Error counting new messages:", error);
                callback(0); // Default to 0 in case of an error
            });
    });
    socket.on("lastUpdatedTime", async (username, roomID, callback) => {
        const room = await Room.findOne({ roomID: roomID });
      
        const time = room.lastUpdated ?? null;  // ❗️ اینجا دیگه تاریخ ساختگی نمی‌دیم
        // console.log(`${room.roomName}  lastUpdate: ${time}`);
        callback(time);
      });
      
    // for count
// fornt code    
    // socket.emit("countNewMessage", "09173121943", "krrlnB6aMRm6symph2", (count) => {
    //     console.log(`You have ${count} new messages.`);
    // });
socket.on("leaveRoom", async ({ username , roomID }) => {
    try {
        if (!username || !roomID) {
            socket.emit("error", { error: `${username} : ${roomID} Invalid data provided for leaving the room` });
            return;
        }

        // Find the room
        const room = await Room.findOne({ roomID });
        if (!room) {
            socket.emit("error", { error: `Room "${roomID}" does not exist` });
            return;
        }

        // Optional: Check if user is a member (for logging/debugging only)
        if (!room.members.includes(username)) {
            console.warn(`User "${username}" is leaving room "${roomID}" but not listed as a member.`);
        }

        // Leave the socket.io room (but do NOT remove from DB)
        socket.leave(roomID);

        // Clear user.roomID
        const updatedUser = await User.findOneAndUpdate(
            { username },
            { roomID: null },
            { new: true }
        );

        if (updatedUser) {
            console.log(`${username} left ${roomID} (remains a member).`);
        }

        // Notify this user
        socket.emit("leftRoom", { roomID });

        // Notify others in the room
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
                onlineUsersServer.delete(socket.id);

                const updatedUser = await User.findOneAndUpdate(
                    { username: currentUsername },
                    { socketID: null, roomID: null },
                    { new: true }
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
