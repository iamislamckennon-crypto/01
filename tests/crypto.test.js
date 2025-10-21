/**
 * Unit tests for crypto utilities
 */

import { describe, it, expect } from 'vitest';
import { sha256, generateCommitment, verifyCommitment, rollDice } from '../cloudflare/src/crypto.js';

describe('Crypto Utilities', () => {
  describe('sha256', () => {
    it('should generate consistent hash for same input', async () => {
      const input = 'test-input';
      const hash1 = await sha256(input);
      const hash2 = await sha256(input);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });
    
    it('should generate different hashes for different inputs', async () => {
      const hash1 = await sha256('input1');
      const hash2 = await sha256('input2');
      
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('generateCommitment and verifyCommitment', () => {
    it('should verify valid commitment', async () => {
      const salt = 'test-salt-123';
      const playerId = 'player1';
      const turnNumber = 1;
      
      const commitment = await generateCommitment(salt, playerId, turnNumber);
      const isValid = await verifyCommitment(commitment, salt, playerId, turnNumber);
      
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid salt', async () => {
      const salt = 'test-salt-123';
      const playerId = 'player1';
      const turnNumber = 1;
      
      const commitment = await generateCommitment(salt, playerId, turnNumber);
      const isValid = await verifyCommitment(commitment, 'wrong-salt', playerId, turnNumber);
      
      expect(isValid).toBe(false);
    });
    
    it('should reject invalid player ID', async () => {
      const salt = 'test-salt-123';
      const playerId = 'player1';
      const turnNumber = 1;
      
      const commitment = await generateCommitment(salt, playerId, turnNumber);
      const isValid = await verifyCommitment(commitment, salt, 'wrong-player', turnNumber);
      
      expect(isValid).toBe(false);
    });
    
    it('should reject invalid turn number', async () => {
      const salt = 'test-salt-123';
      const playerId = 'player1';
      const turnNumber = 1;
      
      const commitment = await generateCommitment(salt, playerId, turnNumber);
      const isValid = await verifyCommitment(commitment, salt, playerId, 2);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('rollDice', () => {
    it('should return value between 1 and 6', () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollDice();
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
        expect(Number.isInteger(roll)).toBe(true);
      }
    });
    
    it('should produce varied results', () => {
      const results = new Set();
      for (let i = 0; i < 100; i++) {
        results.add(rollDice());
      }
      
      // Should get multiple different values in 100 rolls
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
