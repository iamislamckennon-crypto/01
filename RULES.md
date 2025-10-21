# Game Rules and Regulations

## Overview
This document outlines the official rules for the competitive dice roll gaming platform, ensuring fair play and transparency.

## Camera Positioning Requirements

### Mandatory Setup
- **Camera Angle**: Must be positioned to capture the entire rolling surface and dice from above or at a clear angle
- **Lighting**: Adequate lighting must illuminate the dice and rolling surface
- **Frame Rate**: Minimum 30 FPS for smooth motion capture
- **Resolution**: Minimum 720p to ensure dice values are clearly visible
- **Stability**: Camera must remain stable throughout the roll; no intentional shaking or obstruction

### Prohibited Actions
- Covering or obstructing the camera view during a roll
- Using filters or effects that obscure dice visibility
- Positioning the camera to hide parts of the rolling process
- Switching cameras mid-roll without opponent agreement

## Dice Requirements

### Physical Dice Specifications
- **Standard Six-Sided Dice**: Must be standard cubic dice with clearly marked pips (1-6)
- **Size**: Between 14mm and 19mm per side (standard gaming dice)
- **Color Contrast**: Dice and pips must have sufficient contrast for camera detection
- **Condition**: Dice must be in good condition, not chipped, worn, or modified
- **Transparency**: Non-transparent dice preferred for clearer computer vision analysis

### Prohibited Dice
- Weighted or loaded dice
- Electronic dice
- Dice with unclear or non-standard markings
- Damaged dice that could affect fair rolling

## Roll Validity Criteria

### Valid Roll Requirements
A roll is considered valid when ALL of the following conditions are met:

1. **Visibility**: The entire roll sequence is visible on camera from release to final rest
2. **Free Roll**: Dice must leave the hand and tumble freely on the surface
3. **Final Rest**: Dice must come to a complete rest on a flat surface within the camera frame
4. **Clear Result**: The top face showing the result must be clearly visible and unobstructed
5. **Single Action**: One continuous roll action; no touching or adjusting dice after release
6. **Time Limit**: Roll must be completed within 10 seconds of being initiated

### Invalid Rolls
Rolls are considered invalid and must be re-rolled if:

- Dice leaves the camera frame during or after rolling
- Dice is obstructed or covered before final value is confirmed
- Dice lands on edge or tilted against another object
- Multiple rolls occur in quick succession (dice roll confusion)
- Camera feed is interrupted or obscured during the roll
- Dice is touched or moved before confirmation
- Technical issues prevent proper video capture

### Re-roll Protocol
- Invalid rolls must be immediately flagged by either player or the system
- Players have 5 seconds to contest a roll after it appears
- If contested, video evidence is reviewed
- Maximum 3 re-rolls allowed per turn; after that, neutral arbitration may be required

## Game Session Structure

### Game Initialization
1. Host player creates a game session
2. Other players join the pending game
3. All players confirm camera setup and visibility
4. Game status changes to "active"
5. Turn order is established

### Turn Sequence
1. Active player announces their roll intent
2. Player performs the roll on camera
3. System captures and analyzes the roll
4. Result is confirmed by all parties (3-second confirmation window)
5. Turn passes to next player
6. Process repeats until game completion conditions are met

### Game Completion
- Game ends when predetermined conditions are met (score threshold, round limit, etc.)
- Final results are recorded with full video evidence
- Players' reputation scores are updated based on game outcome
- Anti-cheat report is generated and stored

## Dispute Resolution Process

### Flagging a Roll
Players may flag a roll as suspicious if they believe:
- The roll was not performed fairly
- The camera view was intentionally obstructed
- The dice appears to have been manipulated
- Technical anomalies occurred

### Dispute Steps
1. **Immediate Flag**: Player clicks "Flag Roll" within 5 seconds of roll completion
2. **Automatic Review**: System performs automated anti-cheat analysis
3. **Evidence Collection**: Video evidence is preserved and timestamped
4. **Peer Review**: Other players in session provide input (optional)
5. **Final Determination**: 
   - If automated analysis detects clear violation: Roll invalidated, warning issued
   - If inconclusive: Roll may stand with notation in game record
   - Repeated flags against a player affect reputation score

### Escalation
- Multiple flags in a single game may result in game cancellation
- Persistent flagging across games results in account review
- False flagging (abuse of the system) also results in reputation penalties

### Evidence Retention
- All game video evidence retained for 30 days
- Disputed games retained for 90 days
- Players can request evidence review during retention period

## Reputation System

### Score Factors
- **Completed Games**: +Points for finishing games
- **Clean Games**: +Bonus for zero flags
- **Disputed Games**: -Points for games with validated flags
- **False Flags**: -Points for flagging without merit
- **Community Feedback**: Peer ratings after games

### Reputation Thresholds
- **Trusted (1000+)**: Experienced player with clean record
- **Established (500-999)**: Regular player with good standing
- **New (0-499)**: New or developing reputation
- **Caution (<0)**: History of issues; games may require additional verification
- **Suspended**: Temporary ban pending review

## Fair Play Commitment

All players agree to:
- Use only standard, unmodified dice
- Provide clear, unobstructed camera views
- Accept automated anti-cheat analysis
- Respect dispute resolution outcomes
- Maintain sportsmanship and integrity

Violations of these rules may result in game forfeiture, reputation penalties, or account suspension.

## Future Enhancements

The following enhancements are planned:
- **Advanced Computer Vision**: Automated dice reading and motion analysis
- **Cryptographic Verification**: Tamper-proof roll verification with blockchain logging
- **AI Referee**: Real-time automated flagging of suspicious patterns
- **Predictive Analytics**: Detection of statistical anomalies in roll sequences
- **Hardware Integration**: Support for verified electronic dice as an option

---

*Last Updated: 2025-10-21*
*Version: 1.0*
