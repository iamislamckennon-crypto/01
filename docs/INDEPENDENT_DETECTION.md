# Independent Dice Detection System

## Overview

The Independent Dice Detection System provides platform-determined dice roll verification without relying on player-declared values. The system uses deterministic computer vision algorithms to detect dice faces from stabilized video frames, building consensus across multiple captures, and maintaining an auditable evidence chain.

## Key Principles

1. **Platform Determination**: The system, not players, determines dice values
2. **Deterministic Processing**: Same input always produces same output
3. **Multi-Frame Consensus**: Requires agreement across 3 stabilized frames
4. **Auditable Evidence**: All detection results are hashed and chained
5. **Opponent Verification**: Uncertain detections require opponent confirmation
6. **Tamper Detection**: Monitors for camera movement, timing violations, and multiple captures

## Architecture

### End-to-End Pipeline

```
1. Pre-Roll Baseline Capture
   ↓
2. Player Rolls Dice
   ↓
3. Camera Stabilization (600ms+)
   ↓
4. Sequential Frame Capture (F1, F2, F3 @ 200ms intervals)
   ↓
5. Client-Side Detection
   - Grayscale conversion (64x64)
   - Frame hashing (SHA-256)
   - Pip detection per frame
   - Consensus building
   ↓
6. Evidence Package Assembly
   - Turn number
   - 3 frame hashes
   - Detected values
   - Timing metadata
   - Algorithm version
   ↓
7. Server Submission & Validation
   - Structure check
   - Timing constraints
   - Evidence hash calculation
   - Hash chain append
   ↓
8. Opponent Confirmation/Dispute
   - Auto-confirm if verified
   - Manual confirm if uncertain
   - Dispute with reason if flagged
   ↓
9. Turn Finalization
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (PWA)                       │
├─────────────────────────────────────────────────────────┤
│  FrameSequenceCapture  │  DiceDetectionPreview         │
│  EvidenceSubmitPanel   │  OpponentConfirmPanel         │
│  DetectionStatusBadge  │                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Vision Utilities                      │
├─────────────────────────────────────────────────────────┤
│  diceDetector.js      │  evidenceBuilder.js            │
│  pixelHash.js         │  pixelDiff.js                  │
│  validation.js        │                                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│            Backend (Cloudflare Workers DO)              │
├─────────────────────────────────────────────────────────┤
│  GameRoomDO                                             │
│   - Evidence storage                                    │
│   - Validation                                          │
│   - Hash chain management                               │
│   - Confirmation/dispute workflow                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  Audit & Verification                   │
├─────────────────────────────────────────────────────────┤
│  verify-chain.js      │  merkle-snapshot.js            │
└─────────────────────────────────────────────────────────┘
```

## Detection Algorithm

### Version: 1.0.0-deterministic-threshold

**Status**: Baseline implementation (placeholder for production CV)

**Method**: Grayscale thresholding with pixel intensity analysis

**Steps**:
1. Downscale frame to 64x64 grayscale
2. Count pixels below threshold (128)
3. Calculate dark pixel ratio
4. Map ratio to dice value (1-6)
5. Assign confidence score

**Limitations**:
- No pip orientation detection
- No multi-die segmentation (>2 dice)
- Lighting sensitive
- No 3D pose estimation

**Future Enhancements** (TODO):
- WASM-based OpenCV integration
- Blob detection for pips
- Edge-based die boundary detection
- ML-based classification (optional)
- Multi-die layout verification

## Evidence Structure

### Evidence Package

```json
{
  "turnNumber": 1,
  "frameHashes": [
    "abc123...",
    "def456...",
    "ghi789..."
  ],
  "diceValues": [4],
  "stabilizationTimeMs": 650,
  "residualMotionScore": 0.12,
  "algorithmVersion": "1.0.0-deterministic-threshold",
  "status": "verified",
  "timestamp": "2025-10-21T10:00:00.000Z"
}
```

### Status Values

- **verified**: All checks passed, high confidence, consensus reached
- **uncertain**: Consensus reached but low confidence OR majority consensus (2/3)
- **flagged**: No consensus (all frames disagree) OR validation failed OR disputed

