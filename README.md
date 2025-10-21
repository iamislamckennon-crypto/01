# Competitive Dice Roll Gaming Platform

## Project Overview

Enterprise-grade competitive dice rolling platform built on Cloudflare Workers, Durable Objects, and Pages. Features provably fair dice rolls, real-time multiplayer, commitment-reveal mechanism, transparent fairness verification, and comprehensive anti-cheating systems.

## Architecture

### Core Components

1. **Cloudflare Workers** - API routing and request handling
2. **Durable Objects** - Game room state management with WebSocket support
3. **Cloudflare Pages** - Static asset hosting and PWA delivery
4. **Turnstile** - Bot protection for registration

### Key Features

- **Commitment-Reveal Mechanism**: Cryptographic commitment scheme prevents roll manipulation
- **Hash Chain Integrity**: Each event is cryptographically linked in an immutable chain
- **Fairness Engine**: Chi-square statistical analysis detects biased distributions
- **Reputation System**: Multi-tier player reputation (new → trusted → flagged → suspended)
- **Real-time Updates**: WebSocket broadcasting for live game state synchronization
- **PWA Support**: Offline-first progressive web app with service worker caching
- **Accessibility**: WCAG 2.1 AA compliant UI components
- **Security**: Rate limiting, origin validation, input sanitization

## Project Structure

```
.
├── cloudflare/
│   ├── src/
│   │   ├── index.js           # Worker entry point
│   │   ├── gameroom.js        # Durable Object implementation
│   │   ├── crypto.js          # Hashing & commitment utilities
│   │   ├── fairness.js        # Chi-square fairness engine
│   │   ├── reputation.js      # Reputation tier logic
│   │   ├── turnstile.js       # Turnstile verification
│   │   └── validation.js      # Input validation
│   ├── public/
│   │   ├── index.html         # Main application page
│   │   ├── offline.html       # Offline fallback page
│   │   ├── manifest.json      # PWA manifest
│   │   ├── service-worker.js  # Service worker for offline support
│   │   └── styles.css         # Enterprise-grade CSS
│   └── ui/
│       ├── components/        # Reusable UI components
│       │   ├── Button.jsx
│       │   ├── Card.jsx
│       │   ├── Modal.jsx
│       │   └── LoadingSpinner.jsx
│       ├── hooks/
│       │   └── useWebSocket.js
│       └── store/
│           └── state.js       # Lightweight state management
├── tests/
│   ├── crypto.test.js         # Crypto utility tests
│   ├── fairness.test.js       # Fairness engine tests
│   └── reputation.test.js     # Reputation logic tests
├── wrangler.toml              # Cloudflare Workers configuration
├── USER_TASKS.md              # Production readiness checklist
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/iamislamckennon-crypto/01.git
   cd 01
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create `.dev.vars` file in the root directory:
   ```
   TURNSTILE_SECRET=your-turnstile-secret-here
   ```

4. **Start development server**
   ```bash
   wrangler dev
   ```

5. **Access the application**
   
   Open `http://localhost:8787` in your browser

### Running Tests

```bash
npm test
```

## API Endpoints

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/register` | POST | Register player with Turnstile validation |
| `/api/gameroom/create` | POST | Create new game room |
| `/api/gameroom/:id/join` | POST | Join game room |
| `/api/gameroom/:id/commit` | POST | Submit commitment hash |
| `/api/gameroom/:id/reveal` | POST | Reveal commitment salt |
| `/api/gameroom/:id/roll` | POST | Perform dice roll |
| `/api/gameroom/:id/state` | GET | Get current room state |
| `/api/gameroom/:id/finalize` | POST | Finalize game |
| `/api/gameroom/:id/dispute` | POST | Dispute game result |

### WebSocket

- `/api/gameroom/:id/stream` - Real-time game state updates

### Example: Creating and Joining a Room

```javascript
// Register player
const registerResponse = await fetch('/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'player123',
    turnstileToken: '<token-from-widget>'
  })
});

// Create room
const createResponse = await fetch('/api/gameroom/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const { roomId } = await createResponse.json();

// Join room
const joinResponse = await fetch(`/api/gameroom/${roomId}/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerId: 'player123' })
});

// Connect WebSocket
const ws = new WebSocket(`ws://localhost:8787/api/gameroom/${roomId}/stream`);
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Game update:', message);
};
```

### Example: Commitment-Reveal Flow

```javascript
// 1. Generate commitment
const salt = crypto.randomUUID();
const playerId = 'player123';
const turnNumber = 1;
const commitmentHash = await sha256(`${salt}${playerId}${turnNumber}`);

// 2. Submit commitment
await fetch(`/api/gameroom/${roomId}/commit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerId, commitmentHash })
});

// 3. Reveal salt
await fetch(`/api/gameroom/${roomId}/reveal`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerId, salt })
});

// 4. Perform roll
const rollResponse = await fetch(`/api/gameroom/${roomId}/roll`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerId })
});
const { rollResult, fairnessStatus } = await rollResponse.json();
```

## Deployment

### Production Deployment

1. **Configure secrets**
   ```bash
   wrangler secret put TURNSTILE_SECRET
   ```

2. **Update wrangler.toml**
   
   Set production environment variables:
   ```toml
   [vars]
   ORIGIN_ALLOWED = "https://yourdomain.com"
   MAX_ROLLS_PER_MINUTE = "60"
   ```

3. **Deploy to Cloudflare**
   ```bash
   wrangler deploy
   ```

4. **Deploy static assets to Pages**
   ```bash
   wrangler pages deploy cloudflare/public
   ```

5. **Complete production checklist**
   
   See [USER_TASKS.md](USER_TASKS.md) for full production readiness checklist (40+ tasks)

## Security Features

- **Turnstile Bot Protection**: Prevents automated abuse
- **Rate Limiting**: Per-IP limits on sensitive endpoints
- **CORS Protection**: Origin validation
- **Input Validation**: Strict schema validation
- **Commitment Verification**: Cryptographic proof of fairness
- **Hash Chain Integrity**: Immutable event history
- **Violation Tracking**: Automatic flagging and suspension

## Fairness Verification

The platform uses chi-square statistical testing to detect unfair dice distributions:

1. After minimum sample size (default: 30 rolls), chi-square test runs
2. p-value computed and compared to significance level (alpha = 0.05)
3. Status assigned: `normal` | `observe` | `suspect`
4. Suspicious patterns flagged and logged

Players can verify fairness by:
- Checking distribution charts in real-time
- Reviewing fairness status badge
- Inspecting hash chain integrity

## Future Enhancements

See `TODO` comments in source code for integration points:

- **VRF Integration**: On-chain verifiable random function
- **Computer Vision**: Physical dice recognition pipeline
- **Analytics Export**: Push metrics to R2 or external aggregator
- **Merkle Anchoring**: Automated hash chain snapshots to blockchain
- **Tournament System**: Multi-player competitions
- **Hardware Dice**: IoT device integration

## Contributing

Contributions welcome! Please ensure:

1. All tests pass
2. Code follows existing style
3. Security best practices maintained
4. Accessibility standards met (WCAG 2.1 AA)

## License

See LICENSE file for details.

## Support

For issues, questions, or feature requests, please open a GitHub issue.