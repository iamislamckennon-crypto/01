/**
 * Unit Tests for Evidence Validation Module
 */

const { 
  validateEvidenceStructure, 
  validateEvidenceTiming, 
  validateEvidence 
} = require('../../src/vision/validation');

// Test validateEvidenceStructure
console.log('Testing validateEvidenceStructure...');

// Valid evidence
const validEvidence = {
  turnNumber: 1,
  frameHashes: [
    'a'.repeat(64),
    'b'.repeat(64),
    'c'.repeat(64)
  ],
  diceValues: [4],
  stabilizationTimeMs: 600,
  residualMotionScore: 0.15,
  algorithmVersion: '1.0.0-test',
  status: 'verified'
};

const result1 = validateEvidenceStructure(validEvidence);
console.assert(result1.valid === true, 'Valid evidence should pass');
console.assert(result1.errors.length === 0, 'Valid evidence should have no errors');
console.log('✓ Valid evidence test passed');

// Invalid turnNumber
const invalidTurn = { ...validEvidence, turnNumber: -1 };
const result2 = validateEvidenceStructure(invalidTurn);
console.assert(result2.valid === false, 'Invalid turnNumber should fail');
console.assert(result2.errors.length > 0, 'Should have errors');
console.log('✓ Invalid turnNumber test passed');

// Invalid frameHashes count
const invalidFrames = { ...validEvidence, frameHashes: ['abc'] };
const result3 = validateEvidenceStructure(invalidFrames);
console.assert(result3.valid === false, 'Wrong frame count should fail');
console.log('✓ Invalid frameHashes count test passed');

// Invalid dice value
const invalidDice = { ...validEvidence, diceValues: [7] };
const result4 = validateEvidenceStructure(invalidDice);
console.assert(result4.valid === false, 'Dice value > 6 should fail');
console.log('✓ Invalid dice value test passed');

// Invalid status
const invalidStatus = { ...validEvidence, status: 'invalid' };
const result5 = validateEvidenceStructure(invalidStatus);
console.assert(result5.valid === false, 'Invalid status should fail');
console.log('✓ Invalid status test passed');

console.log();

// Test validateEvidenceTiming
console.log('Testing validateEvidenceTiming...');

const result6 = validateEvidenceTiming(validEvidence, {
  minStabilizationMs: 600,
  maxResidualMotion: 0.2
});
console.assert(result6.valid === true, 'Valid timing should pass');
console.log('✓ Valid timing test passed');

const lowStabilization = { ...validEvidence, stabilizationTimeMs: 400 };
const result7 = validateEvidenceTiming(lowStabilization, {
  minStabilizationMs: 600
});
console.assert(result7.valid === false, 'Low stabilization should fail');
console.assert(result7.violations.length > 0, 'Should have violations');
console.log('✓ Low stabilization test passed');

const highMotion = { ...validEvidence, residualMotionScore: 0.5 };
const result8 = validateEvidenceTiming(highMotion, {
  maxResidualMotion: 0.2
});
console.assert(result8.valid === false, 'High motion should fail');
console.log('✓ High motion test passed');

console.log();

// Test validateEvidence (combined)
console.log('Testing validateEvidence...');

const result9 = validateEvidence(validEvidence);
console.assert(result9.valid === true, 'Valid complete evidence should pass');
console.log('✓ Valid complete evidence test passed');

const invalidComplete = { 
  ...validEvidence, 
  turnNumber: -1, 
  stabilizationTimeMs: 400 
};
const result10 = validateEvidence(invalidComplete);
console.assert(result10.valid === false, 'Invalid complete should fail');
console.assert(result10.errors.length > 0, 'Should have structure errors');
console.assert(result10.violations.length > 0, 'Should have timing violations');
console.log('✓ Invalid complete evidence test passed');

console.log();
console.log('='.repeat(50));
console.log('All validation tests passed!');
console.log('='.repeat(50));
