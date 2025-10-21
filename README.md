# Competitive Dice Roll Gaming Platform Prototype

## Project Overview
This is a working prototype for a competitive dice roll gaming platform that enables global participants to compete in dice rolling games using video camera verification. The platform ensures fair play through transparent video-based verification and comprehensive anti-cheating mechanisms.

## Features
- **Create or Join Games**: Start a new game session or join existing games with a Game ID
- **Video Camera Verification**: Real-time video feed integration for transparent gameplay
- **Dice Rolling**: Secure dice roll generation with instant results
- **Game Logging**: Complete activity log for all game actions and events
- **Comprehensive Rules**: Detailed game rules and anti-cheating documentation
- **Modern UI**: Beautiful, responsive interface with gradient design

## Security / Anti-Cheating Mechanisms
This prototype includes comprehensive anti-cheating documentation covering:
- Camera positioning detection and verification gestures
- Timestamped video recording and pattern analysis
- Comprehensive session logging and anomaly detection
- Player reputation system and community reporting
- Progressive challenge system and real-time moderation

See [ANTI_CHEATING.md](ANTI_CHEATING.md) for complete details.

## Game Rules
The platform implements clear, comprehensive rules for fair gameplay including:
- Equipment and camera requirements
- Valid roll criteria and verification procedures
- Game session protocols (start, play, end)
- Dispute resolution and technical issue handling
- Code of conduct and penalties

See [GAME_RULES.md](GAME_RULES.md) for complete rules.

## Architecture
The platform consists of:
- **Frontend**: Vanilla JavaScript for lightweight, fast UI with no build dependencies
- **Backend**: Node.js with Express for handling game logic and API endpoints
- **Video Integration**: WebRTC support for camera access and video streaming
- **Static Serving**: Efficient static file serving for production deployment

## Setup Instructions

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/iamislamckennon-crypto/01.git
   cd 01
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Building the Client
```bash
npm run build
```
This compiles the client files into the `client/build/` directory.

### Running the Server
```bash
npm start
```
The server will start on port 3000 (or PORT environment variable if set).

### Development
```bash
npm run dev
```
This builds the client and starts the server in one command.

### Accessing the Application
Open your browser and navigate to `http://localhost:3000`

## API Endpoints

### Health Check
- **GET** `/api/health` - Check server status

### Game Management
- **POST** `/api/game/create` - Create a new game session
- **POST** `/api/game/join` - Join an existing game session
  - Body: `{ "gameId": "string", "playerId": "string" }`
- **POST** `/api/game/roll` - Roll dice in a game
  - Body: `{ "gameId": "string", "playerId": "string" }`

### Documentation
- **GET** `/GAME_RULES.md` - View official game rules
- **GET** `/ANTI_CHEATING.md` - View anti-cheating mechanisms

## Project Structure
```
01/
├── server/
│   └── index.js           # Express server and API endpoints
├── client/
│   ├── public/
│   │   └── index.html     # Main HTML with styles
│   └── src/
│       └── app.js         # Application JavaScript
├── GAME_RULES.md          # Comprehensive game rules
├── ANTI_CHEATING.md       # Anti-cheating mechanisms
├── build-client.sh        # Client build script
├── package.json           # Project dependencies
└── README.md             # This file
```

## Browser Requirements
- Modern browser with WebRTC support
- Camera and microphone permissions for video verification
- JavaScript enabled

## Contributing
This is a prototype addressing GitHub Issues #1, #2, and #3:
1. ✅ Scaffold prototype with video cam capabilities
2. ✅ Define clear rules for competitive gaming
3. ✅ Implement anti-cheating mechanisms documentation

Feel free to contribute improvements, report issues, or suggest new features!