const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const Player = require('../models/Player');
const diceService = require('../services/diceService');
const anticheatService = require('../services/anticheatService');
const { validateGameData, validateRollData, isValidObjectId } = require('../utils/validators');
const { authenticateToken, rateLimiter } = require('../middleware/auth');

// Apply rate limiting to all game routes
router.use(rateLimiter({ maxRequests: 100, windowMs: 15 * 60 * 1000 }));

/**
 * POST /games - Create a new game
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { hostPlayer } = req.body;

    // Validate input
    const validation = validateGameData({ hostPlayer });
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // Verify host player exists
    const player = await Player.findById(hostPlayer);
    if (!player) {
      return res.status(404).json({ error: 'Host player not found' });
    }

    // Create game
    const game = new Game({
      hostPlayer,
      players: [hostPlayer],
      status: 'pending'
    });

    await game.save();
    await game.populate('hostPlayer players');

    res.status(201).json({
      message: 'Game created successfully',
      game
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game', details: error.message });
  }
});

/**
 * GET /games/:id - Get game details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid game ID format' });
    }

    const game = await Game.findById(id)
      .populate('hostPlayer', 'username displayName reputationScore')
      .populate('players', 'username displayName reputationScore')
      .populate('rolls.player', 'username displayName');

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game', details: error.message });
  }
});

/**
 * POST /games/:id/join - Join an existing game
 */
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { playerId } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid game ID format' });
    }

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    // Find game and player
    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Check game status
    if (game.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot join game in current status' });
    }

    // Check if player already joined
    if (game.players.some(p => p.toString() === playerId)) {
      return res.status(400).json({ error: 'Player already in game' });
    }

    // Add player and update status if needed
    game.players.push(playerId);
    
    // Auto-start game when second player joins (can be customized)
    if (game.players.length >= 2) {
      game.status = 'active';
    }

    await game.save();
    await game.populate('hostPlayer players');

    res.json({
      message: 'Successfully joined game',
      game
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: 'Failed to join game', details: error.message });
  }
});

/**
 * POST /games/:id/roll - Perform a dice roll in the game
 */
router.post('/:id/roll', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { playerId, diceCount = 1, metadata = {} } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid game ID format' });
    }

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    // Find game
    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Verify game is active
    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    // Verify player is in game
    if (!game.players.some(p => p.toString() === playerId)) {
      return res.status(403).json({ error: 'Player not in this game' });
    }

    // Validate camera/video metadata (placeholder)
    const validation = diceService.validateVisibleOnCamera(metadata);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Roll validation failed',
        issues: validation.issues
      });
    }

    // Perform dice roll
    const values = diceService.rollDice(6, diceCount);

    // Create roll record
    const roll = {
      player: playerId,
      values,
      videoProofId: metadata.videoProofId || null,
      timestamp: new Date(),
      isFlagged: false
    };

    // Validate roll data
    const rollValidation = validateRollData(roll);
    if (!rollValidation.isValid) {
      return res.status(400).json({ errors: rollValidation.errors });
    }

    game.rolls.push(roll);
    await game.save();
    await game.populate('rolls.player', 'username displayName');

    res.json({
      message: 'Roll completed successfully',
      roll: game.rolls[game.rolls.length - 1],
      gameStatus: game.status
    });
  } catch (error) {
    console.error('Error performing roll:', error);
    res.status(500).json({ error: 'Failed to perform roll', details: error.message });
  }
});

/**
 * GET /games/:id/report - Get anti-cheat report for the game
 */
router.get('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid game ID format' });
    }

    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Generate anti-cheat report
    const report = anticheatService.produceSessionReport(game);
    
    // Also include aggregated roll statistics
    const rollStats = diceService.aggregateRolls(game.rolls);

    res.json({
      report,
      statistics: rollStats
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
});

module.exports = router;
