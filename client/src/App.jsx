import React, { useState } from 'react';
import GameSession from './components/GameSession';

function App() {
  const [currentView, setCurrentView] = useState('lobby');
  const [currentGameId, setCurrentGameId] = useState(null);

  const renderView = () => {
    switch (currentView) {
      case 'game':
        return (
          <GameSession 
            gameId={currentGameId} 
            onBack={() => {
              setCurrentView('lobby');
              setCurrentGameId(null);
            }}
          />
        );
      case 'rules':
        return (
          <div className="rules-view">
            <h2>Game Rules</h2>
            <div className="rules-content">
              <p>For detailed rules, please see <a href="/RULES.md" target="_blank">RULES.md</a></p>
              <h3>Quick Start:</h3>
              <ul>
                <li>Create or join a game</li>
                <li>Position your camera to show the dice and rolling surface</li>
                <li>Roll your dice on camera</li>
                <li>Results are automatically verified</li>
                <li>Fair play is enforced through anti-cheat systems</li>
              </ul>
            </div>
            <button onClick={() => setCurrentView('lobby')}>Back to Lobby</button>
          </div>
        );
      case 'lobby':
      default:
        return (
          <div className="lobby-view">
            <h2>Game Lobby</h2>
            <div className="lobby-actions">
              <button 
                onClick={() => {
                  setCurrentView('game');
                  // Game ID will be set by GameSession component
                }}
                className="btn-primary"
              >
                Create New Game
              </button>
              <button 
                onClick={() => setCurrentView('rules')}
                className="btn-secondary"
              >
                View Rules
              </button>
            </div>
            <div className="info-section">
              <h3>Welcome to the Competitive Dice Roll Gaming Platform</h3>
              <p>Fair, transparent, and competitive dice gaming with anti-cheat verification.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎲 Dice Gaming Platform</h1>
        <nav>
          <button onClick={() => setCurrentView('lobby')}>Lobby</button>
          <button onClick={() => setCurrentView('rules')}>Rules</button>
        </nav>
      </header>
      <main className="app-main">
        {renderView()}
      </main>
      <footer className="app-footer">
        <p>Competitive Dice Roll Gaming Platform - Fair Play Guaranteed</p>
      </footer>
    </div>
  );
}

export default App;
