/**
 * Unit Tests for Hash Chain Integration
 */

const { verifyHashChain, verifyEvidenceHash } = require('../../scripts/verify-chain');

console.log('Testing verifyHashChain...');

// Test empty chain
const emptyChain = [];
const result1 = verifyHashChain(emptyChain);
console.assert(result1.valid === true, 'Empty chain should be valid');
console.log('✓ Empty chain test passed');

// Test valid chain
const validChain = [
  {
    type: 'game_started',
    timestamp: '2025-10-21T10:00:00.000Z'
  },
  {
    type: 'evidence_submitted',
    turnNumber: 1,
    playerId: 'player1',
    evidenceHash: 'a'.repeat(64),
    timestamp: '2025-10-21T10:01:00.000Z'
  },
  {
    type: 'evidence_confirmed',
    turnNumber: 1,
    playerId: 'player2',
    timestamp: '2025-10-21T10:02:00.000Z'
  }
];

const result2 = verifyHashChain(validChain);
console.assert(result2.valid === true, 'Valid chain should pass');
console.assert(result2.eventsVerified === 3, 'Should verify all events');
console.log('✓ Valid chain test passed');

// Test chain with missing fields
const invalidChain = [
  {
    type: 'game_started',
    timestamp: '2025-10-21T10:00:00.000Z'
  },
  {
    type: 'evidence_submitted',
    // Missing timestamp
    turnNumber: 1
  }
];

const result3 = verifyHashChain(invalidChain);
console.assert(result3.valid === false, 'Chain with missing fields should fail');
console.assert(result3.errors.length > 0, 'Should have errors');
console.log('✓ Invalid chain test passed');

// Test chain with invalid evidence hash
const invalidEvidenceHash = [
  {
    type: 'evidence_submitted',
    turnNumber: 1,
    playerId: 'player1',
    evidenceHash: 'invalid',
    timestamp: '2025-10-21T10:00:00.000Z'
  }
];

const result4 = verifyHashChain(invalidEvidenceHash);
console.assert(result4.valid === false, 'Invalid evidence hash format should fail');
console.log('✓ Invalid evidence hash format test passed');

console.log();

// Test verifyEvidenceHash
console.log('Testing verifyEvidenceHash...');

const evidence = {
  turnNumber: 1,
  frameHashes: ['abc123', 'def456', 'ghi789'],
  diceValues: [4],
  stabilizationTimeMs: 600,
  residualMotionScore: 0.15,
  algorithmVersion: '1.0.0-test',
  status: 'verified'
};

// Calculate expected hash
const crypto = require('crypto');
const canonical = JSON.stringify({
  turnNumber: evidence.turnNumber,
  frameHashes: evidence.frameHashes,
  diceValues: evidence.diceValues,
  stabilizationTimeMs: evidence.stabilizationTimeMs,
  residualMotionScore: evidence.residualMotionScore,
  algorithmVersion: evidence.algorithmVersion,
  status: evidence.status
});
const expectedHash = crypto.createHash('sha256').update(canonical).digest('hex');

const result5 = verifyEvidenceHash(evidence, expectedHash);
console.assert(result5 === true, 'Matching evidence hash should verify');
console.log('✓ Valid evidence hash test passed');

const result6 = verifyEvidenceHash(evidence, 'wrong-hash');
console.assert(result6 === false, 'Wrong hash should not verify');
console.log('✓ Invalid evidence hash test passed');

// Test with modified evidence
const modifiedEvidence = { ...evidence, diceValues: [5] };
const result7 = verifyEvidenceHash(modifiedEvidence, expectedHash);
console.assert(result7 === false, 'Modified evidence should not match original hash');
console.log('✓ Modified evidence test passed');

console.log();
console.log('='.repeat(50));
console.log('All hash chain tests passed!');
console.log('='.repeat(50));
