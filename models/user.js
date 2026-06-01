const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose').default;

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    first_name: {
        type: String,
        required: true,
        trim: true,
    },
    last_name: {
        type: String,
        required: true,
        trim: true,
    },
    fara_ID: {
        type: String,
        trim: true,
        unique: true,
        lowercase: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true // اجازه چند کاربر با ایمیل خالی
    },
    phone: {
            type: String,
            default: null
        },
    devices:[
        {
            token: { type: String },
            ip: { type: String },
            userAgent: { type: String},
            createdAt: { type: Date},
            expiresAt: { type: Date},
            lastActive: { type: Date},
            dc_time: { type: Date},
            socketID: {
                type: String,
                default: null, // Optional, will be null if not set
            },
            roomID: {
                type: String,
                default: null, // Optional, will be null if not set
            }
        }
    ],
    device_login: {
        type: String,
        default: null, // Optional, will be null if not set
    },
    socketID: {
        type: String,
        default: null, // Optional, will be null if not set
    },
    roomID: {
        type: String,
        default: null, // Optional, will be null if not set
    },
    status: {
        type: String,
        default: null, // Optional, will be null if not set
    },
    lastActive: {
        type: Date,
        default: null, // Optional, will be null if not set
    },
    settings: {
        bgColor: { type: String },
        fgColor: { type: String},
        fontSize: { type: String},
        borderRad: { type: String},
    },
}, { timestamps: true }); // Automatically add createdAt and updatedAt fields

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
