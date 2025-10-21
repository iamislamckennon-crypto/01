# API Reference

## Physical Dice Detection Pipeline API

This document describes the API endpoints for the physical dice detection system.

### Base URL
```
http://localhost:3000/api
```

## Endpoints

### 1. Submit Evidence

Submit physical dice detection evidence after a roll.

**Endpoint:** `POST /api/gameroom/:id/submit-evidence`

**Parameters:**
- `id` (path) - Game room identifier

**Request Body:**
```json
{
  "turnNumber": 1,
  "surfaceHash": "abc123def456",
  "frameHashes": ["hash1", "hash2", "hash3"],
  "diceValues": [4, 4, 4],
  "stabilizationTimeMs": 3000,
  "residualMotionScore": 0.01,
  "algorithmVersion": "1.0.0-phase1",
  "timestamp": 1634567890123
}
```

**Response (Success):**
```json
{
  "success": true,
  "turnNumber": 1,
  "status": "verified",
  "detectedValue": 4,
  "confidence": 1.0,
  "requiresOpponentConfirmation": false,
  "hashChainTip": "a1b2c3d4e5f6"
}
```

**Response (Violation):**
```json
{
  "error": "Violation detected",
  "message": "Camera movement detected (score: 0.250)",
  "violations": 1,
  "status": "flagged"
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation error or violation
- `404` - Game room not found

---

### 2. Confirm Opponent

Opponent confirms or disputes a detected dice value.

**Endpoint:** `POST /api/gameroom/:id/confirm-opponent`

**Parameters:**
- `id` (path) - Game room identifier

**Request Body:**
```json
{
  "turnNumber": 1,
  "agree": true,
  "playerId": "player2"
}
```

**Response (Agreement):**
```json
{
  "success": true,
  "message": "Value confirmed",
  "status": "verified",
  "finalValue": 4
}
```

**Response (Disagreement):**
```json
{
  "success": true,
  "message": "Disagreement recorded",
  "rerollRequired": true,
  "rerollsRemaining": 2
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request or max rerolls reached
- `404` - Game room or turn not found

---

### 3. Request Reroll

Request a reroll due to disagreement about detected value.

**Endpoint:** `POST /api/gameroom/:id/request-reroll`

**Parameters:**
- `id` (path) - Game room identifier

**Request Body:**
```json
{
  "turnNumber": 1,
  "playerId": "player2"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reroll requested",
  "rerollNumber": 1,
  "rerollsRemaining": 2
}
```

**Status Codes:**
- `200` - Success
- `400` - Max rerolls exceeded
- `404` - Game room or turn not found

---

### 4. Get Hash Chain

Retrieve the complete hash chain for verification.

**Endpoint:** `GET /api/gameroom/:id/hash-chain`

**Parameters:**
- `id` (path) - Game room identifier

**Response:**
```json
{
  "events": [
    {
      "type": "ROLL_COMMIT",
      "data": {
        "turnNumber": 1,
        "commitment": "hash123"
      },
      "timestamp": 1634567890000,
      "previousHash": "0000000000000000",
      "eventIndex": 0,
      "hash": "a1b2c3d4e5f67890"
    },
    {
      "type": "ROLL_REVEAL",
      "data": {
        "turnNumber": 1,
        "revealedValue": 4,
        "nonce": "nonce123"
      },
      "timestamp": 1634567895000,
      "previousHash": "a1b2c3d4e5f67890",
      "eventIndex": 1,
      "hash": "b2c3d4e5f6789012"
    },
    {
      "type": "ROLL_EVIDENCE",
      "data": {
        "turnNumber": 1,
        "evidenceHash": "evidence123",
        "status": "verified",
        "detectedValue": 4
      },
      "timestamp": 1634567900000,
      "previousHash": "b2c3d4e5f6789012",
      "eventIndex": 2,
      "hash": "c3d4e5f678901234"
    }
  ],
  "tip": "c3d4e5f678901234",
  "verification": {
    "valid": true,
    "eventCount": 3,
    "tip": "c3d4e5f678901234"
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Game room not found

---

### 5. Commit (Testing/Integration)

Submit a commitment for a dice roll.

**Endpoint:** `POST /api/gameroom/:id/commit`

**Request Body:**
```json
{
  "turnNumber": 1,
  "commitment": "hash_of_value_and_nonce",
  "playerId": "player1"
}
```

**Response:**
```json
{
  "success": true,
  "turnNumber": 1,
  "hashChainTip": "abc123"
}
```

---

### 6. Reveal (Testing/Integration)

Reveal the committed dice value.

**Endpoint:** `POST /api/gameroom/:id/reveal`

**Request Body:**
```json
{
  "turnNumber": 1,
  "value": 4,
  "nonce": "random_nonce_123"
}
```

**Response:**
```json
{
  "success": true,
  "turnNumber": 1,
  "hashChainTip": "def456"
}
```

---

### 7. Get Turn Information

Retrieve information about a specific turn.

**Endpoint:** `GET /api/gameroom/:id/turn/:turnNumber`

**Parameters:**
- `id` (path) - Game room identifier
- `turnNumber` (path) - Turn number

**Response:**
```json
{
  "turn": {
    "turnNumber": 1,
    "player": "player1",
    "commitment": "hash123",
    "revealedValue": 4,
    "detectedValue": 4,
    "status": "verified",
    "evidence": { ... }
  },
  "hashChainEvents": [ ... ]
}
```

---

## Event Types

The hash chain uses the following event types:

- `ROLL_COMMIT` - Player commits to a roll
- `ROLL_REVEAL` - Player reveals the committed value
- `ROLL_EVIDENCE` - Physical dice detection evidence submitted
- `OPPONENT_CONFIRM` - Opponent confirms or disputes detected value
- `REROLL_REQUEST` - Reroll requested due to disagreement

---

## Detection Status Values

- `verified` - Value verified with high confidence (≥2/3 frames agree)
- `uncertain` - Low confidence detection (requires opponent confirmation)
- `flagged` - Violation detected (timing, camera movement, etc.)

---

## Configuration Constants

```javascript
{
  STABLE_WINDOW: 3,              // Frames needed for stabilization
  STABILIZATION_MAX: 5000,       // Max ms to wait for stabilization
  DETECTION_WINDOW: 10000,       // Max ms from reveal to evidence
  CAMERA_MOVE_THRESHOLD: 0.15,   // Pixel diff threshold
  CONSENSUS_FRAMES: 3,           // Frames captured for consensus
  CONSENSUS_MIN_MATCH: 2,        // Min matching frames for verification
  MAX_REROLLS: 3                 // Max rerolls per turn
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400  | Invalid request or violation |
| 404  | Resource not found |
| 500  | Internal server error |

---

## Timing Requirements

1. **Detection Window**: Evidence must be submitted within 10 seconds of reveal
2. **Stabilization**: Dice must stabilize within 5 seconds
3. **Frame Capture**: 3 consecutive stable frames required

---

## Violation Types

1. **Timing Violation**: Evidence submitted outside detection window
2. **Camera Movement**: Excessive pixel difference between baseline and first frame
3. **Stabilization Timeout**: Dice did not stabilize within allowed time
4. **Structure Validation**: Invalid evidence format

---

## Best Practices

1. **Capture Baseline**: Always capture F0 (baseline surface) before roll
2. **Wait for Stabilization**: Ensure dice have fully stopped before capturing frames
3. **Consistent Lighting**: Maintain stable lighting conditions throughout capture
4. **Fixed Camera**: Avoid camera movement during detection
5. **Evidence Timing**: Submit evidence promptly after stabilization

---

## Example Flow

```javascript
// 1. Commit
POST /api/gameroom/game123/commit
{ turnNumber: 1, commitment: "hash...", playerId: "player1" }

// 2. Reveal
POST /api/gameroom/game123/reveal
{ turnNumber: 1, value: 4, nonce: "nonce..." }

// 3. Submit Evidence
POST /api/gameroom/game123/submit-evidence
{
  turnNumber: 1,
  surfaceHash: "baseline...",
  frameHashes: ["f1", "f2", "f3"],
  diceValues: [4, 4, 4],
  stabilizationTimeMs: 3000,
  residualMotionScore: 0.01,
  algorithmVersion: "1.0.0-phase1",
  timestamp: Date.now()
}

// Response: { status: "verified", detectedValue: 4 }

// 4. Verify Chain
GET /api/gameroom/game123/hash-chain
// Response includes all events and verification status
```