### Evidence Hash

Canonical JSON representation hashed with SHA-256:

```javascript
evidenceHash = SHA256(JSON.stringify({
  turnNumber,
  frameHashes,
  diceValues,
  stabilizationTimeMs,
  residualMotionScore,
  algorithmVersion,
  status
}))
```

## Validation Rules

### Structure Validation

- ✓ `turnNumber`: positive integer
- ✓ `frameHashes`: exactly 3 SHA-256 hashes (64 hex chars)
- ✓ `diceValues`: non-empty array, all values 1-6
- ✓ `stabilizationTimeMs`: non-negative number
- ✓ `residualMotionScore`: 0.0 to 1.0
- ✓ `algorithmVersion`: non-empty string
- ✓ `status`: verified | uncertain | flagged

### Timing Validation

- ✓ `stabilizationTimeMs >= MIN_STABILIZATION_MS` (default: 600ms)
- ✓ `residualMotionScore <= MAX_RESIDUAL_MOTION` (default: 0.2)

### Tamper Detection

- ✓ Pixel diff ratio between pre-roll and post-roll < `PIXEL_DIFF_THRESHOLD`
- ✓ No multiple evidence submissions per turn
- ✓ Frame capture timing consistency

## Consensus Algorithm

### 3-Frame Consensus

**Perfect Consensus** (all 3 frames agree):
- Status: `verified` if confidence >= 0.7, else `uncertain`

**Majority Consensus** (2 out of 3 agree):
- Status: `uncertain` (requires opponent confirmation)

**No Consensus** (all different):
- Status: `flagged` (cannot submit, must re-roll)

### Confidence Calculation

```javascript
avgConfidence = mean([frame1.confidence, frame2.confidence, frame3.confidence])
consensusRatio = maxVoteCount / totalFrames
overallConfidence = avgConfidence × consensusRatio
```

## Opponent Confirmation Workflow

### Auto-Confirmation
- Status `verified` with high confidence → No action needed

### Manual Confirmation
- Status `uncertain` → Opponent must review and confirm/dispute

### Dispute
- Opponent submits dispute with reason
- Evidence status → `flagged`
- Turn may be re-rolled or escalated

## Hash Chain Integration

### Chain Events

```javascript
// Evidence submission
{
  type: 'evidence_submitted',
  turnNumber: 1,
  playerId: 'player1',
  evidenceHash: 'abc123...',
  timestamp: '2025-10-21T10:00:00.000Z'
}

// Confirmation
{
  type: 'evidence_confirmed',
  turnNumber: 1,
  playerId: 'player2',
  timestamp: '2025-10-21T10:01:00.000Z'
}

// Dispute
{
  type: 'evidence_disputed',
  turnNumber: 1,
  playerId: 'player2',
  reason: 'Incorrect detection',
  timestamp: '2025-10-21T10:02:00.000Z'
}
```

### Verification

Run chain verification:
```bash
node scripts/verify-chain.js --game-room-id=<id> --verify-evidence
```

## Merkle Snapshot

### Purpose
Batch commit event hashes to Merkle tree for future blockchain anchoring.

### Usage
```bash
node scripts/merkle-snapshot.js --events=50 --game-room-id=<id>
```

### Output
- Merkle root hash
- Tree structure summary
- Example proof verification

### Future: Blockchain Anchoring
- Publish Merkle root to Ethereum/Bitcoin
- Enable third-party audit of entire game history
- Immutable timestamp for disputes

## Configuration

### Environment Variables (wrangler.toml)

```toml
MIN_STABILIZATION_MS = 600        # Minimum camera stabilization time
MAX_RESIDUAL_MOTION = 0.2         # Max motion between frames
PIXEL_DIFF_THRESHOLD = 0.35       # Max camera movement detection
MERKLE_BATCH_SIZE = 50            # Events per Merkle snapshot
MAX_POST_ROLL_CAPTURES = 1        # Max evidence submissions per turn
```

### Tuning Guidelines

**Stricter (Production)**:
- `MIN_STABILIZATION_MS = 800`
- `MAX_RESIDUAL_MOTION = 0.15`
- `PIXEL_DIFF_THRESHOLD = 0.3`

