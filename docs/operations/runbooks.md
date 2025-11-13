# Operational Runbooks

## Table of Contents
1. [Deployment Runbook](#deployment-runbook)
2. [Incident Response](#incident-response)
3. [Database Operations](#database-operations)
4. [Scaling Operations](#scaling-operations)
5. [Troubleshooting Guide](#troubleshooting-guide)

## Deployment Runbook

### Pre-Deployment Checklist
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review approved
- [ ] Security scan passed
- [ ] Performance baseline acceptable
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Team notified

### Staging Deployment
```bash
# 1. Prepare
git checkout develop
git pull origin develop

# 2. Build and test
pnpm install
pnpm test
pnpm build

# 3. Deploy
./scripts/deploy.sh staging

# 4. Verify
curl https://staging.b2bplus.com/api/health
pnpm test:e2e --env staging

# 5. Notify
# Send notification to #deployments channel
```

### Production Deployment
```bash
# 1. Prepare
git checkout main
git pull origin main

# 2. Build and test
pnpm install
pnpm test --coverage
pnpm build

# 3. Create backup
./scripts/backup-database.sh

# 4. Deploy
./scripts/deploy.sh production

# 5. Monitor
# Watch metrics for 30 minutes
# Check error rates, response times, database connections

# 6. Verify
curl https://b2bplus.com/api/health
# Run smoke tests

# 7. Notify
# Send notification to #deployments and #leadership
```

### Rollback Procedure
```bash
# If deployment fails:
./scripts/rollback.sh production

# Verify rollback
curl https://b2bplus.com/api/health

# Investigate failure
# Document root cause
# Create incident report
```

## Incident Response

### Critical Error (P1)
**Response Time**: 15 minutes

1. **Alert & Acknowledge**
   - Acknowledge alert in Sentry/monitoring
   - Page on-call engineer
   - Create incident in incident management system

2. **Assess Impact**
   - Check error rate and affected users
   - Determine if rollback needed
   - Notify stakeholders

3. **Immediate Action**
   - If error rate > 5%: Initiate rollback
   - If database issue: Check connection pool
   - If API issue: Check rate limiting

4. **Investigation**
   - Review error logs
   - Check recent deployments
   - Review database queries
   - Check external service status

5. **Resolution**
   - Apply fix or rollback
   - Verify resolution
   - Monitor for 1 hour

6. **Post-Incident**
   - Document root cause
   - Create follow-up tasks
   - Schedule post-mortem

### High Error Rate (P2)
**Response Time**: 1 hour

1. Check error logs
2. Identify error pattern
3. Determine if rollback needed
4. Apply fix or rollback
5. Monitor for 30 minutes

### Performance Degradation (P3)
**Response Time**: 4 hours

1. Check performance metrics
2. Identify bottleneck
3. Check database queries
4. Check cache hit rates
5. Apply optimization or rollback

## Database Operations

### Database Migration
```bash
# 1. Create migration
supabase migration new add_new_column

# 2. Edit migration file
# supabase/migrations/TIMESTAMP_add_new_column.sql

# 3. Test locally
supabase migration up

# 4. Backup production
./scripts/backup-database.sh

# 5. Apply to staging
supabase migration up --db-url $STAGING_DB_URL

# 6. Test in staging
# Run full test suite

# 7. Apply to production
supabase migration up --db-url $PRODUCTION_DB_URL

# 8. Verify
SELECT * FROM information_schema.columns WHERE table_name = 'table_name';
```

### Database Restore
```bash
# 1. Identify backup to restore
aws s3 ls s3://b2b-plus-backups/

# 2. Download backup
aws s3 cp s3://b2b-plus-backups/backup_20240115_020000.sql .

# 3. Restore to staging first
psql -h staging-db.supabase.co -U postgres < backup_20240115_020000.sql

# 4. Verify data
SELECT COUNT(*) FROM orders;

# 5. If verified, restore to production
psql -h prod-db.supabase.co -U postgres < backup_20240115_020000.sql

# 6. Verify production
SELECT COUNT(*) FROM orders;
```

## Scaling Operations

### Horizontal Scaling
```bash
# 1. Monitor current load
# Check CPU, memory, connections

# 2. Increase instance count
vercel scale --instances 5

# 3. Monitor new instances
# Check error rates, response times

# 4. Verify load distribution
# Check logs from all instances
```

### Database Scaling
```bash
# 1. Monitor database metrics
# Check connections, query time, CPU

# 2. Increase connection pool
# Update connection-pool.ts

# 3. Add database indexes
# Review slow queries
# Create indexes for frequently queried columns

# 4. Archive old data
# Move historical data to archive table
```

## Troubleshooting Guide

### High Error Rate
1. Check Sentry for error patterns
2. Check recent deployments
3. Check database connectivity
4. Check external service status
5. Check rate limiting

### Slow Response Times
1. Check database query performance
2. Check cache hit rates
3. Check API response times
4. Check external service latency
5. Check server CPU/memory

### Database Connection Issues
1. Check connection pool status
2. Check database server status
3. Check network connectivity
4. Check firewall rules
5. Check connection string

### Memory Leaks
1. Check memory usage trends
2. Review recent code changes
3. Check for unclosed connections
4. Check for event listener leaks
5. Restart service if necessary

### Deployment Failures
1. Check build logs
2. Check test results
3. Check security scan results
4. Check database migrations
5. Check environment variables

## Escalation Contacts

### On-Call Rotation
- **Primary**: DevOps Engineer
- **Secondary**: Engineering Lead
- **Tertiary**: CTO

### Escalation Levels
- **P1 (Critical)**: Page all on-call
- **P2 (High)**: Page primary on-call
- **P3 (Medium)**: Create ticket
- **P4 (Low)**: Add to backlog

## Related Documentation
- [Deployment Guide](./deployment-guide.md)
- [Database Backup Strategy](./database-backup-strategy.md)
- [Monitoring & Alerting](./monitoring-alerting.md)
- [Security Procedures](./security-procedures.md)

