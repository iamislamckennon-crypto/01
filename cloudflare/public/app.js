/**
 * Main application JavaScript
 * Handles UI interactions and API calls
 */

// State
let currentPlayerId = null;
let currentRoomId = null;
let currentSalt = null;
let ws = null;

// DOM elements
const welcomeSection = document.getElementById('welcome-section');
const gameSection = document.getElementById('game-section');
const registrationForm = document.getElementById('registration-form');
const themeToggle = document.getElementById('theme-toggle');
const loadingOverlay = document.getElementById('loading-overlay');
const toastContainer = document.getElementById('toast-container');

// Game UI elements
const roomIdDisplay = document.getElementById('room-id');
const roomStatusDisplay = document.getElementById('room-status');
const playerCountDisplay = document.getElementById('player-count');
const totalRollsDisplay = document.getElementById('total-rolls');
const fairnessBadge = document.getElementById('fairness-badge');
const fairnessBar = document.getElementById('fairness-bar');
const rollResult = document.getElementById('roll-result');
const diceValue = document.getElementById('dice-value');
const commitmentStatus = document.getElementById('commitment-status');
const eventsLog = document.getElementById('events-log');

// Buttons
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const commitBtn = document.getElementById('commit-btn');
const revealBtn = document.getElementById('reveal-btn');
const rollBtn = document.getElementById('roll-btn');

// Utility functions
function showLoading() {
  loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  loadingOverlay.style.display = 'none';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

function logEvent(event) {
  const eventItem = document.createElement('div');
  eventItem.className = 'event-item';
  
  const time = new Date().toLocaleTimeString();
  
  // Create text nodes to prevent XSS
  const timeSpan = document.createElement('span');
  timeSpan.className = 'event-time';
  timeSpan.textContent = time;
  
  const typeSpan = document.createElement('span');
  typeSpan.className = 'event-type';
  typeSpan.textContent = event.type;
  
  const separator = document.createTextNode(': ');
  
  const payloadSpan = document.createElement('span');
  payloadSpan.textContent = JSON.stringify(event.payload || {});
  
  eventItem.appendChild(timeSpan);
  eventItem.appendChild(typeSpan);
  eventItem.appendChild(separator);
  eventItem.appendChild(payloadSpan);
  
  eventsLog.insertBefore(eventItem, eventsLog.firstChild);
  
  // Keep only last 20 events
  while (eventsLog.children.length > 20) {
    eventsLog.lastChild.remove();
  }
}

// API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`/api${endpoint}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API call failed');
  }
  
  return data;
}

// Registration
registrationForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(registrationForm);
  const playerId = formData.get('playerId');
  
  // Get Turnstile token if widget exists
  const turnstileToken = window.turnstile?.getResponse?.();
  
  try {
    showLoading();
    
    await apiCall('/register', 'POST', {
      playerId,
      turnstileToken
    });
    
    currentPlayerId = playerId;
    
    // Show game section
    welcomeSection.style.display = 'none';
    gameSection.style.display = 'block';
    
    showToast('Registration successful!', 'success');
  } catch (error) {
    showToast(`Registration failed: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
});

// Create room
createRoomBtn.addEventListener('click', async () => {
  try {
    showLoading();
    
    const data = await apiCall('/gameroom/create', 'POST');
    currentRoomId = data.roomId;
    
    roomIdDisplay.textContent = currentRoomId;
    
    // Automatically join
    await joinRoom();
    
    showToast('Room created!', 'success');
  } catch (error) {
    showToast(`Failed to create room: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
});

// Join room
async function joinRoom() {
  try {
    await apiCall(`/gameroom/${currentRoomId}/join`, 'POST', {
      playerId: currentPlayerId
    });
    
    // Connect WebSocket
    connectWebSocket();
    
    // Enable buttons
    commitBtn.disabled = false;
    rollBtn.disabled = false;
    
    showToast('Joined room!', 'success');
  } catch (error) {
    showToast(`Failed to join room: ${error.message}`, 'error');
  }
}