**Lenient (Development)**:
- `MIN_STABILIZATION_MS = 400`
- `MAX_RESIDUAL_MOTION = 0.3`
- `PIXEL_DIFF_THRESHOLD = 0.4`

## Limitations & Disclaimers

### Current Limitations

1. **Algorithm Accuracy**: Placeholder threshold algorithm is NOT production-ready
2. **Lighting Sensitivity**: Poor lighting may cause false detections
3. **Multi-Die Support**: Limited to 1-2 dice only
4. **No Pip Orientation**: Cannot verify die face orientation
5. **No Deepfake Detection**: Camera feed tampering not detected

### Known Failure Modes

- **Shadows**: May be detected as pips
- **Reflections**: Glossy dice may cause errors
- **Obstructions**: Fingers or objects blocking view
- **Motion Blur**: Insufficient stabilization
- **Zoom/Distance**: Dice too small or large in frame

### Mitigation

- Require opponent confirmation for uncertain detections
- Allow disputes with reasoning
- Log all evidence for manual review
- Future: Upgrade to WASM CV module

## Security Considerations

### Threat Model

**Attacker Goals**:
- Submit false dice values
- Replay evidence from previous rolls
- Tamper with frame data
- Bypass opponent confirmation

**Defenses**:
- Frame hashing prevents frame tampering
- Evidence hash prevents data modification
- Hash chain prevents replay attacks
- Timing constraints prevent pre-recording
- Pixel diff detects camera movement
- Multiple evidence submission blocked

### Remaining Risks

- **Sophisticated Video Editing**: Deep learning-based frame synthesis
- **Multiple Camera Angles**: Attacker uses pre-recorded video feed
- **Social Engineering**: Convincing opponent to confirm false evidence

### Future Mitigations

- Video authentication challenges (random prompts)
- Liveness detection (motion patterns)
- Blockchain anchoring for immutability
- Community reputation scoring

## Performance

### Client-Side
- Frame capture: ~10ms per frame
- Grayscale conversion: ~5ms
- Detection per frame: ~2ms
- Total pipeline: < 1 second

### Server-Side (Workers)
- Evidence validation: < 10ms
- Hash calculation: < 5ms
- Storage write: < 20ms
- Total: < 50ms

### Cloudflare Workers Limits
- CPU time: 50ms (validation only, detection client-side)
- Memory: < 1MB per evidence package
- Storage: Durable Objects (no practical limit)

## Testing

### Unit Tests
```bash
node tests/unit/validation.test.js
node tests/unit/consensus.test.js
node tests/unit/pixelDiff.test.js
node tests/unit/hashChain.test.js
```

### Integration Tests
```bash
# Full turn simulation
node tests/integration/full-turn.test.js
```

### Manual Testing
1. Start camera feed
2. Capture baseline frame
3. Roll dice
4. Wait for stabilization
5. Capture 3 frames
6. Submit evidence
7. Verify hash chain
8. Test opponent confirmation
9. Test dispute workflow

## Roadmap

### Phase 1 (Current)
- ✓ Deterministic threshold detection
- ✓ Multi-frame consensus
- ✓ Evidence packaging
- ✓ Server validation
- ✓ Hash chain integration
- ✓ Opponent confirmation workflow

### Phase 2 (Q1 2026)
- [ ] WASM OpenCV integration
- [ ] Blob-based pip detection
- [ ] Multi-die segmentation
- [ ] Lighting normalization
- [ ] Frame quality scoring

### Phase 3 (Q2 2026)
- [ ] ML-based classification (optional)
- [ ] 3D pose estimation
- [ ] Video authentication challenges
- [ ] Blockchain anchoring automation
- [ ] Community audit dashboard

## References

- Algorithm versioning: Semantic versioning (semver.org)
- Hash chain design: Certificate Transparency (RFC 6962)
- Merkle trees: Bitcoin SPV (BIP 37)
- Computer vision: OpenCV documentation

---

**Document Status**: Complete  
**Last Updated**: 2025-10-21  
**Version**: 1.0  
**Owner**: Engineering Team
