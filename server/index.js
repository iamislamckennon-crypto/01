/**
 * Main Express Server
 * API endpoints for dice detection pipeline
 */

const express = require('express');
const config = require('./config');
const { processEvidence } = require('./evidenceValidator');
const HashChain = require('./hashChain');

const app = express();
app.use(express.json());

// In-memory storage (in production, use database)
const gameRooms = new Map();

/**
 * Initialize a game room
 */
function initGameRoom(id) {
  if (!gameRooms.has(id)) {
    gameRooms.set(id, {
      id,
      hashChain: new HashChain(),
      turns: new Map(),
      violations: {
        player1: 0,
        player2: 0
      },
      rerollCounts: new Map()
    });
  }
  return gameRooms.get(id);
}

/**
 * POST /api/gameroom/:id/submit-evidence
 * Submit dice detection evidence
 */
app.post('/api/gameroom/:id/submit-evidence', (req, res) => {
  const { id } = req.params;
  const evidence = req.body;
  
  // Get or create game room
  const room = initGameRoom(id);
  
  // Get turn data (should exist from previous commit/reveal)
  const turn = room.turns.get(evidence.turnNumber);
  if (!turn) {
    return res.status(400).json({
      error: 'Turn not found',
      message: 'Must commit and reveal before submitting evidence'
    });
  }
  
  // Check if evidence already submitted
  if (turn.evidence) {
    return res.status(400).json({
      error: 'Evidence already submitted',
      message: 'Evidence can only be submitted once per turn'
    });
  }
  
  // Process evidence
  const result = processEvidence(evidence, turn.revealTimestamp);
  
  // Check for violations
  if (result.violation) {
    const player = turn.player;
    room.violations[player]++;
    
    // Add to hash chain
    room.hashChain.addEvidence(
      evidence.turnNumber,
      result.evidenceHash || 'violation',
      config.STATUS.FLAGGED,
      null
    );
    
    return res.status(400).json({
      error: 'Violation detected',
      message: result.reason,
      violations: room.violations[player],
      status: result.status
    });
  }
  
  // Store evidence
  turn.evidence = evidence;
  turn.evidenceResult = result;
  turn.detectedValue = result.value;
  turn.status = result.status;
  
  // Add to hash chain
  room.hashChain.addEvidence(
    evidence.turnNumber,
    result.evidenceHash,
    result.status,
    result.value
  );
  
  res.json({
    success: true,
    turnNumber: evidence.turnNumber,
    status: result.status,
    detectedValue: result.value,
    confidence: result.confidence,
    requiresOpponentConfirmation: result.requiresOpponentConfirmation,
    hashChainTip: room.hashChain.getTip()
  });
});

/**
 * POST /api/gameroom/:id/confirm-opponent
 * Opponent confirms or disputes detected value
 */
app.post('/api/gameroom/:id/confirm-opponent', (req, res) => {
  const { id } = req.params;
  const { turnNumber, agree, playerId } = req.body;
  
  const room = gameRooms.get(id);
  if (!room) {
    return res.status(404).json({ error: 'Game room not found' });
  }
  
  const turn = room.turns.get(turnNumber);
  if (!turn) {
    return res.status(404).json({ error: 'Turn not found' });
  }
  
  if (!turn.evidence) {
    return res.status(400).json({ error: 'No evidence to confirm' });
  }
  
  // Opponent must be different from player who rolled
  if (playerId === turn.player) {
    return res.status(400).json({ error: 'Cannot confirm own roll' });
  }
  
  // Add confirmation to hash chain
  room.hashChain.addOpponentConfirm(turnNumber, agree, playerId);
  
  if (agree) {
    // Update status to verified
    turn.status = config.STATUS.VERIFIED;
    
    res.json({
      success: true,
      message: 'Value confirmed',
      status: config.STATUS.VERIFIED,
      finalValue: turn.detectedValue
    });
  } else {
    // Disagreement - check reroll count
    const currentRerolls = room.rerollCounts.get(turnNumber) || 0;
    
    if (currentRerolls >= config.MAX_REROLLS) {
      return res.status(400).json({
        error: 'Max rerolls reached',
        message: `Maximum ${config.MAX_REROLLS} rerolls per turn`
      });
    }
    
    res.json({
      success: true,
      message: 'Disagreement recorded',
      rerollRequired: true,
      rerollsRemaining: config.MAX_REROLLS - currentRerolls
    });
  }
});

