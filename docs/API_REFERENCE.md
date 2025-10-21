# API Reference

## Overview

This document describes the REST API endpoints for the dice roll gaming platform, with focus on the independent detection evidence workflow.

## Base URL

```
Development: https://dice-roll-platform-dev.workers.dev
Production:  https://dice-roll-platform-prod.workers.dev
```

## Authentication

*To be implemented - currently no authentication required for development*

## Endpoints

### Submit Evidence

Submit dice detection evidence for a turn.

**Endpoint**: `POST /api/gameroom/:id/submit-evidence`

**Parameters**:
- `:id` - Game room ID (path parameter)

**Request Body**:
```json
{
  "evidence": {
    "turnNumber": 1,
    "frameHashes": [
      "abc123def456...",
      "def456ghi789...",
      "ghi789jkl012..."
    ],
    "diceValues": [4],
    "stabilizationTimeMs": 650,
    "residualMotionScore": 0.12,
    "algorithmVersion": "1.0.0-deterministic-threshold",
    "status": "verified",
    "timestamp": "2025-10-21T10:00:00.000Z"
  },
  "playerId": "player1"
}
```

**Response** (Success):
```json
{
  "success": true,
  "evidenceHash": "a1b2c3d4e5f6...",
  "status": "verified"
}
```

**Response** (Validation Error):
```json
{
  "success": false,
  "errors": [
    "Invalid turnNumber: must be positive integer"
  ],
  "violations": [
    "Stabilization time 400ms below minimum 600ms"
  ]
}
```

**Status Codes**:
- `200` - Success
- `400` - Validation error
- `409` - Evidence already submitted for turn
- `500` - Server error

---

### Confirm Evidence

Opponent confirms submitted evidence.

**Endpoint**: `POST /api/gameroom/:id/confirm-evidence`

**Parameters**:
- `:id` - Game room ID (path parameter)

**Request Body**:
```json
{
  "turnNumber": 1,
  "playerId": "player2"
}
```

**Response** (Success):
```json
{
  "success": true,
  "status": "verified"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Cannot confirm own evidence"
}
```

**Status Codes**:
- `200` - Success
- `400` - Invalid request
- `404` - Evidence not found
- `409` - Already confirmed
- `500` - Server error

---

### Dispute Evidence

Opponent disputes submitted evidence.

**Endpoint**: `POST /api/gameroom/:id/dispute-evidence`

**Parameters**:
- `:id` - Game room ID (path parameter)

**Request Body**:
```json
{
  "turnNumber": 1,
  "playerId": "player2",
  "reason": "Incorrect detection - die shows 5 not 4"
}
```

**Response** (Success):
```json
{
  "success": true,
  "status": "flagged"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Cannot dispute own evidence"
}
```

**Status Codes**:
- `200` - Success
- `400` - Invalid request
- `404` - Evidence not found
- `500` - Server error

---

### Get Evidence

Retrieve evidence summary for a turn.

**Endpoint**: `GET /api/gameroom/:id/evidence/:turnNumber`

**Parameters**:
- `:id` - Game room ID (path parameter)
- `:turnNumber` - Turn number (path parameter)

**Response** (Success):
```json
{
  "turnNumber": 1,
  "diceValues": [4],
  "status": "verified",
  "algorithmVersion": "1.0.0-deterministic-threshold",
  "evidenceHash": "a1b2c3d4e5f6...",
  "submittedAt": "2025-10-21T10:00:00.000Z",
  "confirmedBy": "player2",
  "confirmedAt": "2025-10-21T10:01:00.000Z",
  "disputedBy": null,
  "disputedAt": null,
  "disputeReason": null
}
```

**Response** (Not Found):
```json
{
  "error": "Evidence not found"
}
```

**Status Codes**:
- `200` - Success
- `404` - Evidence not found
- `500` - Server error

---

## Data Models

### Evidence Object

Complete evidence structure stored server-side:

```typescript
interface Evidence {
  turnNumber: number;
  frameHashes: string[]; // 3 SHA-256 hashes
  diceValues: number[]; // Array of 1-6
  stabilizationTimeMs: number;
  residualMotionScore: number; // 0.0-1.0
  algorithmVersion: string;
  status: 'verified' | 'uncertain' | 'flagged';
  timestamp: string; // ISO 8601
  
  // Server-added fields
  playerId: string;
  evidenceHash: string; // SHA-256 of canonical evidence
  submittedAt: string; // ISO 8601
  confirmedBy: string | null;
  confirmedAt: string | null;
  disputedBy: string | null;
  disputedAt: string | null;
  disputeReason: string | null;
}
```

