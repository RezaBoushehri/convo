const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const express = require("express"),
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
    { addUser, getUsers, deleteUser, getRoomUsers   } = require("./users/users"),
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

// phone validation
function phoneVal(phoneNumber, res) {
    // Basic server-side validation
    const phoneRegex = /^[0-9]{10}$/;

    if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).send('Invalid phone number');
    }

    // Proceed with further logic if valid
    res.send('Phone number is valid');
}


const mongoURI = "mongodb://localhost:27017/chatRoom"; // Replace with your URI
mongoose
    .connect(mongoURI, {})
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

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
            checkPeriod: 86400000 // prune expired entries every 24h
        }),
        secret:
            process.env.SESSION_SECRET ||
            "a247be870c3def81c99684460c558f29a7b51d0d895df10011b5277fa8612771",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true }, // Set to true in production
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

// Routes
app.get("/", middleware.isLoggedIn, (req, res) => {
    res.render("index", { roomid: "" });
});

app.get("/join/:id", middleware.isLoggedIn, (req, res) => {
    const roomID = req.params.id;

    // Check if the room exists in the `rooms` array or object
    const roomExists = rooms.find((room) => room.roomID === roomID);

    if (roomExists) {
        // Render the room and provide the room ID
        res.render("index", { roomid: roomID });
    } else {
        // If the room does not exist, redirect or send an error
        res.status(404).json({ error: "Room not found" });
    }
});
// Login/Registration Routes (Passport Auth)
app.get("/login", (req, res) => {
    res.render("login");
});

// Using async/await properly for login and handling redirects
app.post("/login", async (req, res, next) => {
    try {
        const user = await User.findByUsername(req.body.username);
        if (!user) {
            return res.redirect("/login");
        }

        passport.authenticate("local", async (err, authenticatedUser, info) => {
            if (err) {
                return next(err);
            }

            if (!authenticatedUser) {
                return res.redirect("/login");
            }

            req.logIn(authenticatedUser, async (err) => {
                if (err) {
                    return next(err);
                }

                req.session.username = authenticatedUser.username;

                // Reset socketID to null after login
                await User.updateOne(
                    { _id: authenticatedUser._id },
                    { $set: { socketID: null } } 
                );

                req.session.save((err) => {
                    if (err) {
                        console.error("Error saving session:", err);
                    }
                });
               
                res.redirect("/"); // Redirect after login
            });
        })(req, res, next);
    } catch (err) {
        return next(err);
    }
});



  

