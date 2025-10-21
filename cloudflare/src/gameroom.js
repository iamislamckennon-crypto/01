/**
 * Durable Object for GameRoom state management
 */

import { rollDice, verifyCommitment, generateEventHash } from './crypto.js';
import { analyzeFairness, updateDistribution } from './fairness.js';
import { calculateReputationTier, updatePlayerStats } from './reputation.js';

export class GameRoomDurable {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set(); // WebSocket sessions
    this.initializeState();
  }

  async initializeState() {
    // Initialize default state if not exists
    const existingState = await this.state.storage.get('gameState');
    if (!existingState) {
      await this.state.storage.put('gameState', {
        id: crypto.randomUUID(),
        players: {},
        turnIndex: 0,
        status: 'pending',
        commitments: {},
        rollEvents: [],
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        totalRolls: 0,
        fairnessStatus: 'normal',
        reputationSnapshot: {},
        hashChain: {
          genesis: null,
          latest: null
        },
        createdAt: Date.now(),
        lastEventHash: null
      });
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    // WebSocket upgrade for /stream endpoint
    if (url.pathname.endsWith('/stream')) {
      if (request.headers.get('Upgrade') === 'websocket') {
        return this.handleWebSocket(request);
      }
      return new Response('Expected WebSocket', { status: 426 });
    }
    
    // Handle API requests
    const path = url.pathname.split('/').pop();
    
    switch (path) {
      case 'join':
        return this.handleJoin(request);
      case 'commit':
        return this.handleCommit(request);
      case 'reveal':
        return this.handleReveal(request);
      case 'roll':
        return this.handleRoll(request);
      case 'state':
        return this.handleGetState(request);
      case 'finalize':
        return this.handleFinalize(request);
      case 'dispute':
        return this.handleDispute(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  async handleWebSocket(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    
    this.state.acceptWebSocket(server);
    this.sessions.add(server);
    
    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });
    
    // Send current state immediately
    const gameState = await this.state.storage.get('gameState');
    server.send(JSON.stringify({
      type: 'state',
      payload: this.getPublicState(gameState)
    }));
    
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleJoin(request) {
    try {
      const { playerId } = await request.json();
      
      if (!playerId) {
        return this.jsonResponse({ error: 'Missing playerId' }, 400);
      }
      
      const gameState = await this.state.storage.get('gameState');
      
      if (gameState.status !== 'pending') {
        return this.jsonResponse({ error: 'Game already started' }, 400);
      }
      
      if (gameState.players[playerId]) {
        return this.jsonResponse({ error: 'Player already joined' }, 400);
      }
      
      // Add player
      gameState.players[playerId] = {
        id: playerId,
        joinedAt: Date.now(),
        ready: false
      };
      
      // Initialize reputation snapshot
      gameState.reputationSnapshot[playerId] = {
        rolls: 0,
        fairnessIncidents: 0,
        commitmentViolations: 0,
        tier: 'new'
      };
      
      // Create event
      const event = {
        type: 'player_joined',
        playerId,
        timestamp: Date.now()
      };
      
      // Add to hash chain
      const eventHash = await this.addToHashChain(gameState, event);
      event.eventHash = eventHash;
      gameState.rollEvents.push(event);
      
      await this.state.storage.put('gameState', gameState);
      
      // Broadcast to WebSocket clients
      this.broadcast({
        type: 'player_joined',
        payload: { playerId, eventHash }
      });
      
      this.logMetric('player_join', { playerId, roomId: gameState.id });
      
      return this.jsonResponse({ success: true, state: this.getPublicState(gameState) });
    } catch (error) {
      return this.jsonResponse({ error: error.message }, 500);
    }
  }

  async handleCommit(request) {
    try {
      const { playerId, commitmentHash } = await request.json();
      
      if (!playerId || !commitmentHash) {
        return this.jsonResponse({ error: 'Missing required fields' }, 400);
      }
      
      const gameState = await this.state.storage.get('gameState');
      
      if (!gameState.players[playerId]) {
        return this.jsonResponse({ error: 'Player not in game' }, 400);
      }
      
      if (gameState.status === 'completed' || gameState.status === 'disputed') {
        return this.jsonResponse({ error: 'Game ended' }, 400);
      }
      
      // Store commitment
      gameState.commitments[playerId] = {
        hash: commitmentHash,
        timestamp: Date.now(),
        turnNumber: gameState.turnIndex,
        revealed: false
      };
      
      // Create event
      const event = {
        type: 'commitment_made',
        playerId,
        commitmentHash,
        turnNumber: gameState.turnIndex,
        timestamp: Date.now()
      };
      
      const eventHash = await this.addToHashChain(gameState, event);
      event.eventHash = eventHash;
      gameState.rollEvents.push(event);
      
      await this.state.storage.put('gameState', gameState);
      
      this.broadcast({
        type: 'commitment_made',
        payload: { playerId, turnNumber: gameState.turnIndex, eventHash }
      });
      
      this.logMetric('commitment_made', { playerId, roomId: gameState.id });
      
      return this.jsonResponse({ success: true, eventHash });
    } catch (error) {
      return this.jsonResponse({ error: error.message }, 500);
    }
  }

  async handleReveal(request) {
    try {
      const { playerId, salt } = await request.json();
      
      if (!playerId || !salt) {
        return this.jsonResponse({ error: 'Missing required fields' }, 400);
      }
      
      const gameState = await this.state.storage.get('gameState');
      const commitment = gameState.commitments[playerId];
      
      if (!commitment) {
        return this.jsonResponse({ error: 'No commitment found' }, 400);
      }
      
      if (commitment.revealed) {
        return this.jsonResponse({ error: 'Already revealed' }, 400);
      }
      
      // Verify commitment
      const isValid = await verifyCommitment(
        commitment.hash,
        salt,
        playerId,
        commitment.turnNumber
      );
      
      commitment.revealed = true;
      commitment.salt = salt;
      commitment.valid = isValid;
      
      if (!isValid) {
        // Flag commitment violation
        gameState.reputationSnapshot[playerId] = updatePlayerStats(
          gameState.reputationSnapshot[playerId],
          { commitmentViolation: 'hash_mismatch' }
        );
        
        this.logMetric('commitment_violation', { playerId, roomId: gameState.id });
      }
      
      // Update reputation tier
      gameState.reputationSnapshot[playerId].tier = calculateReputationTier(
        gameState.reputationSnapshot[playerId],
        parseInt(this.env.SUSPENSION_THRESHOLD || '3')
      );
      
      // Create event
      const event = {
        type: 'commitment_revealed',
        playerId,
        valid: isValid,
        turnNumber: commitment.turnNumber,
        timestamp: Date.now()
      };
      
      const eventHash = await this.addToHashChain(gameState, event);
      event.eventHash = eventHash;
      gameState.rollEvents.push(event);
      
      await this.state.storage.put('gameState', gameState);
      
      this.broadcast({
        type: 'commitment_revealed',
        payload: { playerId, valid: isValid, eventHash }
      });
      
      return this.jsonResponse({ success: true, valid: isValid, eventHash });
    } catch (error) {
      return this.jsonResponse({ error: error.message }, 500);
    }
  }

  async handleRoll(request) {
    try {
      const { playerId } = await request.json();
      
      if (!playerId) {
        return this.jsonResponse({ error: 'Missing playerId' }, 400);
      }
      
      const gameState = await this.state.storage.get('gameState');
      
      if (!gameState.players[playerId]) {
        return this.jsonResponse({ error: 'Player not in game' }, 400);
      }
      
      // Perform crypto-secure roll
      const rollResult = rollDice();
      
      // Update distribution
      gameState.distribution = updateDistribution(gameState.distribution, rollResult);
      gameState.totalRolls += 1;
      
      // Update player stats
      gameState.reputationSnapshot[playerId] = updatePlayerStats(
        gameState.reputationSnapshot[playerId],
        { roll: true }
      );
      
      // Analyze fairness
      const fairnessAnalysis = analyzeFairness(
        gameState.distribution,
        gameState.totalRolls,
        parseInt(this.env.MIN_FAIRNESS_SAMPLE_SIZE || '30'),
        parseFloat(this.env.FAIRNESS_ALPHA || '0.05')
      );
      
      gameState.fairnessStatus = fairnessAnalysis.status;
      gameState.fairnessDetails = fairnessAnalysis;
      
      // Update reputation tier
      gameState.reputationSnapshot[playerId].tier = calculateReputationTier(
        gameState.reputationSnapshot[playerId],
        parseInt(this.env.SUSPENSION_THRESHOLD || '3')
      );
      
      // Activate game if pending
      if (gameState.status === 'pending') {
        gameState.status = 'active';
      }
      
      // Create event
      const event = {
        type: 'roll',
        playerId,
        rollResult,
        turnNumber: gameState.turnIndex,
        fairnessStatus: gameState.fairnessStatus,
        timestamp: Date.now()
      };
      
      const eventHash = await this.addToHashChain(gameState, event);
      event.eventHash = eventHash;
      gameState.rollEvents.push(event);
      
      // Increment turn
      gameState.turnIndex += 1;
      
      await this.state.storage.put('gameState', gameState);
      
      this.broadcast({
        type: 'roll',
        payload: {
          playerId,
          rollResult,
          fairnessStatus: gameState.fairnessStatus,
          eventHash
        }
      });
      
      this.logMetric('roll', {
        playerId,
        roomId: gameState.id,
        result: rollResult,
        fairness: gameState.fairnessStatus
      });
      
      return this.jsonResponse({
        success: true,
        rollResult,
        fairnessStatus: gameState.fairnessStatus,
        eventHash
      });
    } catch (error) {
      return this.jsonResponse({ error: error.message }, 500);
    }
  }

  async handleGetState(request) {
    try {
      const gameState = await this.state.storage.get('gameState');
      return this.jsonResponse(this.getPublicState(gameState));
    } catch (error) {
      return this.jsonResponse({ error: error.message }, 500);
    }
  }

  async handleFinalize(request) {
    try {
      const gameState = await this.state.storage.get('gameState');
      
      if (gameState.status === 'completed' || gameState.status === 'disputed') {
        return this.jsonResponse({ error: 'Game already ended' }, 400);
      }
      
      gameState.status = 'completed';
      gameState.completedAt = Date.now();
      
      // Create event
      const event = {
        type: 'game_finalized',
        timestamp: Date.now()
      };
      
      const eventHash = await this.addToHashChain(gameState, event);
      event.eventHash = eventHash;
      gameState.rollEvents.push(event);
      
      await this.state.storage.put('gameState', gameState);
      
      this.broadcast({
        type: 'game_finalized',
        payload: { eventHash }
      });
      
      this.logMetric('game_finalized', { roomId: gameState.id });
      
      return this.jsonResponse({ success: true, eventHash });
    } catch (error) {
      return this.jsonResponse({ error: error.message }, 500);
    }
  }

  async handleDispute(request) {
    try {
      const { playerId, reason } = await request.json();
      
      if (!playerId || !reason) {
        return this.jsonResponse({ error: 'Missing required fields' }, 400);
      }
      
      const gameState = await this.state.storage.get('gameState');
      
      gameState.status = 'disputed';
      gameState.disputedAt = Date.now();
      gameState.disputeReason = reason;
      gameState.disputedBy = playerId;
      
      // Create event
      const event = {
        type: 'game_disputed',
        playerId,
        reason,
        timestamp: Date.now()
      };
      
      const eventHash = await this.addToHashChain(gameState, event);
      event.eventHash = eventHash;
      gameState.rollEvents.push(event);
      
      await this.state.storage.put('gameState', gameState);
      
      this.broadcast({
        type: 'game_disputed',
        payload: { playerId, reason, eventHash }
      });
      
      this.logMetric('game_disputed', { playerId, roomId: gameState.id, reason });
      
      return this.jsonResponse({ success: true, eventHash });
    } catch (error) {
      return this.jsonResponse({ error: error.message }, 500);
    }
  }

  async addToHashChain(gameState, eventPayload) {
    const prevHash = gameState.lastEventHash || gameState.hashChain.genesis || '0'.repeat(64);
    const eventHash = await generateEventHash(prevHash, eventPayload);
    
    if (!gameState.hashChain.genesis) {
      gameState.hashChain.genesis = eventHash;
    }
    
    gameState.hashChain.latest = eventHash;
    gameState.lastEventHash = eventHash;
    
    return eventHash;
  }

  getPublicState(gameState) {
    return {
      id: gameState.id,
      status: gameState.status,
      players: Object.values(gameState.players).map(p => ({
        id: p.id,
        joinedAt: p.joinedAt,
        reputation: gameState.reputationSnapshot[p.id]?.tier || 'new'
      })),
      turnIndex: gameState.turnIndex,
      totalRolls: gameState.totalRolls,
      fairnessStatus: gameState.fairnessStatus,
      fairnessDetails: gameState.fairnessDetails,
      distribution: gameState.distribution,
      recentEvents: gameState.rollEvents.slice(-10),
      hashChain: {
        genesis: gameState.hashChain.genesis,
        latest: gameState.hashChain.latest
      }
    };
  }

  broadcast(message) {
    const messageStr = JSON.stringify(message);
    this.state.getWebSockets().forEach(ws => {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error('WebSocket send error:', error);
      }
    });
  }

  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  logMetric(eventType, data) {
    console.log(JSON.stringify({
      prefix: '[METRIC]',
      eventType,
      timestamp: Date.now(),
      ...data
    }));
  }
}
