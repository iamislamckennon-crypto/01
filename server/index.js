const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting middleware to prevent DoS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to all routes
app.use(limiter);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// Serve documentation files
app.get('/GAME_RULES.md', (req, res) => {
  res.sendFile(path.join(__dirname, '../GAME_RULES.md'));
});

app.get('/ANTI_CHEATING.md', (req, res) => {
  res.sendFile(path.join(__dirname, '../ANTI_CHEATING.md'));
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Game session endpoint placeholder
app.post('/api/game/create', (req, res) => {
  // TODO: Implement game creation logic
  res.json({ 
    success: true, 
    gameId: 'game-' + Date.now(),
    message: 'Game session created'
  });
});

app.post('/api/game/join', (req, res) => {
  // TODO: Implement game join logic
  const { gameId, playerId } = req.body;
  res.json({ 
    success: true, 
    gameId,
    playerId,
    message: 'Joined game session'
  });
});

app.post('/api/game/roll', (req, res) => {
  // TODO: Implement dice roll logic with verification
  const { gameId, playerId } = req.body;
  const diceRoll = Math.floor(Math.random() * 6) + 1;
  res.json({ 
    success: true, 
    gameId,
    playerId,
    roll: diceRoll,
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler: send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
