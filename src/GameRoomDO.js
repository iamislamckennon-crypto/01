/**
 * GameRoomDO - Durable Object managing game room state
 * Enforces turn-based sequence, timing windows, commitment-reveal protocol
 */

import { sha256, chainHash, canonicalizeEvent, verifyCommitment } from './utils/crypto.js';
import { updateFairness, recordRoll, initializeFairnessCounts } from './utils/fairness.js';
import { computeTier, canPlay, recordSuccessfulRoll, recordViolation } from './utils/reputation.js';

const STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DISPUTED: 'disputed'
};

export class GameRoomDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade for real-time updates
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      await this.handleSession(server);
      
      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    // Handle HTTP requests
    try {
      const path = url.pathname;
      const method = request.method;

      if (method === 'POST' && path === '/join') {
        return await this.handleJoin(request);
      } else if (method === 'POST' && path === '/checklist') {
        return await this.handleChecklist(request);
      } else if (method === 'POST' && path === '/pre-roll-frame') {
        return await this.handlePreRollFrame(request);
      } else if (method === 'POST' && path === '/commit') {
        return await this.handleCommit(request);
      } else if (method === 'POST' && path === '/reveal') {
        return await this.handleReveal(request);
      } else if (method === 'POST' && path === '/declare-roll') {
        return await this.handleDeclareRoll(request);
      } else if (method === 'POST' && path === '/finalize-turn') {
        return await this.handleFinalizeTurn(request);
      } else if (method === 'POST' && path === '/dispute') {
        return await this.handleDispute(request);
      } else if (method === 'POST' && path === '/update-perspective') {
        return await this.handleUpdatePerspective(request);
      } else if (method === 'GET' && path === '/state') {
        return await this.handleGetState();
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('GameRoomDO error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleSession(webSocket) {
    webSocket.accept();
    this.sessions.add(webSocket);

    webSocket.addEventListener('close', () => {
      this.sessions.delete(webSocket);
    });

    webSocket.addEventListener('error', () => {
      this.sessions.delete(webSocket);
    });
  }

  async broadcast(message) {
    const messageStr = JSON.stringify(message);
    for (const session of this.sessions) {
      try {
        session.send(messageStr);
      } catch (error) {
        this.sessions.delete(session);
      }
    }
  }

  async getGameState() {
    return await this.state.storage.get('gameState') || this.initializeGameState();
  }

  initializeGameState() {
    return {
      id: this.state.id.toString(),
      status: STATUS.PENDING,
      players: [],
      turnIndex: 0,
      turnNumber: 1,
      commitments: {},
      rollEvents: [],
      fairness: {
        counts: initializeFairnessCounts(),
        deviation: 0,
        status: 'insufficient_data'
      },
      hashChainTip: 'genesis',
      createdAt: Date.now()
    };
  }

  async saveGameState(state) {
    await this.state.storage.put('gameState', state);
  }

  async handleJoin(request) {
    const { playerId } = await request.json();
    const state = await this.getGameState();

    if (state.players.length >= 2) {
      return new Response(JSON.stringify({ error: 'Room is full' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (state.players.some(p => p.id === playerId)) {
      return new Response(JSON.stringify({ error: 'Player already in room' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const player = {
      id: playerId,
      createdAt: Date.now(),
      rollCount: 0,
      violations: 0,
      tier: 'NEW',
      perspective: 'first-person',
      checklistComplete: false
    };

    state.players.push(player);

    // Activate game when both players joined
    if (state.players.length === 2) {
      state.status = STATUS.ACTIVE;
      
      // Record join event in hash chain
      const event = {
        type: 'game_started',
        timestamp: Date.now(),
        players: state.players.map(p => p.id)
      };
      await this.recordEvent(state, event);
    }

    await this.saveGameState(state);
    await this.broadcast({ type: 'state_update', state });

    return new Response(JSON.stringify({ success: true, state }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleChecklist(request) {
    const { playerId, checklist } = await request.json();
    const state = await this.getGameState();

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return new Response(JSON.stringify({ error: 'Player not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    player.checklistComplete = 
      checklist.flatSurface &&
      checklist.standardDice &&
      checklist.adequateLighting &&
      checklist.cameraFixed;

    await this.saveGameState(state);
    await this.broadcast({ type: 'state_update', state });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handlePreRollFrame(request) {
    const { playerId, frameHash } = await request.json();
    const state = await this.getGameState();

    const currentPlayer = state.players[state.turnIndex];
    if (currentPlayer.id !== playerId) {
      return new Response(JSON.stringify({ error: 'Not your turn' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!state.commitments[state.turnNumber]) {
      state.commitments[state.turnNumber] = {};
    }

    state.commitments[state.turnNumber].preFrameHash = frameHash;
    state.commitments[state.turnNumber].preFrameTime = Date.now();

    await this.saveGameState(state);
    await this.broadcast({ type: 'state_update', state });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleCommit(request) {
    const { playerId, commitmentHash } = await request.json();
    const state = await this.getGameState();

    const currentPlayer = state.players[state.turnIndex];
    if (currentPlayer.id !== playerId) {
      return new Response(JSON.stringify({ error: 'Not your turn' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!currentPlayer.checklistComplete) {
      return new Response(JSON.stringify({ error: 'Checklist not complete' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const commitment = state.commitments[state.turnNumber] || {};
    if (!commitment.preFrameHash) {
      return new Response(JSON.stringify({ error: 'Pre-roll frame required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    commitment.playerId = playerId;
    commitment.commitmentHash = commitmentHash;
    commitment.commitTime = Date.now();
    commitment.saltRevealed = false;

    state.commitments[state.turnNumber] = commitment;

    await this.saveGameState(state);
    await this.broadcast({ type: 'state_update', state });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleReveal(request) {
    const { playerId, salt } = await request.json();
    const state = await this.getGameState();

    const currentPlayer = state.players[state.turnIndex];
    if (currentPlayer.id !== playerId) {
      return new Response(JSON.stringify({ error: 'Not your turn' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const commitment = state.commitments[state.turnNumber];
    if (!commitment || !commitment.commitmentHash) {
      return new Response(JSON.stringify({ error: 'No commitment found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check reveal timing window
    const revealWindow = parseInt(this.env.REVEAL_WINDOW || '30000');
    const timeSinceCommit = Date.now() - commitment.commitTime;
    if (timeSinceCommit > revealWindow) {
      // Timing violation
      const playerObj = state.players.find(p => p.id === playerId);
      playerObj.violations++;
      playerObj.tier = computeTier(playerObj.rollCount, playerObj.violations);
      
      await this.saveGameState(state);
      
      return new Response(JSON.stringify({ error: 'Reveal window expired', violation: true }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    commitment.salt = salt;
    commitment.saltRevealed = true;
    commitment.revealTime = Date.now();

    await this.saveGameState(state);
    await this.broadcast({ type: 'state_update', state });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleDeclareRoll(request) {
    const { playerId, value, postFrameHash } = await request.json();
    const state = await this.getGameState();

    const currentPlayer = state.players[state.turnIndex];
    if (currentPlayer.id !== playerId) {
      return new Response(JSON.stringify({ error: 'Not your turn' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const commitment = state.commitments[state.turnNumber];
    if (!commitment || !commitment.saltRevealed) {
      return new Response(JSON.stringify({ error: 'Salt not revealed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify commitment
    const isValid = await verifyCommitment(
      commitment.commitmentHash,
      commitment.salt,
      playerId,
      state.turnNumber
    );

    if (!isValid) {
      // Commitment mismatch is a violation
      const playerObj = state.players.find(p => p.id === playerId);
      playerObj.violations++;
      playerObj.tier = computeTier(playerObj.rollCount, playerObj.violations);
      
      await this.saveGameState(state);
      
      return new Response(JSON.stringify({ 
        error: 'Commitment verification failed', 
        violation: true 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check declare timing window
    const declareWindow = parseInt(this.env.DECLARE_WINDOW || '30000');
    const timeSinceReveal = Date.now() - commitment.revealTime;
    if (timeSinceReveal > declareWindow) {
      const playerObj = state.players.find(p => p.id === playerId);
      playerObj.violations++;
      playerObj.tier = computeTier(playerObj.rollCount, playerObj.violations);
      
      await this.saveGameState(state);
      
      return new Response(JSON.stringify({ error: 'Declare window expired', violation: true }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    commitment.declaredValue = value;
    commitment.postFrameHash = postFrameHash;
    commitment.declareTime = Date.now();

    await this.saveGameState(state);
    await this.broadcast({ type: 'state_update', state });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleFinalizeTurn(request) {
    const { playerId } = await request.json();
    const state = await this.getGameState();

    const currentPlayer = state.players[state.turnIndex];
    if (currentPlayer.id !== playerId) {
      return new Response(JSON.stringify({ error: 'Not your turn' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const commitment = state.commitments[state.turnNumber];
    if (!commitment || !commitment.declaredValue) {
      return new Response(JSON.stringify({ error: 'Roll not declared' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Record roll in fairness tracking
    state.fairness.counts = recordRoll(state.fairness.counts, commitment.declaredValue);
    const minSample = parseInt(this.env.MIN_SAMPLE || '10');
    const fairnessResult = updateFairness(state.fairness.counts, minSample);
    state.fairness.deviation = fairnessResult.deviation;
    state.fairness.status = fairnessResult.status;

    // Update player reputation
    const playerObj = state.players.find(p => p.id === playerId);
    playerObj.rollCount++;
    playerObj.tier = computeTier(playerObj.rollCount, playerObj.violations);

    // Record turn event in hash chain
    const event = {
      type: 'turn_completed',
      turnNumber: state.turnNumber,
      playerId,
      value: commitment.declaredValue,
      timestamp: Date.now(),
      preFrameHash: commitment.preFrameHash,
      postFrameHash: commitment.postFrameHash
    };
    await this.recordEvent(state, event);

    // Move to next turn
    state.turnIndex = (state.turnIndex + 1) % 2;
    state.turnNumber++;

    await this.saveGameState(state);
    await this.broadcast({ type: 'state_update', state });

    return new Response(JSON.stringify({ success: true, state }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleDispute(request) {
    const { playerId, reason } = await request.json();
    const state = await this.getGameState();

    state.status = STATUS.DISPUTED;
    
    const event = {
      type: 'dispute_raised',
      playerId,
      reason,
      timestamp: Date.now(),
      turnNumber: state.turnNumber
    };
    await this.recordEvent(state, event);

    await this.saveGameState(state);
    await this.broadcast({ type: 'state_update', state });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleUpdatePerspective(request) {
    const { playerId, perspective } = await request.json();
    const state = await this.getGameState();

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return new Response(JSON.stringify({ error: 'Player not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    player.perspective = perspective;

    await this.saveGameState(state);
    await this.broadcast({ type: 'state_update', state });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleGetState() {
    const state = await this.getGameState();
    return new Response(JSON.stringify(state), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async recordEvent(state, event) {
    const canonical = canonicalizeEvent(event);
    const newHash = await chainHash(state.hashChainTip, canonical);
    
    state.rollEvents.push({
      ...event,
      hash: newHash,
      prevHash: state.hashChainTip
    });
    
    state.hashChainTip = newHash;
  }
}
