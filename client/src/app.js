// Dice Roll Gaming Platform - Main Application (Vanilla JavaScript)

class DiceRollApp {
  constructor() {
    this.state = {
      gameId: '',
      playerId: '',
      isInGame: false,
      diceRoll: null,
      gameLogs: [],
      videoEnabled: false,
      inputGameId: '',
      inputPlayerId: ''
    };
    this.videoElement = null;
    this.init();
  }

  init() {
    this.render();
    this.checkServerHealth();
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  async checkServerHealth() {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      this.addLog('System', data.message);
    } catch (error) {
      this.addLog('System', 'Failed to connect to server', true);
    }
  }

  addLog(actor, message, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    this.state.gameLogs.push({ actor, message, timestamp, isError });
    this.renderGameLog();
  }

  async createGame() {
    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success) {
        this.setState({ 
          gameId: data.gameId,
          playerId: 'host',
          isInGame: true 
        });
        this.addLog('System', `Game created: ${data.gameId}`);
      }
    } catch (error) {
      this.addLog('System', 'Failed to create game', true);
    }
  }

  async joinGame() {
    const gameId = document.getElementById('inputGameId').value;
    const playerId = document.getElementById('inputPlayerId').value;
    
    if (!gameId || !playerId) {
      this.addLog('System', 'Please enter Game ID and Player ID', true);
      return;
    }

    try {
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId })
      });
      const data = await response.json();
      
      if (data.success) {
        this.setState({ 
          gameId: data.gameId,
          playerId: data.playerId,
          isInGame: true,
          inputGameId: gameId,
          inputPlayerId: playerId
        });
        this.addLog('System', `Joined game: ${data.gameId}`);
      }
    } catch (error) {
      this.addLog('System', 'Failed to join game', true);
    }
  }

  async rollDice() {
    const { gameId, playerId } = this.state;
    
    if (!gameId || !playerId) {
      this.addLog('System', 'Not in a game session', true);
      return;
    }

    this.addLog(playerId, 'Rolling dice...');

    try {
      const response = await fetch('/api/game/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId })
      });
      const data = await response.json();
      
      if (data.success) {
        this.setState({ diceRoll: data.roll });
        this.addLog(playerId, `Rolled: ${data.roll}`);
      }
    } catch (error) {
      this.addLog('System', 'Failed to roll dice', true);
    }
  }

  async enableVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      this.videoElement = document.getElementById('videoFeed');
      if (this.videoElement) {
        this.videoElement.srcObject = stream;
      }
      
      this.setState({ videoEnabled: true });
      this.addLog('System', 'Video camera enabled');
    } catch (error) {
      this.addLog('System', 'Failed to access camera. Please check permissions.', true);
    }
  }

  leaveGame() {
    this.setState({
      gameId: '',
      playerId: '',
      isInGame: false,
      diceRoll: null
    });
    this.addLog('System', 'Left game session');
  }

  renderGameLog() {
    const logContainer = document.getElementById('gameLog');
    if (!logContainer) return;
    
    if (this.state.gameLogs.length === 0) {
      logContainer.innerHTML = '<p style="color: #999; text-align: center">No activity yet</p>';
      return;
    }
    
    logContainer.innerHTML = this.state.gameLogs.map(log => `
      <div class="log-entry" style="border-left-color: ${log.isError ? '#f44336' : '#667eea'}">
        <div class="timestamp">${log.timestamp}</div>
        <div><strong>${log.actor}:</strong> ${log.message}</div>
      </div>
    `).join('');
  }

  render() {
    const root = document.getElementById('root');
    const { gameId, playerId, isInGame, diceRoll, videoEnabled } = this.state;

    root.innerHTML = `
      <div class="app-container">
        <h1>🎲 Dice Roll Gaming Platform</h1>
        <p class="subtitle">Competitive dice rolling with video verification</p>

        <div class="info-box">
          <strong>📹 Video Verification Required:</strong> All players must enable their camera 
          to participate in games. This ensures fair play and transparency.
        </div>

        ${!isInGame ? `
          <div class="section">
            <h2>Start or Join Game</h2>
            <div class="button-group">
              <button onclick="app.createGame()">
                Create New Game
              </button>
            </div>
            
            <div style="margin-top: 30px">
              <h3 style="margin-bottom: 15px">Join Existing Game</h3>
              <input
                id="inputGameId"
                type="text"
                placeholder="Enter Game ID"
              />
              <input
                id="inputPlayerId"
                type="text"
                placeholder="Enter Your Player ID"
              />
              <button onclick="app.joinGame()">
                Join Game
              </button>
            </div>
          </div>
        ` : `
          <div class="section">
            <h2>
              Game Session
              <span class="status-badge connected">Active</span>
            </h2>
            <p><strong>Game ID:</strong> ${gameId}</p>
            <p><strong>Player ID:</strong> ${playerId}</p>
          </div>

          <div class="section">
            <h2>Video Feed</h2>
            <div class="video-container">
              <div>
                ${videoEnabled ? `
                  <video id="videoFeed" autoplay muted></video>
                ` : `
                  <div class="video-placeholder">
                    <div>
                      <p>📹 Camera Not Enabled</p>
                      <p style="font-size: 0.9em; margin-top: 10px">
                        Click "Enable Camera" to start video verification
                      </p>
                    </div>
                  </div>
                `}
              </div>
            </div>
            <button onclick="app.enableVideo()" ${videoEnabled ? 'disabled' : ''}>
              ${videoEnabled ? 'Camera Enabled ✓' : 'Enable Camera'}
            </button>
          </div>

          <div class="section">
            <h2>Dice Rolling</h2>
            <div class="warning-box">
              <strong>⚠️ Important:</strong> Before rolling, ensure your camera clearly shows 
              the dice and rolling surface. Announce your intention to roll verbally.
            </div>
            
            ${diceRoll ? `
              <div class="dice-result">
                <div class="dice-value">${diceRoll}</div>
              </div>
            ` : ''}
            
            <div class="button-group">
              <button onclick="app.rollDice()">
                🎲 Roll Dice
              </button>
              <button onclick="app.leaveGame()" style="background: #f44336">
                Leave Game
              </button>
            </div>
          </div>
        `}

        <div class="section">
          <h2>Game Log</h2>
          <div class="game-log" id="gameLog">
            <p style="color: #999; text-align: center">No activity yet</p>
          </div>
        </div>

        <a href="/GAME_RULES.md" class="rules-link" target="_blank">
          📋 View Official Game Rules
        </a>
        <a href="/ANTI_CHEATING.md" class="rules-link" target="_blank">
          🔒 View Anti-Cheating Mechanisms
        </a>
      </div>
    `;

    this.renderGameLog();
    
    // Re-attach video stream if needed
    if (videoEnabled && this.videoElement && this.videoElement.srcObject) {
      const newVideo = document.getElementById('videoFeed');
      if (newVideo) {
        newVideo.srcObject = this.videoElement.srcObject;
      }
    }
  }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new DiceRollApp();
});

