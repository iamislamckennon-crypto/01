/**
 * GameRoom Durable Object
 * 
 * Manages game state, evidence storage, and verification workflow.
 * Extends existing commitment-reveal pattern with evidence tracking.
 */

const crypto = require('crypto');
const { validateEvidence } = require('../vision/validation');

class GameRoomDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  
  /**
   * Initialize game state
   */
  async initialize() {
    const existing = await this.state.storage.get('gameState');
    if (!existing) {
      await this.state.storage.put('gameState', {
        id: this.state.id.toString(),
        players: [],
        turns: [],
        evidence: {},
        hashChain: [],
        status: 'waiting',
        createdAt: new Date().toISOString()
      });
    }
  }
  
  /**
   * Get game state
   */
  async getState() {
    await this.initialize();
    return await this.state.storage.get('gameState');
  }
  
  /**
   * Submit detection evidence for a turn
   * 
   * @param {Object} evidence - Evidence package
   * @param {string} playerId - Player submitting evidence
   * @returns {Object} Result with status
   */
  async submitEvidence(evidence, playerId) {
    const gameState = await this.getState();
    
    // Validate evidence structure and timing
    const config = {
      minStabilizationMs: this.env.MIN_STABILIZATION_MS || 600,
      maxResidualMotion: this.env.MAX_RESIDUAL_MOTION || 0.2
    };
    
    const validation = validateEvidence(evidence, config);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        violations: validation.violations
      };
    }
    
    // Check for multiple submissions
    const turnKey = `turn_${evidence.turnNumber}`;
    if (gameState.evidence[turnKey]) {
      return {
        success: false,
        errors: ['Evidence already submitted for this turn']
      };
    }
    
    // Calculate evidence hash
    const evidenceHash = this.calculateEvidenceHash(evidence);
    
    // Store evidence
    gameState.evidence[turnKey] = {
      ...evidence,
      playerId,
      evidenceHash,
      submittedAt: new Date().toISOString(),
      confirmedBy: null,
      disputedBy: null
    };
    
    // Add to hash chain
    const chainEvent = {
      type: 'evidence_submitted',
      turnNumber: evidence.turnNumber,
      playerId,
      evidenceHash,
      timestamp: new Date().toISOString()
    };
    gameState.hashChain.push(chainEvent);
    
    await this.state.storage.put('gameState', gameState);
    
    return {
      success: true,
      evidenceHash,
      status: evidence.status
    };
  }
  
  /**
   * Confirm opponent's evidence
   * 
   * @param {number} turnNumber - Turn number
   * @param {string} playerId - Confirming player ID
   * @returns {Object} Result
   */
  async confirmEvidence(turnNumber, playerId) {
    const gameState = await this.getState();
    const turnKey = `turn_${turnNumber}`;
    
    const evidence = gameState.evidence[turnKey];
    if (!evidence) {
      return {
        success: false,
        error: 'Evidence not found for turn'
      };
    }
    
    if (evidence.playerId === playerId) {
      return {
        success: false,
        error: 'Cannot confirm own evidence'
      };
    }
    
    if (evidence.confirmedBy) {
      return {
        success: false,
        error: 'Evidence already confirmed'
      };
    }
    
    // Update evidence status
    evidence.confirmedBy = playerId;
    evidence.confirmedAt = new Date().toISOString();
    
    // If was uncertain, upgrade to verified
    if (evidence.status === 'uncertain') {
      evidence.status = 'verified';
    }
    
    // Add to hash chain
    gameState.hashChain.push({
      type: 'evidence_confirmed',
      turnNumber,
      playerId,
      timestamp: new Date().toISOString()
    });
    
    await this.state.storage.put('gameState', gameState);
    
    return {
      success: true,
      status: evidence.status
    };
  }
  
  /**
   * Dispute evidence
   * 
   * @param {number} turnNumber - Turn number
   * @param {string} playerId - Disputing player ID
   * @param {string} reason - Dispute reason
   * @returns {Object} Result
   */
  async disputeEvidence(turnNumber, playerId, reason) {
    const gameState = await this.getState();
    const turnKey = `turn_${turnNumber}`;
    
    const evidence = gameState.evidence[turnKey];
    if (!evidence) {
      return {
        success: false,
        error: 'Evidence not found for turn'
      };
    }
    
    if (evidence.playerId === playerId) {
      return {
        success: false,
        error: 'Cannot dispute own evidence'
      };
    }
    
    // Update evidence status
    evidence.disputedBy = playerId;
    evidence.disputedAt = new Date().toISOString();
    evidence.disputeReason = reason;
    evidence.status = 'flagged';
    
    // Add to hash chain
    gameState.hashChain.push({
      type: 'evidence_disputed',
      turnNumber,
      playerId,
      reason,
      timestamp: new Date().toISOString()
    });
    
    await this.state.storage.put('gameState', gameState);
    
    return {
      success: true,
      status: 'flagged'
    };
  }
  
  /**
   * Get evidence for a specific turn
   * 
   * @param {number} turnNumber - Turn number
   * @returns {Object} Evidence summary
   */
  async getEvidence(turnNumber) {
    const gameState = await this.getState();
    const turnKey = `turn_${turnNumber}`;
    
    const evidence = gameState.evidence[turnKey];
    if (!evidence) {
      return null;
    }
    
    // Return summary without raw frame data
    return {
      turnNumber,
      diceValues: evidence.diceValues,
      status: evidence.status,
      algorithmVersion: evidence.algorithmVersion,
      evidenceHash: evidence.evidenceHash,
      submittedAt: evidence.submittedAt,
      confirmedBy: evidence.confirmedBy,
      confirmedAt: evidence.confirmedAt,
      disputedBy: evidence.disputedBy,
      disputedAt: evidence.disputedAt,
      disputeReason: evidence.disputeReason
    };
  }
  
  /**
   * Calculate evidence hash
   * 
   * @param {Object} evidence - Evidence object
   * @returns {string} SHA-256 hash
   */
  calculateEvidenceHash(evidence) {
    // Create canonical JSON representation
    const canonical = JSON.stringify({
      turnNumber: evidence.turnNumber,
      frameHashes: evidence.frameHashes,
      diceValues: evidence.diceValues,
      stabilizationTimeMs: evidence.stabilizationTimeMs,
      residualMotionScore: evidence.residualMotionScore,
      algorithmVersion: evidence.algorithmVersion,
      status: evidence.status
    });
    
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
  
  /**
   * Fetch handler for HTTP requests
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Route handling
    if (request.method === 'POST' && path.endsWith('/submit-evidence')) {
      const body = await request.json();
      const result = await this.submitEvidence(body.evidence, body.playerId);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (request.method === 'POST' && path.endsWith('/confirm-evidence')) {
      const body = await request.json();
      const result = await this.confirmEvidence(body.turnNumber, body.playerId);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (request.method === 'POST' && path.endsWith('/dispute-evidence')) {
      const body = await request.json();
      const result = await this.disputeEvidence(body.turnNumber, body.playerId, body.reason);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (request.method === 'GET' && path.match(/\/evidence\/\d+$/)) {
      const turnNumber = parseInt(path.split('/').pop());
      const evidence = await this.getEvidence(turnNumber);
      
      if (!evidence) {
        return new Response(JSON.stringify({ error: 'Evidence not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(evidence), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
}

module.exports = GameRoomDO;
