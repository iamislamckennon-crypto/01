# User Tasks & Maintenance Guide

## Overview

This document outlines periodic tasks and maintenance procedures for the dice roll gaming platform, including independent detection system calibration, hash chain verification, and Merkle anchoring.

## Regular Tasks

### Daily Tasks

#### 1. Monitor Detection Quality

**Frequency**: Daily  
**Owner**: Operations Team  
**Duration**: 15 minutes

**Steps**:
1. Review detection status dashboard
2. Check rate of `uncertain` and `flagged` detections
3. Identify patterns in failed detections
4. Review dispute reasons from players

**Success Criteria**:
- < 20% uncertain detections
- < 5% flagged detections
- < 3% disputed evidences

**Action Items**:
- If thresholds exceeded, trigger calibration process
- Document lighting/environmental issues
- Update FAQ with common problems

#### 2. Verify Recent Hash Chains

**Frequency**: Daily  
**Owner**: Security Team  
**Duration**: 5 minutes per game room

**Steps**:
```bash
# Verify last 24 hours of activity
node scripts/verify-chain.js --game-room-id=<id> --verify-evidence
```

**Success Criteria**:
- All chains verify successfully
- No evidence hash mismatches
- Timestamps chronologically ordered

**Action Items**:
- If verification fails, investigate immediately
- Preserve chain state for forensics
- Notify affected players

### Weekly Tasks

#### 3. Generate Merkle Snapshots

**Frequency**: Weekly (Sunday midnight)  
**Owner**: Automation Service  
**Duration**: 10 minutes

**Steps**:
```bash
# Generate snapshot for each active game room
for room_id in $(get_active_rooms); do
  node scripts/merkle-snapshot.js --events=100 --game-room-id=$room_id
  # Store root hash for anchoring
done
```

**Outputs**:
- Merkle root hash per game room
- Tree structure summary
- Verification proofs for sample events

**Storage**:
- Save roots to `merkle-roots.json`
- Timestamp each snapshot
- Archive tree structures

**Action Items**:
- Prepare roots for blockchain anchoring
- Update audit dashboard with roots
- Generate reports for stakeholders

#### 4. Detection System Calibration

**Frequency**: Weekly  
**Owner**: ML/CV Team  
**Duration**: 2 hours

**Steps**:
1. Collect flagged detections from past week
2. Analyze failure patterns
3. Adjust configuration thresholds if needed
4. Test changes in staging environment
5. Deploy to production with monitoring

**Configuration Tuning**:
```toml
# Review and adjust in wrangler.toml
MIN_STABILIZATION_MS = 600  # Increase if high motion detected
MAX_RESIDUAL_MOTION = 0.2   # Decrease for stricter validation
PIXEL_DIFF_THRESHOLD = 0.35 # Adjust based on camera movement
```

**Metrics to Review**:
- Detection accuracy (ground truth vs detected)
- Consensus agreement rate
- Average confidence scores
- Dispute rate by detection status

**Action Items**:
- Document configuration changes
- Create decision log entry (DEC-XXX)
- Update USER_TASKS.md with new thresholds

#### 5. Backup Hash Chains

**Frequency**: Weekly (Sunday)  
**Owner**: Operations Team  
**Duration**: 30 minutes

**Steps**:
1. Export all game room states from Durable Objects
2. Compress and encrypt backups
3. Upload to secure cloud storage (S3, GCS)
4. Verify backup integrity
5. Rotate old backups (keep 4 weeks)

**Backup Format**:
```json
{
  "gameRoomId": "room123",
  "exportedAt": "2025-10-21T00:00:00.000Z",
  "hashChain": [...],
  "evidence": {...},
  "merkleRoots": [...]
}
```

**Action Items**:
- Test restoration procedure quarterly
- Document recovery time objective (RTO)
- Update disaster recovery plan

### Monthly Tasks

#### 6. Blockchain Anchoring (Future)

**Frequency**: Monthly (1st of month)  
**Owner**: Blockchain Team  
**Duration**: 1 hour

