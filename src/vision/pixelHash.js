/**
 * Pixel Hash Utility
 * 
 * Provides deterministic frame hashing for tamper detection.
 * Downscales frames to 64x64 grayscale and computes SHA-256 hash.
 */

const crypto = require('crypto');

/**
 * Downscale and convert image data to 64x64 grayscale
 * 
 * @param {ImageData|Buffer} imageData - Raw image data (RGBA format)
 * @param {number} width - Original image width
 * @param {number} height - Original image height
 * @returns {Uint8Array} 64x64 grayscale data
 */
function downscaleToGrayscale(imageData, width, height) {
  const targetSize = 64;
  const grayscale = new Uint8Array(targetSize * targetSize);
  
  const scaleX = width / targetSize;
  const scaleY = height / targetSize;
  
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      // Sample from original image
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIndex = (srcY * width + srcX) * 4; // RGBA
      
      // Convert to grayscale: 0.299R + 0.587G + 0.114B
      const r = imageData[srcIndex];
      const g = imageData[srcIndex + 1];
      const b = imageData[srcIndex + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      grayscale[y * targetSize + x] = gray;
    }
  }
  
  return grayscale;
}

/**
 * Compute SHA-256 hash of frame data
 * 
 * @param {Uint8Array} grayscaleData - 64x64 grayscale pixel data
 * @returns {string} Hex-encoded SHA-256 hash
 */
function computeHash(grayscaleData) {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from(grayscaleData));
  return hash.digest('hex');
}

/**
 * Hash a video frame for evidence tracking
 * 
 * @param {ImageData|Buffer} frameData - Raw frame pixel data (RGBA)
 * @param {number} width - Frame width
 * @param {number} height - Frame height
 * @returns {string} Frame hash (SHA-256 hex)
 */
function hashFrame(frameData, width, height) {
  const grayscale = downscaleToGrayscale(frameData, width, height);
  return computeHash(grayscale);
}

/**
 * Verify a frame hash matches the provided data
 * 
 * @param {ImageData|Buffer} frameData - Raw frame pixel data
 * @param {number} width - Frame width
 * @param {number} height - Frame height
 * @param {string} expectedHash - Expected hash value
 * @returns {boolean} True if hash matches
 */
function verifyFrameHash(frameData, width, height, expectedHash) {
  const actualHash = hashFrame(frameData, width, height);
  return actualHash === expectedHash;
}

module.exports = {
  downscaleToGrayscale,
  computeHash,
  hashFrame,
  verifyFrameHash
};
