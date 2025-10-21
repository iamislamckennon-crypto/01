# Future Integration Points

This document outlines planned integrations and enhancement points marked with TODO comments in the codebase.

## VRF Integration

**Location**: `cloudflare/src/gameroom.js` - `handleRoll` method

**Purpose**: Replace crypto.getRandomValues with on-chain verifiable random function (VRF) for enhanced trustless randomness.

**Implementation Notes**:
```javascript
// TODO: VRF integration point
// Replace rollDice() with VRF call:
// const vrf = await fetchVRFProof(roomId, turnNumber);
// const rollResult = vrf.value;
// Store vrf.proof for verification
```

**Requirements**:
- Smart contract deployment on supported chain (Ethereum, Polygon, etc.)
- VRF oracle integration (Chainlink VRF recommended)
- Proof verification mechanism
- Gas cost management

---

## Computer Vision Pipeline

**Location**: `cloudflare/src/gameroom.js` - future method `processPhysicalRoll`

**Purpose**: Analyze camera feed to detect and verify physical dice rolls.

**Implementation Notes**:
```javascript
// TODO: CV pipeline hook
// async function processPhysicalRoll(videoFrame) {
//   const result = await cvService.detectDice(videoFrame);
//   if (!result.confident) throw new Error('Unclear roll');
//   return result.value;
// }
```

**Requirements**:
- TensorFlow.js or similar CV library
- Pre-trained dice recognition model
- Edge detection and OCR for die face reading
- Confidence scoring threshold
- Video frame capture API integration

---

## Analytics Export

**Location**: `cloudflare/src/gameroom.js` - `logMetric` method

**Purpose**: Export structured metrics to R2 storage or external analytics platform.

**Implementation Notes**:
```javascript
// TODO: Analytics export
// After logMetric call, batch and push to R2:
// await env.ANALYTICS_BUCKET.put(
//   `metrics/${date}/${roomId}.json`,
//   JSON.stringify(metricsBuffer)
// );
```

**Requirements**:
- R2 bucket configuration
- Batching strategy (time-based or count-based)
- Schema definition for analytics events
- Query/analysis pipeline (e.g., Athena, BigQuery)
- Data retention and archival policy

---

## Automated Merkle Anchor

**Location**: `cloudflare/src/gameroom.js` - `finalize` method

**Purpose**: Automatically compute Merkle tree of hash chain and anchor to blockchain for tamper-proof audit trail.

**Implementation Notes**:
```javascript
// TODO: Automated Merkle anchor
// On finalize:
// const merkleRoot = computeMerkleRoot(gameState.rollEvents);
// await blockchainService.anchor(merkleRoot, gameState.id);
// Store txHash for verification
```

**Requirements**:
- Merkle tree library (e.g., merkletreejs)
- Blockchain anchor service (smart contract or API)
- Transaction signing and submission
- Verification endpoint for Merkle proof
- Cost optimization (batch multiple rooms)

---

## Tournament System

**Location**: New file `cloudflare/src/tournament.js`

**Purpose**: Multi-player tournament brackets with elimination or round-robin formats.

**Implementation Notes**:
```javascript
// TODO: Tournament system
// class TournamentDurable extends DurableObject {
//   async createBracket(players, format);
//   async advanceRound(winners);
//   async getStandings();
// }
```

**Requirements**:
- Tournament Durable Object class
- Bracket generation algorithms
- Match scheduling and pairing
- Leaderboard aggregation
- Prize distribution logic (if applicable)

---

## Enhanced Rate Limiting

**Location**: `cloudflare/src/index.js` - `isRateLimited` function

**Purpose**: Implement distributed rate limiting using Durable Objects for consistency.

**Implementation Notes**:
```javascript
// TODO: Distributed rate limiting
// Replace in-memory map with Durable Object:
// const limiter = env.RATE_LIMITER.get(durableObjectId);
// const allowed = await limiter.checkLimit(key, limit);
```

**Requirements**:
- RateLimiter Durable Object
- Sliding window or token bucket algorithm
- Per-user and per-IP tracking
- Configurable limits per endpoint

---

## Player Profiles

**Location**: New file `cloudflare/src/profiles.js`

**Purpose**: Persistent player profiles with stats, achievements, and preferences.

**Implementation Notes**:
```javascript
// TODO: Player profiles
// Store in KV or D1:
// await env.PLAYER_PROFILES.put(playerId, JSON.stringify(profile));
```

**Requirements**:
- KV namespace or D1 database
- Profile schema (stats, settings, avatar)
- Privacy controls
- Social features (friends, blocking)

---

## Multi-language Support

**Location**: `cloudflare/public/index.html` and UI components

**Purpose**: Internationalization (i18n) for global user base.

**Implementation Notes**:
```javascript
// TODO: i18n
// Use i18n library:
// const t = useTranslation();
// <h1>{t('welcome.title')}</h1>
```

**Requirements**:
- Translation files (JSON format)
- Language detection from browser
- Language switcher UI
- RTL support for Arabic, Hebrew, etc.

---

## Mobile App Integration

**Location**: New directory `mobile/`

**Purpose**: React Native or Flutter mobile applications.

**Implementation Notes**:
- Share core logic with web (TypeScript)
- Native WebSocket and API clients
- Push notifications for game events
- Biometric authentication

**Requirements**:
- Mobile development framework
- App store deployment
- Deep linking for room invites
- Offline mode with sync

---

## Testing Enhancements

**Location**: `tests/` directory

**Purpose**: Expand test coverage to include integration and E2E tests.

**Implementation Notes**:
```javascript
// TODO: Integration tests
// Test full game flow with miniflare:
// describe('Game flow', () => {
//   it('should complete full game', async () => {
//     // Create, join, commit, reveal, roll
//   });
// });
```

**Requirements**:
- Miniflare for local Durable Objects testing
- Playwright or Puppeteer for E2E
- CI/CD pipeline integration
- Performance benchmarking

---

## Priority Matrix

| Feature | Priority | Complexity | Impact |
|---------|----------|------------|--------|
| Analytics Export | High | Low | High |
| Enhanced Rate Limiting | High | Medium | Medium |
| VRF Integration | Medium | High | High |
| Tournament System | Medium | High | High |
| Player Profiles | Medium | Medium | Medium |
| CV Pipeline | Low | Very High | Medium |
| Merkle Anchor | Low | Medium | Low |
| Mobile App | Low | Very High | High |
| Multi-language | Low | Low | Medium |
| Testing Enhancements | High | Medium | High |

---

## Implementation Timeline

**Phase 2 (Post-Launch)**:
- Analytics Export
- Enhanced Rate Limiting
- Testing Enhancements

**Phase 3 (Q2)**:
- Player Profiles
- Tournament System
- Multi-language Support

**Phase 4 (Q3+)**:
- VRF Integration
- Mobile App
- CV Pipeline
- Merkle Anchor
