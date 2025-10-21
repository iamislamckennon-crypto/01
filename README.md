# Competitive Dice Roll Gaming Platform Prototype

## Project Overview
This project is a competitive dice roll gaming platform prototype that allows users to participate in thrilling dice rolling games with a competitive edge.

## Features
- Real-time multiplayer gaming
- Intuitive user interface
- Various game modes and rules
- Leaderboard tracking

## Security / Anti-Cheating Mechanisms
- Secure random number generation for dice rolls
- Player authentication and session management
- Monitoring and logging of all game actions to detect anomalies
- **Independent dice roll detection** - platform-determined dice values from video evidence

## Independent Dice Detection

The platform implements an automated dice detection system that removes reliance on player-declared values:

- **Multi-Frame Consensus**: Captures 3 stabilized frames and builds consensus
- **Deterministic Processing**: Same input always produces same output
- **Tamper Detection**: Monitors camera movement, timing violations, and frame manipulation
- **Auditable Evidence**: All detections hashed and chained for verification
- **Opponent Confirmation**: Uncertain detections require opponent review

### How It Works

1. **Pre-Roll**: Capture baseline frame before roll
2. **Roll**: Player rolls physical dice
3. **Stabilization**: Wait 600ms+ for camera to stabilize
4. **Capture**: Take 3 frames at 200ms intervals
5. **Detection**: Client-side deterministic pip detection
6. **Consensus**: Build agreement across frames
7. **Submit**: Package evidence and send to server
8. **Verify**: Server validates timing, structure, and hashes
9. **Confirm**: Opponent confirms or disputes detection

### Detection Status

- **Verified**: All checks passed, high confidence
- **Uncertain**: Requires opponent confirmation
- **Flagged**: Detection failed or disputed

### Disclaimers

⚠️ **Current Implementation**: Uses placeholder threshold algorithm (not production-ready)
⚠️ **Limitations**: Lighting sensitive, limited to 1-2 dice, no deepfake detection
⚠️ **Future**: Will integrate WASM-based OpenCV for production use

See [INDEPENDENT_DETECTION.md](docs/INDEPENDENT_DETECTION.md) for complete documentation.

## Architecture
The architecture of the platform consists of:
- Frontend: Built with React.js for a responsive user experience.
- Backend: Node.js with Express for handling game logic and user sessions.
- Database: MongoDB for storing user data and game records.

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

Feel free to contribute to the project or suggest features!