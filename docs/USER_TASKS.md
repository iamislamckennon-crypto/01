# User Tasks and Operator Procedures

## Overview

This document outlines manual tasks, operator procedures, and guidelines for maintaining the physical dice detection system.

---

## Operator Responsibilities

### Daily Tasks

#### 1. Monitor System Health
- Check server logs for errors
- Review violation rates
- Monitor detection accuracy metrics
- Verify hash chain integrity

**Command:**
```bash
npm start
# Check logs at: /var/log/dice-detection/
```

#### 2. Review Flagged Turns
- Identify turns with status "flagged" or "uncertain"
- Investigate violation patterns
- Contact players if needed
- Document resolution

**Endpoint:**
```
GET /api/gameroom/:id/turn/:turnNumber
```

#### 3. Database Backup
- Export hash chains for external verification
- Backup game state
- Archive completed games

**Commands:**
```bash
# Export hash chain
curl http://localhost:3000/api/gameroom/GAME_ID/hash-chain > backup.json

# Verify backup
node scripts/verify-hash-chain.js backup.json
```

---

### Weekly Tasks

#### 1. Performance Review
- Analyze detection success rates
- Identify common failure patterns
- Review timing violations
- Check reroll frequency

#### 2. User Support
- Respond to detection issues
- Provide lighting guidance
- Help with camera setup
- Address dispute escalations

#### 3. Security Audit
- Review violation logs
- Identify suspicious patterns
- Check for coordinated cheating
- Update detection parameters if needed

---

### Monthly Tasks

#### 1. Statistical Analysis
- Generate fairness reports
- Compare detected vs. declared values
- Identify outlier players
- Update reputation scores

#### 2. System Updates
- Apply security patches
- Update detection algorithms
- Review and merge community contributions
- Test new features

#### 3. Documentation Updates
- Update operator manual
- Revise user guidelines
- Document known issues
- Update FAQ

---

## Manual Review Procedures

### When to Escalate to Manual Review

Automatic escalation triggers:
1. **High Violation Count:** Player exceeds 5 violations per game
2. **Reroll Limit Reached:** 3+ rerolls in single turn
3. **Suspicious Patterns:** Consistently "uncertain" detections
4. **Opponent Disputes:** Multiple dispute escalations

### Manual Review Process

1. **Gather Evidence**
   - Retrieve turn data from API
   - Review hash chain events
   - Check frame hashes and detected values
   - Compare with player's declared value

2. **Analyze Detection**
   - Review stabilization times
   - Check residual motion scores
   - Examine frame consensus
   - Look for camera movement

3. **Make Decision**
   - **Accept Detection:** Mark turn as verified
   - **Reject Detection:** Request reroll
   - **Penalize Player:** Apply violation penalty
   - **Investigate Further:** Request additional evidence

4. **Document Resolution**
   - Add notes to turn record
   - Update hash chain if needed
   - Notify players of decision
   - Log in operator journal

**Template Email:**
```
Subject: Turn Review - Game [GAME_ID] Turn [TURN_NUMBER]

Dear [PLAYER_NAME],

We have reviewed turn [TURN_NUMBER] in game [GAME_ID].

Detection Result: [DETECTED_VALUE]
Declared Value: [DECLARED_VALUE]
Status: [STATUS]

Decision: [ACCEPT/REJECT/REROLL]
Reason: [EXPLANATION]

If you have questions, please contact support.

Best regards,
Game Operator Team
```

---

## User Guidelines

### Lighting and Background Requirements

#### Optimal Setup
- **Lighting:** Diffuse, even lighting (avoid direct sunlight or harsh shadows)
- **Background:** Solid, contrasting color (white dice on dark surface or vice versa)
- **Camera:** Fixed position, stable mount
- **Distance:** 20-40cm from dice to camera
- **Angle:** Slight overhead angle (30-45 degrees)

#### Examples

**Good Setup:**
- White dice on black felt
- LED ring light overhead
- Camera on tripod
- Indoor controlled lighting

**Poor Setup:**
- Colorful patterned background
- Strong side lighting causing shadows
- Handheld camera (unstable)
- Outdoor natural light (varies)

### Pre-Roll Checklist

Before each turn, players should:
- [ ] Position camera at correct angle
- [ ] Ensure dice are visible in frame
- [ ] Check lighting is even (no glare)
- [ ] Verify background is clear
- [ ] Capture baseline surface (F0)
- [ ] Wait for "ready" indicator

### During Roll

- [ ] Perform dice roll
- [ ] Wait for dice to fully stabilize
- [ ] Keep camera steady (no movement)
- [ ] Avoid shadows over dice
- [ ] Wait for detection to complete

### After Detection

- [ ] Review detected value
- [ ] Confirm if accurate
- [ ] Dispute if incorrect (limited rerolls)
- [ ] Proceed with turn

---

## Common Issues and Solutions

### Issue: Detection Failed (Uncertain Status)

**Symptoms:**
- System reports "uncertain" status
- Requires opponent confirmation

**Possible Causes:**
1. Poor lighting conditions
2. Dice partially obscured
3. Non-standard dice (pip size/shape)
4. Motion during capture

**Solutions:**
1. Improve lighting setup
2. Ensure dice fully in frame
3. Use standard dice
4. Wait longer for stabilization
5. Request reroll if needed

---

### Issue: Camera Movement Violation

**Symptoms:**
- Error: "Camera movement detected"
- High residualMotionScore

**Possible Causes:**
1. Handheld camera moved
2. Table bumped during capture
3. Zoom changed
4. Camera auto-focus adjusted

