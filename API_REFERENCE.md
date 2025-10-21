# API Reference

Base URL: `/api`

## Authentication
No authentication tokens. Player identity established via `playerId` in request bodies.

## Rate Limits
- Registration: 5 requests per 5 minutes per IP
- Room creation: 10 requests per 1 minute per IP
- Gameplay: 100 requests per 1 minute per IP

## Response Format
All responses are JSON with CORS headers enabled.

Success:
```json
{
  "success": true,
  "data": { ... }
}
```

Error:
```json
{
  "error": "Error message",
  "violation": true  // Optional: indicates reputation violation
}
```

---

## Endpoints

### POST /api/register
Register a player (with Turnstile verification).

**Request:**
```json
{
  "playerId": "player123",
  "turnstileToken": "optional-turnstile-token"
}
```

**Validation:**
- `playerId`: 3-50 characters, alphanumeric + underscore/dash
- `turnstileToken`: Optional if `TURNSTILE_SECRET` not configured

**Response:**
```json
{
  "success": true,
  "playerId": "player123",
  "message": "Registration successful"
}
```

**Errors:**
- 400: Invalid player ID
- 400: Turnstile verification failed
- 429: Rate limit exceeded

---

### POST /api/gameroom/create
Create a new game room and join as first player.

**Request:**
```json
{
  "playerId": "player123"
}
```

**Response:**
```json
{
  "success": true,
  "roomId": "0000000000000001:00000000000000000000000000000000"
}
```

**Errors:**
- 400: Invalid player ID
- 429: Rate limit exceeded

---

### POST /api/gameroom/:roomId/join
Join an existing game room.

**Request:**
```json
{
  "playerId": "player456"
}
```

**Response:**
```json
{
  "success": true,
  "state": { /* Game state object */ }
}
```

**Errors:**
- 400: Room is full
- 400: Player already in room
- 400: Invalid player ID

---

### POST /api/gameroom/:roomId/checklist
Submit pre-roll checklist confirmation.

