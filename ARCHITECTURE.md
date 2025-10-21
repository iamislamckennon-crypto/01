# Architecture

## Overview

The Remote Physical Dice Rolling Platform is a production-feasible system for competitive dice rolling between two remote players with tamper-evident controls and deterministic fairness monitoring.

## System Components

### 1. Cloudflare Worker (Entry Point)
- **File**: `src/index.js`
- **Purpose**: HTTP/WebSocket request routing, validation, rate limiting
- **Key Features**:
  - REST API endpoints for all game actions
  - WebRTC signaling (SDP/ICE exchange)
  - Turnstile verification for registration
  - CORS handling
  - Static asset serving

### 2. Durable Object: GameRoomDO
- **File**: `src/GameRoomDO.js`
- **Purpose**: Authoritative game state management
- **Key Features**:
  - Turn-based sequence enforcement
  - Commitment-reveal protocol
  - Frame hash storage (pre/post roll)
  - Timing window enforcement
  - Hash chain maintenance
  - Real-time state broadcast via WebSocket

### 3. Utility Modules

#### Crypto (`src/utils/crypto.js`)
- SHA-256 hashing
- Commitment computation: `SHA256(salt:playerId:turnNumber)`
- Canonical JSON serialization (sorted keys)
- Hash chain linking: `SHA256(prevHash:canonicalEvent)`
- Commitment verification

#### Fairness (`src/utils/fairness.js`)
- Roll count tracking per value (1-6)
- Deviation calculation: `max(|count - expected| / expected)`
- Status thresholds:
  - `deviation >= 0.9` → SUSPECT
  - `deviation >= 0.6` → OBSERVE
  - `deviation < 0.6` → NORMAL
  - `total < MIN_SAMPLE` → INSUFFICIENT_DATA

#### Reputation (`src/utils/reputation.js`)
- Deterministic tier computation
- Tiers: NEW → TRUSTED → FLAGGED → SUSPENDED
- Rules:
  - NEW: default
  - TRUSTED: ≥10 rolls, 0 violations
  - FLAGGED: ≥2 violations
  - SUSPENDED: ≥5 violations (blocks further actions)

#### Validation (`src/utils/validation.js`)
- Player ID format: 3-50 alphanumeric/underscore/dash
- UUID v4 format for salts
- SHA-256 hash format (64 hex chars)
- Dice value: 1-6
- Checklist completeness
- Perspective: first-person | third-person

### 4. Frontend PWA

#### Core App (`public/app.js`)
- State management
- WebSocket client for real-time updates
- REST API interactions
- UI orchestration
- Service worker registration

#### WebRTC Manager (`public/webrtc.js`)
- Peer connection establishment
- Local/remote stream handling
- Frame capture for hashing (64x64 grayscale)
- ICE candidate exchange

#### Service Worker (`public/service-worker.js`)
- Static asset caching
- Offline fallback
- Network-first strategy for API calls

## Data Flow

### Turn Sequence

```
1. Player Setup
   ├─ Join game room
   ├─ Complete pre-roll checklist
   └─ Enable camera (WebRTC)

2. Pre-Commitment Phase
   ├─ Capture pre-roll frame → Hash
   └─ Submit frame hash to DO

3. Commitment Phase
   ├─ Generate salt (UUID v4)
   ├─ Compute commitment: SHA256(salt:playerId:turnNumber)
   └─ Submit commitment hash to DO

4. Reveal Phase
   ├─ Reveal salt within REVEAL_WINDOW
   └─ DO verifies commitment

5. Physical Roll
   └─ Player rolls physical dice

6. Declaration Phase
   ├─ Select rolled value (1-6)
   ├─ Capture post-roll frame → Hash
   ├─ Submit value + post-frame hash
   └─ DO verifies timing within DECLARE_WINDOW

7. Finalization Phase
   ├─ DO updates fairness metrics
   ├─ DO updates player reputation
   ├─ DO records event in hash chain
   └─ Turn advances to next player
```

### Hash Chain Structure

```
Event 0: game_started
  prevHash: "genesis"
  hash: SHA256("genesis" + canonical(event0))

Event 1: turn_completed (turn 1)
  prevHash: hash0
  hash: SHA256(hash0 + canonical(event1))

Event 2: turn_completed (turn 2)
  prevHash: hash1
  hash: SHA256(hash1 + canonical(event2))
  
...

Current Tip: hashN
```

### Timing Windows

```
Commit Time
    ↓
    [REVEAL_WINDOW: 30s]
    ↓
Reveal Time
    ↓
    [DECLARE_WINDOW: 30s]
    ↓
Declare Time
```

Exceeding windows → Violation recorded → Reputation penalty

