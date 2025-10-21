/**
 * Fairness engine using chi-square test for dice roll distribution
 */

/**
 * Calculate chi-square statistic for dice roll distribution
 * @param {object} distribution - Distribution counts {1: count, 2: count, ...}
 * @param {number} totalRolls - Total number of rolls
 * @returns {number} Chi-square statistic
 */
export function calculateChiSquare(distribution, totalRolls) {
  if (totalRolls === 0) return 0;
  
  const expected = totalRolls / 6; // Uniform expectation for fair 6-sided die
  let chiSquare = 0;
  
  for (let i = 1; i <= 6; i++) {
    const observed = distribution[i] || 0;
    const diff = observed - expected;
    chiSquare += (diff * diff) / expected;
  }
  
  return chiSquare;
}

/**
 * Get p-value for chi-square statistic (5 degrees of freedom for 6-sided die)
 * Using approximation for chi-square critical values
 * @param {number} chiSquare - Chi-square statistic
 * @returns {number} Approximate p-value
 */
export function getChiSquarePValue(chiSquare) {
  // Critical values for chi-square with 5 degrees of freedom
  // These are standard values from chi-square distribution table
  const criticalValues = [
    { pValue: 0.95, critical: 1.145 },
    { pValue: 0.90, critical: 1.610 },
    { pValue: 0.50, critical: 4.351 },
    { pValue: 0.10, critical: 9.236 },
    { pValue: 0.05, critical: 11.070 },
    { pValue: 0.01, critical: 15.086 },
    { pValue: 0.001, critical: 20.515 }
  ];
  
  // Find approximate p-value
  for (const { pValue, critical } of criticalValues) {
    if (chiSquare < critical) {
      return pValue;
    }
  }
  
  return 0.0001; // Very small p-value for extreme chi-square values
}

/**
 * Determine fairness status based on chi-square test
 * @param {object} distribution - Distribution counts
 * @param {number} totalRolls - Total number of rolls
 * @param {number} minSampleSize - Minimum sample size for test
 * @param {number} alpha - Significance level (default 0.05)
 * @returns {object} Fairness status and details
 */
export function analyzeFairness(distribution, totalRolls, minSampleSize = 30, alpha = 0.05) {
  if (totalRolls < minSampleSize) {
    return {
      status: 'normal',
      reason: 'insufficient_samples',
      chiSquare: 0,
      pValue: 1.0,
      totalRolls,
      minSampleSize
    };
  }
  
  const chiSquare = calculateChiSquare(distribution, totalRolls);
  const pValue = getChiSquarePValue(chiSquare);
  
  let status = 'normal';
  let reason = 'distribution_normal';
  
  // Determine status based on p-value thresholds
  if (pValue < alpha) {
    status = 'suspect';
    reason = 'distribution_significantly_abnormal';
  } else if (pValue < alpha * 2) {
    status = 'observe';
    reason = 'distribution_approaching_threshold';
  }
  
  return {
    status,
    reason,
    chiSquare: Math.round(chiSquare * 1000) / 1000,
    pValue: Math.round(pValue * 1000) / 1000,
    totalRolls,
    distribution: { ...distribution }
  };
}

/**
 * Update distribution with new roll
 * @param {object} distribution - Current distribution
 * @param {number} roll - New roll value (1-6)
 * @returns {object} Updated distribution
 */
export function updateDistribution(distribution, roll) {
  const updated = { ...distribution };
  updated[roll] = (updated[roll] || 0) + 1;
  return updated;
}
