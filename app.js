const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const crypto = require('crypto');
const ipRangeCheck = require("ip-range-check");
const express = require("express");
const multer = require("multer");
// const jwt = require('jsonwebtoken');
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
    // cron = require('node-cron'),
    getMessagesUpToYesterday_file_delete = require('./services/getYesterdayMessages'),
    {deleteFile,room_managament,room_delete_messages,delete_OrphanFiles} = require('./services/del_room'),
    {socketEncrypt,socketDecrypt,encryptAES256,decryptAES256,decrypt} = require('./services/encryption'),
    { message_encryption,
        message_encryption_map,
        sendBackupToPHP,
        processMessage,
        getUnreadMessages,
        count_new_msg_room,
        rgbToHex,
        removePx,
        show_message_onload} = require('./services/messages_func'),
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

// const { timeStamp, error } = require("console");
var session = require("express-session");
const Log_message = require('./services/log');
const room = require('./models/room');
// const { settings } = require('cluster');
// const { now } = require('mongoose');
var MemoryStore = require("memorystore")(session);

env.config();
// Set up CORS (if needed for front-end)
const corsOptions = {
    
    origin:  ['https://mc.farahoosh.ir'], // replace with your front-end domain
    methods: ['GET', 'POST'],
    credentials: true
};

app.use(cors(corsOptions));
// کلید و توکن نمونه
const secretKey = process.env.SECRETKEY;
const SECRET_KEY_RTSP = process.env.SECRETKEY_RTSP;
const SECRET_KEY_TOKEN_AUTOLOGIN = process.env.SECRETKEY_LOGIN;


function sanitizeMessage(message) {  
    const withBreaks = message.replace(/\n/g, '<br>');
  const clean = DOMPurify.sanitize(withBreaks, {    
        ALLOWED_TAGS: [      
            'div','table','thead','tbody','tr','td','th',      
            'br','img','a','span','p','pre'    
        ],    
        ALLOWED_ATTR: [      
            'style',      
            'data-excel-formula',      
            'data-excel-value',      
            'data-excel-type',      
            'src',      
            'href'    
        ]  
    });
  if (clean !== withBreaks) {    
        console.warn("⚠️ Message contained unsafe content and was sanitized");  
    }
  return withBreaks;
}
// const mongoURI = "mongodb://chatAdmin:chatAdmin@127.0.0.1:27017/chatRoom?authSource=chatRoom"; // Replace with your URI
const mongoURI = "mongodb://adminChat:XMUZWqR4CnOwf@127.0.0.1:27017/chatRoom?authSource=chatRoom"; // Replace with your URI
mongoose
    .connect(mongoURI, {})
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
  

const sessionMiddleware = session({
    store: new MemoryStore({
        checkPeriod: 86400000
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 3 * 30 * 24 * 60 * 60 * 1000
    }
});



app.use(sessionMiddleware);
// app.use(cookieParser())

io.use((socket, next) => {  
    sessionMiddleware(socket.request, {}, async (err) => {      
        try {
             if (err) {
            throw new Error(err);
            };
            const session = socket.request.session;
            if (!session || !session.passport || !session.passport.user) {  
                throw new Error("unauthorized");     
            }
            const user = await User.findByUsername(session.passport.user);
            if (!user) {  
                throw new Error("unauthorized User");    
            }
            if (!user?.device_login) {  
                throw new Error("unauthorized Device");    
            }
            socket.user = user;
            socket.token = session.token;
            return next();      
        } catch (error) {
            console.error(`IO connection: `,error.message)
            return next(error)
        }
       
    });
});

// Middleware to enforce HTTPS
const skippTokenRefreshPaths = [
    "upload",
    "uploads",
    "upload_rtsp",
    "autoLogin",
    "login",
    "logout",
    "js",
   ];
app.use(async (req, res, next) => {
    // اگر این مسیر قرار نیست توکن ریفرش شود
    const path_splited = req.path.split('/')
    // console.log(req.path)
    const token_update = !(skippTokenRefreshPaths).includes(path_splited[1])
    if (req.headers['x-forwarded-proto'] === 'http') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    let user ;
    if (req.isAuthenticated && req.isAuthenticated()){ 
        return next();
    }
    // TODO: set cookie-parser later
    const cookieHeader = req.headers.cookie;
    req.cookies ={}
    if (!cookieHeader){
        return next()
    }
    const cookies = cookieHeader.split(';')
    for(const cookie of cookies) {
        const parts = cookie.split('=')
        const key = parts[0].trim()
        const value = parts.slice(1).join('=')
        req.cookies[key] = decodeURIComponent(value)
    }
    if (!req.cookies?.autoLogin) return next();
    const token = req.cookies.autoLogin ;
    if (!token) return next();
    console.log("used token:",token)

    try {

        user = await User.findOne({ 
            "devices.token": token, 
            "devices.expiresAt": { $gt: new Date() }
        });
        // const user_reza = await User.updateOne({username : '09173121943'},{ $set:{"devices":[]}});
        // console.log(user_reza)

        if (!user) return next();
        req.logIn(user, async (err) => {
            if (err) return next(err);
            try {
                const exp_time = Date.now() + 90 * 24 * 60 * 60 * 1000
                const expires = new Date(exp_time); // 3 months
                const new_token = encryptAES256(exp_time.toString(),SECRET_KEY_TOKEN_AUTOLOGIN)
                const exp_u_time = (user?.devices.filter(d=> d.token == token)[0].expiresAt)
                if(!token_update) return next()
                const T_time_str = decryptAES256(token, SECRET_KEY_TOKEN_AUTOLOGIN);
                const T_time_num = parseInt(T_time_str); // تبدیل به عدد
                const T_time_date = new Date(T_time_num); // تبدیل به Date
                // console.log("is_diff",(T_time_date).getTime !== (exp_u_time).getTime)
                // console.log("t_time",(T_time_date) ,"ex_time" ,(exp_u_time))
                if((T_time_date).getTime !== (exp_u_time).getTime) {
                    await User.updateOne(
                    { username:user.username, "devices.token": token },
                    { $pull: { devices: { token } } }
                    );
                        


                        // 2) Passport logout (passport@0.6 uses a callback)
                        req.logout((err) => {
                        if (err) return next(err);


                        // 3) Destroy server session
                        req.session?.destroy((err2) => {
                            if (err2) return next(err2);


                            // 4) Clear cookie (options should match how you set it)
                            res.clearCookie("autoLogin", {
                            httpOnly: true,
                            secure: true, // only works over HTTPS
                            sameSite: "lax",
                            path: "/",
                            });


                            // 5) Respond
                            return next();
                        });
                        });
                }
                user = await User.findOneAndUpdate({"devices.token": token },
                {
                    "device_login":new_token
                    ,
                    $set: {
                        "devices.$.token": new_token,
                        "devices.$.expiresAt": expires,
                        "devices.$.ip": req.ip,
                        "devices.$.lastActive": new Date()
                    }
                    
                },{new:true});


                req.session.username = user.username;
                req.session.token = new_token
                req.token = new_token
                req.user = user;
                res.cookie("autoLogin", new_token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: "lax",
                    path: "/",
                    expires: expires
                });
                return next();                
            } catch (error) {
                console.error('Decryption failed:', error.message);
                
                // پاک کردن کوکی نامعتبر
                res.clearCookie("autoLogin", {
                    httpOnly: true,
                    secure: true,
                    sameSite: "lax",
                    path: "/",
                });
                return next(error.message);

                // پاسخ مناسب به کاربر
                return res.status(401).json({ 
                    error: 'Session expired. Please login again.' 
                });
            }

            
        });

    } catch (err) {
        return next(err);
    }

});


app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    next();
});


// Routes
app.get("/:path", async (req, res, next) => {
    const path = req.params.path;
    
    // بررسی مسیرهای خاص
    if (path === 'undefined') {
        return res.redirect('/');
    }

    if (path.includes('profile')) {
        if (!req.user) {
            return res.redirect('/login');
        }

        const username = req.user.username;

        return res.render(path, { username });
    }

    next(); // ادامه جریان عادی
});


app.get("/", middleware.isLoggedIn,async (req, res) => {
    const username = req.user.username?? null; // Assuming username is stored in req.user
    const token = req.cookies.autoLogin ;

    // Clear previous room reference
    const currentUser = await User.findOneAndUpdate({ username ,"devices.token": token },
        {
            roomID: null ,
            $set: {
                // "devices.$.token": new_token,
                "devices.$.roomID": null,
                "devices.$.lastActive": new Date()
            }
    });

    const Device_room = currentUser?.devices.filter(d=> d.token == token)[0].roomID ?? null
    Room.findOneAndUpdate({roomID: Device_room,"member_data.id":currentUser?._id},{
        member_data:
        {
            $set:{
               "member_data.$.leaved_at" : new Date()
            }
        }
    })
    if(username) {
        res.render("index", { roomID: "" ,rgbToHex, removePx, username: username});
    }
    else{
        res.redirect("/login");
    }   

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
                    res.render("index", { roomID: roomID, rgbToHex, removePx, room ,username: username });
                } else {
                    res.redirect(`/?error=${encodeURIComponent("You are not a member of this private room")}`);
                }
            } else if (room.setting[0].Joinable_url === "public") {
                // Public room: Anyone can join
                res.render("index", { roomID: roomID, rgbToHex, removePx, room , username: username });
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
    // const username = req?.session?.username ?? null; // Assuming username is stored in req.user
    // if(username){
    //     return res.render("index", { roomID: "" ,username: username});
    // } else{

        return res.render("login");
    // }
});

