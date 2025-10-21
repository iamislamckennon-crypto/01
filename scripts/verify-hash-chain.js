#!/usr/bin/env node
/**
 * Hash Chain Verification Script
 * Verifies integrity of exported hash chain data
 */

const fs = require('fs');
const path = require('path');

// Import hash computation logic
function computeEventHash(event) {
  const data = JSON.stringify({
    type: event.type,
    data: event.data,
    timestamp: event.timestamp,
    previousHash: event.previousHash,
    eventIndex: event.eventIndex
  });
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  
  return hash.toString(16).padStart(16, '0');
}

function verifyHashChain(chainData) {
  const errors = [];
  const warnings = [];
  let currentHash = '0000000000000000';
  
  console.log('Starting hash chain verification...\n');
  console.log(`Chain contains ${chainData.events.length} events\n`);
  
  // Verify each event
  for (let i = 0; i < chainData.events.length; i++) {
    const event = chainData.events[i];
    
    console.log(`Event ${i}: ${event.type} (Turn ${event.data.turnNumber || 'N/A'})`);
    
    // Check event index
    if (event.eventIndex !== i) {
      errors.push(`Event ${i}: Event index mismatch (expected ${i}, got ${event.eventIndex})`);
    }
    
    // Check previous hash
    if (event.previousHash !== currentHash) {
      errors.push(`Event ${i}: Previous hash mismatch`);
      console.log(`  ✗ Previous hash mismatch`);
      console.log(`    Expected: ${currentHash}`);
      console.log(`    Got: ${event.previousHash}`);
    } else {
      console.log(`  ✓ Previous hash valid`);
    }
    
    // Recompute and verify event hash
    const computedHash = computeEventHash(event);
    if (computedHash !== event.hash) {
      errors.push(`Event ${i}: Hash mismatch (computed ${computedHash}, stored ${event.hash})`);
      console.log(`  ✗ Hash mismatch`);
      console.log(`    Computed: ${computedHash}`);
      console.log(`    Stored: ${event.hash}`);
    } else {
      console.log(`  ✓ Hash valid`);
    }
    
    // Check timestamp ordering
    if (i > 0 && event.timestamp < chainData.events[i - 1].timestamp) {
      warnings.push(`Event ${i}: Timestamp earlier than previous event`);
      console.log(`  ⚠ Timestamp ordering issue`);
    }
    
    // Validate event type
    const validTypes = ['ROLL_COMMIT', 'ROLL_REVEAL', 'ROLL_EVIDENCE', 'OPPONENT_CONFIRM', 'REROLL_REQUEST'];
    if (!validTypes.includes(event.type)) {
      warnings.push(`Event ${i}: Unknown event type: ${event.type}`);
      console.log(`  ⚠ Unknown event type`);
    }
    
    currentHash = event.hash;
    console.log();
  }
  
  // Verify chain tip
  if (chainData.tip !== currentHash) {
    errors.push(`Chain tip mismatch (expected ${currentHash}, got ${chainData.tip})`);
  }
  
  // Print summary
  console.log('═'.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total Events: ${chainData.events.length}`);
  console.log(`Chain Tip: ${chainData.tip}`);
  console.log(`Computed Tip: ${currentHash}`);
  console.log();
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✓ VERIFICATION PASSED');
    console.log('  Chain integrity verified successfully!');
    return { valid: true, errors: [], warnings: [] };
  } else {
    if (errors.length > 0) {
      console.log('✗ VERIFICATION FAILED');
      console.log(`  ${errors.length} error(s) found:`);
      errors.forEach(err => console.log(`    - ${err}`));
    } else {
      console.log('⚠ VERIFICATION PASSED WITH WARNINGS');
    }
    
    if (warnings.length > 0) {
      console.log(`  ${warnings.length} warning(s):`);
      warnings.forEach(warn => console.log(`    - ${warn}`));
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Hash Chain Verification Script');
    console.log('Usage: node verify-hash-chain.js <chain-file.json>');
    console.log('');
    console.log('Options:');
    console.log('  <chain-file.json>  Path to exported hash chain JSON file');
    console.log('');
    console.log('Example:');
    console.log('  node verify-hash-chain.js game123-chain.json');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  // Check file exists
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  // Load chain data
  let chainData;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    chainData = JSON.parse(fileContent);
  } catch (err) {
    console.error(`Error: Failed to parse JSON: ${err.message}`);
    process.exit(1);
  }
  
  // Validate structure
  if (!chainData.events || !Array.isArray(chainData.events)) {
    console.error('Error: Invalid chain data structure (missing events array)');
    process.exit(1);
  }
  
  if (!chainData.tip) {
    console.error('Error: Invalid chain data structure (missing tip)');
    process.exit(1);
  }
  
  // Verify chain
  const result = verifyHashChain(chainData);
  
  // Exit with appropriate code
  process.exit(result.valid ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { verifyHashChain, computeEventHash };
