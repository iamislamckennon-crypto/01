# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Browser / Mobile                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   PWA App    │  │ Service      │  │  WebSocket   │          │
│  │  (index.html)│  │  Worker      │  │   Client     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            │ HTTPS/WSS
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                    CLOUDFLARE EDGE                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Cloudflare Workers                       │ │
│  │                      (index.js)                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  Router & Middleware                                  │ │ │
│  │  │  - Rate Limiting                                      │ │ │
│  │  │  - CORS Validation                                    │ │ │
│  │  │  - Origin Checking                                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                           │                                │ │
│  │         ┌─────────────────┼─────────────────┐             │ │
│  │         │                 │                 │             │ │
│  │         ▼                 ▼                 ▼             │ │
│  │  ┌───────────┐    ┌──────────┐    ┌──────────────┐      │ │
│  │  │ Turnstile │    │   Game   │    │   Static     │      │ │
│  │  │ Verifier  │    │   Room   │    │   Assets     │      │ │
│  │  │           │    │   API    │    │   Handler    │      │ │
│  │  └───────────┘    └──────────┘    └──────────────┘      │ │
│  └─────────────────────────┼──────────────────────────────────┘ │
│                            │                                    │
│  ┌─────────────────────────▼──────────────────────────────────┐ │
│  │              Durable Objects Layer                         │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │         GameRoomDurable Instance (per room)          │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐ │ │ │
│  │  │  │ State Storage:                                  │ │ │ │
│  │  │  │  - players                                      │ │ │ │
│  │  │  │  - commitments                                  │ │ │ │
│  │  │  │  - rollEvents                                   │ │ │ │
│  │  │  │  - distribution                                 │ │ │ │
│  │  │  │  - hashChain                                    │ │ │ │
│  │  │  │  - reputationSnapshot                           │ │ │ │
│  │  │  └─────────────────────────────────────────────────┘ │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐ │ │ │
│  │  │  │ Methods:                                        │ │ │ │
│  │  │  │  - join()                                       │ │ │ │
│  │  │  │  - commit()                                     │ │ │ │
│  │  │  │  - reveal()                                     │ │ │ │
│  │  │  │  - roll()                                       │ │ │ │
│  │  │  │  - getState()                                   │ │ │ │
│  │  │  │  - finalize()                                   │ │ │ │
│  │  │  │  - dispute()                                    │ │ │ │
│  │  │  └─────────────────────────────────────────────────┘ │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐ │ │ │
│  │  │  │ WebSocket Sessions                              │ │ │ │
│  │  │  │  - Real-time broadcasting                       │ │ │ │
│  │  │  │  - State updates                                │ │ │ │
│  │  │  └─────────────────────────────────────────────────┘ │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Cloudflare Pages                          │ │
│  │  - Static HTML/CSS/JS                                       │ │
│  │  - PWA Manifest                                             │ │
│  │  - Service Worker                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Player Registration Flow

```
Client                Worker              Turnstile API
  │                      │                       │
  │──── POST /register ──>│                      │
  │   (playerId, token)  │                       │
  │                      │──── Verify Token ────>│
  │                      │<──── Success ─────────│
  │<──── 200 OK ─────────│                       │
  │   (registered)       │                       │
```

### 2. Game Room Creation & Join Flow

```
Client            Worker         Durable Object
  │                  │                  │
  │─ POST /create ──>│                  │
  │                  │── Generate ID ───│
  │<─── roomId ──────│                  │
  │                  │                  │
  │─ POST /join ────>│                  │
  │  (playerId)      │                  │
  │                  │─── join() ──────>│
  │                  │                  │─ Store player
  │                  │                  │─ Update state
  │                  │                  │─ Create event
  │                  │                  │─ Add to hash chain
  │                  │<─── Success ─────│
  │<─── state ───────│                  │
  │                  │                  │
  │═══ WebSocket ════╪══════════════════╪═══> Broadcast
```

### 3. Commitment-Reveal-Roll Flow

