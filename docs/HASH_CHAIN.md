# Hash Chain Documentation

## Overview

The hash chain provides an immutable audit trail for all game events, including dice detection evidence. Each event is cryptographically hashed and linked, enabling verification of game integrity and dispute resolution.

## Architecture

### Chain Structure

```
Event 1 → Event 2 → Event 3 → ... → Event N
  ↓         ↓         ↓               ↓
Hash 1    Hash 2    Hash 3         Hash N
```

Each event contains:
- Event type
- Timestamp
- Type-specific data
- Optional evidence hash

### Event Types

#### Game Events
```javascript
{
  type: 'game_started',
  timestamp: '2025-10-21T10:00:00.000Z',
  players: ['player1', 'player2']
}
```

#### Evidence Events
```javascript
{
  type: 'evidence_submitted',
  turnNumber: 1,
  playerId: 'player1',
  evidenceHash: 'a1b2c3d4e5f6...',
  timestamp: '2025-10-21T10:01:00.000Z'
}
```

#### Confirmation Events
```javascript
{
  type: 'evidence_confirmed',
  turnNumber: 1,
  playerId: 'player2',
  timestamp: '2025-10-21T10:02:00.000Z'
}
```

#### Dispute Events
```javascript
{
  type: 'evidence_disputed',
  turnNumber: 1,
  playerId: 'player2',
  reason: 'Incorrect detection',
  timestamp: '2025-10-21T10:03:00.000Z'
}
```

## Evidence Hash Integration

### Evidence Hash Calculation

The evidence hash is a SHA-256 hash of the canonical JSON representation:

```javascript
const canonical = JSON.stringify({
  turnNumber: evidence.turnNumber,
  frameHashes: evidence.frameHashes,
  diceValues: evidence.diceValues,
  stabilizationTimeMs: evidence.stabilizationTimeMs,
  residualMotionScore: evidence.residualMotionScore,
  algorithmVersion: evidence.algorithmVersion,
  status: evidence.status
});

const evidenceHash = SHA256(canonical);
```

### Why Evidence Hash?

1. **Immutability**: Evidence cannot be modified after submission
2. **Verification**: Anyone can recalculate and verify hash
3. **Tamper Detection**: Any change invalidates the hash
4. **Dispute Resolution**: Original evidence provably unchanged

### Chain Linkage

Each `evidence_submitted` event includes the evidence hash:

```
Turn 1 Evidence → evidence_submitted event
     ↓                      ↓
Evidence Hash     evidenceHash field in event
     ↓                      ↓
   Stored              Chain append
```

## Hash Chain Verification

### Verification Script

```bash
node scripts/verify-chain.js --game-room-id=<id> --verify-evidence
```

### Verification Steps

1. **Load Chain**: Fetch all events from Durable Object
2. **Structure Check**: Verify required fields present
3. **Event Hash**: Calculate hash for each event
4. **Evidence Hash**: Verify evidence hash matches evidence data
5. **Sequence Check**: Ensure chronological order
6. **Report**: Output verification result

### Example Output

```
======================================================================
Hash Chain Verification Tool
======================================================================

Configuration:
  Game Room ID: room123
  Verify Evidence: Yes

Chain Length: 10 events
Evidence Records: 3

Verifying hash chain...
✓ Chain valid (10 events verified)

Verifying evidence hashes...
  ✓ turn_1: Hash valid
  ✓ turn_2: Hash valid
  ✓ turn_3: Hash valid

Evidence Summary:
  Verified: 3
  Errors: 0

======================================================================
✓ VERIFICATION PASSED
======================================================================
```

## Merkle Tree Integration

### Merkle Snapshot

The Merkle snapshot tool builds a Merkle tree from recent event hashes for efficient batch verification:

```bash
node scripts/merkle-snapshot.js --events=50 --game-room-id=<id>
```

### Merkle Tree Structure

```
                Root Hash
               /         \
         Hash A           Hash B
        /     \          /      \
    Hash1   Hash2    Hash3    Hash4
      |       |        |        |
    Evt1    Evt2     Evt3     Evt4
```

### Benefits

1. **Compact Proof**: Verify single event with O(log n) hashes
2. **Batch Commitment**: Single root represents entire batch
3. **Blockchain Anchoring**: Publish root on-chain
4. **Third-Party Audit**: Anyone can verify without full chain

### Merkle Proof Generation

```javascript
const proof = generateProof(tree, leafIndex);
// Returns: [{ hash, position }, ...]

const valid = verifyProof(leafHash, proof, rootHash);
// Returns: true if valid
```

### Example Proof

```
Verify Event 2:
- Leaf: Hash2
- Proof: [Hash1 (left), Hash B (right)]
- Root: Root Hash

Verification:
  combine(Hash1, Hash2) = Hash A
  combine(Hash A, Hash B) = Root Hash ✓
```

## Blockchain Anchoring (Future)

### Planned Implementation

1. **Batch Events**: Collect N events (e.g., 50)
2. **Build Tree**: Generate Merkle tree
3. **Publish Root**: Submit root to blockchain
4. **Record Transaction**: Store transaction hash
5. **Enable Audit**: Third parties verify via blockchain

### Target Blockchains

