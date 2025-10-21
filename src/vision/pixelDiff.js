/**
 * Pixel Difference Utility
 * 
 * Computes pixel-level differences between frames to detect camera movement.
 * Used for tamper detection and stabilization verification.
 */

/**
 * Calculate pixel difference ratio between two grayscale images
 * 
 * @param {Uint8Array} frame1 - First frame (64x64 grayscale)
 * @param {Uint8Array} frame2 - Second frame (64x64 grayscale)
 * @param {number} threshold - Pixel difference threshold (default: 30)
 * @returns {number} Ratio of changed pixels (0.0 to 1.0)
 */
function calculatePixelDiffRatio(frame1, frame2, threshold = 30) {
  if (frame1.length !== frame2.length) {
    throw new Error('Frame dimensions must match');
  }
  
  let changedPixels = 0;
  const totalPixels = frame1.length;
  
  for (let i = 0; i < totalPixels; i++) {
    const diff = Math.abs(frame1[i] - frame2[i]);
    if (diff > threshold) {
      changedPixels++;
    }
  }
  
  return changedPixels / totalPixels;
}

/**
 * Calculate residual motion score across multiple frames
 * 
 * @param {Array<Uint8Array>} frames - Array of grayscale frames
 * @returns {number} Average motion score (0.0 to 1.0)
 */
function calculateResidualMotion(frames) {
  if (frames.length < 2) {
    return 0.0;
  }
  
  let totalDiff = 0;
  let comparisons = 0;
  
  for (let i = 1; i < frames.length; i++) {
    const diff = calculatePixelDiffRatio(frames[i - 1], frames[i]);
    totalDiff += diff;
    comparisons++;
  }
  
  return totalDiff / comparisons;
}

/**
 * Detect excessive camera movement
 * 
 * @param {Uint8Array} preRollFrame - Pre-roll baseline frame
 * @param {Uint8Array} postRollFrame - Post-roll stabilized frame
 * @param {number} maxDiffRatio - Maximum allowed difference ratio (default: 0.35)
 * @returns {boolean} True if movement exceeds threshold
 */
function detectExcessiveMovement(preRollFrame, postRollFrame, maxDiffRatio = 0.35) {
  const diffRatio = calculatePixelDiffRatio(preRollFrame, postRollFrame);
  return diffRatio > maxDiffRatio;
}

module.exports = {
  calculatePixelDiffRatio,
  calculateResidualMotion,
  detectExcessiveMovement
};