**Steps**:
1. Collect weekly Merkle roots from past month
2. Build super-tree of weekly roots
3. Publish super-tree root to blockchain
4. Record transaction hash
5. Update game rooms with anchor reference

**Blockchain Options**:
- Ethereum mainnet (high security, high cost)
- Polygon (medium cost, faster)
- Bitcoin (maximum immutability)

**Cost Estimate**:
- Ethereum: ~$50-100 per anchor
- Polygon: ~$0.01-1 per anchor
- Bitcoin: ~$10-50 per anchor

**Action Items**:
- Choose blockchain based on budget
- Automate anchoring script
- Document transaction IDs
- Enable third-party verification

#### 7. Detection Algorithm Updates

**Frequency**: Monthly  
**Owner**: ML/CV Team  
**Duration**: 4-8 hours

**Review Checklist**:
- [ ] Evaluate current algorithm performance
- [ ] Review latest CV research/libraries
- [ ] Test new algorithms in sandbox
- [ ] Compare accuracy with baseline
- [ ] Document improvements in DECISION_LOG.md

**Version Upgrade Process**:
1. Implement new algorithm with new version string
2. Deploy to staging with A/B testing
3. Compare metrics (accuracy, speed, disputes)
4. Gradual rollout to production (10% → 50% → 100%)
5. Monitor for regressions
6. Update INDEPENDENT_DETECTION.md

**Backward Compatibility**:
- Keep old algorithm versions for re-verification
- Document version differences
- Provide migration path for old evidence

### Quarterly Tasks

#### 8. Comprehensive Audit

**Frequency**: Quarterly  
**Owner**: Security Team  
**Duration**: 1 week

**Scope**:
- [ ] Verify all hash chains across all game rooms
- [ ] Recalculate all evidence hashes
- [ ] Check timestamp consistency
- [ ] Validate Merkle roots
- [ ] Review dispute resolutions
- [ ] Test recovery procedures
- [ ] Security vulnerability scan
- [ ] Performance benchmarking

**Deliverables**:
- Audit report with findings
- Risk assessment
- Remediation plan
- Updated security documentation

**Action Items**:
- Present findings to stakeholders
- Prioritize remediation items
- Update procedures based on lessons learned

#### 9. User Feedback Review

**Frequency**: Quarterly  
**Owner**: Product Team  
**Duration**: 2 days

**Feedback Sources**:
- Dispute reasons
- Support tickets
- User surveys
- Forum discussions
- Detection failure reports

**Analysis**:
- Categorize feedback by theme
- Identify top pain points
- Prioritize improvements
- Create feature roadmap

**Action Items**:
- Update FAQ and documentation
- Plan UX improvements
- Schedule feature development
- Communicate changes to users

## Incident Response

### Detection System Failure

**Severity**: High  
**Response Time**: 1 hour

**Symptoms**:
- > 50% flagged detections
- Hash chain verification failures
- Server errors on evidence submission

**Response Steps**:
1. Notify operations team immediately
2. Disable auto-finalization of uncertain detections
3. Switch to manual confirmation mode
4. Investigate root cause (check logs, metrics)
5. Apply hotfix or rollback if needed
6. Communicate with affected users
7. Post-incident review within 24 hours

### Hash Chain Compromise

**Severity**: Critical  
**Response Time**: Immediate

**Symptoms**:
- Evidence hash mismatches
- Timestamp inconsistencies
- Unauthorized modifications

**Response Steps**:
1. Freeze all game rooms immediately
2. Preserve current state for forensics
3. Restore from last verified backup
4. Notify all affected players
5. Conduct security investigation
6. Implement additional safeguards
7. Public disclosure if data breach

### Blockchain Anchor Failure

**Severity**: Medium  
**Response Time**: 24 hours

**Symptoms**:
- Transaction not confirmed
- Incorrect root published
- Smart contract error

**Response Steps**:
1. Retry transaction with higher gas
2. Verify root calculation
3. Use alternative blockchain if needed
4. Document incident
5. Update anchoring procedures

## Automation Opportunities

### High Priority

