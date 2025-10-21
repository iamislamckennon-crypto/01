# Hash Chain Architecture

## Overview

The hash chain provides a cryptographic audit trail of all game events, ensuring tamper-evident recording of dice rolls, detections, and disputes.

## Chain Structure

Each event in the chain contains:

```javascript
{
  type: "EVENT_TYPE",
  data: { ... },
  timestamp: 1634567890000,
  previousHash: "abc123...",
  eventIndex: 0,
  hash: "def456..."
}
```

## Event Types

### 1. ROLL_COMMIT

Records a player's commitment to a dice value before rolling.

**Data Structure:**
```javascript
{
  type: "ROLL_COMMIT",
  data: {
    turnNumber: 1,
    commitment: "hash(value + nonce)"
  }
}
```

**Purpose:** Prevents players from changing their claimed value after seeing the physical result.

---

### 2. ROLL_REVEAL

Records the revealed dice value and nonce after the physical roll.

**Data Structure:**
```javascript
{
  type: "ROLL_REVEAL",
  data: {
    turnNumber: 1,
    revealedValue: 4,
    nonce: "random_string"
  }
}
```

**Purpose:** Makes the committed value public for verification (hash(revealedValue + nonce) should match commitment).

---

### 3. ROLL_EVIDENCE

Records the physical dice detection evidence submitted by the client.

**Data Structure:**
```javascript
{
  type: "ROLL_EVIDENCE",
  data: {
    turnNumber: 1,
    evidenceHash: "hash_of_evidence_package",
    status: "verified" | "uncertain" | "flagged",
    detectedValue: 4 | null
  }
}
```

**Purpose:** Creates immutable record of detection results, linking detected value to the turn.

**Evidence Hash Calculation:**
The `evidenceHash` is computed from:
- turnNumber
- surfaceHash (baseline frame)
- frameHashes (3 detection frames)
- diceValues (detected values)
- algorithmVersion

This ensures evidence integrity and prevents tampering.

---

### 4. OPPONENT_CONFIRM

Records opponent's confirmation or dispute of a detected value.

**Data Structure:**
```javascript
{
  type: "OPPONENT_CONFIRM",
  data: {
    turnNumber: 1,
    agree: true | false,
    confirmedBy: "player2"
  }
}
```

**Purpose:** Provides peer verification mechanism for uncertain detections.

---

### 5. REROLL_REQUEST

Records a request to reroll due to disagreement.

**Data Structure:**
```javascript
{
  type: "REROLL_REQUEST",
  data: {
    turnNumber: 1,
    requestedBy: "player2",
    rerollCount: 1
  }
}
```

**Purpose:** Tracks dispute resolution attempts, enforcing MAX_REROLLS limit.

---

## Hash Computation

Each event's hash is computed from:

```javascript
hash = SHA256(
  type +
  JSON.stringify(data) +
  timestamp +
  previousHash +
  eventIndex
)
```

The chain links events through `previousHash`, creating a tamper-evident structure.

**Genesis Hash:** `0000000000000000`

---

## Chain Verification

The chain integrity can be verified by:

1. Starting with genesis hash `0000000000000000`
2. For each event in order:
   - Verify `previousHash` matches current chain tip
   - Recompute event hash from data
   - Verify computed hash matches stored hash
   - Update chain tip to event hash
3. Confirm final tip matches chain's reported tip

**Verification Endpoint:**
```
GET /api/gameroom/:id/hash-chain
```

Returns complete chain and verification status.

---

## Typical Turn Flow

```
Genesis (0000000000000000)
    |
    v
ROLL_COMMIT (hash: a1b2c3...)
    |
    v
ROLL_REVEAL (hash: b2c3d4...)
    |
    v
ROLL_EVIDENCE (hash: c3d4e5...)
    |
    v
[Optional: OPPONENT_CONFIRM (hash: d4e5f6...)]
    |
    v
[Optional: REROLL_REQUEST (hash: e5f6g7...)]
```

---

## Security Properties

### Tamper Evidence