**Solutions:**
1. Use tripod or fixed mount
2. Keep table stable
3. Disable auto-zoom
4. Lock camera focus
5. Recapture baseline

---

### Issue: Timing Violation

**Symptoms:**
- Error: "Evidence submitted outside detection window"

**Possible Causes:**
1. Slow network connection
2. Long stabilization time
3. Browser performance issues
4. Server clock mismatch

**Solutions:**
1. Check network connection
2. Reduce motion (roll gently)
3. Close unnecessary browser tabs
4. Verify system time is correct
5. Contact operator if persistent

---

### Issue: False Detection

**Symptoms:**
- Detected value doesn't match actual roll
- Opponent disputes

**Possible Causes:**
1. Lighting caused false pips (glare)
2. Background pattern confused detector
3. Dice at extreme angle
4. Dice partially out of frame

**Solutions:**
1. Improve lighting (diffuse, even)
2. Use solid background
3. Ensure dice flat on surface
4. Position dice fully in frame
5. Request reroll (up to 3 times)

---

## External Verification Tasks

### TODO: Merkle Snapshot Procedure

**Status:** Not Implemented (Phase 2)

**Future Process:**
1. Generate Merkle tree from hash chain
2. Compute Merkle root
3. Anchor root to external blockchain
4. Store proof-of-anchoring
5. Enable public verification

**Command (Future):**
```bash
node scripts/generate-merkle-snapshot.js --gameroom GAME_ID
node scripts/anchor-to-blockchain.js --merkle-root ROOT_HASH
```

---

### TODO: External Audit Portal

**Status:** Not Implemented (Phase 4)

**Future Features:**
- Public verification of hash chains
- Merkle proof validation
- Blockchain anchor verification
- Detection algorithm transparency
- Community auditing

**URL (Future):**
```
https://verify.dicegame.com/gameroom/GAME_ID
```

---

## Maintenance Scripts

### Hash Chain Verification

```bash
# Verify single game
node scripts/verify-hash-chain.js --gameroom GAME_ID

# Verify all games
node scripts/verify-all-chains.js

# Export chain for external verification
node scripts/export-chain.js --gameroom GAME_ID --output chain.json
```

### Database Cleanup

```bash
# Archive completed games (older than 30 days)
node scripts/archive-games.js --days 30

# Purge frame data (keep hashes only)
node scripts/cleanup-frames.js --gameroom GAME_ID

# Vacuum database
node scripts/vacuum-db.js
```

### Statistics Generation

```bash
# Generate fairness report
node scripts/generate-fairness-report.js --gameroom GAME_ID

# Violation summary
node scripts/violation-report.js --period weekly

# Detection accuracy metrics
node scripts/detection-metrics.js
```

---

## Emergency Procedures

### Suspected Cheating

1. **Immediate Actions:**
   - Flag player account
   - Suspend from new games
   - Export all relevant evidence
   - Document incident

2. **Investigation:**
   - Review all player's games
   - Check hash chains for tampering
   - Analyze detection patterns
   - Interview opponent(s)

3. **Resolution:**
   - Permanent ban if confirmed
   - Refund affected opponents
   - Update detection parameters
   - Document for future prevention

### System Compromise

1. **Immediate Actions:**
   - Take server offline
   - Export all hash chains
   - Verify external backups
   - Notify users

2. **Recovery:**
   - Investigate breach
   - Restore from backup
   - Verify chain integrity
   - Apply security patches

3. **Post-Mortem:**
   - Document incident
   - Update security procedures
   - Notify affected users
   - Implement preventive measures

---

## Configuration Management

### Detection Parameters

Edit `server/config.js` to adjust:

```javascript
{
  MOTION_THRESHOLD: 0.02,        // Stabilization sensitivity
  DETECTION_WINDOW: 10000,       // Time limit (ms)
  CAMERA_MOVE_THRESHOLD: 0.15,   // Camera movement tolerance
  MAX_REROLLS: 3                 // Reroll limit per turn
}
```

**When to Adjust:**
- User feedback indicates too strict/lenient
- Detection accuracy drops
- Violation rate too high
- Environment changes (new camera types)

**How to Update:**
1. Test new parameters in staging
2. Document reason for change
3. Deploy to production
4. Monitor metrics for 1 week
5. Revert if issues occur

---

## Contact Information

### Escalation Path

1. **Level 1 Support:** operators@dicegame.com
2. **Level 2 Technical:** tech-support@dicegame.com
3. **Level 3 Engineering:** engineering@dicegame.com
4. **Security Issues:** security@dicegame.com

### Emergency Hotline

**Phone:** +1-555-DICE-911  
**Available:** 24/7 for critical issues

---

## Training Resources

### New Operator Onboarding

1. Read this document thoroughly
2. Review API_REFERENCE.md
3. Study HASH_CHAIN.md
4. Complete operator training module
5. Shadow experienced operator (1 week)
6. Handle cases under supervision (2 weeks)
7. Full access granted after certification

### Continuing Education

- Monthly training sessions
- Annual security refresher
- Algorithm update workshops
- Community conference attendance

---

## Appendix: Tool Commands

### Quick Reference

```bash
# Start server
npm start

# Run tests
npm test

# Verify chain
node scripts/verify-hash-chain.js <file>

# Export game data
curl http://localhost:3000/api/gameroom/ID/hash-chain > export.json

# Check server health
curl http://localhost:3000/health

# View logs
tail -f /var/log/dice-detection/server.log
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-21  
**Next Review:** Monthly  
**Owner:** Operations Team
