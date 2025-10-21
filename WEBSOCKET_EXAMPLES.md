# WebSocket Client Examples

This document provides example code for connecting to the game room WebSocket API.

## JavaScript (Browser)

### Basic Connection

```javascript
const roomId = 'your-room-id';
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}/api/gameroom/${roomId}/stream`;

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log('Connected to game room');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
  
  // Handle different message types
  switch (message.type) {
    case 'state':
      console.log('Current game state:', message.payload);
      break;
    case 'player_joined':
      console.log('Player joined:', message.payload.playerId);
      break;
    case 'roll':
      console.log('Roll result:', message.payload.rollResult);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from game room');
};

// Send a message (optional, currently server doesn't expect client messages)
ws.send(JSON.stringify({ type: 'ping' }));
```

### With Reconnection Logic

```javascript
class GameRoomClient {
  constructor(roomId) {
    this.roomId = roomId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }
  
  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/gameroom/${this.roomId}/stream`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('Connected to game room');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.emit(message.type, message.payload);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected from game room');
      this.emit('disconnected');
      this.attemptReconnect();
    };
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage
const client = new GameRoomClient('room-123');

client.on('connected', () => {
  console.log('Successfully connected!');
});

client.on('state', (state) => {
  console.log('Game state:', state);
  updateUI(state);
});

client.on('roll', (payload) => {
  console.log('Roll result:', payload.rollResult);
  displayRoll(payload.rollResult);
});

client.on('player_joined', (payload) => {
  console.log('New player:', payload.playerId);
  addPlayerToList(payload.playerId);
});

client.connect();

// Later, disconnect
// client.disconnect();
```

## Node.js

### Using ws Library

```javascript
import WebSocket from 'ws';

const roomId = 'your-room-id';
const wsUrl = `wss://yourdomain.com/api/gameroom/${roomId}/stream`;

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('Connected to game room');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message);
  
  switch (message.type) {
    case 'state':
      handleState(message.payload);
      break;
    case 'roll':
      handleRoll(message.payload);
      break;
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from game room');
});
```

## Python

### Using websockets Library

```python
import asyncio
import json
import websockets

async def connect_to_room(room_id):
    uri = f"wss://yourdomain.com/api/gameroom/{room_id}/stream"
    
    async with websockets.connect(uri) as websocket:
        print("Connected to game room")
        
        try:
            async for message in websocket:
                data = json.loads(message)
                print(f"Received: {data}")
                
                message_type = data.get('type')
                payload = data.get('payload', {})
                
                if message_type == 'state':
                    handle_state(payload)
                elif message_type == 'roll':
                    handle_roll(payload)
                elif message_type == 'player_joined':
                    handle_player_joined(payload)
                    
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed")

def handle_state(state):
    print(f"Game state: {state}")

def handle_roll(payload):
    print(f"Roll result: {payload['rollResult']}")

def handle_player_joined(payload):
    print(f"Player joined: {payload['playerId']}")

# Run
asyncio.run(connect_to_room('room-123'))
```

## React Hook

### Custom useGameRoom Hook

```javascript
import { useEffect, useRef, useState } from 'react';

export function useGameRoom(roomId) {
  const [state, setState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  
  useEffect(() => {
    if (!roomId) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/gameroom/${roomId}/stream`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'state') {
        setState(message.payload);
      } else {
        // Handle other message types
        console.log('Event:', message.type, message.payload);
      }
    };
    
    ws.onerror = (err) => {
      setError('Connection error');
    };
    
    ws.onclose = () => {
      setIsConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, [roomId]);
  
  return {
    state,
    isConnected,
    error
  };
}

// Usage in component
function GameRoom({ roomId }) {
  const { state, isConnected, error } = useGameRoom(roomId);
  
  if (error) return <div>Error: {error}</div>;
  if (!isConnected) return <div>Connecting...</div>;
  if (!state) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Room: {state.id}</h2>
      <p>Status: {state.status}</p>
      <p>Players: {state.players.length}</p>
      <p>Total Rolls: {state.totalRolls}</p>
      <p>Fairness: {state.fairnessStatus}</p>
    </div>
  );
}
```

## Message Types

### Server → Client Messages

#### 1. state
Initial game state sent on connection:
```json
{
  "type": "state",
  "payload": {
    "id": "room-123",
    "status": "active",
    "players": [...],
    "turnIndex": 5,
    "totalRolls": 42,
    "fairnessStatus": "normal",
    "distribution": { "1": 7, "2": 8, ... }
  }
}
```

#### 2. player_joined
New player joins the room:
```json
{
  "type": "player_joined",
  "payload": {
    "playerId": "player456",
    "eventHash": "abc123..."
  }
}
```

#### 3. commitment_made
Player submits commitment:
```json
{
  "type": "commitment_made",
  "payload": {
    "playerId": "player456",
    "turnNumber": 5,
    "eventHash": "def456..."
  }
}
```

#### 4. commitment_revealed
Player reveals commitment:
```json
{
  "type": "commitment_revealed",
  "payload": {
    "playerId": "player456",
    "valid": true,
    "eventHash": "ghi789..."
  }
}
```

#### 5. roll
Dice roll result:
```json
{
  "type": "roll",
  "payload": {
    "playerId": "player456",
    "rollResult": 4,
    "fairnessStatus": "normal",
    "eventHash": "jkl012..."
  }
}
```

#### 6. game_finalized
Game completed:
```json
{
  "type": "game_finalized",
  "payload": {
    "eventHash": "mno345..."
  }
}
```

#### 7. game_disputed
Game disputed:
```json
{
  "type": "game_disputed",
  "payload": {
    "playerId": "player456",
    "reason": "unfair_distribution",
    "eventHash": "pqr678..."
  }
}
```

## Testing WebSocket Connection

### Using websocat (CLI tool)

```bash
# Install websocat
brew install websocat  # macOS
# or
cargo install websocat  # Rust

# Connect to WebSocket
websocat wss://yourdomain.com/api/gameroom/room-123/stream

# You'll see messages as they arrive
```

### Using wscat (npm)

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c wss://yourdomain.com/api/gameroom/room-123/stream
```

### Using Browser DevTools

```javascript
// Open browser console and run:
const ws = new WebSocket('wss://yourdomain.com/api/gameroom/room-123/stream');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

## Best Practices

1. **Always handle connection errors** - Network issues are common
2. **Implement reconnection logic** - Don't leave users hanging
3. **Parse JSON safely** - Use try-catch around JSON.parse
4. **Clean up on unmount** - Close WebSocket when component unmounts
5. **Rate limit reconnections** - Use exponential backoff
6. **Show connection status** - Let users know if they're connected
7. **Handle message order** - Use event hashes to verify integrity
8. **Validate message types** - Check message.type before processing

## Troubleshooting

### Connection Refused

- Check if room ID exists
- Verify WebSocket endpoint is correct
- Ensure SSL/TLS is configured (use wss:// not ws:// in production)

### Connection Drops

- Implement heartbeat/ping mechanism
- Use reconnection logic
- Check Cloudflare WebSocket limits (no timeout by default)

### Messages Not Received

- Check browser console for errors
- Verify WebSocket is in OPEN state (ws.readyState === 1)
- Ensure server is broadcasting to connected clients