**Request:**
```json
{
  "playerId": "player123",
  "checklist": {
    "flatSurface": true,
    "standardDice": true,
    "adequateLighting": true,
    "cameraFixed": true
  }
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- 400: Invalid checklist data
- 404: Player not found

---

### POST /api/gameroom/:roomId/pre-roll-frame
Submit pre-roll camera frame hash.

**Request:**
```json
{
  "playerId": "player123",
  "frameHash": "a1b2c3d4..." // 64-character SHA-256 hex hash
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- 400: Not your turn
- 400: Invalid frame hash

---

### POST /api/gameroom/:roomId/commit
Submit commitment hash.

**Request:**
```json
{
  "playerId": "player123",
  "commitmentHash": "e5f6g7h8..." // SHA-256(salt:playerId:turnNumber)
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- 400: Not your turn
- 400: Checklist not complete
- 400: Pre-roll frame required
- 400: Invalid commitment hash

---

### POST /api/gameroom/:roomId/reveal
Reveal salt to verify commitment.

**Request:**
```json
{
  "playerId": "player123",
  "salt": "550e8400-e29b-41d4-a716-446655440000" // UUID v4
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- 400: Not your turn
- 400: No commitment found
- 400: Reveal window expired (violation recorded)
- 400: Invalid UUID format

---

### POST /api/gameroom/:roomId/declare-roll
Declare the rolled dice value.

**Request:**
```json
{
  "playerId": "player123",
  "value": 5,  // 1-6
  "postFrameHash": "i9j0k1l2..." // 64-character SHA-256 hex hash
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- 400: Not your turn
- 400: Salt not revealed
- 400: Commitment verification failed (violation recorded)
- 400: Declare window expired (violation recorded)
- 400: Invalid dice value or hash

---

### POST /api/gameroom/:roomId/finalize-turn
Finalize current turn and advance to next player.

**Request:**
```json
{
  "playerId": "player123"
}
```

**Response:**
```json
{
  "success": true,
  "state": { /* Updated game state */ }
}
```

**Errors:**
- 400: Not your turn
- 400: Roll not declared

---

### POST /api/gameroom/:roomId/dispute
Raise a dispute about the current game.

**Request:**
```json
{
  "playerId": "player123",
  "reason": "Opponent moved camera during roll"
}
```

**Response:**
```json
{
  "success": true
}
```

Game status changes to `disputed`. Manual review required.

---

### POST /api/gameroom/:roomId/update-perspective
Update player's camera perspective.

**Request:**
```json
{
  "playerId": "player123",
  "perspective": "first-person"  // or "third-person"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- 404: Player not found
- 400: Invalid perspective value

---

### GET /api/gameroom/:roomId/state
Fetch current game state.

**Response:**
```json
{
  "id": "room-id",
  "status": "active",
  "players": [
    {
      "id": "player123",
      "createdAt": 1234567890,
      "rollCount": 5,
      "violations": 0,
      "tier": "NEW",
      "perspective": "first-person",
      "checklistComplete": true
    },
    {
      "id": "player456",
      "createdAt": 1234567900,
      "rollCount": 5,
      "violations": 1,
      "tier": "FLAGGED",
      "perspective": "third-person",
      "checklistComplete": true
    }
  ],
  "turnIndex": 0,
  "turnNumber": 6,
  "commitments": {
    "6": {
      "playerId": "player123",
      "commitmentHash": "abc123...",
      "commitTime": 1234567950,
      "salt": "550e8400-...",
      "saltRevealed": true,
      "revealTime": 1234567960,
      "declaredValue": 4,
      "preFrameHash": "def456...",
      "postFrameHash": "ghi789...",
      "declareTime": 1234567970
    }
  },
  "rollEvents": [
    {
      "type": "game_started",
      "timestamp": 1234567890,
      "players": ["player123", "player456"],
      "hash": "event0hash...",
      "prevHash": "genesis"
    },
    {
      "type": "turn_completed",
      "turnNumber": 1,
      "playerId": "player123",
      "value": 3,
      "timestamp": 1234567900,
      "preFrameHash": "...",
      "postFrameHash": "...",
      "hash": "event1hash...",
      "prevHash": "event0hash..."
    }
  ],
  "fairness": {
    "counts": [2, 3, 1, 2, 1, 1],
    "deviation": 0.45,
    "status": "normal"
  },
  "hashChainTip": "eventNhash...",
  "createdAt": 1234567890
}
```

---

### WebSocket: /api/gameroom/:roomId/stream
Real-time state updates via WebSocket.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8787/api/gameroom/ROOM_ID/stream');
```

**Messages Received:**
```json
{
  "type": "state_update",
  "state": { /* Full game state */ }
}
```

Sent whenever game state changes (player joins, turn advances, etc.).

---

## WebRTC Signaling

### POST /api/webrtc/offer
Exchange SDP offer.

**Request:**
```json
{
  "roomId": "room-id",
  "playerId": "player123",
  "offer": { /* RTCSessionDescription */ }
}
```

**Response:**
```json
{
  "success": true
}
```

---

### POST /api/webrtc/answer
Exchange SDP answer.

**Request:**
```json
{
  "roomId": "room-id",
  "playerId": "player456",
  "answer": { /* RTCSessionDescription */ }
}
```

**Response:**
```json
{
  "success": true
}
```

---

### POST /api/webrtc/ice
Exchange ICE candidates.

**Request:**
```json
{
  "roomId": "room-id",
  "playerId": "player123",
  "candidate": { /* RTCIceCandidate */ }
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Game State Object

### Status Values
- `pending`: Waiting for second player
- `active`: Game in progress
- `completed`: Game finished normally
- `disputed`: Dispute raised, manual review needed

### Player Tiers
- `NEW`: Default for new players
- `TRUSTED`: ≥10 successful rolls, 0 violations
- `FLAGGED`: ≥2 violations
- `SUSPENDED`: ≥5 violations (cannot play)

### Fairness Status
- `insufficient_data`: < MIN_SAMPLE rolls
- `normal`: Deviation < 0.6
- `observe`: Deviation 0.6-0.89
- `suspect`: Deviation ≥ 0.9

### Timing Constants (Environment Variables)
- `REVEAL_WINDOW`: Time allowed for salt reveal (default 30000ms)
- `DECLARE_WINDOW`: Time allowed for roll declaration (default 30000ms)
- `MIN_SAMPLE`: Minimum rolls before fairness analysis (default 10)
- `SUSPEND_THRESHOLD`: Violations before suspension (default 5)

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request (validation failed) |
| 404 | Resource Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

---

## Example Workflow

```javascript
// 1. Register
await fetch('/api/register', {
  method: 'POST',
  body: JSON.stringify({ playerId: 'alice' })
});

// 2. Create room
const { roomId } = await fetch('/api/gameroom/create', {
  method: 'POST',
  body: JSON.stringify({ playerId: 'alice' })
}).then(r => r.json());

// 3. Connect WebSocket
const ws = new WebSocket(`ws://host/api/gameroom/${roomId}/stream`);
ws.onmessage = (e) => {
  const { type, state } = JSON.parse(e.data);
  if (type === 'state_update') {
    updateUI(state);
  }
};

// 4. Submit checklist
await fetch(`/api/gameroom/${roomId}/checklist`, {
  method: 'POST',
  body: JSON.stringify({
    playerId: 'alice',
    checklist: { flatSurface: true, standardDice: true, adequateLighting: true, cameraFixed: true }
  })
});

// 5. Capture pre-roll frame
const frameHash = await captureAndHashFrame();
await fetch(`/api/gameroom/${roomId}/pre-roll-frame`, {
  method: 'POST',
  body: JSON.stringify({ playerId: 'alice', frameHash })
});

// 6. Make commitment
const salt = crypto.randomUUID();
const commitment = await computeCommitment(salt, 'alice', turnNumber);
await fetch(`/api/gameroom/${roomId}/commit`, {
  method: 'POST',
  body: JSON.stringify({ playerId: 'alice', commitmentHash: commitment })
});

// 7. Reveal salt
await fetch(`/api/gameroom/${roomId}/reveal`, {
  method: 'POST',
  body: JSON.stringify({ playerId: 'alice', salt })
});

// 8. Roll physical dice...

// 9. Declare result
const postFrameHash = await captureAndHashFrame();
await fetch(`/api/gameroom/${roomId}/declare-roll`, {
  method: 'POST',
  body: JSON.stringify({ playerId: 'alice', value: 4, postFrameHash })
});

// 10. Finalize turn
await fetch(`/api/gameroom/${roomId}/finalize-turn`, {
  method: 'POST',
  body: JSON.stringify({ playerId: 'alice' })
});
```
