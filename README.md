# Remote Physical Dice Rolling Platform

A production-feasible competitive dice rolling platform where two remote players physically roll dice under deterministic, auditable constraints with cryptographic commitment-reveal protocol.

## 🎲 Key Features

- **Physical Dice Rolls**: No server RNG - players roll real physical dice
- **Commitment-Reveal Protocol**: Cryptographic binding prevents post-roll manipulation
- **Video Streaming**: WebRTC peer-to-peer with first-person/third-person perspectives
- **Frame Hashing**: Pre/post-roll camera snapshots for tamper detection
- **Fairness Monitoring**: Simple deviation-based anomaly detection (no ML)
- **Reputation System**: Deterministic tiers (NEW → TRUSTED → FLAGGED → SUSPENDED)
- **Hash Chain Audit**: Immutable event log with external verification
- **PWA**: Installable progressive web app with offline support
- **Anti-Bot**: Cloudflare Turnstile integration

## 🏗️ Architecture

Built on **Cloudflare Workers** with:
- **Durable Objects**: Authoritative game state per room
- **WebRTC**: Peer-to-peer video streaming
- **WebSocket**: Real-time state updates
- **Service Worker**: Offline-first PWA

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed flow diagrams and component breakdown.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Open browser to http://localhost:8787
```

### Testing

```bash
# Run unit tests
npm test

# Verify hash chain (with test data)
node scripts/verify-chain.js --test

# Verify live game
node scripts/verify-chain.js <roomId> http://localhost:8787
```

### Deployment

```bash
# Set secrets
wrangler secret put TURNSTILE_SECRET

# Deploy to Cloudflare Workers
npm run deploy
```

## 📖 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, data flows, security mechanisms
- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete endpoint documentation with examples
- **[HASH_CHAIN.md](HASH_CHAIN.md)** - Hash chain algorithm, verification, security properties
- **[USER_TASKS.md](USER_TASKS.md)** - Production readiness checklist (47+ tasks)

### Research Documentation

The platform development is guided by comprehensive research into fairness, anti-cheat mechanisms, cryptographic randomness, and trust systems:

- **[Research Plan](RESEARCH_PLAN.md)** - Research objectives across 8 dimensions
- **[Research Sources](RESEARCH_SOURCES.md)** - Curated academic papers, projects, standards
- **[Decision Log](docs/DECISION_LOG.md)** - Architectural decision records

## 🎮 How to Play

1. **Register** with a player ID
2. **Create** a new game room or **Join** an existing one
3. **Complete** the pre-roll checklist:
   - ✓ Flat surface
   - ✓ Standard 6-sided dice
   - ✓ Adequate lighting
   - ✓ Camera fixed in position
4. **Capture** pre-roll frame (camera snapshot)
5. **Commit** to your roll (generates cryptographic commitment)
6. **Reveal** your salt within 30 seconds
7. **Roll** your physical dice
8. **Declare** the result and capture post-roll frame
9. **Finalize** turn - system validates and advances to opponent

## 🔐 Security Mechanisms

### Commitment-Reveal Protocol
```
Salt (UUID) + Player ID + Turn Number
    ↓ SHA-256
Commitment Hash
    ↓ (recorded)
Physical Roll
    ↓
Reveal Salt
    ↓ (verified)
Declare Result
```

Prevents changing declared value after seeing opponent's roll.

### Frame Hashing
- Pre-roll and post-roll camera snapshots captured
- 64x64 grayscale frames hashed with SHA-256
- Detects camera movement during roll
- TODO: Implement pixel diff threshold

### Hash Chain
Every game event cryptographically linked:
```
genesis → event1 → event2 → event3 → ... → tip
```

External verification ensures tamper-evidence.

### Timing Windows
- **Reveal**: 30s after commitment
- **Declare**: 30s after reveal
- Violations recorded in player reputation

## 🧪 Testing

### Unit Tests (18 tests)
```bash
npm test
```

Tests cover:
- ✅ Crypto utilities (commitment, hash chain)
- ✅ Fairness calculations
- ✅ Reputation tier logic

### Integration Testing

1. Open two browser windows at `http://localhost:8787`
2. Player 1: Create room
3. Player 2: Join room (copy room ID)
4. Complete 3+ turns
5. Verify hash chain: `node scripts/verify-chain.js <roomId> http://localhost:8787`

## 📦 Project Structure

```
├── src/
│   ├── index.js              # Worker router
│   ├── GameRoomDO.js         # Durable Object
│   └── utils/
│       ├── crypto.js         # SHA-256, commitment, hash chain
│       ├── fairness.js       # Deviation tracking
│       ├── reputation.js     # Tier computation
│       └── validation.js     # Input validation
├── public/
│   ├── index.html            # PWA shell
│   ├── app.js                # Main app logic
│   ├── webrtc.js             # WebRTC manager
│   ├── style.css             # Light/dark theme
│   ├── service-worker.js     # Offline support
│   ├── manifest.json         # PWA manifest
│   └── offline.html          # Offline fallback
├── scripts/
│   └── verify-chain.js       # Hash chain verification
├── tests/
│   ├── crypto.test.js        # Crypto tests
│   ├── fairness.test.js      # Fairness tests
│   └── reputation.test.js    # Reputation tests
├── wrangler.toml             # Cloudflare config
└── package.json
```

## 🌐 Environment Variables

Set in `wrangler.toml`:

```toml
ORIGIN_ALLOWED = "http://localhost:8787,https://your-domain.com"
PRE_COMMIT_WINDOW = "60000"   # 60 seconds
REVEAL_WINDOW = "30000"       # 30 seconds
DECLARE_WINDOW = "30000"      # 30 seconds
MIN_SAMPLE = "10"             # Minimum rolls for fairness
SUSPEND_THRESHOLD = "5"       # Violations before ban
```

Secrets (via `wrangler secret put`):
```
TURNSTILE_SECRET              # Cloudflare Turnstile key
```

## 🚧 Known Limitations

### Explicitly Not Implemented
- ❌ Computer vision pip detection
- ❌ ML-based anomaly detection
- ❌ Blockchain anchoring
- ❌ Advanced tournament system
- ❌ Hardware dice sensors

### TODO
- [ ] Pixel diff for camera movement detection
- [ ] Merkle tree snapshots for batch verification
- [ ] TURN server for restrictive NATs
- [ ] Multi-room lobby
- [ ] Frame image storage (encrypted)

See [USER_TASKS.md](USER_TASKS.md) for complete production checklist.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

## 📄 License

[Specify your license]

## 🙏 Acknowledgments

Research informed by academic literature on:
- Cryptographic commitment schemes
- Verifiable Random Functions (VRF)
- Reputation systems (ELO, Glicko, Bayesian trust)
- Merkle trees and hash chains
- WebRTC security

See [RESEARCH_SOURCES.md](RESEARCH_SOURCES.md) for citations.

---

**Status**: Work in Progress (WIP)  
**Version**: 1.0.0  
**Last Updated**: 2025-10-21