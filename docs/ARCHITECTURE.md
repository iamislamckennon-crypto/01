# Architecture Overview

## System Architecture

The dice roll gaming platform consists of three main layers: Frontend (PWA), Backend (Cloudflare Workers), and Audit/Verification tools.

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer (PWA)                    │
│  - React/Vue Components                                     │
│  - Camera Access & Frame Capture                            │
│  - Client-Side Detection                                    │
│  - Evidence Packaging                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS/REST
┌─────────────────────────────────────────────────────────────┐
│              Backend Layer (Cloudflare Workers)             │
│  - Durable Objects (Game Rooms)                             │
│  - Evidence Validation                                      │
│  - Hash Chain Management                                    │
│  - Player Session Management                                │
└─────────────────────────────────────────────────────────────┘
                            ↓ Storage
┌─────────────────────────────────────────────────────────────┐
│                  Persistent Storage Layer                   │
│  - Durable Object Storage (Evidence, Chain)                 │
│  - KV Storage (Configuration)                               │
│  - R2 Storage (Backups, Logs)                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Audit & Verification Layer                  │
│  - Hash Chain Verification Script                           │
│  - Merkle Snapshot Tool                                     │
│  - Blockchain Anchoring (Future)                            │
└─────────────────────────────────────────────────────────────┘
```

## Independent Detection Flow

### High-Level Flow

```
┌──────────┐
│  Player  │
└────┬─────┘
     │
     ▼
┌──────────────────┐
│   Pre-Roll       │──────────┐
│   Baseline       │          │
└────┬─────────────┘          │
     │                        │ Frame Data
     ▼                        │
┌──────────────────┐          │
│   Roll Dice      │          │
└────┬─────────────┘          │
     │                        │
     ▼                        │
┌──────────────────┐          │
│  Stabilization   │          │
│    (600ms+)      │          │
└────┬─────────────┘          │
     │                        │
     ▼                        │
┌──────────────────┐          │
│  Capture 3       │◄─────────┘
│  Frames          │
│  (F1, F2, F3)    │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Client-Side     │
│  Detection       │
│  (Consensus)     │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Package         │
│  Evidence        │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Submit to       │
│  Server          │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Server          │
│  Validation      │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Hash Chain      │
│  Append          │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Opponent        │
│  Review          │
│  (if uncertain)  │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Turn            │
│  Finalized       │
└──────────────────┘
```

### Detailed Component Interaction

```
┌─────────────────┐
│FrameSequence    │
│Capture          │
└────┬────────────┘
     │ captureSequence()
     ▼
┌─────────────────┐     ┌─────────────────┐
│ pixelHash.js    │     │ pixelDiff.js    │
│ - hashFrame()   │     │ - calcDiffRatio()│
└────┬────────────┘     └────┬────────────┘
     │                       │
     │ hashes                │ motion score
     ▼                       ▼
┌─────────────────────────────────────────┐
│ diceDetector.js                         │
│ - detectDiceFace() per frame            │
└────┬────────────────────────────────────┘
     │ detections
     ▼
┌─────────────────┐
│evidenceBuilder  │
│- buildConsensus()│
│- packageEvidence()│
└────┬────────────┘
     │ evidence package
     ▼
┌─────────────────┐
│validation.js    │
│- validateEvidence()│
└────┬────────────┘
     │ validation result
     ▼
┌─────────────────┐
│EvidenceSubmit   │
│Panel            │
└────┬────────────┘
     │ HTTP POST
     ▼
┌─────────────────┐
│GameRoomDO       │
│- submitEvidence()│
│- confirmEvidence()│
│- disputeEvidence()│
└────┬────────────┘
     │ store & chain
     ▼
┌─────────────────┐
│Durable Object   │
│Storage          │
└─────────────────┘
```

## Data Flow Diagram

### Evidence Submission Flow

```
Client                    Server                  Storage
  │                         │                        │
  │  POST /submit-evidence  │                        │
  ├────────────────────────>│                        │
  │                         │                        │
  │                         │ validateEvidence()     │
  │                         ├───────────┐            │
  │                         │           │            │
  │                         │<──────────┘            │
  │                         │                        │
  │                         │ calculateEvidenceHash()│
  │                         ├───────────┐            │
  │                         │           │            │
  │                         │<──────────┘            │
  │                         │                        │
  │                         │  store(evidence)       │
  │                         ├───────────────────────>│
  │                         │                        │
  │                         │  append(hashChain)     │
  │                         ├───────────────────────>│
  │                         │                        │
  │                         │<───────────────────────┤
  │     { success: true }   │                        │
  │<────────────────────────┤                        │
  │                         │                        │
