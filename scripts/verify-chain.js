#!/usr/bin/env node
/**
 * Hash Chain Verification Script
 * Verifies the integrity of the event hash chain
 * Usage: node scripts/verify-chain.js [roomId] [apiUrl]
 */

import { sha256, canonicalizeEvent, chainHash } from '../src/utils/crypto.js';

async function verifyHashChain(events) {
  console.log(`Verifying hash chain with ${events.length} events...\n`);
  
  let prevHash = 'genesis';
  let isValid = true;
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    console.log(`Event ${i + 1}:`);
    console.log(`  Type: ${event.type}`);
    console.log(`  Claimed previous hash: ${event.prevHash}`);
    console.log(`  Claimed current hash: ${event.hash}`);
    
    // Verify previous hash matches
    if (event.prevHash !== prevHash) {
      console.log(`  ❌ ERROR: Previous hash mismatch!`);
      console.log(`     Expected: ${prevHash}`);
      console.log(`     Got: ${event.prevHash}`);
      isValid = false;
      break;
    }
    
    // Remove hash fields from event for canonical computation
    const { hash, prevHash: _, ...eventData } = event;
    
    // Compute canonical form and expected hash
    const canonical = canonicalizeEvent(eventData);
    const expectedHash = await chainHash(prevHash, canonical);
    
    if (expectedHash !== event.hash) {
      console.log(`  ❌ ERROR: Hash mismatch!`);
      console.log(`     Expected: ${expectedHash}`);
      console.log(`     Got: ${event.hash}`);
      isValid = false;
      break;
    }
    
    console.log(`  ✓ Valid\n`);
    prevHash = event.hash;
  }
  
  if (isValid) {
    console.log('✅ Hash chain verification PASSED');
    console.log(`Final hash tip: ${prevHash}`);
  } else {
    console.log('❌ Hash chain verification FAILED');
  }
  
  return isValid;
}

async function fetchAndVerify(roomId, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/api/gameroom/${roomId}/state`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const gameState = await response.json();
    
    console.log('='.repeat(60));
    console.log('Hash Chain Verification Report');
    console.log('='.repeat(60));
    console.log(`Room ID: ${roomId}`);
    console.log(`Game Status: ${gameState.status}`);
    console.log(`Current Turn: ${gameState.turnNumber}`);
    console.log(`Hash Chain Tip: ${gameState.hashChainTip}`);
    console.log('='.repeat(60));
    console.log();
    
    const isValid = await verifyHashChain(gameState.rollEvents);
    
    console.log();
    console.log('='.repeat(60));
    
    process.exit(isValid ? 0 : 1);
    
  } catch (error) {
    console.error('Error fetching game state:', error.message);
    process.exit(1);
  }
}

// Sample data for testing without API
const sampleEvents = [
  {
    type: 'game_started',
    timestamp: 1234567890,
    players: ['player1', 'player2'],
    prevHash: 'genesis',
    hash: '...' // Will be computed
  }
];

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Hash Chain Verification Script');
  console.log('==============================\n');
  console.log('Usage:');
  console.log('  node scripts/verify-chain.js <roomId> [apiUrl]');
  console.log('  node scripts/verify-chain.js --test\n');
  console.log('Options:');
  console.log('  --test    Run with sample test data');
  console.log('  --help    Show this help message\n');
  console.log('Examples:');
  console.log('  node scripts/verify-chain.js abc123 http://localhost:8787');
  console.log('  node scripts/verify-chain.js abc123 https://your-worker.workers.dev');
  console.log('  node scripts/verify-chain.js --test\n');
  process.exit(0);
}

if (args[0] === '--help') {
  console.log('Hash Chain Verification Script');
  console.log('==============================\n');
  console.log('This script verifies the integrity of the event hash chain in a game room.');
  console.log('It fetches the game state from the API and validates that each event');
  console.log('in the chain correctly links to the previous event.\n');
  console.log('The verification checks:');
  console.log('  1. Each event\'s prevHash matches the previous event\'s hash');
  console.log('  2. Each event\'s hash is correctly computed from its canonical JSON');
  console.log('  3. The chain is unbroken from genesis to the current tip\n');
  process.exit(0);
}

if (args[0] === '--test') {
  console.log('Running with test data...\n');
  
  // Create a simple test chain
  const testEvents = [];
  let prevHash = 'genesis';
  
  for (let i = 0; i < 3; i++) {
    const event = {
      type: 'turn_completed',
      turnNumber: i + 1,
      playerId: i % 2 === 0 ? 'player1' : 'player2',
      value: (i % 6) + 1,
      timestamp: Date.now() + i * 1000,
      preFrameHash: 'a'.repeat(64),
      postFrameHash: 'b'.repeat(64)
    };
    
    const canonical = canonicalizeEvent(event);
    const hash = await chainHash(prevHash, canonical);
    
    testEvents.push({
      ...event,
      prevHash,
      hash
    });
    
    prevHash = hash;
  }
  
  await verifyHashChain(testEvents);
  process.exit(0);
}

// Fetch and verify from API
const roomId = args[0];
const apiUrl = args[1] || 'http://localhost:8787';

fetchAndVerify(roomId, apiUrl);
