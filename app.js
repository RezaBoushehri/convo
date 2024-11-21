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
    { addUser, getUsers, deleteUser, getRoomUsers  } = require("./users/users"),
    rooms = [],
     
    io = socket(server, {
        cors: {
            origin: "https://localhost:4000", // Replace with your client URL
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

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
    const roomExists = rooms.find((room) => room.roomName === roomID);

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
        // phoneVal(req.body.username,res)
        // Find the user by username using async/await
        const user = await User.findByUsername(req.body.username);

        // If the user is not found
        if (!user) {
            return res.redirect("/login");
        }

        // Authenticate the user using Passport.js local strategy
        passport.authenticate("local", (err, user, info) => {
            if (err) {
                return next(err); // Handle any errors that may occur
            }

            if (!user) {
                // If authentication fails (no user found), redirect to login with message
                return res.redirect("/login");
            }

            req.logIn(user, (err) => {
                if (err) {
                    return next(err); // Handle any login errors
                }

                // Redirect after successful login
                let redirectUrl = req.session.redirectUrl || "/";
                if (redirectUrl.indexOf("login") !== -1) {
                    redirectUrl = "/";
                }
                res.redirect(redirectUrl);
            });
        })(req, res, next); // Explicitly call the authenticate function with next()
    } catch (err) {
        return next(err); // Handle errors while finding the user
    }
});