1. **Automated Merkle Snapshots**
   - Cron job: Weekly at midnight
   - Store roots in database
   - Alert on failure

2. **Daily Chain Verification**
   - GitHub Actions workflow
   - Verify all active rooms
   - Post results to dashboard

3. **Detection Metrics Dashboard**
   - Real-time detection status
   - Dispute rate tracking
   - Configuration tuning suggestions

### Medium Priority

4. **Automated Calibration**
   - ML-based threshold optimization
   - A/B testing framework
   - Gradual rollout automation

5. **Blockchain Anchoring**
   - Scheduled monthly anchoring
   - Multi-chain support
   - Cost optimization

6. **Backup Automation**
   - Continuous backup to cloud
   - Automated restoration testing
   - Disaster recovery drills

## Monitoring & Alerts

### Key Metrics

**Detection Quality**:
- Detection status distribution (verified/uncertain/flagged)
- Average confidence scores
- Consensus agreement rate
- Dispute rate

**System Health**:
- Evidence submission latency
- Hash chain verification time
- Durable Object response time
- Error rates

**Security**:
- Failed verification attempts
- Suspicious player behavior
- Evidence tampering attempts
- Unusual dispute patterns

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Flagged detections | > 10% | > 20% |
| Evidence hash mismatch | > 0 | > 5 |
| Chain verification failures | > 1 | > 5 |
| Dispute rate | > 5% | > 15% |
| API error rate | > 1% | > 5% |

### Alert Channels

- **Slack**: Real-time alerts for on-call team
- **Email**: Daily digest for operations team
- **Dashboard**: Visual monitoring for all stakeholders
- **PagerDuty**: Critical incidents (24/7)

## Documentation Maintenance

### Update Triggers

Update documentation when:
- [ ] Algorithm version changes
- [ ] Configuration thresholds adjusted
- [ ] New features added
- [ ] Security vulnerabilities discovered
- [ ] User feedback indicates confusion
- [ ] Regulatory requirements change

### Documentation Checklist

When updating docs:
- [ ] Update version numbers
- [ ] Add changelog entry
- [ ] Update examples with current values
- [ ] Review cross-references
- [ ] Test code snippets
- [ ] Get peer review
- [ ] Publish and announce changes

## Training & Onboarding

### New Team Members

**Week 1**:
- Read all documentation (INDEPENDENT_DETECTION.md, HASH_CHAIN.md, API_REFERENCE.md)
- Run verification scripts locally
- Review recent detection metrics
- Shadow experienced team member

**Week 2**:
- Perform daily tasks with supervision
- Investigate sample detection failures
- Participate in calibration session
- Review incident response procedures

**Week 3**:
- Perform tasks independently
- Contribute to documentation
- Propose process improvements
- Join on-call rotation

### Knowledge Transfer

**Documentation**:
- Decision log for historical context
- Runbooks for common procedures
- Troubleshooting guides
- Architecture diagrams

**Sessions**:
- Weekly team meetings
- Monthly deep dives on specific topics
- Quarterly workshops on new technologies
- Annual security training

## Success Metrics

### Detection System

- **Accuracy**: > 90% correct detections (ground truth)
- **Dispute Rate**: < 5% of all evidences
- **Uncertain Rate**: < 20% requiring manual confirmation
- **Flagged Rate**: < 5% requiring re-roll

### Operations

- **Chain Verification**: 100% success rate
- **Uptime**: > 99.9% availability
- **Response Time**: < 100ms for evidence submission
- **Backup Success**: 100% successful weekly backups

### Security

- **Zero Breaches**: No hash chain compromises
- **Zero Data Loss**: No evidence or chain data lost
- **Audit Compliance**: 100% pass rate on quarterly audits

## Contact Information

**Operations Team**: ops@example.com  
**Security Team**: security@example.com  
**ML/CV Team**: ml@example.com  
**On-Call**: oncall@example.com  
**Support**: support@example.com

---

**Document Status**: Complete  
**Last Updated**: 2025-10-21  
**Version**: 1.0  
**Next Review**: 2026-01-21  
**Owner**: Operations Team
