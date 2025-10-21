/**
 * Evidence Builder Module
 * 
 * Builds consensus from multiple frame detections and constructs
 * evidence packages for submission to the server.
 */

const { detectDiceFace, getAlgorithmVersion } = require('./diceDetector');

/**
 * Build consensus from multiple frame detections
 * 
 * @param {Array<Uint8Array>} frames - Array of grayscale frames
 * @returns {Object} Consensus result { values: number[], confidence: number, status: string }
 */
function buildConsensus(frames) {
  if (frames.length !== 3) {
    throw new Error('Expected exactly 3 frames for consensus');
  }
  
  // Detect face from each frame
  const detections = frames.map(frame => detectDiceFace(frame));
  
  // Count occurrences of each value
  const valueCounts = {};
  detections.forEach(detection => {
    valueCounts[detection.value] = (valueCounts[detection.value] || 0) + 1;
  });
  
  // Find most common value
  let consensusValue = null;
  let maxCount = 0;
  
  for (const [value, count] of Object.entries(valueCounts)) {
    if (count > maxCount) {
      maxCount = count;
      consensusValue = parseInt(value);
    }
  }
  
  // Calculate consensus confidence
  const avgConfidence = detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;
  const consensusRatio = maxCount / frames.length;
  const overallConfidence = avgConfidence * consensusRatio;
  
  // Determine status based on consensus
  let status;
  if (maxCount === 3) {
    status = overallConfidence >= 0.7 ? 'verified' : 'uncertain';
  } else if (maxCount === 2) {
    status = 'uncertain';
  } else {
    status = 'flagged';
  }
  
  return {
    values: [consensusValue],
    confidence: overallConfidence,
    status,
    detections: detections.map(d => ({ value: d.value, confidence: d.confidence }))
  };
}

/**
 * Package evidence for submission
 * 
 * @param {Object} params - Evidence parameters
 * @param {number} params.turnNumber - Turn number
 * @param {Array<string>} params.frameHashes - Array of 3 frame hashes
 * @param {Array<number>} params.diceValues - Detected dice values
 * @param {number} params.stabilizationTimeMs - Time to stabilize (ms)
 * @param {number} params.residualMotionScore - Motion score (0.0-1.0)
 * @param {string} params.status - Detection status
 * @returns {Object} Evidence package
 */
function packageEvidence({ 
  turnNumber, 
  frameHashes, 
  diceValues, 
  stabilizationTimeMs, 
  residualMotionScore,
  status 
}) {
  return {
    turnNumber,
    frameHashes,
    diceValues,
    stabilizationTimeMs,
    residualMotionScore,
    algorithmVersion: getAlgorithmVersion(),
    status,
    timestamp: new Date().toISOString()
  };
}

/**
 * Build complete evidence from frame sequence
 * 
 * @param {Object} params - Parameters
 * @param {number} params.turnNumber - Turn number
 * @param {Array<Uint8Array>} params.frames - 3 grayscale frames
 * @param {Array<string>} params.frameHashes - 3 frame hashes
 * @param {number} params.stabilizationTimeMs - Stabilization time
 * @param {number} params.residualMotionScore - Motion score
 * @returns {Object} Complete evidence package
 */
function buildEvidence({ 
  turnNumber, 
  frames, 
  frameHashes, 
  stabilizationTimeMs, 
  residualMotionScore 
}) {
  const consensus = buildConsensus(frames);
  
  return packageEvidence({
    turnNumber,
    frameHashes,
    diceValues: consensus.values,
    stabilizationTimeMs,
    residualMotionScore,
    status: consensus.status
  });
}

module.exports = {
  buildConsensus,
  packageEvidence,
  buildEvidence
};
