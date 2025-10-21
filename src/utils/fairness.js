/**
 * Fairness monitoring using simple deviation ratio
 * No ML or chi-square - just basic statistical deviation
 */

const EXPECTED_PROBABILITY = 1 / 6;
const DEVIATION_OBSERVE_THRESHOLD = 0.6;
const DEVIATION_SUSPECT_THRESHOLD = 0.9;

/**
 * Calculate fairness metrics from roll counts
 * @param {number[]} counts - Array of 6 integers [count1, count2, ..., count6]
 * @param {number} minSample - Minimum rolls before analysis
 * @returns {{ deviation: number, status: string }} - Fairness assessment
 */
export function updateFairness(counts, minSample = 10) {
  const total = counts.reduce((sum, c) => sum + c, 0);
  
  if (total < minSample) {
    return {
      deviation: 0,
      status: 'insufficient_data'
    };
  }

  // Calculate deviation as max distance from expected proportion
  const expected = total * EXPECTED_PROBABILITY;
  let maxDeviation = 0;
  
  for (const count of counts) {
    const deviation = Math.abs(count - expected) / expected;
    maxDeviation = Math.max(maxDeviation, deviation);
  }

  // Determine status based on thresholds
  let status = 'normal';
  if (maxDeviation >= DEVIATION_SUSPECT_THRESHOLD) {
    status = 'suspect';
  } else if (maxDeviation >= DEVIATION_OBSERVE_THRESHOLD) {
    status = 'observe';
  }

  return {
    deviation: maxDeviation,
    status
  };
}

/**
 * Initialize empty fairness counts
 * @returns {number[]} Array of 6 zeros
 */
export function initializeFairnessCounts() {
  return [0, 0, 0, 0, 0, 0];
}

/**
 * Update counts with new roll value
 * @param {number[]} counts - Current counts
 * @param {number} value - Dice value (1-6)
 * @returns {number[]} Updated counts
 */
export function recordRoll(counts, value) {
  if (value < 1 || value > 6) {
    throw new Error('Invalid dice value: must be 1-6');
  }
  const newCounts = [...counts];
  newCounts[value - 1]++;
  return newCounts;
}
