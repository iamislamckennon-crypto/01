/**
 * Tests for reputation tier system
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { 
  computeTier, 
  canPlay, 
  TIER,
  initializeReputation,
  recordSuccessfulRoll,
  recordViolation
} from '../src/utils/reputation.js';

test('computeTier returns NEW for new player', () => {
  const tier = computeTier(0, 0);
  assert.strictEqual(tier, TIER.NEW);
});

test('computeTier returns TRUSTED after sufficient clean rolls', () => {
  const tier = computeTier(10, 0);
  assert.strictEqual(tier, TIER.TRUSTED);
});

test('computeTier returns FLAGGED with violations', () => {
  const tier = computeTier(5, 2);
  assert.strictEqual(tier, TIER.FLAGGED);
});

test('computeTier returns SUSPENDED with many violations', () => {
  const tier = computeTier(10, 5);
  assert.strictEqual(tier, TIER.SUSPENDED);
});

test('computeTier prioritizes suspension over other tiers', () => {
  // Even with many rolls, violations lead to suspension
  const tier = computeTier(100, 5);
  assert.strictEqual(tier, TIER.SUSPENDED);
});

test('computeTier requires zero violations for TRUSTED', () => {
  // Many rolls but with 1 violation -> still NEW (needs 2 for FLAGGED)
  const tier = computeTier(20, 1);
  assert.strictEqual(tier, TIER.NEW);
  
  // With 2 violations -> FLAGGED
  const tier2 = computeTier(20, 2);
  assert.strictEqual(tier2, TIER.FLAGGED);
});

test('canPlay allows NEW players', () => {
  assert.strictEqual(canPlay(TIER.NEW), true);
});

test('canPlay allows TRUSTED players', () => {
  assert.strictEqual(canPlay(TIER.TRUSTED), true);
});

test('canPlay allows FLAGGED players', () => {
  assert.strictEqual(canPlay(TIER.FLAGGED), true);
});

test('canPlay blocks SUSPENDED players', () => {
  assert.strictEqual(canPlay(TIER.SUSPENDED), false);
});

test('initializeReputation creates correct state', () => {
  const rep = initializeReputation();
  
  assert.strictEqual(rep.rollCount, 0);
  assert.strictEqual(rep.violations, 0);
  assert.strictEqual(rep.tier, TIER.NEW);
});

test('recordSuccessfulRoll increments count and updates tier', () => {
  let rep = initializeReputation();
  
  // Record 10 successful rolls
  for (let i = 0; i < 10; i++) {
    rep = recordSuccessfulRoll(rep);
  }
  
  assert.strictEqual(rep.rollCount, 10);
  assert.strictEqual(rep.violations, 0);
  assert.strictEqual(rep.tier, TIER.TRUSTED);
});

test('recordViolation increments violations and updates tier', () => {
  let rep = initializeReputation();
  
  // Record 2 violations
  rep = recordViolation(rep);
  rep = recordViolation(rep);
  
  assert.strictEqual(rep.rollCount, 0);
  assert.strictEqual(rep.violations, 2);
  assert.strictEqual(rep.tier, TIER.FLAGGED);
});

test('recordViolation can lead to suspension', () => {
  let rep = initializeReputation();
  
  // Record 5 violations
  for (let i = 0; i < 5; i++) {
    rep = recordViolation(rep);
  }
  
  assert.strictEqual(rep.violations, 5);
  assert.strictEqual(rep.tier, TIER.SUSPENDED);
  assert.strictEqual(canPlay(rep.tier), false);
});

test('reputation workflow - clean player progression', () => {
  let rep = initializeReputation();
  
  // Start as NEW
  assert.strictEqual(rep.tier, TIER.NEW);
  
  // After 5 rolls, still NEW
  for (let i = 0; i < 5; i++) {
    rep = recordSuccessfulRoll(rep);
  }
  assert.strictEqual(rep.tier, TIER.NEW);
  
  // After 10 rolls, become TRUSTED
  for (let i = 0; i < 5; i++) {
    rep = recordSuccessfulRoll(rep);
  }
  assert.strictEqual(rep.tier, TIER.TRUSTED);
});

test('reputation workflow - player with violations', () => {
  let rep = initializeReputation();
  
  // 8 successful rolls
  for (let i = 0; i < 8; i++) {
    rep = recordSuccessfulRoll(rep);
  }
  
  // Add one violation - still NEW (needs 2 for FLAGGED)
  rep = recordViolation(rep);
  assert.strictEqual(rep.tier, TIER.NEW);
  
  // Add another violation - now FLAGGED
  rep = recordViolation(rep);
  assert.strictEqual(rep.tier, TIER.FLAGGED);
  
  // More successful rolls don't remove violations
  for (let i = 0; i < 10; i++) {
    rep = recordSuccessfulRoll(rep);
  }
  assert.strictEqual(rep.tier, TIER.FLAGGED);
  assert.strictEqual(rep.rollCount, 18);
  assert.strictEqual(rep.violations, 2);
});

test('reputation workflow - path to suspension', () => {
  let rep = initializeReputation();
  
  // Mix of rolls and violations
  rep = recordSuccessfulRoll(rep);
  rep = recordViolation(rep); // 1 violation
  rep = recordSuccessfulRoll(rep);
  rep = recordViolation(rep); // 2 violations -> FLAGGED
  
  assert.strictEqual(rep.tier, TIER.FLAGGED);
  
  rep = recordViolation(rep); // 3 violations
  rep = recordViolation(rep); // 4 violations
  rep = recordViolation(rep); // 5 violations -> SUSPENDED
  
  assert.strictEqual(rep.tier, TIER.SUSPENDED);
  assert.strictEqual(canPlay(rep.tier), false);
});
