/**
 * Reputation tier logic for players
 */

/**
 * Calculate reputation tier for a player
 * @param {object} playerStats - Player statistics
 * @param {number} playerStats.rolls - Total rolls
 * @param {number} playerStats.fairnessIncidents - Fairness violations
 * @param {number} playerStats.commitmentViolations - Commitment mismatches
 * @param {number} suspensionThreshold - Violations threshold for suspension
 * @returns {string} Reputation tier: 'new' | 'trusted' | 'flagged' | 'suspended'
 */
export function calculateReputationTier(playerStats, suspensionThreshold = 3) {
  const { rolls = 0, fairnessIncidents = 0, commitmentViolations = 0 } = playerStats;
  const totalViolations = fairnessIncidents + commitmentViolations;
  
  // Suspended: exceeds violation threshold
  if (totalViolations >= suspensionThreshold) {
    return 'suspended';
  }
  
  // Flagged: has any violations
  if (totalViolations > 0) {
    return 'flagged';
  }
  
  // New: less than 10 rolls
  if (rolls < 10) {
    return 'new';
  }
  
  // Trusted: sufficient rolls and no violations
  return 'trusted';
}

/**
 * Create initial player record
 * @param {string} playerId - Player identifier
 * @returns {object} Player record
 */
export function createPlayerRecord(playerId) {
  return {
    playerId,
    createdAt: Date.now(),
    rolls: 0,
    fairnessIncidents: 0,
    commitmentViolations: 0,
    flags: []
  };
}

/**
 * Update player statistics after a roll
 * @param {object} playerRecord - Current player record
 * @param {object} updates - Updates to apply
 * @returns {object} Updated player record
 */
export function updatePlayerStats(playerRecord, updates = {}) {
  const updated = { ...playerRecord };
  
  if (updates.roll) {
    updated.rolls = (updated.rolls || 0) + 1;
  }
  
  if (updates.fairnessViolation) {
    updated.fairnessIncidents = (updated.fairnessIncidents || 0) + 1;
    updated.flags = [...(updated.flags || []), {
      type: 'fairness',
      timestamp: Date.now(),
      reason: updates.fairnessViolation
    }];
  }
  
  if (updates.commitmentViolation) {
    updated.commitmentViolations = (updated.commitmentViolations || 0) + 1;
    updated.flags = [...(updated.flags || []), {
      type: 'commitment',
      timestamp: Date.now(),
      reason: updates.commitmentViolation
    }];
  }
  
  return updated;
}

/**
 * Get tier metadata
 * @param {string} tier - Reputation tier
 * @returns {object} Tier metadata
 */
export function getTierMetadata(tier) {
  const metadata = {
    new: {
      displayName: 'New Player',
      color: '#808080',
      description: 'Less than 10 rolls completed'
    },
    trusted: {
      displayName: 'Trusted',
      color: '#00aa00',
      description: 'Verified player with clean record'
    },
    flagged: {
      displayName: 'Flagged',
      color: '#ff8800',
      description: 'Player with violations on record'
    },
    suspended: {
      displayName: 'Suspended',
      color: '#ff0000',
      description: 'Player suspended due to multiple violations'
    }
  };
  
  return metadata[tier] || metadata.new;
}