// WebSocket connection
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/gameroom/${currentRoomId}/stream`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    showToast('Connected to game room', 'success');
  };
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(message);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    showToast('Connection error', 'error');
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    showToast('Disconnected from game room', 'warning');
  };
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
  console.log('Received message:', message);
  logEvent(message);
  
  if (message.type === 'state') {
    updateGameState(message.payload);
  } else if (message.type === 'player_joined') {
    updateGameState(message.payload);
  } else if (message.type === 'roll') {
    const { rollResult, fairnessStatus } = message.payload;
    displayRoll(rollResult);
    updateFairnessStatus(fairnessStatus);
  } else if (message.type === 'commitment_made') {
    commitmentStatus.textContent = 'Committed';
    commitmentStatus.className = 'badge badge-info';
    revealBtn.disabled = false;
  } else if (message.type === 'commitment_revealed') {
    const { valid } = message.payload;
    commitmentStatus.textContent = valid ? 'Verified' : 'Invalid';
    commitmentStatus.className = valid ? 'badge badge-success' : 'badge badge-danger';
  }
}

// Update game state
function updateGameState(state) {
  if (state.status) {
    roomStatusDisplay.textContent = state.status.charAt(0).toUpperCase() + state.status.slice(1);
    roomStatusDisplay.className = `badge badge-${state.status === 'active' ? 'success' : 'info'}`;
  }
  
  if (state.players) {
    playerCountDisplay.textContent = state.players.length || 0;
  }
  
  if (state.totalRolls !== undefined) {
    totalRollsDisplay.textContent = state.totalRolls;
  }
  
  if (state.fairnessStatus) {
    updateFairnessStatus(state.fairnessStatus);
  }
  
  if (state.distribution) {
    updateDistribution(state.distribution, state.totalRolls || 0);
  }
}

// Commit
commitBtn.addEventListener('click', async () => {
  try {
    showLoading();
    
    // Generate salt and commitment
    currentSalt = crypto.randomUUID();
    const turnNumber = 0; // TODO: Get from state
    const commitmentString = `${currentSalt}${currentPlayerId}${turnNumber}`;
    
    // Hash commitment
    const encoder = new TextEncoder();
    const data = encoder.encode(commitmentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const commitmentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    await apiCall(`/gameroom/${currentRoomId}/commit`, 'POST', {
      playerId: currentPlayerId,
      commitmentHash
    });
    
    commitBtn.disabled = true;
    
    showToast('Commitment submitted!', 'success');
  } catch (error) {
    showToast(`Commit failed: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
});

// Reveal
revealBtn.addEventListener('click', async () => {
  if (!currentSalt) {
    showToast('No commitment to reveal', 'error');
    return;
  }
  
  try {
    showLoading();
    
    await apiCall(`/gameroom/${currentRoomId}/reveal`, 'POST', {
      playerId: currentPlayerId,
      salt: currentSalt
    });
    
    revealBtn.disabled = true;
    currentSalt = null;
    
    showToast('Commitment revealed!', 'success');
  } catch (error) {
    showToast(`Reveal failed: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
});

// Roll dice
rollBtn.addEventListener('click', async () => {
  try {
    showLoading();
    
    const data = await apiCall(`/gameroom/${currentRoomId}/roll`, 'POST', {
      playerId: currentPlayerId
    });
    
    displayRoll(data.rollResult);
    updateFairnessStatus(data.fairnessStatus);
    
    showToast(`Rolled a ${data.rollResult}!`, 'success');
  } catch (error) {
    showToast(`Roll failed: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
});

// Display roll result
function displayRoll(value) {
  diceValue.textContent = value;
  rollResult.style.display = 'block';
}

// Update fairness status
function updateFairnessStatus(status) {
  fairnessBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  
  if (status === 'normal') {
    fairnessBadge.className = 'badge badge-success';
    fairnessBar.style.width = '100%';
    fairnessBar.style.backgroundColor = 'var(--color-success)';
  } else if (status === 'observe') {
    fairnessBadge.className = 'badge badge-warning';
    fairnessBar.style.width = '66%';
    fairnessBar.style.backgroundColor = 'var(--color-warning)';
  } else if (status === 'suspect') {
    fairnessBadge.className = 'badge badge-danger';
    fairnessBar.style.width = '33%';
    fairnessBar.style.backgroundColor = 'var(--color-danger)';
  }
}

// Update distribution chart
function updateDistribution(distribution, totalRolls) {
  const maxCount = Math.max(...Object.values(distribution), 1);
  
  for (let i = 1; i <= 6; i++) {
    const count = distribution[i] || 0;
    const percentage = totalRolls > 0 ? (count / totalRolls) * 100 : 0;
    
    const bar = document.getElementById(`dist-${i}`);
    const countDisplay = document.getElementById(`count-${i}`);
    
    if (bar) {
      bar.style.width = `${percentage}%`;
    }
    
    if (countDisplay) {
      countDisplay.textContent = count;
    }
  }
}

// Theme toggle
themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Initialize Turnstile if configured
if (window.turnstile) {
  window.turnstile.render('#turnstile-widget', {
    sitekey: 'YOUR_SITE_KEY_HERE', // TODO: Configure via environment
    callback: function(token) {
      console.log('Turnstile token received');
    }
  });
}