## Security Mechanisms

### 1. Commitment-Reveal Protocol
- Prevents post-roll manipulation
- Salt binding to player and turn
- Cryptographic verification

### 2. Frame Hashing
- Pre-roll and post-roll camera snapshots
- Detects camera movement (TODO: pixel diff)
- Stored in event log for audit

### 3. Timing Enforcement
- Server-side timestamps (untrusted client time ignored)
- Deterministic violation tracking
- Automatic reputation updates

### 4. Hash Chain Audit Trail
- Immutable event log
- Canonical JSON (sorted keys) for determinism
- External verification script (`scripts/verify-chain.js`)

### 5. Reputation System
- Transparent tier computation
- Suspension blocks gameplay
- No appeals/resets (deterministic)

### 6. Rate Limiting
- Per-IP request throttling
- Registration: 5 req / 5 min
- Room creation: 10 req / 1 min
- Gameplay: 100 req / 1 min

### 7. Input Validation
- Schema checks on all endpoints
- Pattern matching (UUID, hash, player ID)
- Error sanitization (no sensitive data leakage)

## WebRTC Architecture

### Signaling
- REST endpoints for SDP offer/answer exchange
- ICE candidate relay via worker
- No dedicated signaling server (stateless)

### Media
- Video only (no audio)
- Peer-to-peer connection
- STUN servers for NAT traversal
- No TURN server (TODO for production)

### Perspective
- Metadata stored in game state
- First-person: camera on player
- Third-person: overhead view of dice surface
- UI toggles, broadcast via WebSocket

## Storage

### Durable Object State
- Persistent storage within DO
- Key: "gameState"
- Auto-saved on each mutation
- WebSocket sessions ephemeral (in-memory Set)

### No External Database
- All state in DO storage
- Scalability: one DO per game room
- Regional placement (automatic)

## Future Extensions (TODOs)

### Planned
- Pixel diff for camera movement detection
- Merkle tree snapshot for periodic anchoring
- Multi-room lobby listing
- TURN server for restrictive NATs

### Explicitly Out of Scope (This Implementation)
- Computer vision pip detection
- ML-based anomaly models
- On-chain VRF / blockchain anchoring
- Advanced tournament system
- Hardware dice sensors

## Deployment

### Development
```bash
npm install
wrangler dev
# Open http://localhost:8787
```

### Production
```bash
wrangler secret put TURNSTILE_SECRET
wrangler deploy
```

### Environment Variables
- `ORIGIN_ALLOWED`: CORS whitelist
- `PRE_COMMIT_WINDOW`: 60000ms
- `REVEAL_WINDOW`: 30000ms
- `DECLARE_WINDOW`: 30000ms
- `MIN_SAMPLE`: 10 rolls
- `SUSPEND_THRESHOLD`: 5 violations

## Testing

### Unit Tests
```bash
npm test
```

### Hash Chain Verification
```bash
node scripts/verify-chain.js <roomId> <apiUrl>
node scripts/verify-chain.js --test
```

### Integration
- Two browsers
- Complete 3+ turns
- Verify state consistency
- Test violation scenarios

## Monitoring

### Key Metrics (TODO)
- Active game rooms
- Average turn duration
- Violation rate
- Suspension rate
- WebRTC connection success rate
- Hash chain verification runs

### Alerts (TODO)
- High violation rate in room
- Hash chain corruption
- WebSocket disconnections
- Rate limit breaches

## Risk Mitigation

| Risk | Mitigation | Status |
|------|------------|--------|
| Player falsifies declared value | Both players observe via WebRTC | ⚠️ Relies on visual verification |
| Camera moved mid-turn | Pre/post frame hashing | ✅ Implemented, diff TODO |
| Time window exploitation | Server-side timestamps | ✅ Implemented |
| Commitment manipulation | Cryptographic binding | ✅ Implemented |
| Network interruption | WebSocket reconnect | ✅ Implemented |
| Collusion between players | Fairness monitoring, manual review | ⚠️ Requires human oversight |

## Performance

### Expected Load
- Small game rooms (2 players)
- Low request rate (~10 requests/turn)
- Minimal compute (hash calculations)

### Durable Object Limits
- ~1MB state size (ample for 1000s of turns)
- ~128 concurrent WebSocket connections (2 needed)
- Sub-100ms request latency

### Static Assets
- Served via Cloudflare CDN
- Cached aggressively
- PWA offline shell

## Compliance

### GDPR Considerations (TODO)
- Player IDs may be PII
- No persistent user database
- Session-based only
- Privacy notice required

### Fair Play
- Deterministic, auditable
- No hidden algorithms
- Open-source eligible