// Using async/await properly for login and handling redirects
app.post("/login", async (req, res, next) => {
    try {
        const sanitizedUsername = DOMPurify.sanitize(req.body.username);
        const user = await User.findByUsername(sanitizedUsername);
        if (!user) {
            // User not found
            return res.redirect(`/login?error=${encodeURIComponent("Username or Password is wrong")}`);
        }
    
        // Direct comparison for cleartext password
        // TODO : set bypass passwords on login
        // const bcrypt = require("bcrypt");

        // const valid = await bcrypt.compare(req.body.password, user.password);

        // if (!valid) {
        //     return res.redirect("/login?error=Invalid Password");
        // }   
        if (req.body.password !== user.password) {
            // Invalid password
            return res.redirect(`/login?error=${encodeURIComponent("Username or Password is wrong")}`);
        }
    
        passport.authenticate("local", async (err, authenticatedUser, info) => {
            if (err) {
                // Passport authentication error
                console.error("Passport authentication error:", err);
                return next(err);
            }
    
            if (!user) {
                // Authentication failed
                return res.redirect(`/login?error=${encodeURIComponent("Authentication Failed")}`);
            }
    
            req.logIn(user, async (err) => {
                if (err) {
                    // Error during login
                    console.error("Error during login:", err);
                    return next(err);
                }
    
                req.session.username = user.username;
                
                try {
                    // Reset socketID to null after login
                    
                    const exp_time = Date.now() + 90 * 24 * 60 * 60 * 1000
                    const expires = new Date(exp_time); // 3 months
                    const token = encryptAES256(exp_time.toString(),SECRET_KEY_TOKEN_AUTOLOGIN)
                    const newDevices ={
                        token: token,       
                        ip: req.ip,       
                        userAgent: req.headers["user-agent"],       
                        createdAt: new Date(),       
                        expiresAt: expires
                    }
                    await User.updateOne( { _id: user._id }, 
                    {   $push: {     
                            devices: {     
                                $each:[newDevices],
                                $slice:-5
                            }  
                        } 
                    });

                    res.cookie("autoLogin", token, {
                        httpOnly: true,
                        secure: true,
                        sameSite: "lax",
                        path:"/",
                        expires: expires
                    });
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
    if(!req?.user?.username) return res.status(404);  
    const username = req.user.username; // Assuming username is stored in req.user
    if(username !== '09173121943')res.redirect("/login?error=Access Denied.");
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
        settings : init_settings
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

// File upload storage settings
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        if(!req?.session?.username) return cb(new Error ("No username detected."));  
        const username = req.session.username; // Assuming username is stored in req.user
        const safeFileName = Buffer.from(file.originalname, "latin1").toString("utf8"); // Ensure UTF-8
        cb(null, username + "_"+ Date.now() + "_" + safeFileName.replace(/\s+/g, "_")); // Avoid spaces
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 10 MB max
}).array("files");

const storage_rtsp = multer.diskStorage({    
    destination: (req, file, cb) => {        
        cb(null, uploadDir);    
    },    
    filename: (req, file, cb) => {        
        const safeFileName = Buffer.from(file.originalname, "latin1").toString("utf8");        
        cb(null, safeFileName.replace(/\s+/g, "_"));    
    },
});
const upload_rtsp_file = multer({ 
        storage: storage_rtsp 
    }).array("files");

// Handle file upload (existing code)
app.post("/upload_rtsp",async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    const allowedRanges = [
        "172.16.28.30",  // existing range
        "94.74.128.194",   // additional IP
        "94.74.128.193"    // additional IP
    ];
    
    const ipIsAllowed = allowedRanges.some(range => ipRangeCheck(clientIP, range));
    if(!ipIsAllowed) return res.status(401).end()
    upload_rtsp_file(req, res,async (err) => {


        if(!req.body.payload && !req.files){
            return res.status(400).json({error:"No message"})
        }
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        try{
            const json = decrypt(req.body.payload,SECRET_KEY_RTSP)
            if(!json?.message){

                return res.status(401).end()
            }
            const savedFiles = req?.files?.map(f=>({
                file: `/uploads/${f.filename}`,
                fileName: Buffer.from(f.originalname, "latin1").toString("utf8"),
                fileType: f.mimetype,
            }))
            // return res.status(200).json({success:true, savedFiles})
            // File successfully uploaded
            const roomID = '8x12wLE6irmn714ker' //rtsp room
            const username = 'Heimdall'
            Log_message(json.message,savedFiles??null,roomID)
            return res.status(200).json({success:true })
        } catch (error) {
            console.log(`uploading RTSP ${error.message}`)
            res.json({
        message : error.message})
        }

    })
})

// Handle file upload (existing code)
app.post("/upload", (req, res) => {
    upload(req, res,async (err) => {
        if(!req?.files || req?.files?.length == 0 ){
            return res.status(400).json({error:"No files uploaded"})
        }
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            if(!req?.session?.username){

                return res.status(401).end()
            } else{
                const user_auth =  await User.findOne({username: req.session.username}).then(user=>{

                    if(!user){
                       return false;
                    }else{
                        console.log(`${user.username} uploading ... `)
                        return true
                    }
                })
                if(!user_auth){
                    return res.status(401).end()
                }
            }
            console.log(req.files)
            // File successfully uploaded

            // Respond with the file data (including the file path and metadata)
            const savedFiles = await req.files.map(f=>({
                file: `/uploads/${f.filename}`,
                fileName: Buffer.from(f.originalname, "latin1").toString("utf8"),
                fileType: f.mimetype,
            }))
            res.json({
                message: "File uploaded successfully",
                fileData: savedFiles,
            });
            // console.log("File uploaded successfully:", req.file.originalname);
            // console.log("File path:", filePath);
                
        } catch (error) {
            req.files.forEach(f=>{
                deleteFile(`/uploads/${f.filename}`)
            })
           res.json({
            message : error.message})
        }
       
        // Broadcast upload success event (emit file data)
        // io.emit("uploadSuccess", { fileData: { filePath, fileName: req.file.originalname } });
    });
});

// Serve the files from the 'uploads' 
app.get("/uploads/:file", async (req, res) => {  
    try {
        const fileName = path.basename(req.params.file); // جلوگیری از path traversal
        if (!req?.session?.username) {      
            return res.status(401).end();    
        }
        const username = req.session.username;    
        console.log(`${fileName}--------> ${username}`)
        const filePath = path.join(uploadDir, fileName);
    if (!fs.existsSync(filePath)) {      
            return res.status(404).end();    
        }
    const access = await file_access(`/uploads/${fileName}`, username);
    if (!access.success) {      
            return res.status(403).json(access);    
        }
    return res.sendFile(filePath);
  } catch (error) {    
        console.error("UPLOADS:", error.message);    
        return res.status(500).end();  
    }
});
async function authinticate_room(roomID,username){
    const resault = await Room.findOne({ roomID }).then(room=>{
        if (!room) return false;
        if(!room?.setting[0]?.Joinable_url) return true
        if (room.setting[0].Joinable_url === "private" && !room.members.includes(username)) {
            return false;
        }else{
            // socket.join(roomID);
            return true
        }
    })
    return resault
}
async function file_access(file,username){

    if(!file|| !username) return {success:false , message:'File not found.'}
    const message = await Message.findOne({"file.file":file}).select("read roomID")
    if(message?.length == 0 ) return {success:false , message:'File not found.'}
    const check_room_permissions = await authinticate_room(message?.roomID,username)
    // TODO: fix read files in chat later
    // const read = await message?.read.filter((r) => r.username === username);
        // if(read.length > 0 && check_room_permissions){
        if(check_room_permissions){
            return  {success: true}
        }else{
            return {success: false, message: 'No accesss.'}
        }
}
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

        // رمزگشایی داده‌های رمزگذاری‌شده
        const encryptedData = req.body.data;
        const decryptedData = decrypt(encryptedData, secretKey);

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
                    if(decryptedData.append==1){
                        existingRoom.members = [...new Set([...existingRoom.members, ...phoneNumbers])]; // Avoid duplicates
                    }else if(decryptedData.append=='delete'){
                        // Remove phoneNumbers from members
                        existingRoom.members = existingRoom.members.filter(member => !phoneNumbers.includes(member));
                        
                    }else{
                        existingRoom.members = [...new Set([existingRoom.admin, ...phoneNumbers])];
                    }
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
app.post('/remove_user_rooms_data', async (req, res) => {
    try {
        const tokenHeader = req.headers['authorization']?.split(' ')[1];
        if (!tokenHeader) return res.status(400).json({ error: 'Authorization token missing' });

        // Decrypt the token
        const secretKey = '9e107d9d372bb6826bd81d3542a419d6cc64ff4ab6356cd63a54d865b40a8c4a';
        const decryptedToken = decrypt(tokenHeader, secretKey);

        // Decrypt the payload
        const encryptedPayload = req.body.payload;
        const decryptedData = decrypt(encryptedPayload, secretKey);
        const { phone, roomIDs } = decryptedData;

        let modifiedCount = 0;

        for (const roomID of roomIDs) {
            const room = await Room.findOne({ roomID });
            if (!room) continue;

            // Remove user from members
            const pullResult = await Room.updateOne(
                { roomID },
                { $pull: { members: phone } }
            );

            if (pullResult.modifiedCount > 0) modifiedCount++;

            // Handle admin reassignment if needed
            if (room.admin === phone) {
                const updatedRoom = await Room.findOne({ roomID });
                const members = updatedRoom.members;

                if (members.length === 1) {
                    await Room.updateOne(
                        { roomID },
                        { $set: { admin: members[0] } }
                    );
                } else if (members.length === 0) {
                    await Room.updateOne(
                        { roomID },
                        { $set: { admin: null } }
                    );
                }
            }
        }

        res.json({ status: 'success', modifiedRooms: modifiedCount });
        // Now you can continue with MongoDB logic as before...
        res.json({ status: 'success', data: decryptedData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
app.post('/autoLogin', async (req, res) => {
    try {
        const tokenHeader = req.headers['authorization']?.split(' ')[1];
        if (!tokenHeader) return res.status(400).json({ error: 'Authorization token missing' });
        
        // Decrypt the token
        const secretKey = '9e107d9d372bb6826bd81d3542a419d6cc64ff4ab6356cd63a54d865b40a8c4a';
        const decryptedToken = decrypt(tokenHeader, secretKey);

        // Decrypt the payload
        const encryptedPayload = req.body.payload;
        const decryptedData = decrypt(encryptedPayload, secretKey);
        const { phone,token } = decryptedData;
        if(!phone){
            return res.json({ success:false, message:'No Access'});
        }
        let success =false ,message = ''
        const currenUser = await User.findOne({username: phone})
        // console.log(decryptedData)
        // console.log(currenUser)
        // return res.json({ success:false, message:'No Access'});

        if(currenUser){
            const is_have_login_yet = currenUser?.devices.filter(d=> d.userAgent == 'Mission Form')[0]
            const is_have_token = token ? currenUser?.devices.filter(d=> d.token == token)[0] : null
            if(is_have_token && is_have_login_yet){
                    success = true
                    message = `${currenUser?.first_name} ${currenUser?.last_name}، خوش آمدید`
            }else{
                // const Gen_token = crypto.randomBytes(64).toString("hex");
                const exp_time = Date.now() + 90 * 24 * 60 * 60 * 1000
                const expires = new Date(exp_time); // 3 months
                const Gen_token = encryptAES256(exp_time.toString(),SECRET_KEY_TOKEN_AUTOLOGIN)
                if(is_have_login_yet){
                    await User.updateOne( { _id: currenUser._id ,'devices.userAgent':'Mission Form'}, 
                    {   $set: {     
                            "devices.$.token":Gen_token,
                            "devices.$.expiresAt":expires
                        } 
                    },{new:true}).then(u=>{
                        success = true
                        message = `${u?.first_name} ${u?.last_name}، خوش آمدید`
    
                    })
                }else{
                    const newDevices ={
                        token: Gen_token,       
                        ip: '',       
                        userAgent: 'Mission Form',       
                        createdAt: new Date(),       
                        expiresAt: expires
                    }
                    await User.updateOne( { _id: currenUser._id }, 
                    {   $push: {     
                            devices: {     
                                $each:[newDevices],
                                $slice:-5
                            }  
                        } 
                    },{new:true}).then(u=>{
                        success = true
                        message = `${u?.first_name} ${u?.last_name}، خوش آمدید`
    
                    })
                }
                return res.json({ success, message , token: Gen_token??null });
            }
            
        }else{
            success = false
            message = 'حساب کاربری شما اشتباه است'

        }

        return res.json({ success, message });
        
        
    } catch (err) {
            
        console.error(err);
        return res.status(500).json({success:false,token:null, error: 'Server error' });
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

//         // رمزگشایی داده‌های رمزگذاری‌شده
//         const encryptedData = req.body.data;
//         const decryptedData = decrypt(encryptedData, secret);

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





app.get("/logout", async (req, res, next) => {
try {
const username = req.session?.username ?? null;
const token = req.cookies?.autoLogin ?? null;


// 1) Remove that device token from the user's devices array (if present)
if (username && token) {
await User.updateOne(
{ username, "devices.token": token },
{ $pull: { devices: { token } } }
);
    console.log(username , token)
}


// 2) Passport logout (passport@0.6 uses a callback)
req.logout((err) => {
if (err) return next(err);


// 3) Destroy server session
req.session?.destroy((err2) => {
if (err2) return next(err2);


// 4) Clear cookie (options should match how you set it)
res.clearCookie("autoLogin", {
httpOnly: true,
secure: true, // only works over HTTPS
sameSite: "lax",
path: "/",
});


// 5) Respond
res.redirect("/login");
});
});
} catch (e) {
    console.log(e.message)
next(e);
}
});



app.get("/sitemap.xml", function (req, res) {
    res.sendFile("sitemap.xml", { root: path.join(__dirname, "../public") });
});

// app.use(function (req, res) {
//     // res.status(404).render("404");
// });


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
//     } catch (error) {
//         console.error('Error:', error.message);
//     }
// };


// // Socket Configuration
// const roomExists = (roomID) => {
//     const index = rooms.findIndex((room) => room === roomID);
//     return index === -1 ? false : true;
// };

const updateUserSocketId = async (user, socketId) => {
    try {
        const currentUser = await User.findOneAndUpdate(
            { _id: user._id },
            { socketID: socketId },
            { new: true } // Return the updated user
        );
        if (currentUser) {
            console.log(`Updated socketId for user ${user.username}: ${socketId}`);
        } else {
            console.log(`User ${user.username} not found in the database`);
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



// message_encryption()

// index.js

// ── وظیفهٔ کرون ──
//   └─ '0 0 * * *' → هر روز ساعت 00:00 (00 دقیقه، 00 ساعت، هر روز ماه، هر ماه، هر روز هفته)
// ====================== اجرا ======================

// cron.schedule('0 0 * * *', async () => {
//   try {
//     console.log('⏰ شروع چک کردن پیام‌های تا دیروز...');
//     const msgs = await getMessagesUpToYesterday_file_delete();

//     console.log(`📥 ${msgs.length} پیام پیدا شد (تا دیروز).`);
//     // اینجا می‌تونید کاری انجام بدید:
//     //   • ذخیره در فایل
//     //   • ارسال به سرویس دیگری
//     //   • پردازش و پاک‌سازی
//     // به‌عنوان مثال، نوشتن در لاگ:
//     msgs.forEach(m => console.log(`${m.createdAt.toISOString()} – ${m.content}`));
//   } catch (err) {
//     console.error('❌ خطا در دریافت پیام‌ها:', err);
//   }
// });

// console.log('✅ برنامه زمان‌بندی شد؛ هر روز ساعت 00:00 اجرا می‌شود.');

// let room_names_filter = [
//     'درخواست چک کردن آنتن سمت موک (#144601)',
//     'اقای زارعی-درخواست تغییر انتن (#144604)',
//     'درخواست انتقال یوزر - crm5 161392 (#144605)',
//     '',
//     '',
//     '',
//     '',
//     '',
//     '',
// ]
// room_managament({ 'seq': 0, 'createdAt': {$lte: '2025-07-14T11:15:53.600+00:00'}})
setInterval(() => {
    getMessagesUpToYesterday_file_delete('8x12wLE6irmn714ker',14) // RTSP rooms
    getMessagesUpToYesterday_file_delete('MYL0V3')
}, (24*60*60*1000));
// setInterval(() => {
    // }, (12*60*60*1000));
setInterval(() => {
    getMessagesUpToYesterday_file_delete('npmDtEwjElmn74vqmu',30,false) // log room clear
    delete_OrphanFiles()
}, (7*24*60*60*1000));
delete_OrphanFiles()
getMessagesUpToYesterday_file_delete('npmDtEwjElmn74vqmu',30,false) // log room clear
getMessagesUpToYesterday_file_delete('8x12wLE6irmn714ker',14) // RTSP rooms
getMessagesUpToYesterday_file_delete('MYL0V3')
// saved mess fwti: 5uyMAg0qf7mnlz05bm
const init_settings = {
        bgColor: "207, 226, 255", // Assuming a background color picker exists
        fgColor: "0, 0, 0", // Assuming a background color picker exists
        fontSize: "16px", // Get font size from range input
        borderRad: "17px", // Get font size from range input
    }
// async function change_settings() {
//     const settings = {
//         marginLeft: "10%",
//         marginRight: "10%",
//         chatWindowBgColor: "245, 245, 245",
//         chatWindowFgColor: "33, 33, 33",
//         bgColor: "207, 226, 255", // Assuming a background color picker exists
//         fgColor: "0, 0, 0", // Assuming a background color picker exists
//         sideBgColor: "242, 242, 242", // Assuming a background color picker exists
//         sideFgColor: "33, 33, 33", // Assuming a background color picker exists
//         fontSize: "16px", // Get font size from range input
//         borderRad: "17px", // Get font size from range input
//     }
//     await User.updateMany({}, { $set: { settings: settings } }).then(()=> console.log('update to:', settings))
// }

// change_settings()
const onlineUsersServer = new Map(); // socket.id => username

io.on("connection", async (socket) => {

    const user = await User.findOneAndUpdate({ _id: socket.user._id ,"devices.token": socket.token },
        {
            
            socketID: socket.id ,  status: "online", lastActive: new Date(),
            $set: {
                // "devices.$.token": new_token,
                "devices.$.socketID": socket.id,
                "devices.$.lastActive": new Date()
            }
        },
    {new:true} );
     // اگر کسی با همان user دوباره وصل شود، قبلی را قطع کن  
    // const existingSockets = io.sockets.sockets;
    // const oldSocket = existingSockets.get(user.socketID);
    // const oldSocket = io.sockets.connected[user.socketID];
    // if (oldSocket && oldSocket.id !== socket.id) {
    //     oldSocket.disconnect(true);  
    // }
    socket.on("userLoggedIn", async () => {
        const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token })
        const  username  = currentUser.username;
        if (!username) {
            return console.error("Username not provided for userLoggedIn");
        }
        if (!currentUser) {
            return console.error("User not found for socket ID:", socket.id);
        }
        onlineUsersServer.set(socket.id, username); // Track online

        // await updateUserSocketId(user, socket.id);
        if(username == '09016956747'){

            socket.emit("userCameBack", {username,name:`${currentUser.first_name} ${currentUser.last_name}`});
        }else{

            socket.broadcast.emit("userCameBack", {username,name:`${currentUser.first_name} ${currentUser.last_name}`});
        }
        socket.emit("onlineUsers", Array.from(onlineUsersServer.values())); // Send online usernames
    });
    socket.on("userSleep", async () => {
        const username = onlineUsersServer.get(socket.id);
        if (!username) return;

        // mark user as inactive
        await User.updateOne(
            { _id:user._id },
           { $set:{ status: "sleep", lastActive: new Date() }}
        );

        onlineUsersServer.delete(socket.id);
        socket.broadcast.emit("userWentSleep", username);
        socket.emit("onlineUsers", Array.from(onlineUsersServer.values())); // Send online usernames

    });

    socket.on("userWake", async () => {
        if (!user || !user.username) return;
        const username = user.username ?? null

        await User.updateOne(
            { _id: user._id },
            { status: "online", lastActive: new Date() }
        );

        // add back to online list
        onlineUsersServer.set(socket.id, username);
        socket.emit("onlineUsers", Array.from(onlineUsersServer.values())); // Send online usernames
        if(username == '09016956747'){

            socket.emit("userCameBack", {username,name:`${user.first_name} ${user.last_name}`});
        }else{

            socket.broadcast.to(user.roomID).emit("userCameBack", {username,name:`${user.first_name} ${user.last_name}`});
        }
    });


    socket.on("ping", () => {

        socket.emit("pong");
        socket.emit("onlineUsers", Array.from(onlineUsersServer.values())); // Send online usernames
    });


    // Listen for authentication / identification from client
    socket.on("authenticate", async (data, callback) => {
        const MINUTES_TO_CHECK = 15;
        const MILLISECONDS_IN_MINUTE = 60 * 1000;
        const THRESHOLD_MS = MINUTES_TO_CHECK * MILLISECONDS_IN_MINUTE;

        function is_send_toast_again(lastConnectionTime) {
            if (!lastConnectionTime) return true; // اگر هیچ زمانی ثبت نشده، فرض بر آفلاین بودن است

            const now = new Date();
            const lastConn = new Date(lastConnectionTime);
            
            // محاسبه اختلاف زمانی به میلی‌ثانیه
            const diffMs = now - lastConn;

            // اگر اختلاف بیشتر از ۱۵ دقیقه بود، کاربر آفلاین است
            return diffMs > THRESHOLD_MS;
        }
        try {
            const {last_connections} = data
            
            let toast_messages = [];
            const currentUser = await User.findOneAndUpdate({_id: socket.user._id ,"devices.token": socket.token }, 
                {status:'online',
                "devices.$.lastActive": new Date(),
                "devices.$.socketID": socket.id,

                },{new: true}
            );

            if (!currentUser) {
                return callback({ success: false, message: "User not found" });
            }

            // Join the user's room if they have one
            const Device = currentUser.devices.filter(d=> d.token == socket.token)[0]
            const Device_room = currentUser.devices.filter(d=> d.token == socket.token)[0].roomID
            if (Device_room) {
                socket.join(Device_room);
                console.log(`${user.username} joined room ${currentUser.roomID}`);
            }else{
                if(is_send_toast_again(last_connections)){
                    // TODO: later work at toasts
                    // const toast_messages_res = await show_message_onload(user.username)
                    // if(toast_messages_res.success){
                    //     toast_messages = toast_messages_res.messages
                    // }
                }
            }
            const room_lastUpdate = await Room.findOne({roomID: Device.roomID}).select("createdAt lastUpdated")
            const Device_dc = new Date(Device?.dc_time)
            const room_date = room_lastUpdate?.lastUpdated ?? room_lastUpdate.createdAt

            
            callback({ success: true,toast_messages:toast_messages, roomID: Device_room , update: (Device_dc.getTime()<room_date.getTime()),date: new Date() });
            console.log(`User authenticated and socketID updated: ${user.username} -> ${socket.id}`);
        } catch (err) {
            console.error("Authentication error:", err);
            callback({ success: false, message: "Authentication failed" });
        }
    });

    socket.on("createRoom", async (data) => {
        // if(true) return
        const { handle, roomName, roomMembers, Joinable_url} = data ;
        if(!handle || !roomName || !roomMembers){
            socket.emit("error", { message: `Please Fill the form.`})
                return
        }
        const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token })
        if (!currentUser) {
            socket.emit("error", { message: "User not found or not part of a room."});
            return
        
        }
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
        
        // Ensure room name uniqueness
        while (await Room.findOne({ roomID : uniqueRoomID })) {
            roomID = `${uniqueRoomID}-${Math.floor(Math.random() * 1000)}`; // Generate a unique name
        }
        if (roomMembers && !Array.isArray(roomMembers)) { 
            const result = []; 
            for (const num of roomMembers.split(',')) {  
                const n = num.trim();  
                if (n.length === 11 && !isNaN(n)) {   
                    result.push(n);  
                } 
            } 
            roomMembers = result;
        }
        const User_members =  await User.find({ username: { $in: roomMembers } }).select('username')
        roomMembers.forEach(member=>{
            if(User_members.filter(user=> user == member.username)[0]){
                socket.emit("error", { message: `${member} not Found.`})
                return
            }
        })
        roomMembers.push(currentUser.username)
        const room = new Room({
            roomID : uniqueRoomID,
            roomName : roomName,
            admin: currentUser.username,
            members: roomMembers, // Initialize the members array
            setting:[{Joinable_url: Joinable_url ??"private"}]
        });
    
        await room.save(); // Save the room to the database
        const member_users = await User.find({ username : {$in: roomMembers} }).select("username first_name last_name").lean();
        const userRead = await User.findOne({ username: currentUser.username }).select("first_name last_name").lean();
        const data_to_join = { name:`${userRead.first_name} ${userRead.last_name}`,
            handle: handle, room: room,
            member_users
        };

        socket.join(room.roomID); // Add the socket to the room
        await User.updateOne({ _id: socket.user._id ,"devices.token": socket.token },
            {
                $set: {
                    // "devices.$.token": new_token,
                    "devices.$.roomID": room.roomID,
                    "devices.$.lastActive": new Date()
                }
            });
            // Add the user to the room
        addUserToRoom(currentUser.username, uniqueRoomID);

        socket.emit("joined", data_to_join); // Notify the user of successful join
        socket.broadcast.to(room.roomID).emit("newconnection", data_to_join); // Broadcast to other users
    });
    
    

    socket.on("joinRoom", async (data) => {
        try {
            const roomID = (data.roomID??'');
            if(!roomID || !data.roomID){
                socket.emit("error", { message: 'No room.' });
                return
            }
            let room = await Room.findOne({ roomID });
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token })
            if (!currentUser) {
                socket.emit("error", { message: "User not found or not part of a room."});
                return
                
            }
            if (!room) {
                socket.emit("error", { message: "Room not Found."});
                return
            }

            const username = currentUser.username;
            const Device_room = currentUser.devices.filter(d=> d.token == socket.token)[0].roomID

            const lastroom = Device_room;
            if (lastroom && lastroom !== roomID) {
                socket.leave(lastroom);

                // Optional: notify others in previous room
                socket.broadcast.to(lastroom).emit("userLeft", { username, roomID: lastroom });

                // Clear previous room reference
                await User.findOneAndUpdate(
                    { username },
                    { roomID: null }
                );
                await User.updateOne({ _id: socket.user._id ,"devices.token": socket.token },
                {
                    $set: {
                        // "devices.$.token": new_token,
                        "devices.$.roomID": null,
                        "devices.$.lastActive": new Date()
                    }
                });
            }

            // Check if target room exists
            const check_room_permissions = await authinticate_room(roomID,username)

            // Join the new room
            if(check_room_permissions){
                socket.join(roomID)
                await addUserToRoom(username, roomID);

                // Update user's roomID
                // await User.findOneAndUpdate({ username }, { roomID });

                await User.updateOne({ _id: socket.user._id ,"devices.token": socket.token },
                {
                    $set: {
                        // "devices.$.token": new_token,
                        "devices.$.roomID": roomID,
                        "devices.$.lastActive": new Date()
                    }
                });
                let room = await Room.findOneAndUpdate({roomID,"member_data.id":currentUser._id},
                {
                    $set: {
                        "member_data.$.joined_at": new Date(),
                        "member_data.$.leaved_at": null
                    }
                },{new:true});
                if (!room) {
                    room = await Room.findOneAndUpdate(
                    { roomID },
                    {
                    $push: {
                    member_data: {
                    id: currentUser._id,
                    joined_at: new Date()
                    }
                    }
                    }
                    );
                }
                // Send settings, messages, and members
                socket.emit("applySettings", currentUser.settings);
                // await message_encryption(roomID)
                const member_users = await User.find({ username : {$in: room.members} }).select("username first_name last_name lastActive status").lean();

                socket.emit("members", room.members);
                socket.emit("joined", { room, name: `${currentUser.first_name} ${currentUser.last_name}` , member_users});
                const Messages = await getUnreadMessages(roomID, currentUser);
                const unreadMessages = Messages.processedMessages;
                if (unreadMessages.length >  50) {
                    socket.emit("restoreMessages", { messages: unreadMessages, prepend: true, unread: true, join: true });
                } else {
                    const lastMessages = await getMessagesByLimit([roomID], 50);

                    if (lastMessages.length > 0) {

                        const processedMessages = await Promise.all(
                            lastMessages.map(msg => processMessage(msg))
                        );
                        
                        const lastUnreadIndex = processedMessages.findLastIndex(
                            msg => !msg.read.some(r => r.username === currentUser.username)
                        );

                        if (lastUnreadIndex !== -1) {
                            processedMessages[lastUnreadIndex].readLine = true;
                        }

                        socket.emit("restoreMessages", {
                            messages: processedMessages,
                            prepend: true,
                            join: true
                        });



                    } else {
                        socket.emit("noMoreMessages", {
                            message: "پیام قدیمی تری نیست"
                        });
                    }

                }
                socket.broadcast.to(roomID).emit("userJoined",
                    { name: `${currentUser.first_name} ${currentUser.last_name}`,
                    member_users,member_data: room.member_data
                 });

            }else{
                socket.leave(roomID);

                socket.emit("error", { message: 'No Access to join.' });
            }
        } catch (error) {
            console.error("Error joining room:", error.message);
            socket.emit("error", { message: error.message });
        }
    });
    // ----------------user management---------------
     socket.on("member_manage",async(data,callback)=>{
        const {status,user} = data
        const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
        const Device_room = currentUser.devices.filter(d=> d.token == socket.token)[0].roomID
        
        let room = currentUser.username =='09173121943'|| status == 'kick'?
            await Room.findOne({roomID: Device_room})
            :await Room.findOne({roomID: Device_room, admin: currentUser.username})
        let message,
            access = false;
        if(!room){
            return callback({ success: false, message: 'شما دسترسی لازم ندارید.' });
        }
        const user_data = await User.findOne({username : user})
        if(!user_data){
            return callback({ success: false, message: "کاربر پیدا نشد." });
        }
        access = true
        
        switch (status) {
            case 'admin':
                if(user_data.username != room.admin){
                    room = await Room.findOneAndUpdate({roomID:room.roomID},{
                       admin: user_data.username
                    },{new:true})
                    message = `کاربر: ${user_data?.first_name} ${user_data?.last_name} ادمین شد.`
                }else{
                    access = false
                    message = `کاربر: ${user_data?.first_name} ${user_data?.last_name} هم اکنون ادمین است.`
                }
                break;
        
            case 'add':
                if(!room.members.includes(user_data.username)){
                   room = await Room.findOneAndUpdate({roomID:room.roomID},{
                        $push:
                        {
                            members: user_data.username
                        }
                    },{new:true})
                    message = `کاربر: ${user_data?.first_name} ${user_data?.last_name} به اتاق افزوده شد.`
                }else{
                    access = false
                    message = `کاربر: ${user_data?.first_name} ${user_data?.last_name} هم اکنون عضو اتاق است.`

                }
                break;
            case 'kick':
                if(room.members.includes(user_data.username)){
                    if(user_data.username == room.admin){
                        access = false
                        message = `کاربر: ${user_data?.first_name} ${user_data?.last_name} ادمین است، اول این سمت را انتقال دهید`
                    }else{

                        room = await Room.findOneAndUpdate({roomID:room.roomID},{
                            $pull:
                            {
                                members: user_data.username
                            }
                        },{new:true})
                        if(user_data.username == currentUser.username){
                            
                            message = `کاربر: ${user_data?.first_name} ${user_data?.last_name} اتاق را ترک کرد`
                        }else{

                            message = `کاربر: ${user_data?.first_name} ${user_data?.last_name} بیرون انداخته شد.`
                        }
                    }
                }else{
                    access = false
                    message = `کاربر: ${user_data?.first_name} ${user_data?.last_name} عضو اتاق نیست.`

                }
                break;
        
            default:
                access = false
                break;
        }
        if(access){
            const member_users = await User.find({ username : {$in: room.members} }).select("username first_name last_name lastActive status").lean();
            Log_message(message,null,room.roomID)
            io.in(Device_room).emit("member_update",{room_admin:room?.admin,member_data:room?.member_data, members:member_users})
        }
        return callback({ success: access, message });
     })
    // Create an in-memory object to track the last fetched date for each room (or user)
    socket.on("requestOlderMessages", async ({ roomID, counter=0 , type='first'}) => {
        const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
        const Device_room = currentUser?.devices.filter(d=> d.token == socket.token)[0].roomID

        console.log('user:',user.username," ==>",currentUser.username," in room: ",Device_room)
        try {
            // Debugging: Log the incoming data to ensure it's correct
                        // Find user by username AND update socketID if needed
            if (!currentUser || !Device_room) {
                console.log('try older message:',currentUser)
                socket.emit("error", { message: "Failed to load older messages." });
                throw new Error("User not found or not in a room.");
            }
            const check_room_permissions = await authinticate_room(roomID,currentUser.username)

            if(!check_room_permissions){
                socket.emit("error", { message: "Failed to Load (no access)." });
                socket.leave(roomID);

                return
            }else{

                socket.join(roomID)
            }
            // Calculate the limit dynamically based on the counter value
            
            const limit =()=>{
                if(typeof counter == 'number'){
                    if(counter!==0){
                    return (counter < 20) ? counter-1 : 20; // Use counter if it's less than 20, otherwise limit to 20
                    }
                }
                else return 50;
            }
            let olderMessages ;
            // Fetch the older messages using the starting ID and dynamic limit
            if(type.includes(['reply','latest'])){
                // Adjust counter to fetch the previous batch of messages
                const startingID = counter;
                olderMessages = await getMessagesByID(startingID, limit(),type); // Function to fetch messages
            }else{
                olderMessages = await getMessagesByDate(Device_room,counter, limit(),type); // Function to fetch messages

            }
    
            // If there are older messages, process and send them back to the client
            if (olderMessages.length > 0) {
                // Process each message
                const processedMessages = await Promise.all(
                    olderMessages.map(async (msg) => await processMessage(msg))
                );
                if(type=='latest'){
                    const lastMessages = await getMessagesByLimit([roomID], 20);
                    const processedLatestMessages = await Promise.all(
                        lastMessages.map(async (msg) => {
                            return await processMessage(msg); // پردازش پیام رمزنگاری‌شده
                        })
                    );
                    
                    socket.emit("restoreMessages", { messages: processedLatestMessages, prepend: true , Latest:true});
                }
                else if(type=='first'){
                    socket.emit("restoreMessages", { messages: processedMessages, prepend: true });
                }else if(type=='last'){
                    socket.emit("restoreMessages", { messages: processedMessages, prepend: false  });
                }

                if(type.split('-')[0]=="reply"){
                    let bool=false
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
                // if(type.includes(['last','first'])){
                // }
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

async function getMessagesByLimitPerRoom(roomIDs, limit) {
  const results = [];

  for (const roomID of roomIDs) {
    const messages = await Message.find({ roomID })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    results.push({ roomID, messages });
  }
  return results;
}


async function getMessagesByLimit(roomIDs, limit) {
  return await Message.find({ roomID: { $in: roomIDs } }) // استفاده از $in برای چند مقدار
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
}

// Helper function to process each message

    
    // Helper function to get all unread messages
// Helper function to get all unread messages


    // Helper function to group messages by date
// Helper function to group messages by date
async function getMessagesByDate(roomID, val ,limit, type) {

 
    

    console.log(`Fetching messages ${type=='last' ? `newer` : `older`} than date =`, val, "for room =", roomID);
    if(type=='latest'){
            // Query the database for messages with IDs numerically less than the given counter
        return await Message.find({
            roomID: roomID,
        })
        .sort({  timestamp: -1 }) // Sort by 'id' in descending order to get older messages first
        .limit(limit || 20) // Limit the result to 50 messages, or the specified limit
        .lean(); // Use lean() to get plain JavaScript objects
        }
    else if(type=='last'){

        // Query the database for messages with IDs numerically less than the given counter
        return await Message.find({
            roomID: roomID,
            // Extract the numeric part of the 'id' to compare with 'counter'
            timestamp: { $gte: new Date(val) }, // The id format should still be 'room-counter'
        })
        .sort({  timestamp: 1 }) // Sort by 'id' in descending order to get older messages first
        .limit(limit || 20) // Limit the result to 50 messages, or the specified limit
        .lean(); // Use lean() to get plain JavaScript objects
    }
    else if(type=='first'){
    // Query the database for messages with IDs numerically less than the given counter
    return await Message.find({
        roomID: roomID,
        // Extract the numeric part of the 'id' to compare with 'counter'
        timestamp: { $lte: new Date(val) },
    })
    .sort({  timestamp: -1 }) // Sort by 'id' in descending order to get older messages first
    .limit(limit || 20) // Limit the result to 50 messages, or the specified limit
    .lean(); // Use lean() to get plain JavaScript objects
    }else if(type.split('-')[0]=="reply"){
        const messageID = val.split('-')[1]
        // Query the database for messages with IDs numerically less than the given counter
        return await Message.find({
            roomID: roomID,
            // Extract the numeric part of the 'id' to compare with 'counter'
            id: { $lt: `${roomID}-${messageID+39}` }, // The id format should still be 'room-counter'
        })
        .sort({  timestamp: -1 }) // Sort by 'id' in descending order to get older messages first
        .limit(39) // Limit the result to 50 messages, or the specified limit
        .lean(); // Use lean() to get plain JavaScript objects
    }
    
}

    
    // Process a single message (convert sender and read users to human-readable form)


 

    // In your socket.io 'connection' handler or dedicated event
    socket.on('roomCounterId', async (data, callback) => {
    try {
        const {roomID,username} = data 

        if (!roomID || typeof roomID !== 'string') {
        return callback({ success: false, message: 'Invalid roomID' });
        }
        const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
        if(!currentUser) {
            callback({
            success: false,
            message: `Failed to generate message ID`
            });
            return
        }

        const check_room_permissions = await authinticate_room(roomID,currentUser.username)
        socket.join(roomID)
        if(!check_room_permissions){
            socket.leave(roomID);

            socket.emit("error", { message: "Failed to generate (no access)." });
            return
        }
        // ── Atomic counter increment ───────────────────────────────
        const counter = await Room.findOneAndUpdate(
        { roomID: currentUser.roomID },           // Use roomID as the document _id (clean & efficient)
        { $inc: { seq: 1 } },
        { 
            upsert: true,                // Create if room doesn't exist yet
            new: true,                   // Return the UPDATED document (after increment)
            setDefaultsOnInsert: true    // Optional: if you have schema defaults
        }
        );

        // Calculate the visible / custom message number
        // 1000000 + seq gives you IDs starting from 1000001, 1000002, ...
        const messageNumber = 1000000 + counter.seq;

        const fullMessageId = `${roomID}-${messageNumber}`;

        // Return to client immediately (client will use this ID for optimistic UI + sending)
        callback({
        success: true,
        messageId: fullMessageId
        });

        // ── Optional: you can also create the message here if you want atomicity
        // But most chat apps separate ID reservation from actual message insertion
        // (client sends message + this ID later via another event)

    } catch (err) {
        console.error('roomCounterId error:', err);
        callback({
        success: false,
        message: 'Failed to generate message ID'
        });
    }
    });
    socket.on("chat", async (data , callback) => {
        let { id, username: encryptedUsername,roomID, message, file, quote, voice } = data;
        try {


            // Find user by username AND update socketID if needed
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });

            // پیدا کردن همه اعضای اتاق
                    // دریافت اطلاعات اتاق از دیتابیس

            if (!currentUser ) {
                throw new Error("User not found or not in a room.");
            }
            const check_room_permissions = await authinticate_room(roomID,currentUser.username)

            if(!check_room_permissions){
                socket.leave(roomID);

                socket.emit("error", { message: "Failed to send (no access)." });
                return
            }
            const username = currentUser.username;
            if(!id){
                // ── Atomic counter increment ───────────────────────────────
                const counter = await Room.findOneAndUpdate(
                { roomID: roomID },           // Use roomID as the document _id (clean & efficient)
                { $inc: { seq: 1 } },
                { 
                    upsert: true,                // Create if room doesn't exist yet
                    new: true,                   // Return the UPDATED document (after increment)
                    setDefaultsOnInsert: true    // Optional: if you have schema defaults
                }
                );

                // Calculate the visible / custom message number
                // 1000000 + seq gives you IDs starting from 1000001, 1000002, ...
                const messageNumber = 1000000 + counter.seq;

                id = `${roomID}-${messageNumber}`;

            }

            // Proceed with message processing...
            if(message){
                message = message.trim()
            }
            const clean = sanitizeMessage(message);
            // if(username == '09016956747' && decrypted_roomID=="MYL0V3" && clean){
            //     const words = clean.split(' ')
            //     const bad_words = ['بمیرم', 'میمیرم','فدات','فداتشم']
            //     if(words.some(word=> bad_words.includes(word)) || bad_words.includes(clean)){
            //         throw new Error(`خدا نکنه دورت بگردم （づ￣3￣）づ╭❤️～`);
            //     }
            // }
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
            
            }
            
            const timestamp = new Date();
            if(!username) throw new Error("User not found or not part of a room.");
            if (!message  && !file && !voice) throw new Error("no message.");
            // Validate the user
            
            const newMessage = new Message({
                id: id,  // ID format: roomID-auto-increment number
                roomID: roomID,
                sender: username,
                quote: quote ? `${roomID}-${quote}`:null,
                message: clean ? socketEncrypt(clean) : '',
                file: fileDetails, // Map over the uploaded file to structure them correctly
                read: [{ username, time: timestamp }], // <- Mark as read by sender
                members: [username],
                encrypt: true,
                timestamp,
            });
            await newMessage.save();
            // Update room's last update timestamp
            const user_name = currentUser?.first_name && currentUser?.last_name ? `${currentUser?.first_name} ${currentUser?.last_name}` : username
            const room = await Room.findOneAndUpdate(
                { roomID: roomID },
                { $set: { lastUpdated: timestamp , last_content: clean ? socketEncrypt(`${user_name}: ${clean}`) : socketEncrypt(`${user_name}: فایل ارسال کرده است`)  } },
                {new:true}
            );
            // Enrich the message with sender details
            let enrichedMessage = {
                ...newMessage.toObject(),
                sender: username,
                // handle: `${currentUser.first_name} ${currentUser.last_name}`,
            };
            
            let encryptedMessage = await processMessage(enrichedMessage)  
            // Broadcast the message to the room
            callback({ success: true , messageId: id});
            io.in(roomID).emit("chat",await encryptedMessage,{ success: true });
            if (!room) throw new Error("Room not found!");

            const roomMembers = room.members; // لیست اعضای اتاق
            
            // گرفتن Socket ID کاربران از دیتابیس
            const onlineUsers = await User.find({ username: { $in: roomMembers } });

            let tempMessage;
            // ارسال پیام به تمام کاربران حاضر در اتاق
            onlineUsers.forEach(async (user) => {
                if (user.username != username) {

                    if (user.username) {
                        const taskMatch = room.roomName.match(/\(#(\d+)\)/);
                        const pvMatch = room.roomName.match(/\(PV\)Chat between (\d{11}) and (\d{11})/);
                        
                        if (pvMatch) {
                            const senderNumber = pvMatch[1];
                            const receiverNumber = pvMatch[2];
                            tempMessage = {
                                title: 'MetaChat',
                                message: `${currentUser.first_name} ${currentUser.last_name}</i><br>${newMessage.message ? socketDecrypt(newMessage.message):'Sent You amessage'}`,
                                reciver:`${user.first_name} ${user.last_name}`,
                                timestamp
                            };
                        } else if (taskMatch) {
                            const taskID = taskMatch[1];
                            tempMessage = {
                                title: 'New comment (MetaChat): '+room.roomName,
                                message: `<br><i>${currentUser.first_name} ${currentUser.last_name}</i> Commented: <br>${newMessage.message ? socketDecrypt(newMessage.message):'Sent You amessage'}`,
                                taskID:taskID,
                                link: "/view?TaskID=" + taskID,
                                reciver:`<i>${user.first_name} ${user.last_name}`,
                                timestamp
                            };
                        } else {
                            tempMessage = {
                                title: `New Message (MetaChat): ${room.roomName}`,
                                message: `${currentUser.first_name} ${currentUser.last_name}: ${newMessage.message ? socketDecrypt(newMessage.message):'Sent You amessage'}`,
                                reciver:`${user.first_name} ${user.last_name}`,
                                timestamp
                            };
                        }
                        tempMessage={
                            ...tempMessage,
                            roomID : roomID
                        }
                        user?.devices.forEach(device=>{

                            if (device.socketID) {
                                tempMessage={
                                    ...tempMessage,
                                    sender: currentUser.username,
                                }
                                io.to(device.socketID).emit("notification", tempMessage);
                            }
                        })
                        count_new_msg_room(room,user)
                        // console.log(tempMessage)
                        sendBackupToPHP(user.username, tempMessage);
                    }
                }
                if(tempMessage && username !='09173121943') sendBackupToPHP('09173121943', tempMessage);
            });
        } catch (error) {
            console.error("Error handling chat message:", error);
            
            // Send failure acknowledgment
            callback({ success: false , messageId: id, message : error.message});
        }
    });

      // دریافت بایت‌های صوتی  
    socket.on("edit", async (data, callback) => {
        try {
            let {messageId , username, new_message} = data 
            if(!messageId )return
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
            const Device_room = currentUser.devices.filter(d=> d.token == socket.token)[0].roomID
            const user_name = currentUser?.first_name && currentUser?.last_name ? `${currentUser?.first_name} ${currentUser?.last_name}` : username

            username = user.username
            if (!messageId || typeof messageId !== "string" && !new_message) {
                throw new Error("Invalid or missing messageId.");
            }

            // Find the current user by socket ID
            if (!currentUser || !Device_room) {
                throw new Error("User not authenticated or not in a room.");
            }


            // Find the message
            const message = await Message.findOne({ id: messageId });
            if (!message) {
                throw new Error("Message not found.");
            }

            // Extract roomID from message ID (format: roomID-1000001 etc.)
            const [roomIDFromId] = messageId.split('-');
            if (roomIDFromId !== Device_room) {
                throw new Error("Message does not belong to your current room.");
            }

            // Authorization: Only the sender can delete their own message
            if (message.sender !== username && username != '09173121943') {
                throw new Error("You can only edit your own messages.");
            }

           
            const clean = sanitizeMessage(new_message);
            const encryption_mess = socketEncrypt(clean)
            // === Delete the message from database ===
            await Message.findOneAndUpdate({ id: messageId },{$set :{message: encryption_mess , edited: new Date()}});

            // === Update room's lastUpdated timestamp ===
            // await Room.findOneAndUpdate(
            //     { roomID: Device_room },
            //     { $set: { lastUpdated: new Date() } }
            // );

            // === Broadcast deletion to all clients in the room ===


            io.in(Device_room).emit("edit", {messageId , new_message});

            // Optional: Send notification to others that a message was deleted
            const room = await Room.findOneAndUpdate({ roomID: Device_room }, { $set: { lastUpdated: new Date()  , last_content: socketEncrypt(`${user_name}: پیامی ویرایش شده است`) } });
            if (room) {
                const onlineUsers = await User.find({ username: { $in: room.members } });
                
                onlineUsers.forEach((user) => {
                    user?.devices.forEach(device=>{
                        if (user.username !== username && user.socketID) {
                            io.to(device.socketID).emit("notification", {
                                sender: currentUser.username,
                                title: `Message edited (MetaChat): ${room.roomName}`,
                                message: `${currentUser.first_name} ${currentUser.last_name} edited a message.`,
                                roomID: Device_room,
                                timestamp: new Date()
                            });
                        }
                    })
                    count_new_msg_room(room,user)
                });
            }

            // Success callback
            if (typeof callback === "function") {
                callback({ success: true , message: 'message Edited.' });
            }


        } catch (error) {
            console.error("Error deleting message:", error.message);
            if (typeof callback === "function") {
                callback({ success: false, error: error.message });
            }
        }
    });
    socket.on("delete", async (data, callback) => {
        try {
            let {messageId , username} = data 
            if(!messageId)throw new Error("Invalid  USER.");
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
            const Device_room =  currentUser.devices.filter(d=> d.token == socket.token)[0].roomID
            username =user.username

            if (!messageId || typeof messageId !== "string") {
                throw new Error("Invalid or missing messageId.");
            }
            const user_name = currentUser?.first_name && currentUser?.last_name ? `${currentUser?.first_name} ${currentUser?.last_name}` : username

            // Find the current user by socket ID
            if (!currentUser || !Device_room) {
                throw new Error("User not authenticated or not in a room.");
            }


            // Find the message
            const message = await Message.findOne({ id: messageId });
            if (!message) {
                throw new Error("Message not found.");
            }

            // Extract roomID from message ID (format: roomID-1000001 etc.)
            const [roomIDFromId] = messageId.split('-');
            if (roomIDFromId !== Device_room) {
                throw new Error("Message does not belong to your current room.");
            }

            // Authorization: Only the sender can delete their own message
            if (message.sender !== username && username != '09173121943') {
                throw new Error("You can only delete your own messages.");
            }

            // === Handle file deletion if files exist ===
            if (message.file && Array.isArray(message.file) && message.file.length > 0) {


                // Assuming files are saved on disk with filename stored in file.fileName
                // Adjust the upload directory path according to your setup
                for (const fileItem of message.file) {
                    if (fileItem.file) {
                        const filePath = path.join(uploadDir,fileItem.file.split('/')[2]);
                        const res_delete = await deleteFile(filePath)
                        if(!res_delete?.success) throw new Error("Somthing went wrong.");
                    }
                }
            }

            // === Delete the message from database ===
            await Message.deleteOne({ id: messageId });

            // === Update room's lastUpdated timestamp ===
            await Room.findOneAndUpdate(
                { roomID: Device_room },
                { $set: { lastUpdated: new Date() ,
                    last_content: socketEncrypt(`${user_name}: پیامی پاک شده است`) 
                } }
            );

            // === Broadcast deletion to all clients in the room ===


            io.in(Device_room).emit("delete", messageId);

            // Optional: Send notification to others that a message was deleted
            const room = await Room.findOne({ roomID: Device_room });
            if (room) {
                const onlineUsers = await User.find({ username: { $in: room.members } });

                onlineUsers.forEach((user) => {
                    if (user.username !== username && user.socketID) {
                        user?.devices.forEach(device=>{
                            io.to(device.socketID).emit("notification", {
                                sender: currentUser.username,
                                title: `Message deleted (MetaChat): ${room.roomName}`,
                                message: `${currentUser.first_name} ${currentUser.last_name} deleted a message.`,
                                roomID: Device_room,
                                timestamp: new Date()
                            });
                        })
                    }
                });
            }

            // Success callback
            if (typeof callback === "function") {
                callback({ success: true });
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            if (typeof callback === "function") {
                callback({ success: false, error: error.message });
            }
        }
    });
    socket.on("delete_file", async (data, callback) => {
        try {
            let {id} = data 
            if(!id)throw new Error("Invalid  USER.");
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
            const Device_room =  currentUser.devices.filter(d=> d.token == socket.token)[0].roomID
            username =user.username

            if (!id || typeof id !== "string") {
                throw new Error("Invalid or missing file_id.");
            }

            // Find the current user by socket ID
            if (!currentUser || !Device_room) {
                throw new Error("User not authenticated or not in a room.");
            }


            // Find the message
            const message = await Message.findOne({ "file._id": id });
            const file = message?.file.filter(file=> file._id == id)[0]
            if (!message || !file) {
                throw new Error("File not found.");
            }

            // Extract roomID from message ID (format: roomID-1000001 etc.)
            const message_roomID = message.roomID;
            if (message_roomID !== Device_room) {
                throw new Error("Message does not belong to your current room.");
            }

            // Authorization: Only the sender can delete their own message
            if (message.sender !== username && username != '09173121943') {
                throw new Error("You can only delete your own messages.");
            }

            // === Handle file deletion if files exist ===
            const filePath = path.join(uploadDir,file?.file.split('/')[2]);

            const res_delete = await deleteFile(filePath)
            if(!res_delete?.success) throw new Error("Somthing went wrong.");
            // === Delete the message from database ===
            await Message.updateOne({ "file._id": id },{$pull:{file:{_id: id} }});

            // === Update room's lastUpdated timestamp ===
            await Room.findOneAndUpdate(
                { roomID: Device_room },
                { $set: { lastUpdated: new Date() } }
            );

            // === Broadcast deletion to all clients in the room ===


            io.in(Device_room).emit("delete_file", id);

            // Optional: Send notification to others that a message was deleted
            const room = await Room.findOne({ roomID: Device_room });
            if (room) {
                const onlineUsers = await User.find({ username: { $in: room.members } });

                onlineUsers.forEach((user) => {
                    if (user.username !== username && user.socketID) {
                        user?.devices.forEach(device=>{
                            io.to(device.socketID).emit("notification", {
                                sender: currentUser.username,
                                title: `Message deleted (MetaChat): ${room.roomName}`,
                                message: `${currentUser.first_name} ${currentUser.last_name} deleted a File.`,
                                roomID: Device_room,
                                timestamp: new Date()
                            });
                        })
                    }
                });
            }

            // Success callback
            if (typeof callback === "function") {
                callback({ success: true });
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            if (typeof callback === "function") {
                callback({ success: false, error: error.message });
            }
        }
    });
    // Listen for upload progress from clients
    socket.on("uploadProgress", async (data) => {
        try {
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
            const Device_room = currentUser.devices.filter(d=> d.token == socket.token)[0].roomID

            if(!Device_room) throw new Error(`No room user added to upload progress`);
            
            const { progress, loaded, total  } = data;
            if(!progress ) throw new Error(`${!progress ? 'No progress':'No fileattached'}`)
            console.log(`Upload Progress: ${progress}%`);
            const room = await Room.findOne({ roomID: Device_room });
            if (room) {
                io.in(Device_room).emit("uploadProgress", { user:currentUser.username , progress: progress, loaded, total  });
            }
        } catch (error) {
            socket.emit("error",{message:error})
        }
       
    });

    
    socket.on("addReaction", async ({ username, messageId, reaction }) => {
        try {
            const timestamp = new Date();
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
            const Device_room = currentUser.devices.filter(d=> d.token == socket.token)[0].roomID

            if (!currentUser || !Device_room) {
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
            io.to(message.roomID).emit("reactionAdded", { messageId, username, time:timestamp, reaction });
            const room = await Room.findOneAndUpdate({ roomID : Device_room},{ $set: { lastUpdated: new Date() } });
            if (!room) throw new Error("Room not found!");

            const roomMembers = room.members; // لیست اعضای اتاق
            
            // گرفتن Socket ID کاربران از دیتابیس
            const onlineUsers = await User.find({ username: { $in: roomMembers } });
            
            const selfSender = await User.findOne({ username });

           

            // ارسال پیام به تمام کاربران حاضر در اتاق
            onlineUsers.forEach(async (user) => {
                if (user.username != username && user.username == message.sender) {

                    if (user.username) {
                        const taskMatch = room.roomName.match(/\(#(\d+)\)/);
                        const pvMatch = room.roomName.match(/\(PV\)Chat between (\d{11}) and (\d{11})/);
                        let tempMessage;
                        
                        if (pvMatch) {
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
    
    
    //         // Optionally notify others in the room of read receipts
    //         socket.broadcast.emit("messagesRead", { messageIds, username, timestamp });
    //     } catch (error) {
    //         console.error("Error in markMessagesRead:", error.message);
    //     }
    // });
    
    socket.on("voice_heared", async (data) => {
        try {
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
            const Device_room = currentUser.devices.filter(d=> d.token == socket.token)[0].roomID
            const roomID = Device_room
            if (!currentUser) {
                console.log(socket.id)
                throw new Error("User not found.");
            }
            const {file_id} = data
            if (!roomID) {
                
                console.log(Device_room,'==>',roomID)
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
            const username = currentUser.username;

            // ✅ Update all messages in parallel
                await Message.findOneAndUpdate(
                    {   roomID,
                        "file._id":file_id,
                        "read.username":  username 
                    },
                    {
                        $set: 
                            { 
                                "read.$.voice_heared":1
                            } 
                    },{new:true}
                ).then((m)=>{
                    io.in(roomID).emit("update_voice_heared", {file_id,username,messageId:m.id})
                    socket.emit('error',m)
                } )
        } catch (error) {
            console.error("Error in voice_heared:", error.message);
            socket.emit('error',error.message)
        }
    })
    socket.on("markMessagesRead", async ({ messageIds, roomID }) => {
        try {
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
            
            if (!currentUser) {
                console.log(socket.id)
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
                    socket.broadcast.to(roomID).emit("readMessageUpdate", msg);
                });

        } catch (error) {
            console.error("Error in markMessagesRead:", error.message);
        }
    });

    
    socket.on("info", async () => {
        const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
        if (currentUser) {
            
            socket.emit("info", currentUser);
        } else {
            socket.emit("error", { message: "User not found" });
        }
    });
    socket.on("roomList", async ({ cursor,cache } = {}) => {
        try {
            const currentUser = await User.findOne({
                _id: socket.user._id,
                "devices.token": socket.token
            });


            if (!currentUser) {
                return socket.emit("error", { message: "User not found" });
            }


            // match داینامیک
            const matchStage = {
                members: currentUser.username
            };


            if (cursor) {
                matchStage.$expr = {
                    $lt: [
                        { $ifNull: ["$lastUpdated", "$createdAt"] },
                        new Date(cursor)
                    ]
                };
            }


            // گرفتن room ها با limit
            const rooms = await Room.aggregate([
                { $match: matchStage },
                {
                    $addFields: {
                        sortDate: { $ifNull: ["$lastUpdated", "$createdAt"] }
                    }
                },
                { $sort: { sortDate: -1 } },
                { $limit: 50 }
            ]);


            const roomIDs = rooms.map(r => r.roomID);


            const users_name = [];


            // اصلاح async loop
            await Promise.all(rooms.map(async (room) => {
    
                const content = socketDecrypt(room?.last_content??'')


                room.lastMessage = {
                    message: content
                };


                room.members?.forEach(username => {
                    if (!users_name.includes(username)) {
                        users_name.push(username);
                    }
                });
            }));


            const users = await User.find({
                username: { $in: users_name }
            })
            .select("username first_name last_name lastActive status")
            .lean();


            // cursor جدید
            const nextCursor = rooms.length
                ? rooms[rooms.length - 1].sortDate
                : null;


            socket.emit("roomList", {
                room: rooms,
                cache,
                users,
                nextCursor
            });


            // شمارش پیام‌های جدید
            rooms
                .filter(room => room?.lastUpdated !== null)
                .forEach(room => {
                    count_new_msg_room(room, currentUser);
                });


        } catch (err) {
            console.error(err);
            socket.emit("error", { message: "Server error" });
        }
    });

    socket.on("typing", async (data) => {
        try {
            const { username, isTyping , name, status} = data; // Extract username and typing status
            
            if (!username || typeof isTyping === "undefined") {
                console.error("Invalid data received for typing event:", data);
                return;
            }
            
            // Find the user and their room
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
            const Device_room = currentUser.devices.filter(d=> d.token == socket.token)[0].roomID
            if (!currentUser || !Device_room) {
                console.error("Error: User not found or not in a room");
                socket.emit("error", { message: "User not found or not in a room" });
                return;
            }
    
            // Broadcast typing status to others in the room (excluding the sender)
            socket.broadcast.to(Device_room).emit("typing", { 
                username,
                name, 
                status,
                isTyping 
            });
        } catch (error) {
            console.error("Error handling typing event:", error.message);
            socket.emit("error", { message: "An error occurred while handling the typing event" });
        }
    });
    
    socket.on("saveSettings", async (data) => {
        try {
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });

            if (!currentUser) throw new Error("User not found");
            let settings = data?? init_settings
            console.log(settings)
            await User.updateOne({_id:currentUser._id},{$set:{settings:settings}}) ; // Assume `settings` field exists in user schema
            // await user.save();
            socket.emit("applySettings", settings);

        } catch (error) {
            console.error("Error saving settings:", error);
            socket.emit("error", { message: "Failed to save settings" });
        }
    });
    socket.on("countNewMessage", async(username, roomID, callback) => {

        const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });

        if (!currentUser) throw new Error("User not found");
        // Fetch messages from the database (adjust this based on your database query)
        Message.find({ roomID: roomID }) // Get all messages in the room
            .then(messages => {
                let newMessageCount = messages.filter(msg =>
                    !msg.read.some(r => r.username === currentUser.username) // Check if the user has NOT read it
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
      
        const time = room?.lastUpdated ?? null;  // ❗️ اینجا دیگه تاریخ ساختگی نمی‌دیم
        callback(time);
    });
      

    socket.on("leaveRoom", async ({ username , roomID }) => {
        try {
            if (!username || !roomID) {
                socket.emit("error", { error: `${username} : ${roomID} Invalid data provided for leaving the room` });
                return;
            }
            if(!user){
                socket.emit("error", { error: `User no Access.` });
                return;
            }
            const currentUser = await User.findOne({_id: socket.user._id ,"devices.token": socket.token });
            const Device_room = currentUser.devices.filter(d=> d.token == socket.token)[0].roomID
            const room = await Room.findOneAndUpdate({roomID:Device_room,"member_data.id":currentUser._id},
                {
                    $set: {
                        "member_data.$.leaved_at": new Date()
                        
                    }
                },{new:true});
            if (!room) {
                if (!room) {
                await Room.findOneAndUpdate(
                { roomID },
                {
                $push: {
                member_data: {
                id: currentUser._id,
                leaved_at: new Date()
                }
                }
                }
                );
                }
                socket.emit("error", { error: `Room "${roomID}" does not exist` });
                return;
            }

            // Optional: Check if user is a member (for logging/debugging only)
            if (!room.members.includes(username)) {
                console.warn(`User "${username}" is leaving room "${roomID}" but not listed as a member.`);
            }

            // Leave the socket.io room (but do NOT remove from DB)
            socket.leave(Device_room);

            // Clear user.roomID
           await User.updateOne({ _id: socket.user._id ,"devices.token": socket.token },
            {
                $set: {
                    // "devices.$.token": new_token,
                    "devices.$.roomID": null,
                    "devices.$.lastActive": new Date()
                }
            });

            socket.broadcast.to(Device_room).emit("typing", { 
                username: user.username,
                isTyping : false
            });

            // Notify this user
            socket.emit("leftRoom", { roomID:Device_room });

            // Notify others in the room
            socket.broadcast.to(Device_room).emit("userLeft", { name:`${user.first_name} ${user.last_name}`, roomID:Device_room });

        } catch (error) {
            console.error("Error handling leaveRoom event:", error);
            socket.emit("error", { error: "Failed to leave the room due to an internal error" });
        }
    });

    
    socket.on("draw", (data) => {
        io.emit("draw", data);
    });

    socket.on("clear", () => {
        io.emit("clear");
    });

    socket.on("undo", (data) => {
        io.emit("undo", data);
    });

    


    socket.on("disconnect", async (reason) => {
        console.log('disconnect reason: ',`${socket.id}__${socket.user.username}==>${reason}`)

        try {
            const currentUser = await User.findOneAndUpdate({_id: socket.user._id ,"devices.token": socket.token }, 
                {status:'offline',lastActive: new Date(),"devices.$.dc_time": new Date()},
                { new: true });
            const Device_room = currentUser?.devices.filter(d=> d.token == socket.token)[0].roomID

            socket.broadcast.to(Device_room).emit("typing", { 
                username: user.username,
                isTyping : false
            });
            // socket.broadcast.to(currentUser.roomID).emit("userDisconnected", `${currentUser.first_name} ${currentUser.last_name}`);
            onlineUsersServer.delete(socket.id);
        } catch (error) {
            console.error("Error during disconnect:", error);
        }
    });
    
    

    socket.on("error", (error) => {
        console.log(getUsers());  // Check if the user list is correct



        
        const safeLog = (obj) => {
            try {
                console.log(JSON.parse(JSON.stringify(obj)));
            } catch (error) {
                console.error("Error logging object:", error);
            }
        };
                console.log("Socket error:", `${socket.id}__${user.username}==>${safeLog(error)}`);

    });
    
});

// TODO: در آینده شاید لازم شد
// const secretKey = CryptoJS.enc.Hex.parse('a247be870c3def81c99684460c558f29a7b51d0d895df10011b5277fa8612771');
