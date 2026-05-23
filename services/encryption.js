// SOCKET UNIT
const crypto = require("crypto");
const jwt = require('jsonwebtoken'),
        env = require("dotenv")
env.config();

const socketSecretKey = Buffer.from(process.env.SOCKET_SECRET_KEY, 'hex');
const SSO_SECRET_TOKEN = process.env.SSO_SECRET_TOKEN
const AES_SECRET_KEY = '56ca69fbace71736c278a4e47137a9be'; // دقیقا 32 بایت
const AES_IV = crypto.randomBytes(16); // Initialization Vector

function verifySSOToken(token, secretKey=SSO_SECRET_TOKEN) {
    try {
        const decoded = jwt.verify(token, secretKey, {
            issuer: 'sso-service',
            audience: 'metachat'
        });
        console.log(decoded)
        // بررسی انقضا
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            throw new Error('Token expired');
        }
        
        return {
            valid: true,
            payload: decoded
        };
    } catch (error) {
        console.error('JWT verification error:', error.message);
        return {
            valid: false,
            error: error.message
        };
    }
}
// رمزنگاری AES-256
function encryptAES256(text, key = AES_SECRET_KEY) {
    // اگر کلید رشته است، آن را به بافر مناسب تبدیل کنید
    const keyBuffer = Buffer.from(key, 'hex').length === 32 
        ? Buffer.from(key, 'hex') 
        : crypto.createHash('sha256').update(key).digest();
    
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, AES_IV);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return AES_IV.toString('hex') + ':' + encrypted;
}
// رمزنگاری AES-256
function encryptAES256_send_notif(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), AES_IV);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return AES_IV.toString('hex') + ':' + encrypted.toString('hex');
}

// تابع رمزگشایی
function decryptAES256(data, key) {
    const [ivHex, encryptedData] = data.split(':');
    if(!ivHex || !encryptedData) return data
    const iv = Buffer.from(ivHex, 'hex');
    
    // همان تبدیل کلید که در رمزنگاری استفاده شد
    const keyBuffer = Buffer.from(key, 'hex').length === 32 
        ? Buffer.from(key, 'hex') 
        : crypto.createHash('sha256').update(key).digest();
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted; // بدون JSON.parse
}


// تابع رمزگشایی
function decrypt(data, key) {
    const [iv, encryptedData] = data.split(':').map((part) => Buffer.from(part, 'hex'));
    const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.createHash('sha256').update(key).digest(), iv);
    let decrypted = decipher.update(encryptedData, null, 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
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
    // 1. Check if input exists and is a string
    if (!encryptedText || typeof encryptedText !== 'string') {
        return encryptedText; // or return null/undefined depending on your needs
    }

    try {
        const [ivHex, encryptedHex] = encryptedText.split(':');
        
        // 2. Check if split failed (e.g., missing colon)
        if (!ivHex || !encryptedHex) {
            return encryptedText;
        }

        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', socketSecretKey, iv);
    
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('Decryption error:', e.message);
        return null; // Handle error gracefully
    }
}

module.exports = {
    socketEncrypt,
    encryptAES256,
    encryptAES256_send_notif,
    decryptAES256,
    decrypt,
    verifySSOToken,
    socketDecrypt};
