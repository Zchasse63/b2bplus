# Database Backup & Restore Procedures

## Overview

B2B Plus uses Supabase (PostgreSQL) for data persistence. This document outlines backup procedures, disaster recovery steps, and restore processes.

## Automated Backups

### Supabase Managed Backups

Supabase provides automatic backup functionality based on your plan:

- **Free Plan**: No automatic backups (use manual methods)
- **Pro Plan**: Daily backups with 7-day retention
- **Team/Enterprise Plans**: Daily backups with 30-day retention + Point-in-Time Recovery (PITR)

### Verify Backup Configuration

1. Log into Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: Project → Settings → Database → Backups
3. Confirm backup schedule and retention settings
4. Enable PITR if available (Team/Enterprise plans)

**Current Configuration** (verify in dashboard):
- Backup Frequency: Daily (automatic)
- Retention Period: 7 days (Pro) / 30 days (Team+)
- PITR: Available on Team/Enterprise plans

## Manual Backup Procedures

### 1. CLI-Based Backup (Recommended)

**Prerequisites:**
- Supabase CLI installed: `npm install -g supabase`
- Database connection string from Supabase Dashboard

**Steps:**

```bash
# Set connection string (get from Supabase Dashboard → Settings → Database)
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Create backup
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# Backup with data and schema
pg_dump $SUPABASE_DB_URL > backup-full-$(date +%Y%m%d-%H%M%S).sql

# Backup schema only
pg_dump --schema-only $SUPABASE_DB_URL > backup-schema-$(date +%Y%m%d-%H%M%S).sql

# Backup data only
pg_dump --data-only $SUPABASE_DB_URL > backup-data-$(date +%Y%m%d-%H%M%S).sql
```

**Backup Script** (`scripts/backup-database.sh`):

```bash
#!/bin/bash
# Automated database backup script

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/b2b-plus-backup-$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep SUPABASE_DB_URL | xargs)
fi

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL not set"
  exit 1
fi

# Create backup
echo "Creating backup: $BACKUP_FILE"
pg_dump "$SUPABASE_DB_URL" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE.gz"

# Delete backups older than 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Cleanup completed: removed backups older than 30 days"
```

### 2. Using Docker/Local Development

**For local Supabase instance:**

```bash
# Backup local database
supabase db dump -f local-backup.sql --local

# Restore to local
supabase db reset --local
psql -h localhost -U postgres -d postgres < local-backup.sql
```

## Restore Procedures

### 1. Restore from Supabase Dashboard

**For managed backups:**

1. Go to: Supabase Dashboard → Settings → Database → Backups
2. Select backup to restore
3. Click "Restore" button
4. Confirm restoration (this will overwrite current database)
5. Wait for restoration to complete (monitor in dashboard)

**Caution**: This overwrites the entire database. Test in staging first.

### 2. Restore from Manual Backup

**Prerequisites:**
- Backup SQL file
- Database connection string
- DANGER: This will overwrite the current database

**Steps:**

```bash
# IMPORTANT: This will DROP and RECREATE the database
# Only run on staging or after confirming with team

# Option A: Restore via psql
psql $SUPABASE_DB_URL < backup-20240118-120000.sql

# Option B: Restore specific tables only
psql $SUPABASE_DB_URL -c "TRUNCATE TABLE orders CASCADE;"
psql $SUPABASE_DB_URL < backup-orders-only.sql

# Option C: Restore using Supabase CLI
supabase db push --db-url $SUPABASE_DB_URL < backup.sql
```

### 3. Point-in-Time Recovery (PITR)

**Available on Team/Enterprise plans:**

1. Go to: Supabase Dashboard → Settings → Database → Backups
2. Click "Point-in-Time Recovery"
3. Select timestamp to restore to
4. Confirm recovery
5. Wait for restoration to complete

**Use cases:**
- Accidental data deletion
- Corrupted data from bad deployment
- Rolling back to specific point before incident

## Disaster Recovery

### Scenario 1: Accidental Data Deletion

**Steps:**

1. **Immediate Actions:**
   - Stop all write operations to prevent further data loss
   - Document what was deleted (tables, rows, time range)

2. **Recovery:**
   - If deletion was recent (<5 min): Use PITR if available
   - If no PITR: Restore from most recent backup
   - For specific tables: Use table-level restore

3. **Verification:**
   - Run data integrity checks
   - Verify critical records exist
   - Test application functionality

### Scenario 2: Database Corruption

**Steps:**