- **Ethereum**: High security, higher cost
- **Bitcoin**: Maximum immutability
- **Polygon**: Lower cost, faster confirmation
- **Custom L2**: Platform-specific chain

### Cost Optimization

- Batch 50-100 events per anchor
- Use rollup or L2 for cost reduction
- Schedule anchoring (e.g., daily)
- Only anchor high-stakes games

## Security Properties

### Immutability

Once an event is added to the chain, it cannot be:
- Modified without detection
- Deleted without breaking chain
- Reordered without timestamp violation

### Auditability

Anyone with access to the chain can:
- Verify all event hashes
- Recalculate evidence hashes
- Detect tampering
- Trace event sequence

### Non-Repudiation

Players cannot deny:
- Submitting evidence (signed by player ID)
- Confirming opponent evidence
- Disputing evidence

### Limitations

- **Storage Required**: Full chain must be available
- **No Privacy**: All events visible (encrypt if needed)
- **Trust in DO**: Durable Object operator controls chain
- **No Finality**: Without blockchain anchor, operator can reset

## Integration with Game Flow

### Turn Lifecycle

```
1. Pre-Roll → capture baseline → (no chain event)
2. Roll Dice → player action → (no chain event)
3. Stabilize → wait period → (no chain event)
4. Capture → 3 frames → (no chain event)
5. Detect → client processing → (no chain event)
6. Submit → evidence_submitted event → CHAIN APPEND
7. Confirm → evidence_confirmed event → CHAIN APPEND
   OR
   Dispute → evidence_disputed event → CHAIN APPEND
8. Finalize → turn_completed event → CHAIN APPEND
```

### Chain Consistency

- Events appended in strict chronological order
- Timestamps must be increasing
- Turn numbers must be sequential
- Player IDs must be valid for game room

## API Integration

### Submit Evidence (Appends to Chain)

```javascript
POST /api/gameroom/:id/submit-evidence
→ Creates evidence_submitted event
→ Appends to chain with evidenceHash
```

### Confirm Evidence (Appends to Chain)

```javascript
POST /api/gameroom/:id/confirm-evidence
→ Creates evidence_confirmed event
→ Appends to chain
```

### Dispute Evidence (Appends to Chain)

```javascript
POST /api/gameroom/:id/dispute-evidence
→ Creates evidence_disputed event
→ Appends to chain with reason
```

## Best Practices

### For Developers

1. **Always Hash Evidence**: Include evidence hash in chain events
2. **Canonical JSON**: Use consistent field order for hashing
3. **Timestamp Precision**: Use ISO 8601 with milliseconds
4. **Validate Before Append**: Check event structure before adding
5. **Periodic Snapshots**: Generate Merkle snapshots regularly

### For Operators

1. **Backup Chains**: Regular backups of Durable Object state
2. **Monitor Chain Size**: Archive old chains if growing large
3. **Audit Regularly**: Run verification script periodically
4. **Anchor Milestones**: Publish Merkle roots at game milestones
5. **Preserve Evidence**: Keep evidence data alongside chain

### For Auditors

1. **Verify Locally**: Run verification scripts yourself
2. **Check Timestamps**: Ensure chronological consistency
3. **Recalculate Hashes**: Don't trust stored hashes
4. **Cross-Reference**: Compare chain with stored evidence
5. **Validate Signatures**: Verify player identities (future)

## Troubleshooting

### Chain Verification Failed

**Symptom**: Verification script reports errors

**Possible Causes**:
- Evidence data modified after submission
- Timestamp inconsistency
- Missing required fields
- Hash calculation mismatch

**Resolution**:
1. Check error messages
2. Verify evidence data integrity
3. Recalculate hashes manually
4. Compare with original submission

### Evidence Hash Mismatch

**Symptom**: Evidence hash doesn't match recalculated hash

**Possible Causes**:
- Evidence modified after hashing
- Different JSON serialization
- Field order changed
- Floating point precision issues

**Resolution**:
1. Use canonical JSON (sorted keys)
2. Fix floating point to 3 decimal places
3. Verify field names match exactly
4. Check for extra/missing fields

## Future Enhancements

### Planned Features

1. **Linked Chain**: Each event includes previous event hash
2. **Digital Signatures**: Players sign their events
3. **Zero-Knowledge Proofs**: Privacy-preserving verification
4. **Multi-Chain Support**: Anchor to multiple blockchains
5. **Automated Anchoring**: Background service for periodic anchoring

### Research Areas

1. **Compression**: Reduce chain storage requirements
2. **Pruning**: Archive old events while preserving proofs
3. **Sharding**: Distribute chain across multiple DOs
4. **Consensus**: Multi-operator chain consensus

## References

- [Certificate Transparency RFC 6962](https://tools.ietf.org/html/rfc6962)
- [Bitcoin Merkle Trees (BIP 37)](https://github.com/bitcoin/bips/blob/master/bip-0037.mediawiki)
- [OpenTimestamps](https://opentimestamps.org/)
- [Ethereum Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf)

## Related Documentation

- [Independent Detection](./INDEPENDENT_DETECTION.md)
- [API Reference](./API_REFERENCE.md)
- [Architecture Overview](./ARCHITECTURE.md)

---

**Document Status**: Complete  
**Last Updated**: 2025-10-21  
**Version**: 1.0  
**Owner**: Engineering Team