Any modification to a past event:
- Changes the event's hash
- Breaks the chain (next event's previousHash won't match)
- Detected by verification

### Append-Only

The chain only allows adding new events, never deleting or modifying existing ones.

### Deterministic

Same input data always produces the same hash, enabling independent verification.

### Temporal Ordering

Events include timestamps and sequential indices, establishing clear ordering.

---

## Integration with Detection Pipeline

The detection pipeline integrates with the hash chain at multiple points:

1. **Before Roll:** Baseline surface captured (not in chain, used for camera move detection)
2. **Commit Phase:** Player commits to expected value → ROLL_COMMIT event
3. **Physical Roll:** Player performs physical dice roll
4. **Reveal Phase:** Player reveals committed value → ROLL_REVEAL event
5. **Detection Phase:** System captures frames and detects pips
6. **Evidence Submission:** Client submits evidence package → ROLL_EVIDENCE event
7. **Verification:** Server validates evidence and records status
8. **Dispute Resolution (if needed):** OPPONENT_CONFIRM or REROLL_REQUEST events

---

## Example Complete Chain

```json
{
  "events": [
    {
      "type": "ROLL_COMMIT",
      "data": {
        "turnNumber": 1,
        "commitment": "abc123def456"
      },
      "timestamp": 1634567890000,
      "previousHash": "0000000000000000",
      "eventIndex": 0,
      "hash": "a1b2c3d4e5f67890"
    },
    {
      "type": "ROLL_REVEAL",
      "data": {
        "turnNumber": 1,
        "revealedValue": 4,
        "nonce": "random_nonce_xyz"
      },
      "timestamp": 1634567895000,
      "previousHash": "a1b2c3d4e5f67890",
      "eventIndex": 1,
      "hash": "b2c3d4e5f6789012"
    },
    {
      "type": "ROLL_EVIDENCE",
      "data": {
        "turnNumber": 1,
        "evidenceHash": "evidence_hash_123",
        "status": "verified",
        "detectedValue": 4
      },
      "timestamp": 1634567900000,
      "previousHash": "b2c3d4e5f6789012",
      "eventIndex": 2,
      "hash": "c3d4e5f678901234"
    }
  ],
  "tip": "c3d4e5f678901234"
}
```

---

## External Verification

The hash chain can be exported and verified externally:

```javascript
// Export chain
GET /api/gameroom/:id/hash-chain

// Verify independently
const chain = await fetch('/api/gameroom/123/hash-chain');
const verification = verifyHashChain(chain.events);
console.log(verification.valid); // true
```

---

## Future Enhancements

**TODO:** External Merkle tree snapshot and anchoring
- Periodic snapshots of chain state
- Merkle root anchoring to external blockchain
- Enables long-term tamper detection beyond platform lifespan

**TODO:** Distributed verification
- Multiple independent verifiers
- Consensus on chain state
- Byzantine fault tolerance

---

## Hash Chain Verification Script

A standalone verification script is provided:

```bash
node scripts/verify-hash-chain.js <chain-export.json>
```

This script:
1. Loads exported chain data
2. Verifies hash chain integrity
3. Validates event sequences
4. Checks for consistency violations
5. Reports verification status

---

## Best Practices

1. **Never Modify Events:** Events are immutable once added
2. **Verify Regularly:** Periodically verify chain integrity
3. **Export Frequently:** Keep backups of chain data
4. **Timestamp Everything:** All events include timestamps
5. **Sequential Ordering:** Events must follow logical game flow

---

## Limitations (Phase 1)

- Simple hash function (demo purposes - use SHA-256 in production)
- In-memory storage (use persistent database in production)
- No external anchoring (planned for Phase 2)
- No distributed verification (planned for Phase 2)

---

## References

- [Bitcoin Blockchain Architecture](https://bitcoin.org/bitcoin.pdf)
- [Merkle Trees](https://en.wikipedia.org/wiki/Merkle_tree)
- [Commit-Reveal Schemes](https://en.wikipedia.org/wiki/Commitment_scheme)
