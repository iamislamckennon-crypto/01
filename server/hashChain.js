/**
 * Hash Chain Management
 * Maintains cryptographic chain of game events
 */

const config = require('./config');

class HashChain {
  constructor() {
    this.events = [];
    this.tip = '0000000000000000'; // Genesis hash
  }

  /**
   * Add event to hash chain
   */
  addEvent(eventType, data, timestamp = Date.now()) {
    const event = {
      type: eventType,
      data,
      timestamp,
      previousHash: this.tip,
      eventIndex: this.events.length
    };
    
    // Compute event hash
    event.hash = this.computeEventHash(event);
    
    // Update chain
    this.events.push(event);
    this.tip = event.hash;
    
    return event;
  }

  /**
   * Add ROLL_COMMIT event
   */
  addCommit(turnNumber, commitment) {
    return this.addEvent(config.EVENT_TYPES.ROLL_COMMIT, {
      turnNumber,
      commitment
    });
  }

  /**
   * Add ROLL_REVEAL event
   */
  addReveal(turnNumber, revealedValue, nonce) {
    return this.addEvent(config.EVENT_TYPES.ROLL_REVEAL, {
      turnNumber,
      revealedValue,
      nonce
    });
  }

  /**
   * Add ROLL_EVIDENCE event
   */
  addEvidence(turnNumber, evidenceHash, status, detectedValue) {
    return this.addEvent(config.EVENT_TYPES.ROLL_EVIDENCE, {
      turnNumber,
      evidenceHash,
      status,
      detectedValue
    });
  }

  /**
   * Add OPPONENT_CONFIRM event
   */
  addOpponentConfirm(turnNumber, agree, confirmedBy) {
    return this.addEvent(config.EVENT_TYPES.OPPONENT_CONFIRM, {
      turnNumber,
      agree,
      confirmedBy
    });
  }

  /**
   * Add REROLL_REQUEST event
   */
  addRerollRequest(turnNumber, requestedBy, rerollCount) {
    return this.addEvent(config.EVENT_TYPES.REROLL_REQUEST, {
      turnNumber,
      requestedBy,
      rerollCount
    });
  }

  /**
   * Compute hash for event
   */
  computeEventHash(event) {
    const data = JSON.stringify({
      type: event.type,
      data: event.data,
      timestamp: event.timestamp,
      previousHash: event.previousHash,
      eventIndex: event.eventIndex
    });
    
    // Safety check: limit data length to prevent DoS
    const MAX_DATA_LENGTH = 10000; // 10KB max
    if (data.length > MAX_DATA_LENGTH) {
      throw new Error('Event data too large');
    }
    
    // Simple hash for demo
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    
    return hash.toString(16).padStart(16, '0');
  }

  /**
   * Verify chain integrity
   */
  verify() {
    let currentHash = '0000000000000000';
    
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      
      // Check previous hash matches
      if (event.previousHash !== currentHash) {
        return {
          valid: false,
          reason: `Event ${i} previous hash mismatch`,
          eventIndex: i
        };
      }
      
      // Recompute hash
      const computedHash = this.computeEventHash(event);
      if (computedHash !== event.hash) {
        return {
          valid: false,
          reason: `Event ${i} hash mismatch`,
          eventIndex: i
        };
      }
      
      currentHash = event.hash;
    }
    
    return {
      valid: true,
      eventCount: this.events.length,
      tip: this.tip
    };
  }

  /**
   * Get events for specific turn
   */
  getEventsByTurn(turnNumber) {
    return this.events.filter(e => e.data.turnNumber === turnNumber);
  }

  /**
   * Get current chain tip
   */
  getTip() {
    return this.tip;
  }

  /**
   * Get all events
   */
  getAllEvents() {
    return [...this.events];
  }

  /**
   * Export chain for external verification
   */
  export() {
    return {
      events: this.events,
      tip: this.tip,
      timestamp: Date.now()
    };
  }

  /**
   * Import chain from export
   */
  import(chainData) {
    this.events = chainData.events;
    this.tip = chainData.tip;
    
    // Verify imported chain
    return this.verify();
  }
}

module.exports = HashChain;
