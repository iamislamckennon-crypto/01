const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const { validatePlayerData, isValidObjectId, validatePagination } = require('../utils/validators');
const { authenticateToken, rateLimiter } = require('../middleware/auth');

// Apply rate limiting
router.use(rateLimiter({ maxRequests: 100, windowMs: 15 * 60 * 1000 }));

/**
 * POST /players - Register a new player
 */
router.post('/', async (req, res) => {
  try {
    const { username, displayName, country = 'Unknown' } = req.body;

    // Validate input
    const validation = validatePlayerData({ username, displayName });
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // Check if username already exists
    const existingPlayer = await Player.findOne({ username });
    if (existingPlayer) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Create new player
    const player = new Player({
      username,
      displayName,
      country,
      reputationScore: 100, // Starting reputation
      flagsCount: 0
    });

    await player.save();

    res.status(201).json({
      message: 'Player registered successfully',
      player: {
        id: player._id,
        username: player.username,
        displayName: player.displayName,
        country: player.country,
        reputationScore: player.reputationScore,
        reputationTier: player.reputationTier,
        createdAt: player.createdAt
      }
    });
  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({ error: 'Failed to register player', details: error.message });
  }
});

/**
 * GET /players/:id - Get player details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid player ID format' });
    }

    const player = await Player.findById(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      player: {
        id: player._id,
        username: player.username,
        displayName: player.displayName,
        country: player.country,
        reputationScore: player.reputationScore,
        reputationTier: player.reputationTier,
        flagsCount: player.flagsCount,
        createdAt: player.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player', details: error.message });
  }
});

/**
 * GET /players - Get list of players with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = validatePagination(req.query);
    const { sortBy = 'reputationScore', order = 'desc' } = req.query;

    // Build sort object
    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    const players = await Player.find()
      .select('username displayName country reputationScore flagsCount createdAt')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Player.countDocuments();

    res.json({
      players: players.map(p => ({
        id: p._id,
        username: p.username,
        displayName: p.displayName,
        country: p.country,
        reputationScore: p.reputationScore,
        reputationTier: p.reputationTier,
        flagsCount: p.flagsCount,
        createdAt: p.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players', details: error.message });
  }
});

/**
 * PATCH /players/:id - Update player reputation
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reputationChange, reason } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid player ID format' });
    }

    if (reputationChange === undefined || typeof reputationChange !== 'number') {
      return res.status(400).json({ error: 'Reputation change must be a number' });
    }

    const player = await Player.findById(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Update reputation
    player.updateReputation(reputationChange, reason || 'Manual adjustment');
    await player.save();

    res.json({
      message: 'Player reputation updated',
      player: {
        id: player._id,
        username: player.username,
        reputationScore: player.reputationScore,
        reputationTier: player.reputationTier
      }
    });
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Failed to update player', details: error.message });
  }
});

module.exports = router;
