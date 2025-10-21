/**
 * Cloudflare Turnstile verification helper
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify Turnstile token with Cloudflare
 * @param {string} token - Turnstile token from client
 * @param {string} secret - Turnstile secret key
 * @param {string} remoteIp - Client IP address (optional)
 * @returns {Promise<object>} Verification result
 */
export async function verifyTurnstileToken(token, secret, remoteIp = null) {
  try {
    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);
    
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }
    
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: 'turnstile_verification_failed',
        errorCodes: ['network_error']
      };
    }
    
    const result = await response.json();
    
    return {
      success: result.success || false,
      challengeTs: result.challenge_ts,
      hostname: result.hostname,
      errorCodes: result['error-codes'] || [],
      error: result.success ? null : 'verification_failed'
    };
  } catch (error) {
    return {
      success: false,
      error: 'turnstile_exception',
      errorCodes: [error.message],
      exception: error.toString()
    };
  }
}

/**
 * Middleware to verify Turnstile token from request
 * @param {Request} request - Request object
 * @param {string} secret - Turnstile secret key
 * @returns {Promise<object>} Verification result with status
 */
export async function verifyTurnstileFromRequest(request, secret) {
  try {
    const body = await request.json();
    const token = body.turnstileToken;
    
    if (!token) {
      return {
        success: false,
        error: 'missing_turnstile_token',
        status: 400
      };
    }
    
    const clientIp = request.headers.get('CF-Connecting-IP');
    const result = await verifyTurnstileToken(token, secret, clientIp);
    
    if (!result.success) {
      return {
        ...result,
        status: 403
      };
    }
    
    return {
      ...result,
      status: 200
    };
  } catch (error) {
    return {
      success: false,
      error: 'invalid_request_format',
      status: 400
    };
  }
}
