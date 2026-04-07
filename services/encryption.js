// SOCKET UNIT
const crypto = require("crypto");
env = require("dotenv"),

env.config();

const socketSecretKey = Buffer.from(process.env.SOCKET_SECRET_KEY, 'hex');

const AES_SECRET_KEY = '56ca69fbace71736c278a4e47137a9be'; // دقیقا 32 بایت
const AES_IV = crypto.randomBytes(16); // Initialization Vector

// رمزنگاری AES-256
function encryptAES256(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), AES_IV);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return AES_IV.toString('hex') + ':' + encrypted.toString('hex');
}

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

module.exports = {
    socketEncrypt,
    encryptAES256,
    socketDecrypt};
