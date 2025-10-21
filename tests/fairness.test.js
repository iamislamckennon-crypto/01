/**
 * Unit tests for fairness engine
 */

import { describe, it, expect } from 'vitest';
import {
  calculateChiSquare,
  getChiSquarePValue,
  analyzeFairness,
  updateDistribution
} from '../cloudflare/src/fairness.js';

describe('Fairness Engine', () => {
  describe('calculateChiSquare', () => {
    it('should return 0 for uniform distribution', () => {
      const distribution = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10 };
      const totalRolls = 60;
      
      const chiSquare = calculateChiSquare(distribution, totalRolls);
      
      expect(chiSquare).toBe(0);
    });
    
    it('should return positive value for non-uniform distribution', () => {
      const distribution = { 1: 20, 2: 10, 3: 10, 4: 10, 5: 5, 6: 5 };
      const totalRolls = 60;
      
      const chiSquare = calculateChiSquare(distribution, totalRolls);
      
      expect(chiSquare).toBeGreaterThan(0);
    });
    
    it('should handle zero total rolls', () => {
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const totalRolls = 0;
      
      const chiSquare = calculateChiSquare(distribution, totalRolls);
      
      expect(chiSquare).toBe(0);
    });
  });
  
  describe('analyzeFairness', () => {
    it('should return normal status for insufficient samples', () => {
      const distribution = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 0 };
      const totalRolls = 15;
      const minSampleSize = 30;
      
      const result = analyzeFairness(distribution, totalRolls, minSampleSize);
      
      expect(result.status).toBe('normal');
      expect(result.reason).toBe('insufficient_samples');
    });
    
    it('should return normal status for uniform distribution', () => {
      const distribution = { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50 };
      const totalRolls = 300;
      const minSampleSize = 30;
      
      const result = analyzeFairness(distribution, totalRolls, minSampleSize);
      
      expect(result.status).toBe('normal');
      expect(result.chiSquare).toBe(0);
    });
    
    it('should detect suspicious distribution', () => {
      // Heavily biased distribution
      const distribution = { 1: 100, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10 };
      const totalRolls = 150;
      const minSampleSize = 30;
      const alpha = 0.05;
      
      const result = analyzeFairness(distribution, totalRolls, minSampleSize, alpha);
      
      // This heavily biased distribution should be flagged
      expect(result.status).not.toBe('normal');
      expect(result.chiSquare).toBeGreaterThan(0);
    });
  });
  
  describe('updateDistribution', () => {
    it('should increment count for rolled value', () => {
      const distribution = { 1: 5, 2: 3, 3: 2, 4: 1, 5: 0, 6: 0 };
      const roll = 3;
      
      const updated = updateDistribution(distribution, roll);
      
      expect(updated[3]).toBe(3);
      expect(updated[1]).toBe(5); // Other values unchanged
    });
    
    it('should initialize count for first occurrence', () => {
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const roll = 4;
      
      const updated = updateDistribution(distribution, roll);
      
      expect(updated[4]).toBe(1);
    });
    
    it('should not mutate original distribution', () => {
      const distribution = { 1: 5, 2: 3, 3: 2, 4: 1, 5: 0, 6: 0 };
      const roll = 2;
      
      updateDistribution(distribution, roll);
      
      // Original should be unchanged
      expect(distribution[2]).toBe(3);
    });
  });
});