```

### Confirmation/Dispute Flow

```
Opponent                  Server                  Storage
  │                         │                        │
  │  POST /confirm-evidence │                        │
  ├────────────────────────>│                        │
  │                         │                        │
  │                         │  getEvidence()         │
  │                         ├───────────────────────>│
  │                         │<───────────────────────┤
  │                         │                        │
  │                         │ validateOwnership()    │
  │                         ├───────────┐            │
  │                         │           │            │
  │                         │<──────────┘            │
  │                         │                        │
  │                         │  updateStatus()        │
  │                         ├───────────────────────>│
  │                         │                        │
  │                         │  append(hashChain)     │
  │                         ├───────────────────────>│
  │                         │                        │
  │     { success: true }   │<───────────────────────┤
  │<────────────────────────┤                        │
  │                         │                        │
```

## Component Architecture

### Frontend Components

```
src/components/
├── FrameSequenceCapture.js
│   └── Manages video stream and frame capture
├── DiceDetectionPreview.js
│   └── Displays detection results
├── EvidenceSubmitPanel.js
│   └── Packages and submits evidence
├── OpponentConfirmPanel.js
│   └── Opponent review interface
└── DetectionStatusBadge.js
    └── Status indicator
```

### Vision Utilities

```
src/vision/
├── diceDetector.js
│   └── Core detection algorithm
├── evidenceBuilder.js
│   └── Consensus and packaging
├── pixelHash.js
│   └── Frame hashing
├── pixelDiff.js
│   └── Motion detection
└── validation.js
    └── Evidence validation
```

### Backend (Durable Objects)

```
src/durable-objects/
└── GameRoomDO.js
    ├── State management
    ├── Evidence storage
    ├── Hash chain management
    └── API endpoints
```

### Scripts

```
scripts/
├── merkle-snapshot.js
│   └── Generate Merkle tree from events
└── verify-chain.js
    └── Verify hash chain integrity
```

## State Management

### Game Room State

```javascript
{
  id: "room123",
  players: ["player1", "player2"],
  turns: [
    {
      turnNumber: 1,
      player: "player1",
      status: "complete"
    }
  ],
  evidence: {
    turn_1: {
      turnNumber: 1,
      frameHashes: [...],
      diceValues: [4],
      status: "verified",
      evidenceHash: "abc123...",
      confirmedBy: "player2",
      // ...
    }
  },
  hashChain: [
    {
      type: "evidence_submitted",
      turnNumber: 1,
      evidenceHash: "abc123...",
      timestamp: "2025-10-21T10:00:00.000Z"
    },
    {
      type: "evidence_confirmed",
      turnNumber: 1,
      playerId: "player2",
      timestamp: "2025-10-21T10:01:00.000Z"
    }
  ],
  status: "active",
  createdAt: "2025-10-21T09:00:00.000Z"
}
```

### Evidence Lifecycle States

```
┌─────────────┐
│  Captured   │ (client-side)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Validated  │ (client-side)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Submitted  │ (sent to server)
└──────┬──────┘
       │
       ├─────────────────────┐
       ▼                     ▼
┌─────────────┐      ┌─────────────┐
│  Verified   │      │  Uncertain  │
│  (auto)     │      │  (pending)  │
└─────────────┘      └──────┬──────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
         ┌─────────────┐        ┌─────────────┐
         │  Confirmed  │        │  Disputed   │
         │  (opponent) │        │  (opponent) │
         └─────────────┘        └──────┬──────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │   Flagged   │
                                └─────────────┘