/**
 * POST /api/gameroom/:id/request-reroll
 * Request a reroll due to disagreement
 */
app.post('/api/gameroom/:id/request-reroll', (req, res) => {
  const { id } = req.params;
  const { turnNumber, playerId } = req.body;
  
  const room = gameRooms.get(id);
  if (!room) {
    return res.status(404).json({ error: 'Game room not found' });
  }
  
  const turn = room.turns.get(turnNumber);
  if (!turn) {
    return res.status(404).json({ error: 'Turn not found' });
  }
  
  // Check reroll limit
  const currentRerolls = room.rerollCounts.get(turnNumber) || 0;
  if (currentRerolls >= config.MAX_REROLLS) {
    return res.status(400).json({
      error: 'Max rerolls reached',
      message: `Maximum ${config.MAX_REROLLS} rerolls per turn`
    });
  }
  
  // Increment reroll count
  const newCount = currentRerolls + 1;
  room.rerollCounts.set(turnNumber, newCount);
  
  // Add to hash chain
  room.hashChain.addRerollRequest(turnNumber, playerId, newCount);
  
  // Clear evidence for new roll
  delete turn.evidence;
  delete turn.evidenceResult;
  delete turn.detectedValue;
  turn.status = 'pending_reroll';
  
  res.json({
    success: true,
    message: 'Reroll requested',
    rerollNumber: newCount,
    rerollsRemaining: config.MAX_REROLLS - newCount
  });
});

/**
 * GET /api/gameroom/:id/hash-chain
 * Get hash chain for verification
 */
app.get('/api/gameroom/:id/hash-chain', (req, res) => {
  const { id } = req.params;
  const room = gameRooms.get(id);
  
  if (!room) {
    return res.status(404).json({ error: 'Game room not found' });
  }
  
  const verification = room.hashChain.verify();
  
  res.json({
    events: room.hashChain.getAllEvents(),
    tip: room.hashChain.getTip(),
    verification
  });
});

/**
 * POST /api/gameroom/:id/commit
 * Commit phase (for testing integration)
 */
app.post('/api/gameroom/:id/commit', (req, res) => {
  const { id } = req.params;
  const { turnNumber, commitment, playerId } = req.body;
  
  const room = initGameRoom(id);
  
  // Create turn
  room.turns.set(turnNumber, {
    turnNumber,
    player: playerId,
    commitment,
    commitTimestamp: Date.now()
  });
  
  // Add to hash chain
  room.hashChain.addCommit(turnNumber, commitment);
  
  res.json({
    success: true,
    turnNumber,
    hashChainTip: room.hashChain.getTip()
  });
});

/**
 * POST /api/gameroom/:id/reveal
 * Reveal phase (for testing integration)
 */
app.post('/api/gameroom/:id/reveal', (req, res) => {
  const { id } = req.params;
  const { turnNumber, value, nonce } = req.body;
  
  const room = gameRooms.get(id);
  if (!room) {
    return res.status(404).json({ error: 'Game room not found' });
  }
  
  const turn = room.turns.get(turnNumber);
  if (!turn) {
    return res.status(404).json({ error: 'Turn not found' });
  }
  
  // Update turn with reveal
  turn.revealedValue = value;
  turn.nonce = nonce;
  turn.revealTimestamp = Date.now();
  
  // Add to hash chain
  room.hashChain.addReveal(turnNumber, value, nonce);
  
  res.json({
    success: true,
    turnNumber,
    hashChainTip: room.hashChain.getTip()
  });
});

/**
 * GET /api/gameroom/:id/turn/:turnNumber
 * Get turn information
 */
app.get('/api/gameroom/:id/turn/:turnNumber', (req, res) => {
  const { id, turnNumber } = req.params;
  const room = gameRooms.get(id);
  
  if (!room) {
    return res.status(404).json({ error: 'Game room not found' });
  }
  
  const turn = room.turns.get(parseInt(turnNumber));
  if (!turn) {
    return res.status(404).json({ error: 'Turn not found' });
  }
  
  res.json({
    turn,
    hashChainEvents: room.hashChain.getEventsByTurn(parseInt(turnNumber))
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

module.exports = app;

// Start server if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Dice detection server running on port ${PORT}`);
  });
}
