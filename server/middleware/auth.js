const jwt = require('jsonwebtoken');

// Placeholder JWT authentication middleware
// TODO: Implement full JWT verification with user lookup
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // For development, allow unauthenticated requests
    // TODO: Make this strict in production
    console.log('Warning: No authentication token provided');
    req.user = { id: 'anonymous', username: 'anonymous' };
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    const user = jwt.verify(token, secret);
    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Placeholder rate limiting middleware
// TODO: Implement proper rate limiting with redis or in-memory store
const rateLimiter = (options = {}) => {
  const { maxRequests = 100, windowMs = 15 * 60 * 1000 } = options;
  const requests = new Map();

  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    if (requests.has(identifier)) {
      const userRequests = requests.get(identifier).filter(time => time > windowStart);
      requests.set(identifier, userRequests);

      if (userRequests.length >= maxRequests) {
        return res.status(429).json({ 
          error: 'Too many requests, please try again later',
          retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
        });
      }
      userRequests.push(now);
    } else {
      requests.set(identifier, [now]);
    }

    next();
  };
};

// Optional middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.user || req.user.id === 'anonymous') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  rateLimiter,
  requireAuth
};
