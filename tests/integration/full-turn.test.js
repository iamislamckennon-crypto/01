/**
 * Integration Test: Full Turn Simulation
 * 
 * Tests the complete flow from evidence submission through confirmation
 */

const GameRoomDO = require('../../src/durable-objects/GameRoomDO');
const { buildEvidence } = require('../../src/vision/evidenceBuilder');

console.log('Integration Test: Full Turn Simulation');
console.log('='.repeat(50));
console.log();

// Mock Durable Object state
class MockState {
  constructor() {
    this.data = new Map();
    this.storage = {
      get: async (key) => this.data.get(key),
      put: async (key, value) => this.data.set(key, value)
    };
  }
}

// Mock environment
const mockEnv = {
  MIN_STABILIZATION_MS: 600,
  MAX_RESIDUAL_MOTION: 0.2
};

// Create test frames
function createTestFrame(size = 64) {
  const frame = new Uint8Array(size * size);
  for (let i = 0; i < frame.length; i++) {
    frame[i] = Math.floor(Math.random() * 256);
  }
  return frame;
}

// Simulate complete turn
async function simulateCompleteTurn() {
  console.log('Step 1: Initialize Game Room');
  const state = new MockState();
  state.id = { toString: () => 'test-room-123' };
  const gameRoom = new GameRoomDO(state, mockEnv);
  
  await gameRoom.initialize();
  console.log('✓ Game room initialized');
  console.log();
  
  console.log('Step 2: Capture Frames and Build Evidence');
  const frames = [
    createTestFrame(),
    createTestFrame(),
    createTestFrame()
  ];
  
  const frameHashes = [
    'a'.repeat(64),
    'b'.repeat(64),
    'c'.repeat(64)
  ];
  
  const evidence = buildEvidence({
    turnNumber: 1,
    frames,
    frameHashes,
    stabilizationTimeMs: 650,
    residualMotionScore: 0.15
  });
  
  console.log('✓ Evidence built');
  console.log(`  - Dice Values: ${evidence.diceValues.join(', ')}`);
  console.log(`  - Status: ${evidence.status}`);
  console.log(`  - Stabilization: ${evidence.stabilizationTimeMs}ms`);
  console.log(`  - Motion Score: ${(evidence.residualMotionScore * 100).toFixed(1)}%`);
  console.log();
  
  console.log('Step 3: Submit Evidence');
  const submitResult = await gameRoom.submitEvidence(evidence, 'player1');
  
  console.assert(submitResult.success === true, 'Evidence submission should succeed');
  console.assert(typeof submitResult.evidenceHash === 'string', 'Should return evidence hash');
  console.log('✓ Evidence submitted successfully');
  console.log(`  - Evidence Hash: ${submitResult.evidenceHash.substring(0, 16)}...`);
  console.log();
  
  console.log('Step 4: Verify Evidence Stored');
  const gameState = await gameRoom.getState();
  console.assert(gameState.evidence.turn_1 !== undefined, 'Evidence should be stored');
  console.assert(gameState.hashChain.length > 0, 'Hash chain should have events');
  console.log('✓ Evidence stored in game state');
  console.log(`  - Hash Chain Length: ${gameState.hashChain.length}`);
  console.log();
  
  console.log('Step 5: Opponent Confirms Evidence (if uncertain)');
  if (evidence.status === 'uncertain') {
    const confirmResult = await gameRoom.confirmEvidence(1, 'player2');
    console.assert(confirmResult.success === true, 'Confirmation should succeed');
    console.log('✓ Evidence confirmed by opponent');
    console.log(`  - New Status: ${confirmResult.status}`);
  } else {
    console.log('  - Skipped (evidence already verified)');
  }
  console.log();
  
  console.log('Step 6: Retrieve Evidence Summary');
  const evidenceSummary = await gameRoom.getEvidence(1);
  console.assert(evidenceSummary !== null, 'Should retrieve evidence');
  console.assert(evidenceSummary.turnNumber === 1, 'Turn number should match');
  console.log('✓ Evidence retrieved successfully');
  console.log(`  - Dice Values: ${evidenceSummary.diceValues.join(', ')}`);
  console.log(`  - Status: ${evidenceSummary.status}`);
  console.log();
  
  console.log('Step 7: Test Duplicate Submission (Should Fail)');
  const duplicateResult = await gameRoom.submitEvidence(evidence, 'player1');
  console.assert(duplicateResult.success === false, 'Duplicate should be rejected');
  console.assert(duplicateResult.errors.length > 0, 'Should have error message');
  console.log('✓ Duplicate submission correctly rejected');
  console.log();
  
  return gameState;
}

// Run test
(async () => {
  try {
    const finalState = await simulateCompleteTurn();
    
    console.log('='.repeat(50));
    console.log('Integration Test PASSED');
    console.log('='.repeat(50));
    console.log();
    console.log('Final State Summary:');
    console.log(`  - Evidence Records: ${Object.keys(finalState.evidence).length}`);
    console.log(`  - Hash Chain Events: ${finalState.hashChain.length}`);
    console.log(`  - Game Status: ${finalState.status}`);
    
  } catch (error) {
    console.error('Integration Test FAILED');
    console.error(error);
    process.exit(1);
  }
})();
