const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const registerWindowMs = parseInteger(process.env.AUTH_REGISTER_WINDOW_MS, 15 * 60 * 1000);
const registerMax = parseInteger(process.env.AUTH_REGISTER_MAX, 10);

// Auth endpoints rate limiter - strict (5 requests per 15 minutes)
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Rate limit by IP address and email
    return `${ipKeyGenerator(req.ip)}-${req.body.email || ''}`;
  }
});

// Register limiter - moderate (3 requests per hour)
const authRegisterLimiter = rateLimit({
  windowMs: registerWindowMs,
  max: registerMax,
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${ipKeyGenerator(req.ip)}-${req.body.email || ''}`;
  }
});

// Forgot password limiter - moderate (3 requests per hour)
const authForgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per windowMs
  message: 'Too many password reset requests, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${ipKeyGenerator(req.ip)}-${req.body.email || ''}`;
  }
});

// General API limiter - lenient (100 requests per 15 minutes)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLoginLimiter,
  authRegisterLimiter,
  authForgotPasswordLimiter,
  generalLimiter
};
