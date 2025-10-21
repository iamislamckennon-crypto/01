/**
 * Main Worker Router
 * Handles REST API endpoints, WebRTC signaling, and routes to Durable Objects
 */

import { GameRoomDO } from './GameRoomDO.js';
import { 
  isValidPlayerId, 
  isValidUUID, 
  isValidHash, 
  isValidDiceValue, 
  isValidChecklist,
  isValidPerspective,
  sanitizeError 
} from './utils/validation.js';

export { GameRoomDO };

// Simple in-memory rate limiting (per-IP)
const rateLimitStore = new Map();

function checkRateLimit(ip, endpoint, limit = 10, windowMs = 60000) {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  const record = rateLimitStore.get(key);
  if (now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function corsHeaders(additionalHeaders = {}) {
  return { ...CORS_HEADERS, ...additionalHeaders };
}

// Verify Turnstile token
async function verifyTurnstile(token, env) {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET,
      response: token
    })
  });
  
  const data = await response.json();
  return data.success;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      // Static asset serving
      if (path === '/' || path.startsWith('/public/') || !path.startsWith('/api/')) {
        return env.ASSETS.fetch(request);
      }

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

      // Registration endpoint with Turnstile
      if (path === '/api/register' && request.method === 'POST') {
        if (!checkRateLimit(clientIp, 'register', 5, 300000)) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: corsHeaders({ 'Content-Type': 'application/json' })
          });
        }

        const { playerId, turnstileToken } = await request.json();
        
        if (!isValidPlayerId(playerId)) {
          return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
            status: 400,
            headers: corsHeaders({ 'Content-Type': 'application/json' })
          });
        }

        // Verify Turnstile (skip if no secret configured)
        if (env.TURNSTILE_SECRET && turnstileToken) {
          const isValid = await verifyTurnstile(turnstileToken, env);
          if (!isValid) {
            return new Response(JSON.stringify({ error: 'Turnstile verification failed' }), {
              status: 400,
              headers: corsHeaders({ 'Content-Type': 'application/json' })
            });
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          playerId,
          message: 'Registration successful' 
        }), {
          headers: corsHeaders({ 'Content-Type': 'application/json' })
        });
      }

      // Create game room
      if (path === '/api/gameroom/create' && request.method === 'POST') {
        if (!checkRateLimit(clientIp, 'create', 10, 60000)) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: corsHeaders({ 'Content-Type': 'application/json' })
          });
        }

        const { playerId } = await request.json();
        
        if (!isValidPlayerId(playerId)) {
          return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
            status: 400,
            headers: corsHeaders({ 'Content-Type': 'application/json' })
          });
        }

        // Generate unique room ID
        const roomId = env.GAME_ROOM_DO.newUniqueId();
        const stub = env.GAME_ROOM_DO.get(roomId);
        
        // Join the room immediately
        const joinRequest = new Request('http://internal/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId })
        });
        
        await stub.fetch(joinRequest);

        return new Response(JSON.stringify({ 
          success: true, 
          roomId: roomId.toString() 
        }), {
          headers: corsHeaders({ 'Content-Type': 'application/json' })
        });
      }

      // Game room actions - route to Durable Object
      const roomMatch = path.match(/^\/api\/gameroom\/([^\/]+)\/(.+)$/);
      if (roomMatch) {
        const [, roomIdStr, action] = roomMatch;
        
        if (!checkRateLimit(clientIp, 'gameplay', 100, 60000)) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: corsHeaders({ 'Content-Type': 'application/json' })
          });
        }

        const roomId = env.GAME_ROOM_DO.idFromString(roomIdStr);
        const stub = env.GAME_ROOM_DO.get(roomId);

        // For WebSocket upgrade
        if (action === 'stream' && request.headers.get('Upgrade') === 'websocket') {
          return stub.fetch(request);
        }

        // Validate request bodies for different actions
        if (request.method === 'POST') {
          const body = await request.json();

          if (action === 'join') {
            if (!isValidPlayerId(body.playerId)) {
              return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
                status: 400,
                headers: corsHeaders({ 'Content-Type': 'application/json' })
              });
            }
          } else if (action === 'checklist') {
            if (!isValidPlayerId(body.playerId) || !isValidChecklist(body.checklist)) {
              return new Response(JSON.stringify({ error: 'Invalid checklist data' }), {
                status: 400,
                headers: corsHeaders({ 'Content-Type': 'application/json' })
              });
            }
          } else if (action === 'pre-roll-frame') {
            if (!isValidPlayerId(body.playerId) || !isValidHash(body.frameHash)) {
              return new Response(JSON.stringify({ error: 'Invalid frame hash' }), {
                status: 400,
                headers: corsHeaders({ 'Content-Type': 'application/json' })
              });
            }
          } else if (action === 'commit') {
            if (!isValidPlayerId(body.playerId) || !isValidHash(body.commitmentHash)) {
              return new Response(JSON.stringify({ error: 'Invalid commitment' }), {
                status: 400,
                headers: corsHeaders({ 'Content-Type': 'application/json' })
              });
            }
          } else if (action === 'reveal') {
            if (!isValidPlayerId(body.playerId) || !isValidUUID(body.salt)) {
              return new Response(JSON.stringify({ error: 'Invalid reveal data' }), {
                status: 400,
                headers: corsHeaders({ 'Content-Type': 'application/json' })
              });
            }
          } else if (action === 'declare-roll') {
            if (!isValidPlayerId(body.playerId) || 
                !isValidDiceValue(body.value) || 
                !isValidHash(body.postFrameHash)) {
              return new Response(JSON.stringify({ error: 'Invalid roll declaration' }), {
                status: 400,
                headers: corsHeaders({ 'Content-Type': 'application/json' })
              });
            }
          } else if (action === 'update-perspective') {
            if (!isValidPlayerId(body.playerId) || !isValidPerspective(body.perspective)) {
              return new Response(JSON.stringify({ error: 'Invalid perspective' }), {
                status: 400,
                headers: corsHeaders({ 'Content-Type': 'application/json' })
              });
            }
          }

          // Forward to Durable Object
          const doRequest = new Request(`http://internal/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          
          const response = await stub.fetch(doRequest);
          const responseData = await response.text();
          
          return new Response(responseData, {
            status: response.status,
            headers: corsHeaders({ 'Content-Type': 'application/json' })
          });
        } else if (request.method === 'GET' && action === 'state') {
          const doRequest = new Request('http://internal/state', { method: 'GET' });
          const response = await stub.fetch(doRequest);
          const responseData = await response.text();
          
          return new Response(responseData, {
            status: response.status,
            headers: corsHeaders({ 'Content-Type': 'application/json' })
          });
        }
      }

      // WebRTC signaling endpoints
      if (path === '/api/webrtc/offer' && request.method === 'POST') {
        const { roomId, playerId, offer } = await request.json();
        
        if (!isValidPlayerId(playerId)) {
          return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
            status: 400,
            headers: corsHeaders({ 'Content-Type': 'application/json' })
          });
        }

        // Store offer in KV or Durable Object storage
        // For simplicity, using a simple in-memory approach (TODO: use KV for production)
        const key = `webrtc:${roomId}:${playerId}:offer`;
        await env.GAME_ROOM_DO.get(env.GAME_ROOM_DO.idFromString(roomId))
          .fetch(new Request('http://internal/state')); // Just to ensure DO is initialized

        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders({ 'Content-Type': 'application/json' })
        });
      }

      if (path === '/api/webrtc/answer' && request.method === 'POST') {
        const { roomId, playerId, answer } = await request.json();
        
        if (!isValidPlayerId(playerId)) {
          return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
            status: 400,
            headers: corsHeaders({ 'Content-Type': 'application/json' })
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders({ 'Content-Type': 'application/json' })
        });
      }

      if (path === '/api/webrtc/ice' && request.method === 'POST') {
        const { roomId, playerId, candidate } = await request.json();
        
        if (!isValidPlayerId(playerId)) {
          return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
            status: 400,
            headers: corsHeaders({ 'Content-Type': 'application/json' })
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders({ 'Content-Type': 'application/json' })
        });
      }

      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders()
      });

    } catch (error) {
      console.error('Worker error:', error);
      // Don't expose error details to client in production
      return new Response(JSON.stringify({ 
        error: 'Internal server error'
      }), {
        status: 500,
        headers: corsHeaders({ 'Content-Type': 'application/json' })
      });
    }
  }
};
