# Competitive Dice Roll Gaming Platform Prototype

## Project Overview
This project is a competitive dice roll gaming platform prototype that allows users to participate in thrilling dice rolling games with a competitive edge.

## Features
- Real-time multiplayer gaming
- Intuitive user interface
- Various game modes and rules
- Leaderboard tracking
- **Physical Dice Detection System** (Phase 1 Complete)
  - System-controlled dice value extraction from video frames
  - Multi-frame consensus validation
  - Camera movement and timing violation detection
  - Cryptographic hash chain audit trail
  - Opponent confirmation for uncertain detections

## Security / Anti-Cheating Mechanisms
- Secure random number generation for dice rolls
- Player authentication and session management
- Monitoring and logging of all game actions to detect anomalies
- **Independent Physical Dice Detection**
  - Deterministic pip detection (client-side)
  - Multi-frame consensus (≥2/3 frames must agree)
  - Tamper detection (camera movement, timing violations)
  - Hash chain integrity verification
  - Limited reroll mechanism for disputes

## Architecture
The architecture of the platform consists of:
- Frontend: Built with React.js for a responsive user experience.
- Backend: Node.js with Express for handling game logic and user sessions.
- Database: MongoDB for storing user data and game records.
- **Detection Pipeline:**
  - Client-side frame capture and stabilization
  - Deterministic pip detection (grayscale + threshold + blob analysis)
  - Evidence package generation with cryptographic hashes
  - Server-side consensus validation and hash chain integration

## Physical Dice Detection Pipeline

### Overview
Phase 1 of the independent detection system is now complete, allowing the platform (not players) to extract dice face values from video frames. This eliminates manual value entry and provides cryptographic proof of game integrity.

### Key Features
1. **Client-Side Detection**
   - Baseline surface capture (F0)
   - Motion-based stabilization detection
   - 3-frame consensus capture (F1, F2, F3)
   - Simple blob detection for pip counting

2. **Server-Side Verification**
   - Evidence structure validation
   - Consensus logic (≥2/3 frames must agree)
   - Timing enforcement (10s detection window)
   - Camera movement violation detection

3. **Hash Chain Integration**
   - ROLL_EVIDENCE event type
   - Cryptographic audit trail
   - Tamper-evident recording
   - External verification support

4. **Dispute Resolution**
   - Opponent confirmation workflow
   - Limited reroll mechanism (3 max per turn)
   - Violation tracking

### Documentation
- **[API Reference](docs/API_REFERENCE.md)** - Complete endpoint documentation with examples
- **[Hash Chain Architecture](docs/HASH_CHAIN.md)** - Event types and verification process
- **[Vision Plan](docs/VISION_PLAN.md)** - Roadmap and future enhancements
- **[User Tasks](docs/USER_TASKS.md)** - Operator procedures and guidelines

### Limitations (Phase 1)
- Single die only (multi-die planned for Phase 2)
- Simple blob detection (ML/CV enhancements in Phase 3)
- In-memory storage (persistent database in production)
- Basic lighting tolerance (glare compensation in Phase 2)

## Research
The platform development is guided by comprehensive research into fairness, anti-cheat mechanisms, cryptographic randomness, and trust systems. Our research framework ensures evidence-based decision making and transparency.

### Research Documentation
- **[Research Plan](RESEARCH_PLAN.md)** - Detailed research objectives, methodology, evaluation criteria, and deliverables across 8 key dimensions:
  - Existing Platforms & Benchmarks
  - Randomness & Fairness (VRF, commit-reveal, randomness beacons)
  - Anti-Cheat & Verification (computer vision, video authentication)
  - Reputation & Trust Models (ELO, Glicko, Bayesian trust)
  - Audit & Transparency (Merkle trees, blockchain anchoring)
  - Community Sentiment & Adoption
  - Risk & Ethical Considerations
  - Competitive & Differentiation Analysis

- **[Research Sources](RESEARCH_SOURCES.md)** - Living catalog of curated references including academic papers, open-source projects, standards, and community discussions

- **[Decision Log](docs/DECISION_LOG.md)** - Architectural decision records documenting context, alternatives, rationale, and follow-up actions

### Research Automation
The `scripts/research/collect_sources.js` script provides scaffolding for future automated research source collection, classification, and scoring:

```bash
node scripts/research/collect_sources.js
```

This script outlines planned tasks for source discovery across all research dimensions and provides integration points for future automation.

## Setup Instructions
1. Clone the repository: `git clone https://github.com/iamislamckennon-crypto/01.git`
2. Navigate to the project directory: `cd 01`
3. Install dependencies: `npm install`
4. Start the development server: `npm start`
5. Open your browser and go to `http://localhost:3000`

## Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

### Detection Pipeline
- `POST /api/gameroom/:id/submit-evidence` - Submit dice detection evidence
- `POST /api/gameroom/:id/confirm-opponent` - Confirm or dispute detected value
- `POST /api/gameroom/:id/request-reroll` - Request reroll due to disagreement
- `GET /api/gameroom/:id/hash-chain` - Get hash chain for verification

See [API_REFERENCE.md](docs/API_REFERENCE.md) for complete documentation.

## Hash Chain Verification

Verify the integrity of an exported hash chain:

```bash
node scripts/verify-hash-chain.js <chain-export.json>
```

Example:
```bash
# Export chain from API
curl http://localhost:3000/api/gameroom/game123/hash-chain > chain.json

# Verify integrity
node scripts/verify-hash-chain.js chain.json
```

Feel free to contribute to the project or suggest features!