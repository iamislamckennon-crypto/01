/**
 * Tests for fairness calculations
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { updateFairness, initializeFairnessCounts, recordRoll } from '../src/utils/fairness.js';

test('initializeFairnessCounts creates array of zeros', () => {
  const counts = initializeFairnessCounts();
  assert.deepStrictEqual(counts, [0, 0, 0, 0, 0, 0]);
});

test('recordRoll updates counts correctly', () => {
  let counts = initializeFairnessCounts();
  
  counts = recordRoll(counts, 1);
  assert.deepStrictEqual(counts, [1, 0, 0, 0, 0, 0]);
  
  counts = recordRoll(counts, 3);
  assert.deepStrictEqual(counts, [1, 0, 1, 0, 0, 0]);
  
  counts = recordRoll(counts, 1);
  assert.deepStrictEqual(counts, [2, 0, 1, 0, 0, 0]);
});

test('recordRoll throws error for invalid values', () => {
  const counts = initializeFairnessCounts();
  
  assert.throws(() => recordRoll(counts, 0), /Invalid dice value/);
  assert.throws(() => recordRoll(counts, 7), /Invalid dice value/);
  assert.throws(() => recordRoll(counts, -1), /Invalid dice value/);
});

test('updateFairness returns insufficient_data for small samples', () => {
  const counts = [1, 1, 1, 0, 0, 0];
  const result = updateFairness(counts, 10);
  
  assert.strictEqual(result.status, 'insufficient_data');
  assert.strictEqual(result.deviation, 0);
});

test('updateFairness returns normal for balanced distribution', () => {
  // Perfect distribution: 10 of each
  const counts = [10, 10, 10, 10, 10, 10];
  const result = updateFairness(counts, 10);
  
  assert.strictEqual(result.status, 'normal');
  assert.strictEqual(result.deviation, 0);
});

test('updateFairness detects moderate deviation', () => {
  // One value appears more frequently
  const counts = [8, 8, 8, 8, 8, 20]; // Total 60, expected each: 10
  // Deviation: (20 - 10) / 10 = 1.0, but max of all: we need less extreme
  const result = updateFairness(counts, 10);
  
  // This actually results in suspect due to high deviation
  // Let's use a different distribution for observe
  const counts2 = [10, 10, 10, 10, 10, 17]; // Total 67, expected: 11.17
  const result2 = updateFairness(counts2, 10);
  // (17 - 11.17) / 11.17 ≈ 0.52 - normal
  
  // For observe status, we need deviation between 0.6 and 0.9
  const counts3 = [8, 8, 8, 8, 8, 18]; // Total 58, expected: 9.67
  const result3 = updateFairness(counts3, 10);
  // (18 - 9.67) / 9.67 ≈ 0.86 - observe
  
  assert.strictEqual(result3.status, 'observe');
  assert.ok(result3.deviation >= 0.6);
  assert.ok(result3.deviation < 0.9);
});

test('updateFairness detects high deviation', () => {
  // Heavily biased distribution
  const counts = [2, 2, 2, 2, 2, 50]; // Total 60, expected each: 10
  const result = updateFairness(counts, 10);
  
  assert.strictEqual(result.status, 'suspect');
  assert.ok(result.deviation >= 0.9);
});

test('updateFairness calculates deviation correctly', () => {
  const counts = [10, 10, 10, 10, 10, 20]; // Total 70, expected each: 11.67
  const result = updateFairness(counts, 10);
  
  // Deviation should be: (20 - 11.67) / 11.67 ≈ 0.714
  assert.ok(result.deviation > 0.7);
  assert.ok(result.deviation < 0.8);
});

test('updateFairness handles edge case of all same value', () => {
  const counts = [50, 0, 0, 0, 0, 0]; // Only 1s
  const result = updateFairness(counts, 10);
  
  assert.strictEqual(result.status, 'suspect');
  assert.ok(result.deviation >= 0.9);
});

test('updateFairness uses custom minSample', () => {
  const counts = [3, 3, 3, 3, 3, 3]; // Total 18
  
  // With minSample 20, should be insufficient
  const result1 = updateFairness(counts, 20);
  assert.strictEqual(result1.status, 'insufficient_data');
  
  // With minSample 10, should be normal
  const result2 = updateFairness(counts, 10);
  assert.strictEqual(result2.status, 'normal');
});

test('fairness workflow - gradual accumulation', () => {
  let counts = initializeFairnessCounts();
  
  // Roll dice multiple times
  for (let i = 0; i < 12; i++) {
    const value = (i % 6) + 1; // Cycle through 1-6 twice
    counts = recordRoll(counts, value);
  }
  
  // Should be perfectly balanced
  assert.deepStrictEqual(counts, [2, 2, 2, 2, 2, 2]);
  
  const result = updateFairness(counts, 10);
  assert.strictEqual(result.status, 'normal');
  assert.strictEqual(result.deviation, 0);
});