app.post("/register", (req, res) => {
    // phoneVal(req.body.username,res)
    const newUser = new User({
        username: req.body.username,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
    });

    User.register(newUser, req.body.password, (error, user) => {
        if (error) {
            console.log(error.message);
            return res.redirect("/register");
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
app.get("/logout", function (req, res) {
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
// const addUserToRoom = async (socketId, roomName) => {
//     try {
//         // Find the user from the in-memory user list or database
//         const user = getUsers().find(user => user.id === socketId);
        
//         if (user) {
//             // Update the user's roomID in the database
//             await User.findOneAndUpdate(
//                 { socketID: socketId },   // Filter by socketID
//                 { $set: { roomID: roomName } },  // Set the roomID
//                 { new: true }              // Return the updated document
//             );

//             // Update the room's members array in the database
//             await Room.findOneAndUpdate(
//                 { roomName: roomName },       // Find the room by its name
//                 { $addToSet: { members: socketId } }, // Add the socketId to the members array (avoid duplicates)
//                 { new: true }                // Return the updated room document
//             );

//             console.log(`User with socketId: ${socketId} added to room: ${roomName}`);
//         } else {
//             console.error("User not found when adding to room");
//         }
//     } catch (error) {
//         console.error("Error adding user to room:", error);
//     }
// };
const addUserToRoom = async (socketId, roomName) => {
    try {
        const roomExists = await Room.findOne({ roomName: roomName });

        if (!roomExists) {
            throw new Error('Room does not exist');
        }

        // Check if user is already in the room
        if (Room.members.includes(socketId)) {
            throw new Error('User already in the room');
        }

        Room.members.push(socketId); // Add the user
        await Room.save();
        console.log(`User with socketId ${socketId} added to room ${roomName}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
};

// const removeUserFromRoom = async (socketId, roomName) => {
//     try {
//         const room = await Room.findOne({ roomName: roomName });

//         if (!room) {
//             throw new Error('Room does not exist');
//         }

//         const userIndex = room.members.indexOf(socketId);

//         if (userIndex === -1) {
//             throw new Error('User not found or not in a room');
//         }

//         room.members.splice(userIndex, 1); // Remove the user
//         await room.save();
//         console.log(`User with socketId ${socketId} removed from room ${roomName}`);
//     } catch (error) {
//         console.error('Error:', error.message);
//     }
// };


// // Socket Configuration
// const roomExists = (roomName) => {
//     const index = rooms.findIndex((room) => room === roomName);
//     return index === -1 ? false : true;
// };

io.on("connection", (socket) => {
    const socketId = socket.id; // Make sure you're getting socketId properly
    // Add user to room with this socketId
    addUserToRoom(socketId, 'roomName');
    socket.on("createRoom", async ({ handle, roomID }) => {
        let roomName = roomID;
        
        // Check if room name already exists, if so, keep generating a new name
        while (await Room.findOne({ roomName })) {
            roomName = `${roomID}-${Math.floor(Math.random() * 1000)}`; // Add random suffix to make the name unique
        }
    
        const room = new Room({
            roomName,
            admin: handle.trim(),
        });
    
        await room.save(); // Save the room to MongoDB
    
        const data = { handle: handle, room: room };
        socket.join(room.roomName);  // Join the socket to the room
    
        addUser(socket.id, handle.trim(), room);  // Add user to a custom user list (if needed)
    
        socket.emit("joined", data);  // Notify the user they've joined the room
        socket.broadcast.to(room.roomName).emit("newconnection", data);  // Broadcast to other users in the room
    });
    
   // Handle joining a room
    // socket.on("joinRoom", async ({ roomID }) => {
    //     try {
    //         // Check if the room exists
    //         const roomExists = await Room.findOne({ roomName: roomID });
            
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

    socket.on('joinRoom', (roomName) => {
        console.log(`Adding user with socketId: ${socket.id} to room: ${roomName}`);
        addUserToRoom(socket.id, roomName);
    });    
    
    socket.on("chat", async (data) => {
        const uniqueId = uuidv4();
        const currentUser = getUsers().find((obj) => obj.id === socket.id);
        if (currentUser) {
            const message = new Message({
                id: uniqueId,
                roomID: currentUser.room.roomName,
                sender: data.handle.trim(),
                message: data.message,
                file: data.image || null,
            });
    
            try {
                await message.save();
                io.in(currentUser.room.roomName).emit("chat", message);

            } catch (error) {
                console.error("Error saving message:", error);
                socket.emit("error", { message: "Failed to save message" });
            }
        }
    });
    
    socket.on("info", async () => {
        const currentUser = await User.findOne({ socketID: socket.id });
        if (currentUser) {
            const room = await Room.findOne({ roomName: currentUser.roomID });
            const users = await User.find({ roomID: currentUser.roomID });
            const messages = await Message.find({ roomID: currentUser.roomID }).sort({ timestamp: 1 });

            socket.emit("info", { room, users, messages });
        } else {
            socket.emit("error", { message: "User not found or not in a room" });
        }
    });

    socket.on("typing", (data) => {
        const user = data.trim();
        const currentUser = getUsers().find((obj) => obj.id == socket.id); // Use find() instead of filter()
        
        if (currentUser && currentUser.room) {
            socket.broadcast.to(currentUser.room.roomName).emit("typing", user); // Emit typing event to the room
        } else {
            console.error("Error: User not found or not in a room");
            socket.emit("error", { message: "User not found or not in a room" });
        }
    });
    
    socket.on("leaveRoom", async ({ roomID }) => {
        try {
            const room = await Room.findOne({ roomName: roomID });
    
            if (room) {
                // Remove the user from the room's members list
                room.members = room.members.filter(member => member !== socket.id);
                await room.save();
    
                socket.leave(roomID);
                socket.emit("leftRoom", { roomID: room.roomName });
    
            } else {
                socket.emit("error", { error: "Room does not exist" });
            }
        } catch (error) {
            console.error(error);
            socket.emit("error", { error: "Failed to leave room" });
        }
    });
    

    socket.on("disconnect", () => {
        const user = deleteUser(socket.id);
        if (user) {
            socket.broadcast.to(user.room.roomName).emit("userDisconnected", user.name);
        }
    });

    socket.on("error", (error) => {
        console.log(getUsers());  // Check if the user list is correct

        console.log("Socket error:", error);
        console.log(`Adding user with socketId: ${socketId} to room: ${roomName}`);

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
