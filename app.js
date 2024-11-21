const express = require("express"),
    privateKey = fs.readFileSync("private-key.pem", "utf8"),
    certificate = fs.readFileSync("certificate.pem", "utf8"),
    credentials = { key: privateKey, cert: certificate },
    app = express(),
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
    server = require("http").createServer(credentials , app),
    { addUser, getUsers, deleteUser, getRoomUsers } = require("./users/users"),
    rooms = [],
    io =  socket(server, {
        cors: {
            origin: "http://172.16.28.166:4000", // Allow specific origin (frontend address)
            methods: ["GET", "POST"],
            allowedHeaders: ["my-custom-header"],
            credentials: true,  // Ensure credentials like cookies are allowed
        },
    });
   
var session = require("express-session");
var MemoryStore = require("memorystore")(session);

env.config();

app.use(
    cors({
        origin: "http://172.16.28.166:4000", // Allow specific origin
        methods: ["GET", "POST"], // Allow specific HTTP methods
        credentials: true, // Allow cookies if needed
    })
);
// Socket.io with CORS configuration


const mongoURI = "mongodb://localhost:27017/mydatabase"; // Replace with your URI
mongoose
    .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "a247be870c3def81c99684460c558f29a7b51d0d895df10011b5277fa8612771",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Set to true in production
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
    res.render("index", { roomid: req.params.id });
});


// Login/Registration Routes (Passport Auth)
app.get("/login", (req, res) => {
    res.render("login");
});
// Using async/await properly for login and handling redirects
app.post("/login", async (req, res, next) => {
    try {
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
    const newUser = new User({
        username: req.body.username,
        first_name: req.body.first_name,
        last_name: req.body.first_name,
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
app.post("/messages", async (req, res) => {
    const { roomId, sender, message } = req.body;

    // Validate input fields
    if (!roomId || !sender || !message) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const newMessage = new Message({ roomId, sender, message });
        await newMessage.save();
        res.status(201).json({ message: "Message saved successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch Messages for Display
app.get("/messages/:roomId", async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await Message.find({ roomId }).sort({ createdAt: 1 }); // Sort by timestamp
        res.status(200).json(messages);
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

const port = process.env.PORT || 4000;

server.listen(port, () => console.log(`Listening on ${port}`));

// Socket Configuration
const roomExists = (roomName) => {
    const index = rooms.findIndex((room) => room === roomName);
    return index === -1 ? false : true;
};

io.on("connection", (socket) => {
    socket.on("createRoom", async ({ handle }) => {
        let roomName = Math.random().toString(36).substr(2, 6);
        while (await Room.findOne({ roomName })) {
            roomName = Math.random().toString(36).substr(2, 6);
        }

        const room = new Room({
            roomName,
            admin: handle.trim(),
        });

        await room.save();

        const data = { handle: handle, room: room };
        rooms.push(room); // Keep the in-memory copy for active use
        socket.join(room.roomName);
        addUser(socket.id, handle.trim(), room);

        socket.emit("joined", data);
        socket.broadcast.to(room.roomName).emit("newconnection", data);
    });

    socket.on("joinRoom", async (data) => {
        const room = await Room.findOne({ roomName: data.room });
        if (room) {
            const user = new User({
                socketID: socket.id,
                name: data.handle.trim(),
                roomID: room.roomName,
            });

            await user.save();

            socket.join(data.room);
            addUser(socket.id, data.handle.trim(), room);

            socket.emit("joined", { handle: data.handle, room });
            socket.broadcast.to(data.room).emit("newconnection", { handle: data.handle });
        } else {
            socket.emit("invalidRoom", { message: "Invalid room ID" });
        }
    });

    socket.on("chat", async (data) => {
        const uniqueId = uuidv4();
        const currentUser = getUsers().find((obj) => obj.id === socket.id);
        if (currentUser) {
            console.log(`Generated unique ID: ${uniqueId}`);
            const message = new Message({
                id: uniqueId,
                roomID: currentUser.room.roomName,
                sender: data.handle.trim(),
                message: data.message,
                file: data.file || null,
            });

            await message.save();

            io.in(currentUser.room.roomName).emit("chat", message);
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
        const currentUser = getUsers().filter((obj) => obj.id == socket.id);
        socket.broadcast.to(currentUser[0].room.roomName).emit("typing", data);
    });

    socket.on("leaveRoom", (handle) => {
        const user = deleteUser(socket.id);
        if (user) {
            socket.leave(user.room.roomName);
            socket.emit("left", user);
            socket.broadcast.to(user.room.roomName).emit("userDisconnected", user.name);
        }
    });

    socket.on("disconnect", () => {
        const user = deleteUser(socket.id);
        if (user) {
            socket.broadcast.to(user.room.roomName).emit("userDisconnected", user.name);
        }
    });

    socket.on("error", (error) => {
        console.log(error);
        socket.emit("error", { message: error });
    });
});
