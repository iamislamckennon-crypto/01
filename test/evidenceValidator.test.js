/**
 * Unit Tests for Evidence Validator
 */

const {
  validateEvidenceStructure,
  applyConsensus,
  computeEvidenceHash,
  validateTiming,
  processEvidence
} = require('../server/evidenceValidator');
const config = require('../server/config');

describe('Evidence Validator', () => {
  describe('validateEvidenceStructure', () => {
    test('should accept valid evidence structure', () => {
      const evidence = {
        turnNumber: 1,
        surfaceHash: 'abc123',
        frameHashes: ['hash1', 'hash2', 'hash3'],
        diceValues: [4, 4, 4],
        stabilizationTimeMs: 2000,
        residualMotionScore: 0.01,
        algorithmVersion: '1.0.0-phase1',
        timestamp: Date.now()
      };
      
      const result = validateEvidenceStructure(evidence);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('should reject missing turnNumber', () => {
      const evidence = {
        surfaceHash: 'abc123',
        frameHashes: ['hash1', 'hash2', 'hash3'],
        diceValues: [4, 4, 4],
        stabilizationTimeMs: 2000,
        residualMotionScore: 0.01,
        algorithmVersion: '1.0.0-phase1',
        timestamp: Date.now()
      };
      
      const result = validateEvidenceStructure(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('turnNumber must be a number');
    });
    
    test('should reject invalid frameHashes length', () => {
      const evidence = {
        turnNumber: 1,
        surfaceHash: 'abc123',
        frameHashes: ['hash1', 'hash2'], // Only 2 instead of 3
        diceValues: [4, 4, 4],
        stabilizationTimeMs: 2000,
        residualMotionScore: 0.01,
        algorithmVersion: '1.0.0-phase1',
        timestamp: Date.now()
      };
      
      const result = validateEvidenceStructure(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    test('should reject invalid dice values', () => {
      const evidence = {
        turnNumber: 1,
        surfaceHash: 'abc123',
        frameHashes: ['hash1', 'hash2', 'hash3'],
        diceValues: [4, 7, 4], // 7 is invalid
        stabilizationTimeMs: 2000,
        residualMotionScore: 0.01,
        algorithmVersion: '1.0.0-phase1',
        timestamp: Date.now()
      };
      
      const result = validateEvidenceStructure(evidence);
      expect(result.valid).toBe(false);
    });
  });
  
  describe('applyConsensus', () => {
    test('should verify when 3 of 3 values match', () => {
      const result = applyConsensus([5, 5, 5]);
      expect(result.status).toBe(config.STATUS.VERIFIED);
      expect(result.value).toBe(5);
      expect(result.confidence).toBe(1.0);
    });
    
    test('should verify when 2 of 3 values match', () => {
      const result = applyConsensus([3, 3, 4]);
      expect(result.status).toBe(config.STATUS.VERIFIED);
      expect(result.value).toBe(3);
      expect(result.confidence).toBeCloseTo(0.666, 2);
    });
    
    test('should be uncertain when no consensus', () => {
      const result = applyConsensus([1, 2, 3]);
      expect(result.status).toBe(config.STATUS.UNCERTAIN);
      expect(result.value).toBe(null);
    });
    
    test('should be uncertain when consensus on 0 (uncertain detection)', () => {
      const result = applyConsensus([0, 0, 0]);
      expect(result.status).toBe(config.STATUS.UNCERTAIN);
      expect(result.value).toBe(null);
    });
    
    test('should handle empty array', () => {
      const result = applyConsensus([]);
      expect(result.status).toBe(config.STATUS.FLAGGED);
      expect(result.value).toBe(null);
    });
  });
  
  describe('computeEvidenceHash', () => {
    test('should generate consistent hash for same evidence', () => {
      const evidence = {
        turnNumber: 1,
        surfaceHash: 'abc123',
        frameHashes: ['hash1', 'hash2', 'hash3'],
        diceValues: [4, 4, 4],
        algorithmVersion: '1.0.0-phase1'
      };
      
      const hash1 = computeEvidenceHash(evidence);
      const hash2 = computeEvidenceHash(evidence);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8);
    });
    
    test('should generate different hashes for different evidence', () => {
      const evidence1 = {
        turnNumber: 1,
        surfaceHash: 'abc123',
        frameHashes: ['hash1', 'hash2', 'hash3'],
        diceValues: [4, 4, 4],
        algorithmVersion: '1.0.0-phase1'
      };
      
      const evidence2 = {
        turnNumber: 1,
        surfaceHash: 'abc123',
        frameHashes: ['hash1', 'hash2', 'hash3'],
        diceValues: [5, 5, 5], // Different values
        algorithmVersion: '1.0.0-phase1'
      };
      
      const hash1 = computeEvidenceHash(evidence1);
      const hash2 = computeEvidenceHash(evidence2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('validateTiming', () => {
    test('should accept evidence within detection window', () => {
      const revealTime = Date.now();
      const evidence = {
        timestamp: revealTime + 5000, // 5 seconds after
        stabilizationTimeMs: 3000
      };
      
      const result = validateTiming(evidence, revealTime);
      expect(result.valid).toBe(true);
      expect(result.timeSinceReveal).toBe(5000);
    });
    
    test('should reject evidence after detection window', () => {
      const revealTime = Date.now();
      const evidence = {
        timestamp: revealTime + 15000, // 15 seconds after (> 10s window)
        stabilizationTimeMs: 3000
      };
      
      const result = validateTiming(evidence, revealTime);
      expect(result.valid).toBe(false);
      expect(result.violation).toBe(true);
    });
    
    test('should reject evidence with timestamp before reveal', () => {
      const revealTime = Date.now();
      const evidence = {
        timestamp: revealTime - 1000, // Before reveal
        stabilizationTimeMs: 3000
      };
      
      const result = validateTiming(evidence, revealTime);
      expect(result.valid).toBe(false);
      expect(result.violation).toBe(true);
    });
    
    test('should reject evidence with excessive stabilization time', () => {
      const revealTime = Date.now();
      const evidence = {
        timestamp: revealTime + 3000,
        stabilizationTimeMs: 6000 // > 5000ms max
      };
      
      const result = validateTiming(evidence, revealTime);
      expect(result.valid).toBe(false);
      expect(result.violation).toBe(true);
    });
  });
  
  describe('processEvidence', () => {
    test('should process valid evidence successfully', () => {
      const revealTime = Date.now();
      const evidence = {
        turnNumber: 1,
        surfaceHash: 'abc123',
        frameHashes: ['hash1', 'hash2', 'hash3'],
        diceValues: [4, 4, 4],
        stabilizationTimeMs: 3000,
        residualMotionScore: 0.01,
        algorithmVersion: '1.0.0-phase1',
        timestamp: revealTime + 4000
      };
      
      const result = processEvidence(evidence, revealTime);
      expect(result.status).toBe(config.STATUS.VERIFIED);
      expect(result.value).toBe(4);
      expect(result.evidenceHash).toBeDefined();
    });
    
    test('should flag camera movement violation', () => {
      const revealTime = Date.now();
      const evidence = {
        turnNumber: 1,
        surfaceHash: 'abc123',
        frameHashes: ['hash1', 'hash2', 'hash3'],
        diceValues: [4, 4, 4],
        stabilizationTimeMs: 3000,
        residualMotionScore: 0.20, // Above 0.15 threshold
        algorithmVersion: '1.0.0-phase1',
        timestamp: revealTime + 4000
      };
      
      const result = processEvidence(evidence, revealTime);
      expect(result.status).toBe(config.STATUS.FLAGGED);
      expect(result.violation).toBe(true);
      expect(result.reason).toContain('Camera movement');
    });
    
    test('should require opponent confirmation for uncertain status', () => {
      const revealTime = Date.now();
      const evidence = {
        turnNumber: 1,
        surfaceHash: 'abc123',
        frameHashes: ['hash1', 'hash2', 'hash3'],
        diceValues: [1, 2, 3], // No consensus
        stabilizationTimeMs: 3000,
        residualMotionScore: 0.01,
        algorithmVersion: '1.0.0-phase1',
        timestamp: revealTime + 4000
      };
      
      const result = processEvidence(evidence, revealTime);
      expect(result.status).toBe(config.STATUS.UNCERTAIN);
      expect(result.requiresOpponentConfirmation).toBe(true);
    });
  });
});
