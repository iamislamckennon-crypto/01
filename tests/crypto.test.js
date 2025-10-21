/**
 * Tests for crypto utilities
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { sha256, computeCommitment, canonicalizeEvent, chainHash, verifyCommitment } from '../src/utils/crypto.js';

test('sha256 hashes strings correctly', async () => {
  const hash = await sha256('hello world');
  assert.strictEqual(typeof hash, 'string');
  assert.strictEqual(hash.length, 64); // SHA-256 produces 64 hex characters
  
  // Test deterministic hashing
  const hash2 = await sha256('hello world');
  assert.strictEqual(hash, hash2);
});

test('sha256 produces different hashes for different inputs', async () => {
  const hash1 = await sha256('test1');
  const hash2 = await sha256('test2');
  assert.notStrictEqual(hash1, hash2);
});

test('computeCommitment creates valid commitment', async () => {
  const salt = '550e8400-e29b-41d4-a716-446655440000';
  const playerId = 'player1';
  const turnNumber = 1;
  
  const commitment = await computeCommitment(salt, playerId, turnNumber);
  assert.strictEqual(typeof commitment, 'string');
  assert.strictEqual(commitment.length, 64);
});

test('computeCommitment is deterministic', async () => {
  const salt = '550e8400-e29b-41d4-a716-446655440000';
  const playerId = 'player1';
  const turnNumber = 1;
  
  const commitment1 = await computeCommitment(salt, playerId, turnNumber);
  const commitment2 = await computeCommitment(salt, playerId, turnNumber);
  assert.strictEqual(commitment1, commitment2);
});

test('canonicalizeEvent sorts keys', () => {
  const event = {
    z: 3,
    a: 1,
    m: 2
  };
  
  const canonical = canonicalizeEvent(event);
  assert.strictEqual(canonical, '{"a":1,"m":2,"z":3}');
});

test('canonicalizeEvent handles nested objects', () => {
  const event = {
    outer: {
      z: 3,
      a: 1
    },
    first: 'value'
  };
  
  const canonical = canonicalizeEvent(event);
  assert.strictEqual(canonical, '{"first":"value","outer":{"a":1,"z":3}}');
});

test('chainHash links events correctly', async () => {
  const prevHash = 'genesis';
  const event = JSON.stringify({ type: 'test', value: 1 });
  
  const newHash = await chainHash(prevHash, event);
  assert.strictEqual(typeof newHash, 'string');
  assert.strictEqual(newHash.length, 64);
  
  // Should be deterministic
  const newHash2 = await chainHash(prevHash, event);
  assert.strictEqual(newHash, newHash2);
});

test('chainHash produces different hashes for different events', async () => {
  const prevHash = 'genesis';
  const event1 = JSON.stringify({ type: 'test', value: 1 });
  const event2 = JSON.stringify({ type: 'test', value: 2 });
  
  const hash1 = await chainHash(prevHash, event1);
  const hash2 = await chainHash(prevHash, event2);
  assert.notStrictEqual(hash1, hash2);
});

test('verifyCommitment validates correct commitment', async () => {
  const salt = '550e8400-e29b-41d4-a716-446655440000';
  const playerId = 'player1';
  const turnNumber = 1;
  
  const commitment = await computeCommitment(salt, playerId, turnNumber);
  const isValid = await verifyCommitment(commitment, salt, playerId, turnNumber);
  assert.strictEqual(isValid, true);
});

test('verifyCommitment rejects incorrect salt', async () => {
  const salt = '550e8400-e29b-41d4-a716-446655440000';
  const wrongSalt = '660e8400-e29b-41d4-a716-446655440000';
  const playerId = 'player1';
  const turnNumber = 1;
  
  const commitment = await computeCommitment(salt, playerId, turnNumber);
  const isValid = await verifyCommitment(commitment, wrongSalt, playerId, turnNumber);
  assert.strictEqual(isValid, false);
});

test('verifyCommitment rejects incorrect player ID', async () => {
  const salt = '550e8400-e29b-41d4-a716-446655440000';
  const playerId = 'player1';
  const wrongPlayerId = 'player2';
  const turnNumber = 1;
  
  const commitment = await computeCommitment(salt, playerId, turnNumber);
  const isValid = await verifyCommitment(commitment, salt, wrongPlayerId, turnNumber);
  assert.strictEqual(isValid, false);
});

test('verifyCommitment rejects incorrect turn number', async () => {
  const salt = '550e8400-e29b-41d4-a716-446655440000';
  const playerId = 'player1';
  const turnNumber = 1;
  const wrongTurnNumber = 2;
  
  const commitment = await computeCommitment(salt, playerId, turnNumber);
  const isValid = await verifyCommitment(commitment, salt, playerId, wrongTurnNumber);
  assert.strictEqual(isValid, false);
});
