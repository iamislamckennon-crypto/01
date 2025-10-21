/**
 * Integration Tests for Complete Turn Flow
 */

const request = require('supertest');
const app = require('../server/index');
const config = require('../server/config');

describe('Integration: Complete Turn Flow', () => {
  const gameId = 'test-game-123';
  
  test('should handle complete verified turn flow', async () => {
    // Step 1: Commit
    const commitRes = await request(app)
      .post(`/api/gameroom/${gameId}/commit`)
      .send({
        turnNumber: 1,
        commitment: 'hash_of_value_and_nonce',
        playerId: 'player1'
      });
    
    expect(commitRes.status).toBe(200);
    expect(commitRes.body.success).toBe(true);
    const commitTip = commitRes.body.hashChainTip;
    
    // Step 2: Reveal
    const revealRes = await request(app)
      .post(`/api/gameroom/${gameId}/reveal`)
      .send({
        turnNumber: 1,
        value: 4,
        nonce: 'random_nonce_123'
      });
    
    expect(revealRes.status).toBe(200);
    expect(revealRes.body.hashChainTip).not.toBe(commitTip);
    
    // Step 3: Submit evidence (all frames agree on value 4)
    const evidenceRes = await request(app)
      .post(`/api/gameroom/${gameId}/submit-evidence`)
      .send({
        turnNumber: 1,
        surfaceHash: 'surface_hash_abc',
        frameHashes: ['frame1_hash', 'frame2_hash', 'frame3_hash'],
        diceValues: [4, 4, 4],
        stabilizationTimeMs: 3000,
        residualMotionScore: 0.01,
        algorithmVersion: '1.0.0-phase1',
        timestamp: Date.now()
      });
    
    expect(evidenceRes.status).toBe(200);
    expect(evidenceRes.body.success).toBe(true);
    expect(evidenceRes.body.status).toBe(config.STATUS.VERIFIED);
    expect(evidenceRes.body.detectedValue).toBe(4);
    expect(evidenceRes.body.requiresOpponentConfirmation).toBe(false);
    
    // Step 4: Verify hash chain
    const chainRes = await request(app)
      .get(`/api/gameroom/${gameId}/hash-chain`);
    
    expect(chainRes.status).toBe(200);
    expect(chainRes.body.verification.valid).toBe(true);
    expect(chainRes.body.events).toHaveLength(3); // commit, reveal, evidence
  });
  
  test('should handle uncertain evidence with opponent confirmation', async () => {
    const gameId2 = 'test-game-456';
    
    // Commit and reveal
    await request(app)
      .post(`/api/gameroom/${gameId2}/commit`)
      .send({ turnNumber: 1, commitment: 'commit123', playerId: 'player1' });
    
    await request(app)
      .post(`/api/gameroom/${gameId2}/reveal`)
      .send({ turnNumber: 1, value: 3, nonce: 'nonce123' });
    
    // Submit uncertain evidence (no consensus)
    const evidenceRes = await request(app)
      .post(`/api/gameroom/${gameId2}/submit-evidence`)
      .send({
        turnNumber: 1,
        surfaceHash: 'surface_hash_xyz',
        frameHashes: ['frame1', 'frame2', 'frame3'],
        diceValues: [1, 2, 3], // No consensus
        stabilizationTimeMs: 3000,
        residualMotionScore: 0.01,
        algorithmVersion: '1.0.0-phase1',
        timestamp: Date.now()
      });
    
    expect(evidenceRes.status).toBe(200);
    expect(evidenceRes.body.status).toBe(config.STATUS.UNCERTAIN);
    expect(evidenceRes.body.requiresOpponentConfirmation).toBe(true);
    
    // Opponent confirms
    const confirmRes = await request(app)
      .post(`/api/gameroom/${gameId2}/confirm-opponent`)
      .send({
        turnNumber: 1,
        agree: true,
        playerId: 'player2'
      });
    
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.status).toBe(config.STATUS.VERIFIED);
  });
  
  test('should handle disagreement and reroll request', async () => {
    const gameId3 = 'test-game-789';
    
    // Setup turn
    await request(app)
      .post(`/api/gameroom/${gameId3}/commit`)
      .send({ turnNumber: 1, commitment: 'commit123', playerId: 'player1' });
    
    await request(app)
      .post(`/api/gameroom/${gameId3}/reveal`)
      .send({ turnNumber: 1, value: 5, nonce: 'nonce123' });
    
    await request(app)
      .post(`/api/gameroom/${gameId3}/submit-evidence`)
      .send({
        turnNumber: 1,
        surfaceHash: 'surface_hash',
        frameHashes: ['f1', 'f2', 'f3'],
        diceValues: [5, 5, 5],
        stabilizationTimeMs: 3000,
        residualMotionScore: 0.01,
        algorithmVersion: '1.0.0-phase1',
        timestamp: Date.now()
      });
    
    // Opponent disagrees
    const confirmRes = await request(app)
      .post(`/api/gameroom/${gameId3}/confirm-opponent`)
      .send({
        turnNumber: 1,
        agree: false,
        playerId: 'player2'
      });
    
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.rerollRequired).toBe(true);
    expect(confirmRes.body.rerollsRemaining).toBe(config.MAX_REROLLS);
    
    // Request reroll
    const rerollRes = await request(app)
      .post(`/api/gameroom/${gameId3}/request-reroll`)
      .send({
        turnNumber: 1,
        playerId: 'player2'
      });
    
    expect(rerollRes.status).toBe(200);
    expect(rerollRes.body.success).toBe(true);
    expect(rerollRes.body.rerollNumber).toBe(1);
  });
  
  test('should reject evidence with timing violation', async () => {
    const gameId4 = 'test-game-timing';
    
    await request(app)
      .post(`/api/gameroom/${gameId4}/commit`)
      .send({ turnNumber: 1, commitment: 'commit', playerId: 'player1' });
    
    const revealRes = await request(app)
      .post(`/api/gameroom/${gameId4}/reveal`)
      .send({ turnNumber: 1, value: 4, nonce: 'nonce' });
    
    // Submit evidence with timestamp way in the past
    const evidenceRes = await request(app)
      .post(`/api/gameroom/${gameId4}/submit-evidence`)
      .send({
        turnNumber: 1,
        surfaceHash: 'surface',
        frameHashes: ['f1', 'f2', 'f3'],
        diceValues: [4, 4, 4],
        stabilizationTimeMs: 3000,
        residualMotionScore: 0.01,
        algorithmVersion: '1.0.0-phase1',
        timestamp: Date.now() - 20000 // 20 seconds ago
      });
    
    expect(evidenceRes.status).toBe(400);
    expect(evidenceRes.body.error).toBe('Violation detected');
  });
  
  test('should reject evidence with camera movement', async () => {
    const gameId5 = 'test-game-camera';
    
    await request(app)
      .post(`/api/gameroom/${gameId5}/commit`)
      .send({ turnNumber: 1, commitment: 'commit', playerId: 'player1' });
    
    await request(app)
      .post(`/api/gameroom/${gameId5}/reveal`)
      .send({ turnNumber: 1, value: 4, nonce: 'nonce' });
    
    // Submit evidence with high residual motion (camera moved)
    const evidenceRes = await request(app)
      .post(`/api/gameroom/${gameId5}/submit-evidence`)
      .send({
        turnNumber: 1,
        surfaceHash: 'surface',
        frameHashes: ['f1', 'f2', 'f3'],
        diceValues: [4, 4, 4],
        stabilizationTimeMs: 3000,
        residualMotionScore: 0.25, // Above threshold
        algorithmVersion: '1.0.0-phase1',
        timestamp: Date.now()
      });
    
    expect(evidenceRes.status).toBe(400);
    expect(evidenceRes.body.error).toBe('Violation detected');
    expect(evidenceRes.body.message).toContain('Camera movement');
  });
  
  test('should enforce max reroll limit', async () => {
    const gameId6 = 'test-game-maxreroll';
    
    // Setup turn
    await request(app)
      .post(`/api/gameroom/${gameId6}/commit`)
      .send({ turnNumber: 1, commitment: 'commit', playerId: 'player1' });
    
    await request(app)
      .post(`/api/gameroom/${gameId6}/reveal`)
      .send({ turnNumber: 1, value: 4, nonce: 'nonce' });
    
    // Request max rerolls
    for (let i = 1; i <= config.MAX_REROLLS; i++) {
      const rerollRes = await request(app)
        .post(`/api/gameroom/${gameId6}/request-reroll`)
        .send({ turnNumber: 1, playerId: 'player2' });
      
      expect(rerollRes.status).toBe(200);
      expect(rerollRes.body.rerollNumber).toBe(i);
    }
    
    // Try to exceed limit
    const failRes = await request(app)
      .post(`/api/gameroom/${gameId6}/request-reroll`)
      .send({ turnNumber: 1, playerId: 'player2' });
    
    expect(failRes.status).toBe(400);
    expect(failRes.body.error).toBe('Max rerolls reached');
  });
});