```

## Security Architecture

### Threat Model

**Threats**:
1. Frame tampering
2. Evidence replay
3. Camera feed manipulation
4. Hash chain modification
5. Dispute abuse

**Mitigations**:
1. Frame hashing (SHA-256)
2. Evidence hash chaining
3. Timing constraints
4. Durable Object immutability
5. Opponent verification

### Trust Boundaries

```
┌────────────────────────────────────────────┐
│ Untrusted: Client Browser                 │
│ - Video capture                            │
│ - Client-side detection                    │
│ - Frame hashing                            │
└──────────────┬─────────────────────────────┘
               │ HTTPS
               ▼
┌────────────────────────────────────────────┐
│ Trusted: Cloudflare Workers                │
│ - Evidence validation                      │
│ - Hash chain management                    │
│ - State persistence                        │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│ Highly Trusted: Blockchain (Future)        │
│ - Merkle root anchoring                    │
│ - Immutable timestamp                      │
└────────────────────────────────────────────┘
```

## Scalability

### Horizontal Scaling

**Cloudflare Workers**:
- Automatic global distribution
- Edge execution (low latency)
- No server management

**Durable Objects**:
- One instance per game room
- Automatic failover
- Transactional consistency

### Performance Characteristics

| Operation | Latency | Throughput |
|-----------|---------|------------|
| Frame capture | ~10ms | N/A |
| Detection (client) | ~2ms/frame | N/A |
| Evidence submission | <50ms | 1000s/sec |
| Hash chain append | <20ms | N/A |
| Chain verification | <100ms | N/A |

### Resource Limits

**Cloudflare Workers**:
- CPU: 50ms per request
- Memory: 128MB
- Durable Object Storage: No practical limit

**Client**:
- Video memory: ~100MB
- Frame storage: ~10MB (3 frames)
- Detection: ~5ms CPU

## Deployment Architecture

### Environments

```
┌─────────────────────────────────────────────┐
│ Development (Local)                         │
│ - wrangler dev                              │
│ - Local Durable Objects                     │
│ - Relaxed validation                        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Staging (dice-roll-platform-dev)            │
│ - Cloudflare Workers                        │
│ - Test Durable Objects                      │
│ - Lenient thresholds                        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Production (dice-roll-platform-prod)        │
│ - Cloudflare Workers                        │
│ - Production Durable Objects                │
│ - Strict validation                         │
└─────────────────────────────────────────────┘
```

### CI/CD Pipeline

```
Code Push → GitHub Actions
     ↓
Unit Tests
     ↓
Integration Tests
     ↓
Deploy to Staging
     ↓
Smoke Tests
     ↓
Manual Approval
     ↓
Deploy to Production (Canary)
     ↓
Monitor Metrics
     ↓
Full Production Rollout
```

## Monitoring & Observability

### Metrics

**Detection Metrics**:
- Detection status distribution
- Consensus agreement rate
- Average confidence scores
- Dispute rate

**System Metrics**:
- Request latency (p50, p95, p99)
- Error rate
- Durable Object response time
- Storage utilization

**Business Metrics**:
- Active game rooms
- Turns per hour
- Player engagement
- Dispute resolution time

### Logging

**Structured Logs**:
```json
{
  "timestamp": "2025-10-21T10:00:00.000Z",
  "level": "info",
  "event": "evidence_submitted",
  "gameRoomId": "room123",
  "turnNumber": 1,
  "playerId": "player1",
  "status": "verified",
  "evidenceHash": "abc123..."
}
```

### Alerting

**Alert Conditions**:
- Error rate > 1%
- Detection flagged rate > 20%
- Hash chain verification failure
- Evidence hash mismatch

**Channels**:
- Slack for warnings
- PagerDuty for critical

## Future Enhancements

### Phase 2 (Q1 2026)

- [ ] WASM-based OpenCV integration
- [ ] Real-time detection preview
- [ ] Multi-die segmentation
- [ ] Enhanced lighting normalization

### Phase 3 (Q2 2026)

- [ ] Blockchain anchoring automation
- [ ] ML-based classification
- [ ] Video authentication challenges
- [ ] Community audit dashboard

## Related Documentation

- [Independent Detection](./INDEPENDENT_DETECTION.md)
- [Hash Chain](./HASH_CHAIN.md)
- [API Reference](./API_REFERENCE.md)
- [User Tasks](./USER_TASKS.md)

---

**Document Status**: Complete  
**Last Updated**: 2025-10-21  
**Version**: 1.0  
**Owner**: Engineering Team
