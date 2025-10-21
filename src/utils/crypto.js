/**
 * Cryptographic utilities for commitment-reveal protocol and hash chain
 */

/**
 * Compute SHA-256 hash of input
 * @param {string|Uint8Array} input - Data to hash
 * @returns {Promise<string>} - Hex-encoded hash
 */
export async function sha256(input) {
  const encoder = new TextEncoder();
  const data = typeof input === 'string' ? encoder.encode(input) : input;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute commitment hash for dice roll
 * @param {string} salt - UUID v4 salt
 * @param {string} playerId - Player identifier
 * @param {number} turnNumber - Current turn number
 * @returns {Promise<string>} - Commitment hash
 */
export async function computeCommitment(salt, playerId, turnNumber) {
  const payload = `${salt}:${playerId}:${turnNumber}`;
  return await sha256(payload);
}

/**
 * Canonicalize event object for hashing (deterministic JSON)
 * @param {object} event - Event payload
 * @returns {string} - Canonical JSON string with sorted keys
 */
export function canonicalizeEvent(event) {
  const sortKeys = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = sortKeys(obj[key]);
        return result;
      }, {});
  };
  return JSON.stringify(sortKeys(event));
}

/**
 * Compute hash chain link
 * @param {string} prevHash - Previous hash in chain
 * @param {string} payloadJson - Canonical JSON of current event
 * @returns {Promise<string>} - New chain hash
 */
export async function chainHash(prevHash, payloadJson) {
  const combined = `${prevHash}:${payloadJson}`;
  return await sha256(combined);
}

/**
 * Verify commitment matches reveal
 * @param {string} commitmentHash - Stored commitment
 * @param {string} salt - Revealed salt
 * @param {string} playerId - Player ID
 * @param {number} turnNumber - Turn number
 * @returns {Promise<boolean>} - True if valid
 */
export async function verifyCommitment(commitmentHash, salt, playerId, turnNumber) {
  const computed = await computeCommitment(salt, playerId, turnNumber);
  return computed === commitmentHash;
}