### Hash Chain Event

Events stored in hash chain:

```typescript
interface ChainEvent {
  type: 'evidence_submitted' | 'evidence_confirmed' | 'evidence_disputed';
  timestamp: string; // ISO 8601
  
  // Type-specific fields
  turnNumber?: number;
  playerId?: string;
  evidenceHash?: string;
  reason?: string;
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "errors": ["Array of validation errors"],
  "violations": ["Array of timing violations"]
}
```

### Common Error Codes

- `400 Bad Request` - Invalid input data
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (already exists)
- `500 Internal Server Error` - Server error

---

## Rate Limiting

*To be implemented*

Current: No rate limiting in development

Planned:
- 10 evidence submissions per minute per player
- 100 API calls per minute per game room

---

## Validation Rules

### Evidence Validation

Server performs the following checks:

1. **Structure Validation**:
   - All required fields present
   - Correct data types
   - Frame hashes are 64-char hex strings
   - Dice values in range 1-6

2. **Timing Validation**:
   - `stabilizationTimeMs >= MIN_STABILIZATION_MS`
   - `residualMotionScore <= MAX_RESIDUAL_MOTION`

3. **Business Logic**:
   - Turn number valid for game state
   - No duplicate submissions
   - Player authorized for game room

### Configuration Values

See `wrangler.toml` for current values:
- `MIN_STABILIZATION_MS`: 600ms (dev: 400ms)
- `MAX_RESIDUAL_MOTION`: 0.2 (dev: 0.3)
- `MAX_POST_ROLL_CAPTURES`: 1

---

## Examples

### Complete Turn Flow

#### 1. Submit Evidence

```bash
curl -X POST https://dice-roll-platform-dev.workers.dev/api/gameroom/room123/submit-evidence \
  -H "Content-Type: application/json" \
  -d '{
    "evidence": {
      "turnNumber": 1,
      "frameHashes": ["abc...", "def...", "ghi..."],
      "diceValues": [4],
      "stabilizationTimeMs": 650,
      "residualMotionScore": 0.12,
      "algorithmVersion": "1.0.0-deterministic-threshold",
      "status": "uncertain",
      "timestamp": "2025-10-21T10:00:00.000Z"
    },
    "playerId": "player1"
  }'
```

#### 2. Opponent Confirms

```bash
curl -X POST https://dice-roll-platform-dev.workers.dev/api/gameroom/room123/confirm-evidence \
  -H "Content-Type: application/json" \
  -d '{
    "turnNumber": 1,
    "playerId": "player2"
  }'
```

#### 3. Get Evidence

```bash
curl https://dice-roll-platform-dev.workers.dev/api/gameroom/room123/evidence/1
```

---

## Webhook Events

*To be implemented*

Planned webhook events:
- `evidence.submitted`
- `evidence.confirmed`
- `evidence.disputed`
- `turn.completed`

---

## Versioning

API Version: `v1`

Version is implied in current endpoints. Future versions will use path prefix:
- `/api/v2/gameroom/...`

---

## Testing

### Using cURL

```bash
# Set base URL
BASE_URL="https://dice-roll-platform-dev.workers.dev"

# Submit evidence
curl -X POST $BASE_URL/api/gameroom/test-room/submit-evidence \
  -H "Content-Type: application/json" \
  -d @evidence.json

# Confirm evidence
curl -X POST $BASE_URL/api/gameroom/test-room/confirm-evidence \
  -H "Content-Type: application/json" \
  -d '{"turnNumber":1,"playerId":"player2"}'

# Get evidence
curl $BASE_URL/api/gameroom/test-room/evidence/1
```

### Using JavaScript Fetch

```javascript
// Submit evidence
const response = await fetch(
  'https://dice-roll-platform-dev.workers.dev/api/gameroom/room123/submit-evidence',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evidence: { /* ... */ },
      playerId: 'player1'
    })
  }
);

const result = await response.json();
console.log(result);
```

---

## Additional Resources

- [Independent Detection Documentation](./INDEPENDENT_DETECTION.md)
- [Hash Chain Verification](./HASH_CHAIN.md)
- [Architecture Overview](./ARCHITECTURE.md)

---

**Document Status**: Complete  
**Last Updated**: 2025-10-21  
**Version**: 1.0  
**Owner**: Engineering Team
