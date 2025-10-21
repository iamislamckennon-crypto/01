/**
 * Cloudflare Worker entry point - API router
 */

import { GameRoomDurable } from './gameroom.js';
import { verifyTurnstileFromRequest } from './turnstile.js';
import { isValidPlayerId, isValidOrigin, sanitizeInput } from './validation.js';
import { generateUUID } from './crypto.js';

// Export Durable Object class
export { GameRoomDurable };

// Rate limiting map (in-memory for simple implementation)
const rateLimitMap = new Map();

/**
 * Simple rate limiter
 * @param {string} key - Rate limit key (e.g., IP address)
 * @param {number} limit - Max requests per minute
 * @returns {boolean} True if rate limit exceeded
 */
function isRateLimited(key, limit) {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }
  
  const requests = rateLimitMap.get(key);
  
  // Clean old requests
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  rateLimitMap.set(key, recentRequests);
  
  if (recentRequests.length >= limit) {
    return true;
  }
  
  recentRequests.push(now);
  return false;
}

/**
 * CORS headers helper
 */
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

/**
 * JSON response helper
 */
function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  });
}

/**
 * Main Worker fetch handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');
      const allowedOrigin = env.ORIGIN_ALLOWED || 'http://localhost:8787';
      
      if (origin && isValidOrigin(request, allowedOrigin)) {
        return new Response(null, {
          headers: corsHeaders(origin)
        });
      }
      
      return new Response(null, { status: 403 });
    }
    
    // Check origin for non-OPTIONS requests
    const origin = request.headers.get('Origin');
    const allowedOrigin = env.ORIGIN_ALLOWED || 'http://localhost:8787';
    const headers = origin && isValidOrigin(request, allowedOrigin) ? corsHeaders(origin) : {};
    
    // Route API requests
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApiRequest(request, env, url, headers);
      } catch (error) {
        console.error('API error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, headers);
      }
    }
    
    // Serve static files from public/
    return handleStaticRequest(request, env, url);
  }
};

/**
 * Handle API requests
 */
async function handleApiRequest(request, env, url, headers) {
  const path = url.pathname;
  
  // POST /api/register - Player registration with Turnstile
  if (path === '/api/register' && request.method === 'POST') {
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    // Rate limiting
    if (isRateLimited(`register:${clientIp}`, 10)) {
      return jsonResponse({ error: 'Rate limit exceeded' }, 429, headers);
    }
    
    try {
      const body = await request.json();
      const { playerId, turnstileToken } = body;
      
      if (!playerId || !isValidPlayerId(playerId)) {
        return jsonResponse({ error: 'Invalid playerId' }, 400, headers);
      }
      
      // Verify Turnstile if secret is configured
      if (env.TURNSTILE_SECRET && turnstileToken) {
        const verification = await verifyTurnstileFromRequest(
          new Request(request.url, {
            method: 'POST',
            body: JSON.stringify({ turnstileToken }),
            headers: request.headers
          }),
          env.TURNSTILE_SECRET
        );
        
        if (!verification.success) {
          return jsonResponse({
            error: 'Turnstile verification failed',
            details: verification.error
          }, 403, headers);
        }
      }
      
      // Registration successful
      return jsonResponse({
        success: true,
        playerId: sanitizeInput(playerId),
        registeredAt: Date.now()
      }, 200, headers);
    } catch (error) {
      return jsonResponse({ error: 'Invalid request' }, 400, headers);
    }
  }
  
  // POST /api/gameroom/create - Create new game room
  if (path === '/api/gameroom/create' && request.method === 'POST') {
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    // Rate limiting
    if (isRateLimited(`create:${clientIp}`, 20)) {
      return jsonResponse({ error: 'Rate limit exceeded' }, 429, headers);
    }
    
    const roomId = generateUUID();
    
    // Get Durable Object stub
    const durableObjectId = env.GAMEROOM.idFromName(roomId);
    const stub = env.GAMEROOM.get(durableObjectId);
    
    return jsonResponse({
      success: true,
      roomId,
      createdAt: Date.now()
    }, 200, headers);
  }
  
  // Handle game room specific operations
  const roomMatch = path.match(/^\/api\/gameroom\/([^\/]+)\/(.+)$/);
  if (roomMatch) {
    const [, roomId, action] = roomMatch;
    
    // Get Durable Object stub
    const durableObjectId = env.GAMEROOM.idFromName(roomId);
    const stub = env.GAMEROOM.get(durableObjectId);
    
    // Forward request to Durable Object
    const doUrl = new URL(request.url);
    doUrl.pathname = `/${action}`;
    
    const doRequest = new Request(doUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
    
    const response = await stub.fetch(doRequest);
    
    // Add CORS headers to response
    if (Object.keys(headers).length > 0) {
      const responseHeaders = new Headers(response.headers);
      Object.entries(headers).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    }
    
    return response;
  }
  
  return jsonResponse({ error: 'Not found' }, 404, headers);
}

/**
 * Handle static file requests
 */
async function handleStaticRequest(request, env, url) {
  // Map root to index.html
  let path = url.pathname;
  if (path === '/' || path === '') {
    path = '/index.html';
  }
  
  // Simple static file serving
  // In production, this would be handled by Cloudflare Pages
  const staticFiles = {
    '/index.html': 'text/html',
    '/offline.html': 'text/html',
    '/manifest.json': 'application/json',
    '/service-worker.js': 'application/javascript',
    '/styles.css': 'text/css'
  };
  
  if (staticFiles[path]) {
    return new Response('Static file serving requires Cloudflare Pages integration', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  return new Response('Not found', { status: 404 });
}
