/**
 * Validation utility functions
 */

/**
 * Validate player data
 * @param {Object} data - Player data to validate
 * @returns {Object} Validation result
 */
function validatePlayerData(data) {
  const errors = [];

  if (!data.username) {
    errors.push('Username is required');
  } else if (data.username.length < 3 || data.username.length > 30) {
    errors.push('Username must be between 3 and 30 characters');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  if (!data.displayName) {
    errors.push('Display name is required');
  } else if (data.displayName.length > 50) {
    errors.push('Display name must not exceed 50 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate game creation data
 * @param {Object} data - Game data to validate
 * @returns {Object} Validation result
 */
function validateGameData(data) {
  const errors = [];

  if (!data.hostPlayer) {
    errors.push('Host player ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate roll data
 * @param {Object} data - Roll data to validate
 * @returns {Object} Validation result
 */
function validateRollData(data) {
  const errors = [];

  if (!data.player) {
    errors.push('Player ID is required');
  }

  if (!data.values || !Array.isArray(data.values)) {
    errors.push('Roll values must be an array');
  } else if (data.values.length === 0) {
    errors.push('At least one dice value is required');
  } else if (!data.values.every(v => Number.isInteger(v) && v >= 1 && v <= 6)) {
    errors.push('All roll values must be integers between 1 and 6');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId format
 */
function isValidObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sanitize user input to prevent injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Validate pagination parameters
 * @param {Object} params - Pagination params (page, limit)
 * @returns {Object} Validated pagination params
 */
function validatePagination(params = {}) {
  let { page = 1, limit = 10 } = params;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  // Ensure valid ranges
  page = Math.max(1, page);
  limit = Math.max(1, Math.min(100, limit)); // Max 100 items per page

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

module.exports = {
  validatePlayerData,
  validateGameData,
  validateRollData,
  isValidObjectId,
  sanitizeInput,
  validatePagination
};
