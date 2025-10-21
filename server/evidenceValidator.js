/**
 * Evidence Validation and Consensus Logic
 * Server-side verification of dice detection evidence
 */

const config = require('./config');

/**
 * Validate evidence package structure
 */
function validateEvidenceStructure(evidence) {
  const errors = [];
  
  // Required fields
  if (typeof evidence.turnNumber !== 'number') {
    errors.push('turnNumber must be a number');
  }
  
  if (typeof evidence.surfaceHash !== 'string') {
    errors.push('surfaceHash must be a string');
  }
  
  if (!Array.isArray(evidence.frameHashes)) {
    errors.push('frameHashes must be an array');
  } else if (evidence.frameHashes.length !== config.CONSENSUS_FRAMES) {
    errors.push(`frameHashes must contain exactly ${config.CONSENSUS_FRAMES} hashes`);
  }
  
  if (!Array.isArray(evidence.diceValues)) {
    errors.push('diceValues must be an array');
  } else if (evidence.diceValues.length !== config.CONSENSUS_FRAMES) {
    errors.push(`diceValues must contain exactly ${config.CONSENSUS_FRAMES} values`);
  }
  
  if (typeof evidence.stabilizationTimeMs !== 'number') {
    errors.push('stabilizationTimeMs must be a number');
  }
  
  if (typeof evidence.residualMotionScore !== 'number') {
    errors.push('residualMotionScore must be a number');
  }
  
  if (typeof evidence.algorithmVersion !== 'string') {
    errors.push('algorithmVersion must be a string');
  }
  
  if (typeof evidence.timestamp !== 'number') {
    errors.push('timestamp must be a number');
  }
  
  // Validate dice values are in valid range (0-6, where 0 = uncertain)
  if (Array.isArray(evidence.diceValues)) {
    for (const value of evidence.diceValues) {
      if (typeof value !== 'number' || value < 0 || value > 6) {
        errors.push('diceValues must contain only numbers between 0 and 6');
        break;
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Apply consensus logic to detect values from multiple frames
 * Requires >= 2 of 3 identical values for verification
 */
function applyConsensus(diceValues) {
  if (!Array.isArray(diceValues) || diceValues.length === 0) {
    return {
      value: null,
      status: config.STATUS.FLAGGED,
      reason: 'Invalid or empty dice values'
    };
  }
  
  // Count occurrences of each value
  const counts = {};
  for (const value of diceValues) {
    counts[value] = (counts[value] || 0) + 1;
  }
  
  // Find value(s) with highest count
  let maxCount = 0;
  let consensusValue = null;
  
  for (const [value, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      consensusValue = parseInt(value);
    }
  }
  
  // Check if consensus threshold is met
  if (maxCount >= config.CONSENSUS_MIN_MATCH) {
    // Value 0 means uncertain detection
    if (consensusValue === 0) {
      return {
        value: null,
        status: config.STATUS.UNCERTAIN,
        reason: 'Detection uncertain across multiple frames',
        counts
      };
    }
    
    return {
      value: consensusValue,
      status: config.STATUS.VERIFIED,
      confidence: maxCount / diceValues.length,
      counts
    };
  }
  
  // No consensus reached
  return {
    value: null,
    status: config.STATUS.UNCERTAIN,
    reason: 'No consensus reached across frames',
    counts
  };
}

/**
 * Compute evidence hash for hash chain
 */
function computeEvidenceHash(evidence) {
  // Create deterministic string representation
  const data = JSON.stringify({
    turnNumber: evidence.turnNumber,
    surfaceHash: evidence.surfaceHash,
    frameHashes: evidence.frameHashes,
    diceValues: evidence.diceValues,
    algorithmVersion: evidence.algorithmVersion
  });
  
  // Simple hash for demo (in production use crypto)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  
  return hash.toString(16).padStart(8, '0');
}

/**
 * Check timing constraints
 */
function validateTiming(evidence, revealTimestamp) {
  const timeSinceReveal = evidence.timestamp - revealTimestamp;
  
  if (timeSinceReveal < 0) {
    return {
      valid: false,
      reason: 'Evidence timestamp before reveal',
      violation: true
    };
  }
  
  if (timeSinceReveal > config.DETECTION_WINDOW) {
    return {
      valid: false,
      reason: `Evidence submitted ${timeSinceReveal}ms after reveal (max: ${config.DETECTION_WINDOW}ms)`,
      violation: true
    };
  }
  
  if (evidence.stabilizationTimeMs > config.STABILIZATION_MAX) {
    return {
      valid: false,
      reason: `Stabilization took ${evidence.stabilizationTimeMs}ms (max: ${config.STABILIZATION_MAX}ms)`,
      violation: true
    };
  }
  
  return {
    valid: true,
    timeSinceReveal
  };
}

/**
 * Check for camera movement violation
 */
function checkCameraMovement(evidence) {
  // In a real implementation, server might store baseline hashes
  // For now, we trust client's residualMotionScore
  if (evidence.residualMotionScore > config.CAMERA_MOVE_THRESHOLD) {
    return {
      violation: true,
      reason: `Camera movement detected (score: ${evidence.residualMotionScore.toFixed(3)})`
    };
  }
  
  return {
    violation: false
  };
}

/**
 * Process evidence and determine verification status
 */
function processEvidence(evidence, revealTimestamp) {
  // Validate structure
  const structureValidation = validateEvidenceStructure(evidence);
  if (!structureValidation.valid) {
    return {
      status: config.STATUS.FLAGGED,
      reason: 'Invalid evidence structure',
      errors: structureValidation.errors,
      value: null
    };
  }
  
  // Check timing
  const timingValidation = validateTiming(evidence, revealTimestamp);
  if (!timingValidation.valid) {
    return {
      status: config.STATUS.FLAGGED,
      reason: timingValidation.reason,
      violation: timingValidation.violation,
      value: null
    };
  }
  
  // Check camera movement
  const cameraCheck = checkCameraMovement(evidence);
  if (cameraCheck.violation) {
    return {
      status: config.STATUS.FLAGGED,
      reason: cameraCheck.reason,
      violation: true,
      value: null
    };
  }
  
  // Apply consensus
  const consensus = applyConsensus(evidence.diceValues);
  
  // Compute evidence hash
  const evidenceHash = computeEvidenceHash(evidence);
  
  return {
    status: consensus.status,
    value: consensus.value,
    confidence: consensus.confidence,
    reason: consensus.reason,
    evidenceHash,
    timeSinceReveal: timingValidation.timeSinceReveal,
    requiresOpponentConfirmation: consensus.status === config.STATUS.UNCERTAIN
  };
}

module.exports = {
  validateEvidenceStructure,
  applyConsensus,
  computeEvidenceHash,
  validateTiming,
  checkCameraMovement,
  processEvidence
};
