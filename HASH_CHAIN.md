# Hash Chain Documentation

## Overview

The hash chain is an immutable, tamper-evident audit trail of all game events. Each event is cryptographically linked to the previous event, making it impossible to alter past events without detection.

## Purpose

1. **Auditability**: External parties can verify game integrity
2. **Tamper Evidence**: Any modification breaks the chain
3. **Transparency**: Complete event history available
4. **Dispute Resolution**: Objective record for review

## Algorithm

### 1. Canonical Event Serialization

Events are serialized to deterministic JSON with sorted keys:

```javascript
function canonicalizeEvent(event) {
  // Recursively sort all object keys
  const sortKeys = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = sortKeys(obj[key]);
        return result;
      }, {});
  };
  return JSON.stringify(sortKeys(event));
}
```

**Example:**
```javascript
Input:  { z: 3, a: 1, m: { y: 2, x: 1 } }
Output: '{"a":1,"m":{"x":1,"y":2},"z":3}'
```

### 2. Hash Computation

Each event hash includes the previous hash:

```javascript
async function chainHash(prevHash, canonicalEventJson) {
  const combined = `${prevHash}:${canonicalEventJson}`;
  return await sha256(combined);
}
```

### 3. Chain Structure

```
Genesis (prevHash = "genesis")
    ↓
Event 0
  canonical: '{"players":["alice","bob"],"timestamp":1234567890,"type":"game_started"}'
  prevHash: "genesis"
  hash: SHA256("genesis:" + canonical)
    ↓
Event 1
  canonical: '{"playerId":"alice","preFrameHash":"...","postFrameHash":"...","timestamp":1234567900,"turnNumber":1,"type":"turn_completed","value":3}'
  prevHash: <hash of event 0>
  hash: SHA256(<hash of event 0> + ":" + canonical)
    ↓
Event 2
  prevHash: <hash of event 1>
  hash: SHA256(<hash of event 1> + ":" + canonical)
    ↓
...
    ↓
Current Tip: <hash of event N>
```

## Event Types

### game_started
Records when two players join and game begins.

```json
{
  "type": "game_started",
  "timestamp": 1234567890,
  "players": ["player1", "player2"],
  "prevHash": "genesis",
  "hash": "computed_hash"
}
```

### turn_completed
Records a finalized turn with all details.

```json
{
  "type": "turn_completed",
  "turnNumber": 1,
  "playerId": "player1",
  "value": 4,
  "timestamp": 1234567900,
  "preFrameHash": "pre_frame_hash",
  "postFrameHash": "post_frame_hash",
  "prevHash": "previous_event_hash",
  "hash": "computed_hash"
}
```

### dispute_raised
Records when a player disputes the game.

```json
{
  "type": "dispute_raised",
  "playerId": "player2",
  "reason": "Camera moved during roll",
  "timestamp": 1234567910,
  "turnNumber": 2,
  "prevHash": "previous_event_hash",
  "hash": "computed_hash"
}
```

## Verification Process

### Automated Script

Use `scripts/verify-chain.js` to verify a game's hash chain:

```bash
# Verify live game
node scripts/verify-chain.js <roomId> <apiUrl>

# Example
node scripts/verify-chain.js abc123 http://localhost:8787

# Test with sample data
node scripts/verify-chain.js --test
```

### Manual Verification Steps

1. **Fetch game state:**
   ```bash
   curl http://localhost:8787/api/gameroom/ROOM_ID/state > state.json
   ```

2. **Extract events:**
   ```javascript
   const { rollEvents, hashChainTip } = JSON.parse(state);
   ```

3. **Verify each event:**
   ```javascript
   let prevHash = 'genesis';
   
   for (const event of rollEvents) {
     // Check prevHash matches
     if (event.prevHash !== prevHash) {
       throw new Error('Chain broken: prevHash mismatch');
     }
     
     // Remove hash fields from event
     const { hash, prevHash: _, ...eventData } = event;
     
     // Compute canonical form
     const canonical = canonicalizeEvent(eventData);
     
     // Compute expected hash
     const expectedHash = await chainHash(prevHash, canonical);
     
     // Verify hash matches
     if (expectedHash !== event.hash) {
       throw new Error('Chain broken: hash mismatch');
     }
     
     prevHash = event.hash;
   }
   
   // Verify final tip matches
   if (prevHash !== hashChainTip) {
     throw new Error('Tip mismatch');
   }
   
   console.log('✅ Chain verified successfully');
   ```

## Security Properties

### 1. Tamper Evidence

**Scenario**: Attacker modifies event N

**Detection**:
- Event N+1's `prevHash` no longer matches modified event N's hash
- Chain is broken at that point
- Verification script fails

### 2. Insertion Resistance

**Scenario**: Attacker tries to insert new event between N and N+1

**Detection**:
- New event's `prevHash` would match event N
- But event N+1's `prevHash` still points to original event N
- Chain is broken
- Verification script fails

### 3. Reordering Resistance

**Scenario**: Attacker reorders events N and N+1

