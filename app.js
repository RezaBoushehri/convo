const express = require("express"),
    app = express(),
    socket = require("socket.io"),
    path = require("path"),
    mongoose = require("mongoose"),
    env = require("dotenv"),
    bodyParser = require("body-parser"),
    LocalStratergy = require("passport-local"),
    passport = require("passport"),
    middleware = require("./middleware"),
    User = require("./models/user");
env.config();
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    require("express-session")({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false,
    })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStratergy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
let user;
app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    user = res.locals.currentUser;
    next();
});

let c = 0;

app.get("/", middleware.isLoggedIn, (req, res) => {
    res.render("index", { c: c });
});

app.get("/login", (req, res) => {
    res.render("login");
});
app.post(
    "/login",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
    }),
    function (req, res) {}
);

// app.get("/register", (req, res) => {
//     res.render("register");
// });
app.post("/register", (req, res) => {
    var newUser = new User({
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
app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("back");
});

const server = app.listen(3000, () => {
    console.log("listening at 3000");
});

//Socket
const io = socket(server);
io.on("connection", (socket) => {
    c++;
    console.log("connection made ", c);
    socket.on("chat", (data) => {
        socket.broadcast.emit("chat", data);
    });
    socket.on("typing", (data) => {
        socket.broadcast.emit("typing", data);
    });
    socket.on("newconnection", (data) => {
        socket.broadcast.emit("newconnection", data);
    });
});