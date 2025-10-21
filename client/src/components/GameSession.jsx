import React, { useState, useEffect } from 'react';
import VideoStream from './VideoStream';
import api from '../services/api';

function GameSession({ gameId: initialGameId, onBack }) {
  const [gameId, setGameId] = useState(initialGameId);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [rollResult, setRollResult] = useState(null);

  // Initialize or load game
  useEffect(() => {
    if (gameId) {
      loadGame(gameId);
    } else {
      createNewGame();
    }
  }, []);

  const createNewGame = async () => {
    setLoading(true);
    setError(null);
    try {
      // First, create or get a player
      const playerResponse = await api.createPlayer({
        username: `player_${Date.now()}`,
        displayName: `Player ${Math.floor(Math.random() * 1000)}`,
        country: 'Unknown'
      });
      
      const newPlayerId = playerResponse.player.id;
      setPlayerId(newPlayerId);

      // Create game
      const gameResponse = await api.createGame({ hostPlayer: newPlayerId });
      setGameId(gameResponse.game._id);
      setGame(gameResponse.game);
      console.log('Game created:', gameResponse.game);
    } catch (err) {
      setError(err.message || 'Failed to create game');
      console.error('Error creating game:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGame = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getGame(id);
      setGame(response.game);
    } catch (err) {
      setError(err.message || 'Failed to load game');
      console.error('Error loading game:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoll = async () => {
    if (!gameId || !playerId) {
      setError('Game not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setRollResult(null);

    try {
      const response = await api.rollDice(gameId, {
        playerId,
        diceCount: 1,
        metadata: {
          frameRate: 30,
          resolution: '720p',
          lighting: 'adequate',
          obstruction: false
        }
      });

      setRollResult(response.roll);
      
      // Reload game to get updated state
      await loadGame(gameId);
      
      console.log('Roll result:', response.roll);
    } catch (err) {
      setError(err.message || 'Failed to perform roll');
      console.error('Error rolling dice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!gameId) return;

    setLoading(true);
    setError(null);

    try {
      // Create a new player for joining
      const playerResponse = await api.createPlayer({
        username: `player_${Date.now()}`,
        displayName: `Player ${Math.floor(Math.random() * 1000)}`,
        country: 'Unknown'
      });
      
      const newPlayerId = playerResponse.player.id;
      setPlayerId(newPlayerId);

      const response = await api.joinGame(gameId, { playerId: newPlayerId });
      setGame(response.game);
      console.log('Joined game:', response.game);
    } catch (err) {
      setError(err.message || 'Failed to join game');
      console.error('Error joining game:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !game) {
    return <div className="loading">Loading game...</div>;
  }

  return (
    <div className="game-session">
      <div className="game-header">
        <h2>Game Session</h2>
        {onBack && <button onClick={onBack}>← Back to Lobby</button>}
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {game && (
        <div className="game-content">
          <div className="game-info">
            <div className="info-card">
              <h3>Game Status: {game.status}</h3>
              <p><strong>Game ID:</strong> {game._id}</p>
              <p><strong>Players:</strong> {game.players?.length || 0}</p>
              <p><strong>Total Rolls:</strong> {game.rolls?.length || 0}</p>
            </div>

            {game.status === 'pending' && game.players?.length < 2 && (
              <div className="action-section">
                <p>Waiting for another player to join...</p>
                <button onClick={handleJoinGame} disabled={loading}>
                  Simulate Second Player Joining
                </button>
              </div>
            )}

            {game.status === 'active' && (
              <div className="action-section">
                <h3>Your Turn</h3>
                <button 
                  onClick={handleRoll} 
                  disabled={loading}
                  className="btn-roll"
                >
                  🎲 Roll Dice
                </button>
              </div>
            )}

            {rollResult && (
              <div className="roll-result">
                <h3>Last Roll Result</h3>
                <div className="dice-display">
                  {rollResult.values.map((value, index) => (
                    <div key={index} className="dice-value">
                      {value}
                    </div>
                  ))}
                </div>
                <p className="timestamp">
                  Rolled at: {new Date(rollResult.timestamp).toLocaleTimeString()}
                </p>
              </div>
            )}

            {game.rolls && game.rolls.length > 0 && (
              <div className="roll-history">
                <h3>Roll History</h3>
                <div className="rolls-list">
                  {game.rolls.slice(-5).reverse().map((roll, index) => (
                    <div key={index} className="roll-item">
                      <span className="roll-player">
                        {roll.player?.username || 'Player'}
                      </span>
                      <span className="roll-values">
                        {roll.values.join(', ')}
                      </span>
                      <span className="roll-time">
                        {new Date(roll.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="video-section">
            <h3>Camera View</h3>
            <VideoStream />
            <p className="video-note">
              📹 Position your camera to show the dice and rolling surface
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameSession;
