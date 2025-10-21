/**
 * Crypto utilities for commitment-reveal and hash chaining
 */

/**
 * Generate SHA-256 hash of input string
 * @param {string} input - Input string to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function sha256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate commitment hash for dice roll
 * @param {string} salt - Random salt (UUID)
 * @param {string} playerId - Player identifier
 * @param {number} turnNumber - Turn number
 * @returns {Promise<string>} Commitment hash
 */
export async function generateCommitment(salt, playerId, turnNumber) {
  const commitmentString = `${salt}${playerId}${turnNumber}`;
  return await sha256(commitmentString);
}

/**
 * Verify commitment against revealed salt
 * @param {string} commitmentHash - Original commitment hash
 * @param {string} salt - Revealed salt
 * @param {string} playerId - Player identifier
 * @param {number} turnNumber - Turn number
 * @returns {Promise<boolean>} True if commitment is valid
 */
export async function verifyCommitment(commitmentHash, salt, playerId, turnNumber) {
  const recomputedHash = await generateCommitment(salt, playerId, turnNumber);
  return recomputedHash === commitmentHash;
}

/**
 * Generate cryptographically secure random dice roll (1-6)
 * @returns {number} Dice roll result
 */
export function rollDice() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Map to 1-6 range
  return (array[0] % 6) + 1;
}

/**
 * Generate event hash for hash chain
 * @param {string} prevHash - Previous event hash in chain
 * @param {object} eventPayload - Event payload object
 * @returns {Promise<string>} Event hash
 */
export async function generateEventHash(prevHash, eventPayload) {
  const payloadString = JSON.stringify(eventPayload);
  const payloadHash = await sha256(payloadString);
  const chainInput = `${prevHash}${payloadHash}`;
  return await sha256(chainInput);
}

/**
 * Generate random UUID v4 (for salt generation)
 * @returns {string} UUID v4
 */
export function generateUUID() {
  return crypto.randomUUID();
}