app.post("/register", (req, res) => {
    // phoneVal(req.body.username,res)
    const newUser = new User({
        username: req.body.username,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        password: req.body.password
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
app.get("/messages/:roomId", async (req, res) => {
    try {
        const { roomId } = req.params;

        // Fetch messages for the given room ID
        const messages = await Message.find({ roomID: roomId }).sort({ createdAt: 1 });

        if (messages.length > 0) {
            res.status(200).json(messages); // Return all messages
        } else {
            res.status(404).json({ error: "No messages found for this room" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


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


io.on("connection", (socket) => {
    const socketId = socket.id;
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
    
        const data = { handle: handle, room: room };
    
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
    socket.on("joinRoom", async ({ roomID, username }) => {
        try {
            const user = await User.findOne({ username });
            console.log(`User ${username} is trying to join room ${roomID}`);
    
            // Ensure the room exists
            const room = await Room.findOne({ roomID:roomID });
            if (!room) throw new Error(`Room "${roomID}" does not exist`);
    
            await addUserToRoom(username, roomID);
            socket.join(roomID);
    
            console.log(`Fetching all unread messages for room: ${roomID}`);
            const unreadMessages = await getUnreadMessages(roomID, username);
            // Process each message

            console.log("unreadMessage :",unreadMessages);

                // Emit unread messages first
            if (unreadMessages.length > 0) {
                socket.emit("restoreMessages", { messages: unreadMessages, prepend: true });
            } else {
                try {
                    console.log("No unread messages. Fetching the last 20 messages.");
                    
                    // Fetch the last 20 messages for the room
                    const lastMessages = await getMessagesByLimit(roomID, 20);
                     // Process each message
                    const processedMessages = await Promise.all(
                        lastMessages.map(async (msg) => await processMessage(msg))
                    );
                    if (processedMessages.length > 0) {
                        console.log("Fetched last 20 messages:", processedMessages);
                        socket.emit("restoreMessages", { messages: processedMessages, prepend: true });
                    } else {
                        console.log("No messages found for the room.");
                        socket.emit("noMoreMessages", { message: "No messages available." });
                    }
                } catch (err) {
                    console.error("Error fetching last 20 messages:", err);
                    socket.emit("error", { message: "Failed to load messages." });
                }
            }

            // Emit user settings
            socket.emit("applySettings", user.settings);
    
            // Notify others
            socket.broadcast.to(roomID).emit("userJoined", { username, roomID });
    
            socket.emit("joined", { room });
    
          
    
        } catch (error) {
            console.error("Error joining room:", error);
            socket.emit("error", { message: error.message });
        }
    });
    
    // Create an in-memory object to track the last fetched date for each room (or user)
    socket.on("requestOlderMessages", async ({ roomID, counter }) => {
        try {
            // Debugging: Log the incoming data to ensure it's correct
            console.log("Received request for older messages:", { roomID, counter });
            
            // Adjust counter to fetch the previous batch of messages
            const startingID = counter;
            console.log("Starting ID for fetch:", startingID);
    
            // Calculate the limit dynamically based on the counter value
            const limit = (counter < 20) ? counter-1 : 20; // Use counter if it's less than 20, otherwise limit to 20
    
            // Fetch the older messages using the starting ID and dynamic limit
            const olderMessages = await getMessagesByID(startingID, limit); // Function to fetch messages
    
            console.log(olderMessages);
            // If there are older messages, process and send them back to the client
            if (olderMessages.length > 0) {
                // Process each message
                const processedMessages = await Promise.all(
                    olderMessages.map(async (msg) => await processMessage(msg))
                );
    
                console.log("Sending older messages.");
                socket.emit("restoreMessages", { messages: processedMessages, prepend: true });
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
async function getMessagesByID(startingID, limit) {
    const [room, currentCounter] = startingID.split("-");
    const counter = parseInt(currentCounter, 10); // Convert to integer
    
    if (isNaN(counter)) {
        throw new Error("Invalid startingID format: counter is not a number.");
    }

    console.log("Fetching messages older than counter =", counter, "for room =", room);

    // Query the database for messages with IDs numerically less than the given counter
    return await Message.find({
        roomID: room,
        // Extract the numeric part of the 'id' to compare with 'counter'
        id: { $lt: `${room}-${counter}` }, // The id format should still be 'room-counter'
    })
    .sort({ timestamp: -1 }) // Sort by 'id' in descending order to get older messages first
    .limit(limit || 20) // Limit the result to 20 messages, or the specified limit
    .lean(); // Use lean() to get plain JavaScript objects
}



async function getMessagesByLimit(roomID, limit) {
    return await Message.find({ roomID }) // Filter by room ID
        .sort({ timestamp: -1 }) // Sort by creation date in descending order
        .limit(limit) // Limit to the specified number
        .lean();
}

// Helper function to process each message
async function processMessage(msg) {
    const user = await User.findOne({ username: msg.sender }).select("first_name last_name").lean();
    const readUsers = await Promise.all(
        (msg.read || []).map(async (readEntry) => {
            const userRead = await User.findOne({ username: readEntry.username }).select("first_name last_name").lean();
            return {
                name: userRead ? `${userRead.first_name} ${userRead.last_name}` : readEntry.username,
                time: readEntry.time,
            };
        })
    );

    return {
        ...msg,
        sender: user ? `${user.first_name} ${user.last_name}` : msg.sender,
        handle: user ? `${user.first_name} ${user.last_name}` : msg.sender,
        readUsers
      
    };
}

    
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
                    name: userRead ? `${userRead.first_name} ${userRead.last_name}` : readEntry.username,
                    time: readEntry.time,
                };
            })
        );
    
        return {
            ...msg,
            sender: user ? `${user.first_name} ${user.last_name}` : msg.sender,
            handle: user ? `${user.first_name} ${user.last_name}` : msg.sender,
            readUsers,
            readLine: false, // Mark unread messages with a readLine
        };
    }
    
    
    
    socket.on("chat", async (data) => {
        try {
            const { username, message, image } = data;
            const timestamp = new Date();
    
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
            // if (!message || !username || !image) {
            const updatedCounter= 1000000+ (counter.seq||0)
            const newMessage = new Message({
                id: `${currentUser.roomID}-${updatedCounter}`,  // ID format: roomID-auto-increment number
                roomID : currentUser.roomID,
                sender: username,
                message : clean ? clean : image ? " ":null,
                file: image || null,
                read: [],
                timestamp,
            });
    
            await newMessage.save();
    
            // Enrich the message with sender details
            const enrichedMessage = {
                ...newMessage.toObject(),
                sender: `${currentUser.first_name} ${currentUser.last_name}`,
                handle: `${currentUser.first_name} ${currentUser.last_name}`,
            };
    
            // Broadcast the message to the room
            io.in(currentUser.roomID).emit("chat", enrichedMessage);
    
            console.log(`Message sent by ${username} in room "${currentUser.roomID}"`);
        // }
        } catch (error) {
            console.error("Error in chat:", error.message);
            socket.emit("chat", { error: "Failed to send message." });
        }
    });
    
    socket.on("markMessagesRead", async ({ messageIds, username }) => {
        try {
            const timestamp = new Date();
            // console.log(messageIds)
            // Update the `read` array for each message
            const updatedMessages = await Promise.all(
                messageIds.map(async (messageId) => {
                    await Message.updateOne(
                        { id: messageId, "read.username": { $ne: username } }, // Ensure username isn't already marked
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
                socket.broadcast.to(user.roomID).emit("userDisconnected", user.last_name);
                
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
