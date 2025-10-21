/**
 * Main application logic for Dice Roll Platform
 */

import { WebRTCManager } from './webrtc.js';

const API_BASE = '/api';

class DiceRollApp {
  constructor() {
    this.state = {
      playerId: null,
      roomId: null,
      gameState: null,
      currentSalt: null,
      selectedDiceValue: null,
      preFrameHash: null,
      postFrameHash: null
    };
    
    this.ws = null;
    this.webrtc = null;
    this.timers = {};
    
    this.init();
  }

  async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Set up event listeners
    this.setupEventListeners();
    
    // Check for install prompt
    this.setupInstallPrompt();
  }

  setupEventListeners() {
    // Registration form
    document.getElementById('registration-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const playerId = document.getElementById('player-id').value;
      this.state.playerId = playerId;
      this.register(playerId);
    });

    document.getElementById('create-room-btn').addEventListener('click', () => {
      this.createRoom();
    });

    document.getElementById('join-room-btn').addEventListener('click', () => {
      const roomId = prompt('Enter Room ID:');
      if (roomId) {
        this.joinRoom(roomId);
      }
    });

    document.getElementById('copy-room-id').addEventListener('click', () => {
      const roomId = document.getElementById('room-id').textContent;
      navigator.clipboard.writeText(roomId);
      alert('Room ID copied to clipboard!');
    });

    // Perspective toggle
    document.getElementById('perspective-fp').addEventListener('click', () => {
      this.updatePerspective('first-person');
    });

    document.getElementById('perspective-tp').addEventListener('click', () => {
      this.updatePerspective('third-person');
    });

    // Checklist
    document.getElementById('checklist-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const checklist = {
        flatSurface: formData.get('flatSurface') === 'on',
        standardDice: formData.get('standardDice') === 'on',
        adequateLighting: formData.get('adequateLighting') === 'on',
        cameraFixed: formData.get('cameraFixed') === 'on'
      };
      this.submitChecklist(checklist);
    });

    // Commitment flow
    document.getElementById('capture-pre-roll').addEventListener('click', () => {
      this.capturePreRollFrame();
    });

    document.getElementById('commit-btn').addEventListener('click', () => {
      this.makeCommitment();
    });

    document.getElementById('reveal-btn').addEventListener('click', () => {
      this.revealSalt();
    });

    // Dice selection
    document.querySelectorAll('.dice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const value = parseInt(e.target.dataset.value);
        this.selectDiceValue(value);
      });
    });

    document.getElementById('capture-post-roll').addEventListener('click', () => {
      this.capturePostRollFrame();
    });

    document.getElementById('finalize-btn').addEventListener('click', () => {
      this.finalizeTurn();
    });

    // Dispute
    document.getElementById('dispute-btn').addEventListener('click', () => {
      const reason = prompt('Enter reason for dispute:');
      if (reason) {
        this.raiseDispute(reason);
      }
    });

    // Event log
    document.getElementById('view-events').addEventListener('click', () => {
      this.showEventLog();
    });

    document.querySelector('.modal-close').addEventListener('click', () => {
      document.getElementById('event-log-modal').style.display = 'none';
    });

    document.getElementById('copy-hash').addEventListener('click', () => {
      const hash = document.getElementById('hash-chain-tip').textContent;
      navigator.clipboard.writeText(hash);
      alert('Hash copied to clipboard!');
    });
  }

  setupInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      document.getElementById('install-app').style.display = 'inline';
    });

    document.getElementById('install-app').addEventListener('click', async (e) => {
      e.preventDefault();
      
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install prompt outcome:', outcome);
        deferredPrompt = null;
      }
    });
  }

  async register(playerId) {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Registration successful');
        document.getElementById('room-info').style.display = 'block';
      } else {
        alert('Registration failed: ' + data.error);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed');
    }
  }

  async createRoom() {
    if (!this.state.playerId) {
      alert('Please register first');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/gameroom/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.state.playerId })
      });

      const data = await response.json();
      
      if (data.success) {
        this.state.roomId = data.roomId;
        document.getElementById('room-id').textContent = data.roomId;
        await this.initializeRoom();
      } else {
        alert('Failed to create room: ' + data.error);
      }
    } catch (error) {
      console.error('Create room error:', error);
      alert('Failed to create room');
    }
  }

  async joinRoom(roomId) {
    if (!this.state.playerId) {
      alert('Please register first');
      return;
    }

    this.state.roomId = roomId;

    try {
      const response = await fetch(`${API_BASE}/gameroom/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.state.playerId })
      });

      const data = await response.json();
      
      if (data.success) {
        document.getElementById('room-id').textContent = roomId;
        await this.initializeRoom();
      } else {
        alert('Failed to join room: ' + data.error);
      }
    } catch (error) {
      console.error('Join room error:', error);
      alert('Failed to join room');
    }
  }

  async initializeRoom() {
    // Hide registration, show game
    document.getElementById('registration-section').style.display = 'none';
    document.getElementById('game-section').style.display = 'block';

    // Connect WebSocket
    this.connectWebSocket();

    // Initialize WebRTC
    try {
      this.webrtc = new WebRTCManager(this.state.roomId, this.state.playerId, API_BASE);
      
      const localStream = await this.webrtc.initialize();
      document.getElementById('local-video').srcObject = localStream;

      this.webrtc.onRemoteStream = (stream) => {
        document.getElementById('remote-video').srcObject = stream;
      };

      this.webrtc.onConnectionStateChange = (state) => {
        console.log('WebRTC connection state:', state);
      };

      // Create offer if first player
      // (In a real implementation, coordinate via WebSocket who creates offer/answer)
      
    } catch (error) {
      console.error('WebRTC initialization error:', error);
      alert('Camera access required for gameplay');
    }

    // Fetch initial game state
    await this.fetchGameState();
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/gameroom/${this.state.roomId}/stream`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      document.getElementById('connection-status').textContent = 'Connected';
      document.getElementById('connection-status').classList.add('connected');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'state_update') {
        this.state.gameState = message.state;
        this.updateUI();
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      document.getElementById('connection-status').textContent = 'Disconnected';
      document.getElementById('connection-status').classList.remove('connected');
      
      // Attempt reconnect
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  async fetchGameState() {
    try {
      const response = await fetch(`${API_BASE}/gameroom/${this.state.roomId}/state`);
      const data = await response.json();
      this.state.gameState = data;
      this.updateUI();
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    }
  }

  updateUI() {
    const gameState = this.state.gameState;
    if (!gameState) return;

    // Update player cards
    gameState.players.forEach((player, index) => {
      const card = document.getElementById(`player-${index + 1}-card`);
      if (card) {
        card.querySelector('.player-id').textContent = player.id;
        card.querySelector('.player-tier span').textContent = player.tier;
        card.querySelector('.rolls').textContent = player.rollCount || 0;
        card.querySelector('.violations').textContent = player.violations || 0;
        card.querySelector('.player-perspective span').textContent = player.perspective || 'first-person';
        
        // Highlight active turn
        if (index === gameState.turnIndex) {
          card.classList.add('active-turn');
        } else {
          card.classList.remove('active-turn');
        }
      }
    });

    // Update turn info
    document.getElementById('turn-number').textContent = gameState.turnNumber;
    const currentPlayer = gameState.players[gameState.turnIndex];
    document.getElementById('current-player').textContent = currentPlayer?.id || 'Unknown';

    // Update turn status
    const isMyTurn = currentPlayer?.id === this.state.playerId;
    const commitment = gameState.commitments[gameState.turnNumber];
    
    let status = 'Waiting...';
    if (isMyTurn) {
      if (!commitment) {
        status = 'Capture pre-roll frame';
      } else if (!commitment.commitmentHash) {
        status = 'Make commitment';
      } else if (!commitment.saltRevealed) {
        status = 'Reveal salt';
      } else if (!commitment.declaredValue) {
        status = 'Declare roll result';
      } else {
        status = 'Finalize turn';
      }
    } else {
      status = 'Opponent\'s turn';
    }
    document.getElementById('turn-status').textContent = status;

    // Enable/disable controls based on turn and state
    this.updateControls(isMyTurn, commitment);

    // Update fairness display
    this.updateFairness(gameState.fairness);

    // Update hash chain
    document.getElementById('hash-chain-tip').textContent = gameState.hashChainTip;
  }

  updateControls(isMyTurn, commitment) {
    const player = this.state.gameState?.players.find(p => p.id === this.state.playerId);
    const checklistComplete = player?.checklistComplete;

    // Pre-roll frame capture
    document.getElementById('capture-pre-roll').disabled = 
      !isMyTurn || !checklistComplete || (commitment && commitment.preFrameHash);

    // Commit button
    document.getElementById('commit-btn').disabled = 
      !isMyTurn || !commitment?.preFrameHash || commitment?.commitmentHash;

    // Reveal button
    document.getElementById('reveal-btn').disabled = 
      !isMyTurn || !commitment?.commitmentHash || commitment?.saltRevealed;

    // Dice buttons
    document.querySelectorAll('.dice-btn').forEach(btn => {
      btn.disabled = !isMyTurn || !commitment?.saltRevealed || commitment?.declaredValue;
    });

    // Post-roll capture
    document.getElementById('capture-post-roll').disabled = 
      !isMyTurn || !this.state.selectedDiceValue || commitment?.postFrameHash;

    // Finalize button
    document.getElementById('finalize-btn').disabled = 
      !isMyTurn || !commitment?.declaredValue;
  }

  async updatePerspective(perspective) {
    try {
      const response = await fetch(`${API_BASE}/gameroom/${this.state.roomId}/update-perspective`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.state.playerId,
          perspective
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update button states
        document.getElementById('perspective-fp').classList.toggle('active', perspective === 'first-person');
        document.getElementById('perspective-tp').classList.toggle('active', perspective === 'third-person');
      }
    } catch (error) {
      console.error('Failed to update perspective:', error);
    }
  }

  async submitChecklist(checklist) {
    try {
      const response = await fetch(`${API_BASE}/gameroom/${this.state.roomId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.state.playerId,
          checklist
        })
      });

      const data = await response.json();
      
      if (data.success) {
        document.getElementById('checklist-status').textContent = '✓ Checklist confirmed';
        document.getElementById('checklist-status').style.color = 'var(--accent-success)';
      }
    } catch (error) {
      console.error('Failed to submit checklist:', error);
    }
  }

  async capturePreRollFrame() {
    try {
      const frameHash = await this.webrtc.captureFrame();
      this.state.preFrameHash = frameHash;

      const response = await fetch(`${API_BASE}/gameroom/${this.state.roomId}/pre-roll-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.state.playerId,
          frameHash
        })
      });

      const data = await response.json();
      
      if (data.success) {
        document.getElementById('pre-roll-status').textContent = '✓ Pre-roll frame captured';
        document.getElementById('pre-roll-status').style.color = 'var(--accent-success)';
      }
    } catch (error) {
      console.error('Failed to capture pre-roll frame:', error);
      alert('Failed to capture frame');
    }
  }

  async makeCommitment() {
    try {
      // Generate salt
      const salt = crypto.randomUUID();
      this.state.currentSalt = salt;
      document.getElementById('salt-display').textContent = salt;

      // Compute commitment
      const commitment = await this.computeCommitment(salt);

      const response = await fetch(`${API_BASE}/gameroom/${this.state.roomId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.state.playerId,
          commitmentHash: commitment
        })
      });

      const data = await response.json();
      
      if (data.success) {
        document.getElementById('commit-status').textContent = '✓ Commitment made';
        document.getElementById('commit-status').style.color = 'var(--accent-success)';
      }
    } catch (error) {
      console.error('Failed to make commitment:', error);
      alert('Failed to make commitment');
    }
  }

  async computeCommitment(salt) {
    const payload = `${salt}:${this.state.playerId}:${this.state.gameState.turnNumber}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async revealSalt() {
    try {
      const response = await fetch(`${API_BASE}/gameroom/${this.state.roomId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.state.playerId,
          salt: this.state.currentSalt
        })
      });

      const data = await response.json();
      
      if (data.success) {
        document.getElementById('reveal-status').textContent = '✓ Salt revealed';
        document.getElementById('reveal-status').style.color = 'var(--accent-success)';
      } else {
        alert('Failed to reveal: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to reveal salt:', error);
      alert('Failed to reveal salt');
    }
  }

  selectDiceValue(value) {
    this.state.selectedDiceValue = value;
    
    // Update button states
    document.querySelectorAll('.dice-btn').forEach(btn => {
      btn.classList.toggle('selected', parseInt(btn.dataset.value) === value);
    });
    
    document.getElementById('declare-status').textContent = `Selected: ${value}`;
  }

  async capturePostRollFrame() {
    try {
      const frameHash = await this.webrtc.captureFrame();
      this.state.postFrameHash = frameHash;

      const response = await fetch(`${API_BASE}/gameroom/${this.state.roomId}/declare-roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.state.playerId,
          value: this.state.selectedDiceValue,
          postFrameHash: frameHash
        })
      });

      const data = await response.json();
      
      if (data.success) {
        document.getElementById('declare-status').textContent = `✓ Declared: ${this.state.selectedDiceValue}`;
        document.getElementById('declare-status').style.color = 'var(--accent-success)';
      } else {
        alert('Failed to declare: ' + data.error);
        if (data.violation) {
          document.getElementById('declare-status').textContent = '✗ Violation recorded';
          document.getElementById('declare-status').style.color = 'var(--accent-danger)';
        }
      }
    } catch (error) {
      console.error('Failed to declare roll:', error);
      alert('Failed to declare roll');
    }
  }

  async finalizeTurn() {
    try {
      const response = await fetch(`${API_BASE}/gameroom/${this.state.roomId}/finalize-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.state.playerId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        document.getElementById('finalize-status').textContent = '✓ Turn finalized';
        document.getElementById('finalize-status').style.color = 'var(--accent-success)';
        
        // Reset state for next turn
        this.state.currentSalt = null;
        this.state.selectedDiceValue = null;
        this.state.preFrameHash = null;
        this.state.postFrameHash = null;
        
        // Clear statuses
        document.getElementById('pre-roll-status').textContent = '';
        document.getElementById('commit-status').textContent = '';
        document.getElementById('reveal-status').textContent = '';
        document.getElementById('declare-status').textContent = '';
        document.getElementById('finalize-status').textContent = '';
        
        // Clear selected dice
        document.querySelectorAll('.dice-btn').forEach(btn => {
          btn.classList.remove('selected');
        });
      }
    } catch (error) {
      console.error('Failed to finalize turn:', error);
      alert('Failed to finalize turn');
    }
  }

  updateFairness(fairness) {
    if (!fairness) return;

    const total = fairness.counts.reduce((sum, c) => sum + c, 0);
    
    // Update bar chart
    fairness.counts.forEach((count, index) => {
      const bar = document.querySelector(`.bar[data-value="${index + 1}"] .bar-fill`);
      if (bar && total > 0) {
        const height = (count / total) * 180; // Max 180px
        bar.style.height = `${height}px`;
      }
    });

    // Update deviation and status
    document.getElementById('fairness-deviation').textContent = fairness.deviation.toFixed(2);
    const statusElement = document.getElementById('fairness-status');
    statusElement.textContent = fairness.status.replace('_', ' ').toUpperCase();
    statusElement.className = 'status-badge ' + fairness.status.replace('_', '-');
  }

  async raiseDispute(reason) {
    try {
      const response = await fetch(`${API_BASE}/gameroom/${this.state.roomId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.state.playerId,
          reason
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Dispute raised successfully');
      }
    } catch (error) {
      console.error('Failed to raise dispute:', error);
      alert('Failed to raise dispute');
    }
  }

  showEventLog() {
    const gameState = this.state.gameState;
    if (!gameState) return;

    const modal = document.getElementById('event-log-modal');
    const list = document.getElementById('event-log-list');
    
    list.innerHTML = '';
    
    gameState.rollEvents.forEach(event => {
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(event, null, 2);
      list.appendChild(pre);
    });

    modal.style.display = 'flex';
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DiceRollApp();
  });
} else {
  new DiceRollApp();
}