```
Client                  Durable Object                Crypto Module
  │                           │                              │
  │─ Generate salt locally    │                              │
  │─ Compute hash locally ────┼─────────────────────────────>│
  │<─ commitmentHash ─────────┼──────────────────────────────│
  │                           │                              │
  │─── POST /commit ─────────>│                              │
  │   (commitmentHash)        │─ Store commitment            │
  │<──── Success ─────────────│                              │
  │                           │                              │
  │─── POST /reveal ─────────>│                              │
  │   (salt)                  │                              │
  │                           │── Verify commitment ────────>│
  │                           │<─ valid/invalid ─────────────│
  │                           │─ Update reputation if invalid│
  │<──── valid ───────────────│                              │
  │                           │                              │
  │─── POST /roll ───────────>│                              │
  │                           │── rollDice() ────────────────>│
  │                           │<─ result (1-6) ───────────────│
  │                           │─ Update distribution         │
  │                           │── analyzeFairness() ─────────>│
  │                           │<─ fairnessStatus ─────────────│
  │                           │─ Update reputation           │
  │                           │─ Add to hash chain           │
  │<──── result, fairness ────│                              │
  │                           │                              │
  │═══ WebSocket broadcast ═══╪══════════════════════════════│
```

### 4. Fairness Analysis Pipeline

```
Roll Event
    │
    ▼
Update Distribution {1:x, 2:y, 3:z, ...}
    │
    ▼
Calculate Chi-Square Statistic
    │
    ▼
Compute P-Value (vs. uniform distribution)
    │
    ▼
┌───────────────────────────────┐
│ P-Value Thresholds:           │
│  > alpha*2   → normal         │
│  alpha*2..alpha → observe     │
│  < alpha     → suspect        │
└───────────────────────────────┘
    │
    ▼
Update fairnessStatus
    │
    ▼
Broadcast to all clients
```

### 5. Hash Chain Integrity

```
Genesis Event
    │
    ▼
Event 1: SHA256(genesis + payload1) → hash1
    │
    ▼
Event 2: SHA256(hash1 + payload2) → hash2
    │
    ▼
Event 3: SHA256(hash2 + payload3) → hash3
    │
    ▼
...
    │
    ▼
Latest Event

Verification:
- Start from genesis
- Recompute each hash in sequence
- Compare with stored hashes
- Any mismatch = tampering detected
```

## Module Dependencies

```
index.js (Worker Entry)
  ├── gameroom.js (Durable Object)
  │   ├── crypto.js
  │   │   └── Web Crypto API
  │   ├── fairness.js
  │   ├── reputation.js
  │   └── validation.js
  ├── turnstile.js
  │   └── Turnstile API
  └── validation.js

app.js (Frontend)
  ├── Web Crypto API
  ├── WebSocket API
  └── DOM API

ui/components/*.jsx
  └── React (optional)

ui/hooks/useWebSocket.js
  └── WebSocket API

ui/store/state.js
  └── Signal-based state management
```

## Security Layers

```
┌─────────────────────────────────────────┐
│         DDoS Protection (CF)            │
├─────────────────────────────────────────┤
│         WAF Rules (CF)                  │
├─────────────────────────────────────────┤
│         Bot Management (CF)             │
├─────────────────────────────────────────┤
│         Turnstile (Registration)        │
├─────────────────────────────────────────┤
│         Rate Limiting (Worker)          │
├─────────────────────────────────────────┤
│         Origin Validation (CORS)        │
├─────────────────────────────────────────┤
│         Input Validation (Schemas)      │
├─────────────────────────────────────────┤
│    Commitment-Reveal (Anti-Cheat)       │
├─────────────────────────────────────────┤
│         Hash Chain (Integrity)          │
├─────────────────────────────────────────┤
│         Reputation System (Trust)       │
└─────────────────────────────────────────┘
```

## Scalability Model

### Horizontal Scaling

- **Workers**: Auto-scale globally across Cloudflare edge
- **Durable Objects**: One per game room, distributed globally
- **Pages**: CDN-cached, instant global delivery

