/**
 * Deterministic reputation tier system
 * Tiers: NEW, TRUSTED, FLAGGED, SUSPENDED
 */

const TRUSTED_THRESHOLD = 10; // Rolls needed to become TRUSTED
const FLAGGED_VIOLATIONS = 2;  // Violations to become FLAGGED
const SUSPEND_VIOLATIONS = 5;  // Violations for SUSPENSION

export const TIER = {
  NEW: 'NEW',
  TRUSTED: 'TRUSTED',
  FLAGGED: 'FLAGGED',
  SUSPENDED: 'SUSPENDED'
};

/**
 * Compute reputation tier based on activity and violations
 * @param {number} rollCount - Number of successful rolls
 * @param {number} violations - Number of violations
 * @returns {string} Tier name
 */
export function computeTier(rollCount, violations) {
  // Suspension takes precedence
  if (violations >= SUSPEND_VIOLATIONS) {
    return TIER.SUSPENDED;
  }
  
  // Flagged status
  if (violations >= FLAGGED_VIOLATIONS) {
    return TIER.FLAGGED;
  }
  
  // Trusted after sufficient clean rolls
  if (rollCount >= TRUSTED_THRESHOLD && violations === 0) {
    return TIER.TRUSTED;
  }
  
  // Default new player
  return TIER.NEW;
}

/**
 * Check if player is allowed to perform actions
 * @param {string} tier - Current tier
 * @returns {boolean} True if allowed to play
 */
export function canPlay(tier) {
  return tier !== TIER.SUSPENDED;
}

/**
 * Initialize player reputation state
 * @returns {{ rollCount: number, violations: number, tier: string }}
 */
export function initializeReputation() {
  return {
    rollCount: 0,
    violations: 0,
    tier: TIER.NEW
  };
}

/**
 * Record successful roll
 * @param {object} reputation - Current reputation state
 * @returns {object} Updated reputation
 */
export function recordSuccessfulRoll(reputation) {
  const rollCount = reputation.rollCount + 1;
  const violations = reputation.violations;
  return {
    rollCount,
    violations,
    tier: computeTier(rollCount, violations)
  };
}

/**
 * Record violation
 * @param {object} reputation - Current reputation state
 * @returns {object} Updated reputation
 */
export function recordViolation(reputation) {
  const rollCount = reputation.rollCount;
  const violations = reputation.violations + 1;
  return {
    rollCount,
    violations,
    tier: computeTier(rollCount, violations)
  };
}
