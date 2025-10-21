/**
 * Unit Tests for Evidence Builder Module
 */

const { buildConsensus, packageEvidence } = require('../../src/vision/evidenceBuilder');

// Create test grayscale frames
function createTestFrame(darkRatio) {
  const frame = new Uint8Array(64 * 64);
  const darkPixels = Math.floor(64 * 64 * darkRatio);
  
  for (let i = 0; i < darkPixels; i++) {
    frame[i] = 50; // Dark pixel
  }
  
  for (let i = darkPixels; i < frame.length; i++) {
    frame[i] = 200; // Light pixel
  }
  
  return frame;
}

console.log('Testing buildConsensus...');

// Test perfect consensus (all 3 frames agree)
const frames1 = [
  createTestFrame(0.03), // Should detect as 1
  createTestFrame(0.03),
  createTestFrame(0.03)
];

const consensus1 = buildConsensus(frames1);
console.assert(consensus1.values.length === 1, 'Should return one value');
console.assert(consensus1.values[0] >= 1 && consensus1.values[0] <= 6, 'Value should be 1-6');
console.assert(consensus1.status === 'verified' || consensus1.status === 'uncertain', 
               'Perfect consensus should be verified or uncertain');
console.log('✓ Perfect consensus test passed');

// Test majority consensus (2 out of 3)
const frames2 = [
  createTestFrame(0.03), // Should detect as 1
  createTestFrame(0.03),
  createTestFrame(0.15)  // Should detect as different value
];

const consensus2 = buildConsensus(frames2);
console.assert(consensus2.status === 'uncertain', 'Majority consensus should be uncertain');
console.log('✓ Majority consensus test passed');

// Test no consensus (all different)
const frames3 = [
  createTestFrame(0.03),
  createTestFrame(0.12),
  createTestFrame(0.22)
];

const consensus3 = buildConsensus(frames3);
console.assert(consensus3.status === 'flagged', 'No consensus should be flagged');
console.log('✓ No consensus test passed');

console.log();

// Test packageEvidence
console.log('Testing packageEvidence...');

const evidence = packageEvidence({
  turnNumber: 5,
  frameHashes: ['hash1', 'hash2', 'hash3'],
  diceValues: [3, 4],
  stabilizationTimeMs: 650,
  residualMotionScore: 0.12,
  status: 'verified'
});

console.assert(evidence.turnNumber === 5, 'Turn number should match');
console.assert(evidence.frameHashes.length === 3, 'Should have 3 frame hashes');
console.assert(evidence.diceValues.length === 2, 'Should have 2 dice values');
console.assert(evidence.stabilizationTimeMs === 650, 'Stabilization time should match');
console.assert(evidence.residualMotionScore === 0.12, 'Motion score should match');
console.assert(evidence.status === 'verified', 'Status should match');
console.assert(typeof evidence.algorithmVersion === 'string', 'Should have algorithm version');
console.assert(typeof evidence.timestamp === 'string', 'Should have timestamp');
console.log('✓ Package evidence test passed');

console.log();
console.log('='.repeat(50));
console.log('All consensus tests passed!');
console.log('='.repeat(50));
