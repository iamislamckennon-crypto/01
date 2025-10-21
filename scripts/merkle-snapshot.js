#!/usr/bin/env node

/**
 * Merkle Snapshot Script
 * 
 * Builds Merkle tree from last N event hashes and prints root.
 * Provides scaffolding for future blockchain anchoring.
 * 
 * Usage:
 *   node scripts/merkle-snapshot.js [--events=50] [--game-room-id=<id>]
 */

'use strict';

const crypto = require('crypto');

/**
 * Hash a single value
 * 
 * @param {string} value - Value to hash
 * @returns {string} SHA-256 hash
 */
function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Combine two hashes
 * 
 * @param {string} left - Left hash
 * @param {string} right - Right hash
 * @returns {string} Combined hash
 */
function combineHashes(left, right) {
  return hash(left + right);
}

/**
 * Build Merkle tree from leaf hashes
 * 
 * @param {Array<string>} leaves - Leaf node hashes
 * @returns {Object} { root, tree, leaves }
 */
function buildMerkleTree(leaves) {
  if (leaves.length === 0) {
    throw new Error('Cannot build tree from empty leaves');
  }
  
  // Copy leaves array
  let currentLevel = [...leaves];
  const tree = [currentLevel];
  
  // Build tree bottom-up
  while (currentLevel.length > 1) {
    const nextLevel = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      
      const parent = combineHashes(left, right);
      nextLevel.push(parent);
    }
    
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }
  
  return {
    root: currentLevel[0],
    tree,
    leaves: leaves.length
  };
}

/**
 * Generate Merkle proof for a leaf
 * 
 * @param {Array<Array<string>>} tree - Merkle tree
 * @param {number} leafIndex - Index of leaf to prove
 * @returns {Array<Object>} Proof path
 */
function generateProof(tree, leafIndex) {
  const proof = [];
  let index = leafIndex;
  
  for (let level = 0; level < tree.length - 1; level++) {
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;
    
    if (siblingIndex < tree[level].length) {
      proof.push({
        hash: tree[level][siblingIndex],
        position: isRightNode ? 'left' : 'right'
      });
    }
    
    index = Math.floor(index / 2);
  }
  
  return proof;
}

/**
 * Verify Merkle proof
 * 
 * @param {string} leaf - Leaf hash
 * @param {Array<Object>} proof - Proof path
 * @param {string} root - Expected root hash
 * @returns {boolean} True if proof valid
 */
function verifyProof(leaf, proof, root) {
  let current = leaf;
  
  for (const step of proof) {
    if (step.position === 'left') {
      current = combineHashes(step.hash, current);
    } else {
      current = combineHashes(current, step.hash);
    }
  }
  
  return current === root;
}

/**
 * Fetch event hashes from game room
 * 
 * @param {string} gameRoomId - Game room ID
 * @param {number} limit - Maximum events to fetch
 * @returns {Promise<Array<string>>} Event hashes
 */
async function fetchEventHashes(gameRoomId, limit) {
  // Placeholder implementation
  // In production, this would fetch from Durable Object storage
  
  console.log(`Fetching last ${limit} events for game room ${gameRoomId}...`);
  
  // For now, generate placeholder hashes
  const hashes = [];
  for (let i = 0; i < limit; i++) {
    const event = {
      type: 'placeholder',
      index: i,
      timestamp: new Date().toISOString()
    };
    hashes.push(hash(JSON.stringify(event)));
  }
  
  return hashes;
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Merkle Snapshot Tool');
  console.log('='.repeat(70));
  console.log();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let batchSize = 50;
  let gameRoomId = 'default';
  
  args.forEach(arg => {
    if (arg.startsWith('--events=')) {
      batchSize = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--game-room-id=')) {
      gameRoomId = arg.split('=')[1];
    }
  });
  
  // Validate batch size from env
  const envBatchSize = process.env.MERKLE_BATCH_SIZE;
  if (envBatchSize) {
    batchSize = parseInt(envBatchSize);
  }
  
  console.log(`Configuration:`);
  console.log(`  Game Room ID: ${gameRoomId}`);
  console.log(`  Batch Size: ${batchSize} events`);
  console.log();
  
  // Fetch event hashes
  const eventHashes = await fetchEventHashes(gameRoomId, batchSize);
  console.log(`Fetched ${eventHashes.length} event hashes`);
  console.log();
  
  // Build Merkle tree
  console.log('Building Merkle tree...');
  const merkleTree = buildMerkleTree(eventHashes);
  
  console.log(`✓ Tree built successfully`);
  console.log(`  Leaves: ${merkleTree.leaves}`);
  console.log(`  Levels: ${merkleTree.tree.length}`);
  console.log(`  Root: ${merkleTree.root}`);
  console.log();
  
  // Generate proof for first event (example)
  if (eventHashes.length > 0) {
    console.log('Generating proof for first event (example)...');
    const proof = generateProof(merkleTree.tree, 0);
    const valid = verifyProof(eventHashes[0], proof, merkleTree.root);
    
    console.log(`  Proof length: ${proof.length} steps`);
    console.log(`  Verification: ${valid ? '✓ Valid' : '✗ Invalid'}`);
    console.log();
  }
  
  // Output result
  console.log('='.repeat(70));
  console.log('MERKLE ROOT:');
  console.log(merkleTree.root);
  console.log('='.repeat(70));
  console.log();
  console.log('This root can be anchored on-chain for immutable audit.');
  console.log('TODO: Implement blockchain anchoring integration');
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
  combineHashes,
  buildMerkleTree,
  generateProof,
  verifyProof,
  fetchEventHashes
};