1. **Assessment:**
   - Check Supabase Dashboard for database status
   - Review error logs
   - Contact Supabase support if infrastructure issue

2. **Recovery:**
   - Restore from most recent known-good backup
   - If corruption is in specific tables, restore those tables only

3. **Prevention:**
   - Enable PITR for faster recovery
   - Run regular backups before deployments

### Scenario 3: Complete Database Loss

**Steps:**

1. **Contact Supabase Support** immediately
2. **Restore from latest backup:**
   - Use most recent manual or automated backup
   - Restore to new Supabase project if necessary
3. **Update application configuration:**
   - Update DATABASE_URL in environment variables
   - Redeploy application
4. **Data reconciliation:**
   - Identify data loss window (time between backup and incident)
   - Manually restore critical records if possible

## Testing Backup & Restore

### Monthly Backup Test

**Execute this checklist monthly:**

1. Create manual backup
2. Restore to staging environment
3. Verify data integrity:
   - Check row counts match production
   - Test critical queries
   - Verify RLS policies work
4. Document any issues
5. Update this documentation if procedures change

**Verification Script** (`scripts/verify-backup.sh`):

```bash
#!/bin/bash
# Verify backup integrity

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./verify-backup.sh <backup-file.sql>"
  exit 1
fi

# Check file size
SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
echo "Backup size: $(($SIZE / 1024 / 1024)) MB"

# Count table definitions
TABLES=$(grep -c "CREATE TABLE" "$BACKUP_FILE")
echo "Tables: $TABLES"

# Count data inserts
INSERTS=$(grep -c "COPY .* FROM stdin" "$BACKUP_FILE")
echo "Tables with data: $INSERTS"

# Check for common errors
if grep -q "ERROR" "$BACKUP_FILE"; then
  echo "WARNING: Backup contains error messages"
fi

echo "Verification complete"
```

## Backup Retention Policy

### Production Backups

- **Automated**: 7 days (Pro) / 30 days (Team+)
- **Manual**: 90 days (stored in S3/local)
- **Monthly**: Keep one backup per month for 1 year
- **Yearly**: Keep end-of-year backup indefinitely

### Staging Backups

- **Automated**: 7 days
- **Manual**: Not required (can restore from production)

## Storage Locations

### Primary Backup Storage

- **Supabase Managed**: Stored in Supabase infrastructure (AWS)
- **Manual Backups**: Store in secure location:
  - AWS S3: `s3://b2b-plus-backups/database/`
  - Local: `./backups/` (gitignored)
  - Team shared drive: Encrypted, access controlled

### Security Considerations

- **Encryption**: All backups must be encrypted at rest
- **Access Control**: Limit backup access to DevOps team only
- **Credentials**: Never commit backup files or connection strings to git
- **Offsite Storage**: Keep at least one backup copy in different region

## Backup Monitoring

### Automated Alerts

Set up monitoring for:
- Backup failures (check Supabase webhook logs)
- Backup size anomalies (>20% deviation)
- Missing scheduled backups

### Manual Checks

**Weekly:**
- Verify most recent backup timestamp in dashboard
- Check backup file sizes

**Monthly:**
- Test restore procedure
- Audit backup retention compliance

## Emergency Contacts

### Backup Issues

- **Primary**: DevOps Team Lead
- **Secondary**: Database Administrator
- **Vendor Support**: Supabase Support (support@supabase.io)
- **Escalation**: CTO

### Support Resources

- Supabase Documentation: https://supabase.com/docs/guides/database/backups
- Supabase Support Portal: https://supabase.com/dashboard/support
- Community: https://github.com/supabase/supabase/discussions

## Appendix

### Useful Commands

```bash
# List all tables
psql $SUPABASE_DB_URL -c "\dt"

# Check database size
psql $SUPABASE_DB_URL -c "SELECT pg_size_pretty(pg_database_size('postgres'));"

# Count rows in critical tables
psql $SUPABASE_DB_URL -c "
  SELECT schemaname, tablename, n_live_tup
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC;
"

# Export specific table
pg_dump $SUPABASE_DB_URL -t orders > orders-backup.sql
```

### Migration Backup

Before running migrations:

```bash
# Pre-migration backup
./scripts/backup-database.sh

# Run migration
supabase migration up

# Post-migration verification
./scripts/verify-backup.sh backups/latest.sql
```

---

**Last Updated**: 2026-01-18
**Reviewed By**: DevOps Team
**Next Review**: 2026-02-18
