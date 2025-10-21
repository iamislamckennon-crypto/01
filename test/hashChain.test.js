/**
 * Unit Tests for Hash Chain
 */

const HashChain = require('../server/hashChain');
const config = require('../server/config');

describe('HashChain', () => {
  let chain;
  
  beforeEach(() => {
    chain = new HashChain();
  });
  
  describe('initialization', () => {
    test('should start with genesis hash', () => {
      expect(chain.getTip()).toBe('0000000000000000');
      expect(chain.getAllEvents()).toHaveLength(0);
    });
  });
  
  describe('addCommit', () => {
    test('should add commit event', () => {
      const event = chain.addCommit(1, 'commitment123');
      
      expect(event.type).toBe(config.EVENT_TYPES.ROLL_COMMIT);
      expect(event.data.turnNumber).toBe(1);
      expect(event.data.commitment).toBe('commitment123');
      expect(event.previousHash).toBe('0000000000000000');
      expect(event.hash).toBeDefined();
      expect(chain.getTip()).toBe(event.hash);
    });
  });
  
  describe('addReveal', () => {
    test('should add reveal event after commit', () => {
      chain.addCommit(1, 'commitment123');
      const prevTip = chain.getTip();
      
      const event = chain.addReveal(1, 4, 'nonce456');
      
      expect(event.type).toBe(config.EVENT_TYPES.ROLL_REVEAL);
      expect(event.data.turnNumber).toBe(1);
      expect(event.data.revealedValue).toBe(4);
      expect(event.data.nonce).toBe('nonce456');
      expect(event.previousHash).toBe(prevTip);
    });
  });
  
  describe('addEvidence', () => {
    test('should add evidence event', () => {
      chain.addCommit(1, 'commitment123');
      chain.addReveal(1, 4, 'nonce456');
      const prevTip = chain.getTip();
      
      const event = chain.addEvidence(1, 'evidenceHash789', config.STATUS.VERIFIED, 4);
      
      expect(event.type).toBe(config.EVENT_TYPES.ROLL_EVIDENCE);
      expect(event.data.turnNumber).toBe(1);
      expect(event.data.evidenceHash).toBe('evidenceHash789');
      expect(event.data.status).toBe(config.STATUS.VERIFIED);
      expect(event.data.detectedValue).toBe(4);
      expect(event.previousHash).toBe(prevTip);
    });
  });
  
  describe('addOpponentConfirm', () => {
    test('should add opponent confirmation event', () => {
      const event = chain.addOpponentConfirm(1, true, 'player2');
      
      expect(event.type).toBe(config.EVENT_TYPES.OPPONENT_CONFIRM);
      expect(event.data.agree).toBe(true);
      expect(event.data.confirmedBy).toBe('player2');
    });
  });
  
  describe('addRerollRequest', () => {
    test('should add reroll request event', () => {
      const event = chain.addRerollRequest(1, 'player1', 1);
      
      expect(event.type).toBe(config.EVENT_TYPES.REROLL_REQUEST);
      expect(event.data.requestedBy).toBe('player1');
      expect(event.data.rerollCount).toBe(1);
    });
  });
  
  describe('verify', () => {
    test('should verify valid chain', () => {
      chain.addCommit(1, 'commitment1');
      chain.addReveal(1, 4, 'nonce1');
      chain.addEvidence(1, 'evidence1', config.STATUS.VERIFIED, 4);
      chain.addCommit(2, 'commitment2');
      chain.addReveal(2, 5, 'nonce2');
      chain.addEvidence(2, 'evidence2', config.STATUS.VERIFIED, 5);
      
      const result = chain.verify();
      
      expect(result.valid).toBe(true);
      expect(result.eventCount).toBe(6);
      expect(result.tip).toBe(chain.getTip());
    });
    
    test('should detect tampered event', () => {
      chain.addCommit(1, 'commitment1');
      chain.addReveal(1, 4, 'nonce1');
      
      // Tamper with first event
      chain.events[0].data.commitment = 'tampered';
      
      const result = chain.verify();
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('hash mismatch');
    });
    
    test('should detect broken chain', () => {
      chain.addCommit(1, 'commitment1');
      chain.addReveal(1, 4, 'nonce1');
      
      // Break the chain
      chain.events[1].previousHash = 'wronghash';
      
      const result = chain.verify();
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('previous hash mismatch');
    });
  });
  
  describe('getEventsByTurn', () => {
    test('should retrieve events for specific turn', () => {
      chain.addCommit(1, 'commitment1');
      chain.addReveal(1, 4, 'nonce1');
      chain.addEvidence(1, 'evidence1', config.STATUS.VERIFIED, 4);
      chain.addCommit(2, 'commitment2');
      chain.addReveal(2, 5, 'nonce2');
      
      const turn1Events = chain.getEventsByTurn(1);
      
      expect(turn1Events).toHaveLength(3);
      expect(turn1Events[0].type).toBe(config.EVENT_TYPES.ROLL_COMMIT);
      expect(turn1Events[1].type).toBe(config.EVENT_TYPES.ROLL_REVEAL);
      expect(turn1Events[2].type).toBe(config.EVENT_TYPES.ROLL_EVIDENCE);
    });
  });
  
  describe('export and import', () => {
    test('should export and import chain correctly', () => {
      chain.addCommit(1, 'commitment1');
      chain.addReveal(1, 4, 'nonce1');
      chain.addEvidence(1, 'evidence1', config.STATUS.VERIFIED, 4);
      
      const exported = chain.export();
      
      const newChain = new HashChain();
      const importResult = newChain.import(exported);
      
      expect(importResult.valid).toBe(true);
      expect(newChain.getTip()).toBe(chain.getTip());
      expect(newChain.getAllEvents()).toHaveLength(3);
    });
  });
  
  describe('complete turn flow', () => {
    test('should handle complete turn with evidence', () => {
      // Turn 1: Commit -> Reveal -> Evidence (verified)
      const commit1 = chain.addCommit(1, 'commitment1');
      const reveal1 = chain.addReveal(1, 4, 'nonce1');
      const evidence1 = chain.addEvidence(1, 'evidence1', config.STATUS.VERIFIED, 4);
      
      expect(evidence1.previousHash).toBe(reveal1.hash);
      expect(reveal1.previousHash).toBe(commit1.hash);
      
      const verification = chain.verify();
      expect(verification.valid).toBe(true);
      expect(verification.eventCount).toBe(3);
    });
    
    test('should handle turn with uncertain evidence and confirmation', () => {
      chain.addCommit(1, 'commitment1');
      chain.addReveal(1, 4, 'nonce1');
      chain.addEvidence(1, 'evidence1', config.STATUS.UNCERTAIN, null);
      chain.addOpponentConfirm(1, true, 'player2');
      
      const verification = chain.verify();
      expect(verification.valid).toBe(true);
      expect(verification.eventCount).toBe(4);
    });
    
    test('should handle turn with disagreement and reroll', () => {
      chain.addCommit(1, 'commitment1');
      chain.addReveal(1, 4, 'nonce1');
      chain.addEvidence(1, 'evidence1', config.STATUS.UNCERTAIN, null);
      chain.addOpponentConfirm(1, false, 'player2');
      chain.addRerollRequest(1, 'player2', 1);
      
      const verification = chain.verify();
      expect(verification.valid).toBe(true);
      expect(verification.eventCount).toBe(5);
    });
  });
});
