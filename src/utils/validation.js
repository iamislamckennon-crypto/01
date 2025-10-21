/**
 * Input validation utilities
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_REGEX = /^[0-9a-f]{64}$/i;
const PLAYER_ID_MIN_LENGTH = 3;
const PLAYER_ID_MAX_LENGTH = 50;

/**
 * Validate player ID
 * @param {string} playerId
 * @returns {boolean}
 */
export function isValidPlayerId(playerId) {
  return typeof playerId === 'string' &&
    playerId.length >= PLAYER_ID_MIN_LENGTH &&
    playerId.length <= PLAYER_ID_MAX_LENGTH &&
    /^[a-zA-Z0-9_-]+$/.test(playerId);
}

/**
 * Validate UUID v4 format
 * @param {string} uuid
 * @returns {boolean}
 */
export function isValidUUID(uuid) {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid);
}

/**
 * Validate SHA-256 hash (hex format)
 * @param {string} hash
 * @returns {boolean}
 */
export function isValidHash(hash) {
  return typeof hash === 'string' && HASH_REGEX.test(hash);
}

/**
 * Validate dice value
 * @param {number} value
 * @returns {boolean}
 */
export function isValidDiceValue(value) {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}

/**
 * Validate checklist object
 * @param {object} checklist
 * @returns {boolean}
 */
export function isValidChecklist(checklist) {
  if (!checklist || typeof checklist !== 'object') return false;
  
  const requiredFields = ['flatSurface', 'standardDice', 'adequateLighting', 'cameraFixed'];
  return requiredFields.every(field => typeof checklist[field] === 'boolean');
}

/**
 * Validate all checklist items are true
 * @param {object} checklist
 * @returns {boolean}
 */
export function checklistComplete(checklist) {
  if (!isValidChecklist(checklist)) return false;
  return checklist.flatSurface &&
    checklist.standardDice &&
    checklist.adequateLighting &&
    checklist.cameraFixed;
}

/**
 * Validate perspective value
 * @param {string} perspective
 * @returns {boolean}
 */
export function isValidPerspective(perspective) {
  return perspective === 'first-person' || perspective === 'third-person';
}

/**
 * Sanitize error message (prevent sensitive data leakage)
 * @param {Error|string} error
 * @returns {string}
 */
export function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  // Remove potential sensitive patterns
  return message.replace(/[a-f0-9]{64}/gi, '[HASH]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[UUID]');
}
