const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const xss = require('xss');
const adminIPs = ['127.0.0.1', '::1', '94.74.128.194', '94.74.128.193','172.16.28.30'];
// Connection tracker
const connectionTracker = new Map();
const MAX_CONNECTIONS_PER_IP = 20;
const CONNECTION_CLEANUP_INTERVAL = 5000;


const ALLOWED_IPS = process.env.ALLOWED_PROFILE_IPS?.split(',') || [
    '127.0.0.1',
    
    '94.74.128.193',
    '94.74.128.194'
];

const isIPAllowed = (ip) => {
    const cleanIP = ip.replace(/^::ffff:/, '');
    return ALLOWED_IPS.includes(cleanIP);
};

const restrictToAllowedIPs = (req, res, next) => {
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    
    if (isIPAllowed(clientIP)) {
        return next();
    }
    
    // Log unauthorized access attempt
    console.warn(`Unauthorized profile image access attempt from IP: ${clientIP}`);
    
    res.status(403).json({
        error: 'Access forbidden',
        code: 'IP_NOT_ALLOWED'
    });
};

// Rate limiters
const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
    skip: (req) => {
        
        const clientIP = req.headers['x-forwarded-for'] || req.ip;
        return adminIPs.includes(clientIP);
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
    skip: (req) => {
        
        const clientIP = req.headers['x-forwarded-for'] || req.ip;
        return adminIPs.includes(clientIP);
    }
});

const extremeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many sensitive operations, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
    skip: (req) => {
        
        const clientIP = req.headers['x-forwarded-for'] || req.ip;
        return adminIPs.includes(clientIP);
    }
});

const loginSlowDown = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 3,
    delayMs: (hits) => hits * 1000,
    maxDelayMs: 30000
});

// XSS Protection middleware
const xssProtection = (req, res, next) => {
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = xss(req.body[key]);
            }
        }
    }
    if (req.query) {
        for (let key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = xss(req.query[key]);
            }
        }
    }
    next();
};

// SQL Injection protection
const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b|\b(OR|AND)\s+\d+\s*=\s*\d+|\b(\-\-)|;)/i;

const preventSqlInjection = (req, res, next) => {
    const checkValue = (value) => {
        if (typeof value === 'string') {
            return sqlInjectionPattern.test(value);
        }
        return false;
    };
    
    const checkObject = (obj) => {
        for (let key in obj) {
            if (checkValue(obj[key])) {
                return true;
            }
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                if (checkObject(obj[key])) return true;
            }
        }
        return false;
    };
    
    if (req.body && checkObject(req.body)) {
        return res.status(400).json({ error: 'Potential SQL injection detected' });
    }
    
    if (req.query && checkObject(req.query)) {
        return res.status(400).json({ error: 'Potential SQL injection detected' });
    }
    
    next();
};

// Connection tracking middleware
const trackConnections = (req, res, next) => {
    const clientIP = req.headers['x-forwarded-for'] || req.ip;
    
    
    // Skip tracking for admin IPs
    if (adminIPs.includes(clientIP)) {
        return next();
    }
    
   
    if (!connectionTracker.has(clientIP)) {
        connectionTracker.set(clientIP, {
            count: 0,
            connections: new Set(),
            lastCleanup: Date.now()
        });
    }
    
    const ipData = connectionTracker.get(clientIP);
    
    if (ipData.count >= MAX_CONNECTIONS_PER_IP) {
        return res.status(429).json({ 
            error: 'Too many simultaneous connections from this IP' 
        });
    }
    
    ipData.count++;
    const connectionId = Symbol('connection');
    ipData.connections.add(connectionId);
    
    res.on('finish', () => {
        const currentIpData = connectionTracker.get(clientIP);
        if (currentIpData) {
            currentIpData.count--;
            currentIpData.connections.delete(connectionId);
            
            if (currentIpData.count === 0) {
                connectionTracker.delete(clientIP);
            }
        }
    });
    
    next();
};

// Security logger
const securityLogger = (req, res, next) => {
    const start = Date.now();
    const clientIP = req.headers['x-forwarded-for'] || req.ip;
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        if (res.statusCode === 429 || res.statusCode === 403 || res.statusCode === 401) {
            console.warn(`Security Event: IP=${clientIP}, Status=${res.statusCode}, Path=${req.path}, Duration=${duration}ms`);
        }
        
        if (res.get('RateLimit-Remaining') === '0') {
            console.warn(`Rate Limit Exceeded: IP=${clientIP}, Path=${req.path}`);
        }
    });
    
    next();
};

// Cleanup interval
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of connectionTracker.entries()) {
        if (data.count === 0 && (now - data.lastCleanup) > 300000) {
            connectionTracker.delete(ip);
        } else {
            data.lastCleanup = now;
        }
    }
}, CONNECTION_CLEANUP_INTERVAL);

// Export all middleware
module.exports = {
    helmet: helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        frameguard: { action: 'deny' },
        noSniff: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    }),
    standardLimiter,
    authLimiter,
    extremeLimiter,
    loginSlowDown,
    xssProtection,
    restrictToAllowedIPs,
    // preventSqlInjection,
    trackConnections,
    securityLogger,
    validateInput: (validations) => {
        return async (req, res, next) => {
            await Promise.all(validations.map(validation => validation.run(req)));
            
            const errors = validationResult(req);
            if (errors.isEmpty()) {
                return next();
            }
            
            res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array().map(e => ({ field: e.param, message: e.msg }))
            });
        };
    },
    loginValidation: [
        // body('username')
        //     .trim()
        //     .isLength({ min: 3, max: 50 })
        //     .matches(/^[a-zA-Z0-9_@.-]+$/)
        //     .withMessage('Username contains invalid characters'),
        // body('password')
        //     .isLength({ min: 6, max: 100 })
        //     .withMessage('Password must be between 6 and 100 characters')
    ],
    getConnectionStats: () => ({
        activeConnections: connectionTracker.size,
        totalConnections: Array.from(connectionTracker.values()).reduce((sum, data) => sum + data.count, 0),
        connectionsByIP: Array.from(connectionTracker.entries()).map(([ip, data]) => ({
            ip,
            connections: data.count
        }))
    })
};