# Database Backup Strategy

## Overview

This document outlines the backup and disaster recovery procedures for the B2B Plus application database.

## Backup Strategy

### Backup Types

#### 1. Automated Daily Backups
- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 30 days
- **Type**: Full database backup
- **Location**: AWS S3 (encrypted)
- **RPO (Recovery Point Objective)**: 24 hours

#### 2. Hourly Incremental Backups
- **Frequency**: Every hour
- **Retention**: 7 days
- **Type**: Incremental backup
- **Location**: AWS S3 (encrypted)
- **RPO**: 1 hour

#### 3. Point-in-Time Recovery (PITR)
- **Retention**: 7 days
- **Granularity**: 1 minute
- **Enabled**: Yes
- **Location**: Supabase managed

#### 4. Manual Backups
- **Frequency**: Before major deployments
- **Retention**: 90 days
- **Type**: Full database backup
- **Location**: AWS S3 + local backup

### Backup Configuration

```bash
# Automated backup script (runs via cron)
0 2 * * * /scripts/backup-database.sh

# Backup command
supabase db pull --db-url $SUPABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Retention Policies

| Backup Type | Retention Period | Storage Location | Encryption |
|-------------|------------------|------------------|------------|
| Daily Full | 30 days | AWS S3 | AES-256 |
| Hourly Incremental | 7 days | AWS S3 | AES-256 |
| PITR | 7 days | Supabase | Managed |
| Manual | 90 days | AWS S3 + Local | AES-256 |
| Pre-deployment | 30 days | AWS S3 | AES-256 |

## Backup Verification

### Automated Verification
- **Frequency**: Daily after backup completion
- **Process**: 
  1. Verify backup file integrity (checksum)
  2. Test restore to staging environment
  3. Validate data consistency
  4. Run smoke tests

### Manual Verification
```bash
# Verify backup integrity
sha256sum backup_20240101_020000.sql

# Test restore
psql -h localhost -U postgres < backup_20240101_020000.sql

# Validate data
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM products;
```

## Disaster Recovery Procedures

### RTO (Recovery Time Objective)
- **Critical Data Loss**: 1 hour
- **Partial Data Loss**: 4 hours
- **Full System Failure**: 8 hours

### Recovery Scenarios

#### Scenario 1: Recent Data Loss (< 24 hours)
1. Identify the point in time to recover to
2. Use PITR to restore to specific timestamp
3. Verify data integrity
4. Notify stakeholders

```bash
# Restore to specific point in time
supabase db restore --db-url $SUPABASE_URL --recovery-time 2024-01-15T10:30:00Z
```

#### Scenario 2: Corrupted Data
1. Identify corruption point
2. Restore from daily backup before corruption
3. Replay transactions from PITR
4. Validate data integrity

```bash
# Restore from daily backup
supabase db restore --db-url $SUPABASE_URL --backup-id backup_20240114_020000
```

#### Scenario 3: Complete Database Failure
1. Provision new database instance
2. Restore from latest backup
3. Verify all data
4. Update connection strings
5. Run smoke tests

```bash
# Full restore procedure
./scripts/restore-database.sh --backup-id latest --environment production
```

#### Scenario 4: Ransomware/Malicious Activity
1. Isolate affected systems immediately
2. Restore from backup before attack
3. Investigate attack vector
4. Implement security fixes
5. Restore to clean state

## Backup Monitoring

### Monitoring Metrics
- Backup completion status
- Backup size trends
- Restore test success rate
- Data consistency checks
- Storage usage

### Alerts
- Backup failure: Immediate notification
- Backup size anomaly: Daily review
- Restore test failure: Immediate notification
- Storage quota exceeded: 24-hour warning

### Dashboard
Access backup monitoring at: `https://monitoring.b2bplus.com/backups`

## Backup Testing

### Monthly Restore Tests
- **Frequency**: First Monday of each month
- **Environment**: Staging
- **Procedure**:
  1. Select random backup from past 30 days
  2. Restore to staging environment
  3. Run full test suite
  4. Validate data integrity
  5. Document results

### Quarterly Disaster Recovery Drill
- **Frequency**: Quarterly
- **Scope**: Full system recovery
- **Participants**: DevOps, Engineering, Product
- **Objective**: Validate RTO/RPO targets

## Backup Access Control

### Access Permissions
- **Backup Creation**: Automated (no manual access)
- **Backup Retrieval**: DevOps team only
- **Backup Restoration**: DevOps + Engineering lead approval
- **Backup Deletion**: DevOps + Security approval

### Audit Logging
All backup operations are logged:
- Backup creation/deletion
- Restore operations
- Access attempts
- Verification results

## Backup Storage

### Primary Storage
- **Location**: AWS S3 (us-east-1)
- **Bucket**: `b2b-plus-backups`
- **Encryption**: AES-256 (SSE-S3)
- **Versioning**: Enabled
- **MFA Delete**: Enabled

### Secondary Storage
- **Location**: AWS S3 (us-west-2) - Cross-region replication
- **Replication**: Automatic
- **Encryption**: AES-256

### Local Backup
- **Location**: `/backups/database/` on backup server
- **Retention**: 7 days
- **Encryption**: AES-256

## Cost Optimization

### Storage Costs
- Daily backups: ~$50/month
- Hourly backups: ~$100/month
- PITR: ~$30/month
- **Total**: ~$180/month

### Cost Reduction Strategies
- Archive old backups to Glacier after 90 days
- Compress backups before storage
- Deduplicate backup data

## Compliance

### Regulatory Requirements
- **GDPR**: Right to deletion - backups deleted after retention period
- **SOC 2**: Backup encryption and access controls
- **HIPAA**: Backup encryption and audit logging (if applicable)

### Backup Retention Compliance
- Backups retained per policy
- Automatic deletion after retention period
- Audit trail maintained for 1 year

## Contacts

### Backup Administration
- **Primary**: DevOps Team (devops@b2bplus.com)
- **Secondary**: Engineering Lead (engineering@b2bplus.com)
- **Emergency**: On-call rotation

### Escalation
- **Backup Failure**: Page on-call DevOps
- **Data Loss**: Page Engineering Lead + CTO
- **Security Incident**: Page Security Team + CTO

## Related Documentation
- [Disaster Recovery Plan](./disaster-recovery-plan.md)
- [Database Operations](./database-operations.md)
- [Security Procedures](./security-procedures.md)

