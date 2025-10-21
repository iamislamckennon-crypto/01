/**
 * Configuration for Physical Dice Detection Pipeline
 * Phase 1: Independent Detection System
 */

module.exports = {
  // Frame Stabilization
  STABLE_WINDOW: 3, // Number of consecutive frames that must be stable
  STABILIZATION_MAX: 5000, // Max ms to wait for stabilization
  MOTION_THRESHOLD: 0.02, // Residual pixel diff ratio threshold for stability
  
  // Detection Windows
  DETECTION_WINDOW: 10000, // Max ms from reveal to evidence submission
  
  // Camera Move Detection
  CAMERA_MOVE_THRESHOLD: 0.15, // Pixel diff ratio threshold between F0 and F1
  
  // Multi-dice Support
  ALLOW_MULTI_DICE: false, // Phase 1: single die only
  
  // Consensus Requirements
  CONSENSUS_FRAMES: 3, // Number of frames to capture for consensus
  CONSENSUS_MIN_MATCH: 2, // Minimum matching frames for verification
  
  // Reroll Limits
  MAX_REROLLS: 3, // Maximum rerolls allowed per turn
  
  // Evidence Package
  ALGORITHM_VERSION: '1.0.0-phase1', // Detection algorithm version
  
  // Violation Thresholds
  VIOLATION_TIERS: {
    LOW: 1,
    MEDIUM: 3,
    HIGH: 5
  },
  
  // Detection Status
  STATUS: {
    VERIFIED: 'verified',
    UNCERTAIN: 'uncertain',
    FLAGGED: 'flagged'
  },
  
  // Hash Chain Event Types
  EVENT_TYPES: {
    ROLL_COMMIT: 'ROLL_COMMIT',
    ROLL_REVEAL: 'ROLL_REVEAL',
    ROLL_EVIDENCE: 'ROLL_EVIDENCE',
    OPPONENT_CONFIRM: 'OPPONENT_CONFIRM',
    REROLL_REQUEST: 'REROLL_REQUEST'
  }
};
