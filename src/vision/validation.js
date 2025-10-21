/**
 * Evidence Validation Module
 * 
 * Validates evidence structure and timing constraints.
 * Used by both client (pre-submission) and server (verification).
 */

/**
 * Validate evidence structure
 * 
 * @param {Object} evidence - Evidence object to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateEvidenceStructure(evidence) {
  const errors = [];
  
  // Check required fields
  if (typeof evidence.turnNumber !== 'number' || evidence.turnNumber < 1) {
    errors.push('Invalid turnNumber: must be positive integer');
  }
  
  if (!Array.isArray(evidence.frameHashes) || evidence.frameHashes.length !== 3) {
    errors.push('Invalid frameHashes: must be array of exactly 3 hashes');
  } else {
    evidence.frameHashes.forEach((hash, idx) => {
      if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) {
        errors.push(`Invalid frameHash at index ${idx}: must be 64-character hex string`);
      }
    });
  }
  
  if (!Array.isArray(evidence.diceValues) || evidence.diceValues.length === 0) {
    errors.push('Invalid diceValues: must be non-empty array');
  } else {
    evidence.diceValues.forEach((value, idx) => {
      if (typeof value !== 'number' || value < 1 || value > 6) {
        errors.push(`Invalid dice value at index ${idx}: must be 1-6`);
      }
    });
  }
  
  if (typeof evidence.stabilizationTimeMs !== 'number' || evidence.stabilizationTimeMs < 0) {
    errors.push('Invalid stabilizationTimeMs: must be non-negative number');
  }
  
  if (typeof evidence.residualMotionScore !== 'number' || 
      evidence.residualMotionScore < 0 || 
      evidence.residualMotionScore > 1) {
    errors.push('Invalid residualMotionScore: must be between 0.0 and 1.0');
  }
  
  if (typeof evidence.algorithmVersion !== 'string' || evidence.algorithmVersion.length === 0) {
    errors.push('Invalid algorithmVersion: must be non-empty string');
  }
  
  if (!['verified', 'uncertain', 'flagged'].includes(evidence.status)) {
    errors.push('Invalid status: must be verified, uncertain, or flagged');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate evidence timing constraints
 * 
 * @param {Object} evidence - Evidence object
 * @param {Object} config - Configuration { minStabilizationMs, maxResidualMotion }
 * @returns {Object} { valid: boolean, violations: string[] }
 */
function validateEvidenceTiming(evidence, config = {}) {
  const minStabilizationMs = config.minStabilizationMs || 600;
  const maxResidualMotion = config.maxResidualMotion || 0.2;
  
  const violations = [];
  
  if (evidence.stabilizationTimeMs < minStabilizationMs) {
    violations.push(`Stabilization time ${evidence.stabilizationTimeMs}ms below minimum ${minStabilizationMs}ms`);
  }
  
  if (evidence.residualMotionScore > maxResidualMotion) {
    violations.push(`Residual motion ${evidence.residualMotionScore.toFixed(3)} exceeds maximum ${maxResidualMotion}`);
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Validate complete evidence package
 * 
 * @param {Object} evidence - Evidence object
 * @param {Object} config - Optional configuration
 * @returns {Object} { valid: boolean, errors: string[], violations: string[] }
 */
function validateEvidence(evidence, config = {}) {
  const structureResult = validateEvidenceStructure(evidence);
  const timingResult = validateEvidenceTiming(evidence, config);
  
  return {
    valid: structureResult.valid && timingResult.valid,
    errors: structureResult.errors,
    violations: timingResult.violations
  };
}

module.exports = {
  validateEvidenceStructure,
  validateEvidenceTiming,
  validateEvidence
};
