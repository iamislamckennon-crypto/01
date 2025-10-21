/**
 * Unit tests for reputation logic
 */

import { describe, it, expect } from 'vitest';
import {
  calculateReputationTier,
  createPlayerRecord,
  updatePlayerStats
} from '../cloudflare/src/reputation.js';

describe('Reputation Logic', () => {
  describe('calculateReputationTier', () => {
    it('should return "new" for players with less than 10 rolls', () => {
      const stats = { rolls: 5, fairnessIncidents: 0, commitmentViolations: 0 };
      const tier = calculateReputationTier(stats);
      
      expect(tier).toBe('new');
    });
    
    it('should return "trusted" for players with 10+ rolls and no violations', () => {
      const stats = { rolls: 20, fairnessIncidents: 0, commitmentViolations: 0 };
      const tier = calculateReputationTier(stats);
      
      expect(tier).toBe('trusted');
    });
    
    it('should return "flagged" for players with any violations', () => {
      const stats = { rolls: 20, fairnessIncidents: 1, commitmentViolations: 0 };
      const tier = calculateReputationTier(stats);
      
      expect(tier).toBe('flagged');
    });
    
    it('should return "suspended" for players exceeding violation threshold', () => {
      const stats = { rolls: 20, fairnessIncidents: 2, commitmentViolations: 2 };
      const suspensionThreshold = 3;
      const tier = calculateReputationTier(stats, suspensionThreshold);
      
      expect(tier).toBe('suspended');
    });
    
    it('should count both fairness and commitment violations', () => {
      const stats = { rolls: 20, fairnessIncidents: 1, commitmentViolations: 1 };
      const tier = calculateReputationTier(stats);
      
      expect(tier).toBe('flagged');
    });
  });
  
  describe('createPlayerRecord', () => {
    it('should create player record with default values', () => {
      const playerId = 'player123';
      const record = createPlayerRecord(playerId);
      
      expect(record.playerId).toBe(playerId);
      expect(record.rolls).toBe(0);
      expect(record.fairnessIncidents).toBe(0);
      expect(record.commitmentViolations).toBe(0);
      expect(record.flags).toEqual([]);
      expect(record.createdAt).toBeGreaterThan(0);
    });
  });
  
  describe('updatePlayerStats', () => {
    it('should increment rolls when roll update is provided', () => {
      const record = { rolls: 5, fairnessIncidents: 0, commitmentViolations: 0 };
      const updated = updatePlayerStats(record, { roll: true });
      
      expect(updated.rolls).toBe(6);
    });
    
    it('should increment fairness incidents and add flag', () => {
      const record = { rolls: 5, fairnessIncidents: 0, commitmentViolations: 0, flags: [] };
      const updated = updatePlayerStats(record, { fairnessViolation: 'suspicious_pattern' });
      
      expect(updated.fairnessIncidents).toBe(1);
      expect(updated.flags).toHaveLength(1);
      expect(updated.flags[0].type).toBe('fairness');
      expect(updated.flags[0].reason).toBe('suspicious_pattern');
    });
    
    it('should increment commitment violations and add flag', () => {
      const record = { rolls: 5, fairnessIncidents: 0, commitmentViolations: 0, flags: [] };
      const updated = updatePlayerStats(record, { commitmentViolation: 'hash_mismatch' });
      
      expect(updated.commitmentViolations).toBe(1);
      expect(updated.flags).toHaveLength(1);
      expect(updated.flags[0].type).toBe('commitment');
      expect(updated.flags[0].reason).toBe('hash_mismatch');
    });
    
    it('should not mutate original record', () => {
      const record = { rolls: 5, fairnessIncidents: 0, commitmentViolations: 0, flags: [] };
      const updated = updatePlayerStats(record, { roll: true });
      
      expect(record.rolls).toBe(5); // Original unchanged
      expect(updated.rolls).toBe(6);
    });
  });
});