**Detection**:
- Event hashes include canonical event data (including turnNumber, timestamp)
- Reordered events produce different hashes
- Subsequent events' `prevHash` fields don't match
- Verification script fails

### 4. Deletion Resistance

**Scenario**: Attacker deletes event N

**Detection**:
- Event N+1's `prevHash` expects hash of event N
- Event N is missing
- Verification script fails

## Storage and Access

### In Durable Object

```javascript
{
  rollEvents: [
    { /* event 0 */ },
    { /* event 1 */ },
    // ...
  ],
  hashChainTip: "current_hash"
}
```

### Via API

```
GET /api/gameroom/:roomId/state
```

Returns full event array and current tip.

### In UI

Hash chain tip displayed with copy button:
```
Hash Chain Tip: a1b2c3d4... [Copy]
```

## Best Practices

### For Players

1. **Record room ID and hash tip** after each turn
2. **Take screenshots** of final hash chain tip
3. **Run verification script** before accepting game results
4. **Report discrepancies** immediately if verification fails

### For Operators

1. **Enable hash chain logging** to external storage
2. **Periodic verification** (e.g., hourly cron job)
3. **Alert on verification failures**
4. **Archive completed game chains** for dispute resolution

### For Auditors

1. **Fetch game state via API**
2. **Run verification script**
3. **Check event timestamps** for timing violations
4. **Compare frame hashes** with stored frames (if available)
5. **Verify fairness metrics** match computed values

## Limitations

### Current

1. **No Merkle Tree**: Linear chain only
2. **No Anchoring**: Not published to external system
3. **No Frame Storage**: Only hashes stored, not actual frames
4. **No Encryption**: Event data is plain JSON

### Future Enhancements (TODO)

1. **Merkle Tree Snapshots**
   - Periodic root hash for efficient batch verification
   - Enables proof-of-inclusion for individual events

2. **Blockchain Anchoring**
   - Publish hash chain tip to public blockchain
   - Provides immutable timestamp
   - Enables trustless verification

3. **Frame Storage**
   - Store actual frame images (encrypted)
   - Enable visual review during disputes
   - Requires additional storage solution

4. **Cross-Room Verification**
   - Link multiple game chains
   - Detect reputation manipulation across rooms
   - Requires global index

## Example Verification Output

```bash
$ node scripts/verify-chain.js abc123 http://localhost:8787

============================================================
Hash Chain Verification Report
============================================================
Room ID: abc123
Game Status: active
Current Turn: 5
Hash Chain Tip: e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8
============================================================

Verifying hash chain with 6 events...

Event 1:
  Type: game_started
  Claimed previous hash: genesis
  Claimed current hash: a1b2c3d4e5f6...
  ✓ Valid

Event 2:
  Type: turn_completed
  Claimed previous hash: a1b2c3d4e5f6...
  Claimed current hash: b2c3d4e5f6g7...
  ✓ Valid

Event 3:
  Type: turn_completed
  Claimed previous hash: b2c3d4e5f6g7...
  Claimed current hash: c3d4e5f6g7h8...
  ✓ Valid

Event 4:
  Type: turn_completed
  Claimed previous hash: c3d4e5f6g7h8...
  Claimed current hash: d4e5f6g7h8i9...
  ✓ Valid

Event 5:
  Type: turn_completed
  Claimed previous hash: d4e5f6g7h8i9...
  Claimed current hash: e5f6g7h8i9j0...
  ✓ Valid

Event 6:
  Type: turn_completed
  Claimed previous hash: e5f6g7h8i9j0...
  Claimed current hash: e7f8g9h0i1j2...
  ✓ Valid

✅ Hash chain verification PASSED
Final hash tip: e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8

============================================================
```

## Dispute Resolution Workflow

1. Player raises dispute via UI
2. Game status → `disputed`
3. Both players' final states frozen
4. Operator fetches game state
5. Runs verification script
6. If chain valid:
   - Review event log for timing violations
   - Check fairness metrics
   - Review frame hashes (visual if frames stored)
   - Make manual decision
7. If chain invalid:
   - Game is compromised
   - Automatic void/refund (if stakes involved)

## FAQ

**Q: Can events be deleted from the chain?**  
A: No. Deletion breaks the chain and is detected by verification.

**Q: What if the Durable Object is deleted?**  
A: The chain is lost. TODO: Implement periodic backups to external storage.

**Q: Can I verify a chain without the API?**  
A: Yes, if you have a copy of the event array. The verification algorithm is deterministic.

**Q: How often should I verify?**  
A: After each turn for critical games. At game end minimum.

**Q: What if verification fails?**  
A: Report to operator immediately. Game results are invalid.

**Q: Are timing windows recorded in the chain?**  
A: Yes, all timestamps are in the canonical event data and included in hashes.

**Q: Can I trust the hash chain?**  
A: The chain is tamper-evident, not tamper-proof. Trust requires both:
  1. Cryptographic integrity (verified by script)
  2. Correct event data (verified by reviewing event contents)
