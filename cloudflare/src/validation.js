/**
 * Input validation utilities
 */

/**
 * Validate player ID format
 * @param {string} playerId - Player ID to validate
 * @returns {boolean} True if valid
 */
export function isValidPlayerId(playerId) {
  if (typeof playerId !== 'string') return false;
  if (playerId.length < 3 || playerId.length > 64) return false;
  // Alphanumeric, hyphens, underscores only
  return /^[a-zA-Z0-9_-]+$/.test(playerId);
}

/**
 * Validate salt format (should be UUID-like)
 * @param {string} salt - Salt to validate
 * @returns {boolean} True if valid
 */
export function isValidSalt(salt) {
  if (typeof salt !== 'string') return false;
  if (salt.length < 32 || salt.length > 128) return false;
  // Allow alphanumeric and hyphens (UUID format)
  return /^[a-zA-Z0-9-]+$/.test(salt);
}

/**
 * Validate commitment hash format
 * @param {string} hash - Hash to validate
 * @returns {boolean} True if valid
 */
export function isValidHash(hash) {
  if (typeof hash !== 'string') return false;
  // SHA-256 produces 64 character hex string
  return /^[a-f0-9]{64}$/i.test(hash);
}

/**
 * Validate room ID format
 * @param {string} roomId - Room ID to validate
 * @returns {boolean} True if valid
 */
export function isValidRoomId(roomId) {
  if (typeof roomId !== 'string') return false;
  if (roomId.length < 8 || roomId.length > 128) return false;
  return /^[a-zA-Z0-9_-]+$/.test(roomId);
}

/**
 * Validate Turnstile token format
 * @param {string} token - Turnstile token to validate
 * @returns {boolean} True if valid
 */
export function isValidTurnstileToken(token) {
  if (typeof token !== 'string') return false;
  // Cloudflare Turnstile tokens are typically long alphanumeric strings
  return token.length > 10 && token.length < 2048;
}

/**
 * Sanitize player input for logging
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  // Remove potential control characters and limit length
  return input.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 256);
}

/**
 * Validate request origin
 * @param {Request} request - Request object
 * @param {string} allowedOrigin - Allowed origin
 * @returns {boolean} True if origin is allowed
 */
export function isValidOrigin(request, allowedOrigin) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  
  // Allow multiple origins separated by comma
  const allowedOrigins = allowedOrigin.split(',').map(o => o.trim());
  return allowedOrigins.includes(origin);
}
