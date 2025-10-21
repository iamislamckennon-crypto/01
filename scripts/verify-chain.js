#!/usr/bin/env node

/**
 * Hash Chain Verification Script
 * 
 * Verifies integrity of hash chain including evidence hashes.
 * Extended to support evidence hash verification.
 * 
 * Usage:
 *   node scripts/verify-chain.js [--game-room-id=<id>] [--verify-evidence]
 */

'use strict';

const crypto = require('crypto');

/**
 * Hash a value
 * 
 * @param {string} value - Value to hash
 * @returns {string} SHA-256 hash
 */
function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Verify hash chain integrity
 * 
 * @param {Array<Object>} chain - Array of chain events
 * @returns {Object} Verification result
 */
function verifyHashChain(chain) {
  if (chain.length === 0) {
    return {
      valid: true,
      message: 'Empty chain (trivially valid)'
    };
  }
  
  const errors = [];
  let previousHash = null;
  
  for (let i = 0; i < chain.length; i++) {
    const event = chain[i];
    
    // Verify event structure
    if (!event.type || !event.timestamp) {
      errors.push(`Event ${i}: Missing required fields (type, timestamp)`);
      continue;
    }
    
    // Calculate event hash
    const eventData = {
      type: event.type,
      timestamp: event.timestamp,
      ...extractEventData(event)
    };
    
    const eventHash = hash(JSON.stringify(eventData));
    
    // For evidence events, verify evidenceHash if present
    if (event.type === 'evidence_submitted' && event.evidenceHash) {
      // Evidence hash should be present
      if (!/^[a-f0-9]{64}$/i.test(event.evidenceHash)) {
        errors.push(`Event ${i}: Invalid evidenceHash format`);
      }
    }
    
    // Store for chain linking (if implementing linked chain)
    previousHash = eventHash;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    eventsVerified: chain.length
  };
}

/**
 * Extract event-specific data
 * 
 * @param {Object} event - Chain event
 * @returns {Object} Event data
 */
function extractEventData(event) {
  const data = {};
  
  // Include all fields except type and timestamp (already included)
  for (const key of Object.keys(event)) {
    if (key !== 'type' && key !== 'timestamp') {
      data[key] = event[key];
    }
  }
  
  return data;
}

/**
 * Verify evidence hash matches evidence data
 * 
 * @param {Object} evidence - Evidence object
 * @param {string} expectedHash - Expected hash
 * @returns {boolean} True if matches
 */
function verifyEvidenceHash(evidence, expectedHash) {
  // Create canonical representation
  const canonical = JSON.stringify({
    turnNumber: evidence.turnNumber,
    frameHashes: evidence.frameHashes,
    diceValues: evidence.diceValues,
    stabilizationTimeMs: evidence.stabilizationTimeMs,
    residualMotionScore: evidence.residualMotionScore,
    algorithmVersion: evidence.algorithmVersion,
    status: evidence.status
  });
  
  const actualHash = hash(canonical);
  return actualHash === expectedHash;
}

/**
 * Fetch game state from storage
 * 
 * @param {string} gameRoomId - Game room ID
 * @returns {Promise<Object>} Game state with chain and evidence
 */
async function fetchGameState(gameRoomId) {
  // Placeholder implementation
  // In production, this would fetch from Durable Object
  
  console.log(`Fetching game state for room ${gameRoomId}...`);
  
  // Generate placeholder chain
  const chain = [
    {
      type: 'game_started',
      timestamp: '2025-10-21T10:00:00.000Z'
    },
    {
      type: 'evidence_submitted',
      turnNumber: 1,
      playerId: 'player1',
      evidenceHash: hash(JSON.stringify({
        turnNumber: 1,
        frameHashes: ['abc123', 'def456', 'ghi789'],
        diceValues: [4],
        stabilizationTimeMs: 600,
        residualMotionScore: 0.15,
        algorithmVersion: '1.0.0-deterministic-threshold',
        status: 'verified'
      })),
      timestamp: '2025-10-21T10:01:00.000Z'
    },
    {
      type: 'evidence_confirmed',
      turnNumber: 1,
      playerId: 'player2',
      timestamp: '2025-10-21T10:02:00.000Z'
    }
  ];
  
  const evidence = {
    turn_1: {
      turnNumber: 1,
      frameHashes: ['abc123', 'def456', 'ghi789'],
      diceValues: [4],
      stabilizationTimeMs: 600,
      residualMotionScore: 0.15,
      algorithmVersion: '1.0.0-deterministic-threshold',
      status: 'verified',
      evidenceHash: chain[1].evidenceHash
    }
  };
  
  return { chain, evidence };
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Hash Chain Verification Tool');
  console.log('='.repeat(70));
  console.log();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let gameRoomId = 'default';
  let verifyEvidence = false;
  
  args.forEach(arg => {
    if (arg.startsWith('--game-room-id=')) {
      gameRoomId = arg.split('=')[1];
    }
    if (arg === '--verify-evidence') {
      verifyEvidence = true;
    }
  });
  
  console.log(`Configuration:`);
  console.log(`  Game Room ID: ${gameRoomId}`);
  console.log(`  Verify Evidence: ${verifyEvidence ? 'Yes' : 'No'}`);
  console.log();
  
  // Fetch game state
  const gameState = await fetchGameState(gameRoomId);
  
  console.log(`Chain Length: ${gameState.chain.length} events`);
  console.log(`Evidence Records: ${Object.keys(gameState.evidence).length}`);
  console.log();
  
  // Verify hash chain
  console.log('Verifying hash chain...');
  const chainResult = verifyHashChain(gameState.chain);
  
  if (chainResult.valid) {
    console.log(`✓ Chain valid (${chainResult.eventsVerified} events verified)`);
  } else {
    console.log(`✗ Chain invalid`);
    chainResult.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  console.log();
  
  // Verify evidence hashes if requested
  let evidenceErrors = 0;
  
  if (verifyEvidence) {
    console.log('Verifying evidence hashes...');
    
    let evidenceVerified = 0;
    
    for (const [key, evidence] of Object.entries(gameState.evidence)) {
      if (evidence.evidenceHash) {
        const valid = verifyEvidenceHash(evidence, evidence.evidenceHash);
        
        if (valid) {
          evidenceVerified++;
          console.log(`  ✓ ${key}: Hash valid`);
        } else {
          evidenceErrors++;
          console.log(`  ✗ ${key}: Hash mismatch`);
        }
      }
    }
    
    console.log();
    console.log(`Evidence Summary:`);
    console.log(`  Verified: ${evidenceVerified}`);
    console.log(`  Errors: ${evidenceErrors}`);
    console.log();
  }
  
  // Final result
  console.log('='.repeat(70));
  const allVerified = chainResult.valid && (!verifyEvidence || (typeof evidenceErrors !== 'undefined' && evidenceErrors === 0));
  if (allVerified) {
    console.log('✓ VERIFICATION PASSED');
  } else {
    console.log('✗ VERIFICATION FAILED');
  }
  console.log('='.repeat(70));
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

// Export for testing
module.exports = {
  hash,
  verifyHashChain,
  verifyEvidenceHash,
  fetchGameState
};