### Performance Characteristics

- **API Latency**: < 50ms (p95) at edge locations
- **WebSocket**: Real-time, sub-second updates
- **Concurrent Rooms**: Unlimited (one DO per room)
- **Concurrent Users per Room**: 100+ (WebSocket limit)

### Cost Scaling

```
Users    | Requests/mo | Est. Cost
---------|-------------|----------
10K      | 1M          | $5-10
100K     | 10M         | $20-50
1M       | 100M        | $150-300
10M      | 1B          | $1000-2000
```

## Future Architecture Enhancements

### Phase 2: Analytics Pipeline

```
Worker
  │
  ├─ [METRIC] logs
  │     │
  │     ▼
  │  Logpush
  │     │
  │     ▼
  │  R2 Bucket
  │     │
  │     ▼
  │  Analytics Engine
  │     │
  │     ├─> Dashboard
  │     └─> Alerts
```

### Phase 3: VRF Integration

```
Roll Request
  │
  ▼
Smart Contract VRF
  │
  ├─> Random Value
  ├─> Proof
  └─> Signature
  │
  ▼
Store in Durable Object
  │
  ▼
Client Verification
```

### Phase 4: Computer Vision

```
Video Frame
  │
  ▼
Edge Detection
  │
  ▼
Die Face Recognition (TensorFlow.js)
  │
  ▼
OCR & Validation
  │
  ▼
Confidence Score
  │
  ▼
Accept/Reject
```

## Deployment Architecture

```
GitHub Repo
  │
  ├─> Cloudflare Pages (Git Integration)
  │    └─> Static Assets (HTML, CSS, JS)
  │
  └─> Wrangler CLI
       └─> Cloudflare Workers
            ├─> Worker Script
            └─> Durable Objects
```

## Monitoring & Observability

```
Application Events
  │
  ├─> Console Logs ([METRIC] prefix)
  │    │
  │    └─> Wrangler Tail (Real-time)
  │         │
  │         └─> Log Aggregator (Datadog, Splunk)
  │
  ├─> Workers Analytics Dashboard
  │    │
  │    ├─> Request volume
  │    ├─> Error rate
  │    ├─> CPU time
  │    └─> Latency (p50, p95, p99)
  │
  └─> Custom Metrics
       │
       ├─> Fairness anomalies
       ├─> Commitment violations
       ├─> Roll frequency
       └─> Player reputation distribution
```

## API Surface

### REST Endpoints

| Endpoint | Method | Auth | Rate Limit | Purpose |
|----------|--------|------|------------|---------|
| /api/register | POST | Turnstile | 10/min | Register player |
| /api/gameroom/create | POST | None | 20/min | Create room |
| /api/gameroom/:id/join | POST | None | 60/min | Join room |
| /api/gameroom/:id/commit | POST | None | 60/min | Submit commitment |
| /api/gameroom/:id/reveal | POST | None | 60/min | Reveal commitment |
| /api/gameroom/:id/roll | POST | None | 60/min | Roll dice |
| /api/gameroom/:id/state | GET | None | 120/min | Get state |
| /api/gameroom/:id/finalize | POST | None | 10/min | End game |
| /api/gameroom/:id/dispute | POST | None | 10/min | Dispute game |

### WebSocket

| Endpoint | Direction | Purpose |
|----------|-----------|---------|
| /api/gameroom/:id/stream | Bidirectional | Real-time updates |

### WebSocket Message Types

**Server → Client:**
- `state` - Full game state
- `player_joined` - Player join event
- `commitment_made` - Commitment submitted
- `commitment_revealed` - Commitment revealed
- `roll` - Dice roll result
- `game_finalized` - Game completed
- `game_disputed` - Game disputed

## Conclusion

This architecture provides:
- ✅ Global edge deployment
- ✅ Sub-50ms latency
- ✅ Unlimited scalability
- ✅ 99.99% uptime (Cloudflare SLA)
- ✅ Built-in DDoS protection
- ✅ Zero server management
- ✅ Pay-per-use pricing
