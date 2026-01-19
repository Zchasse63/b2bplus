# B2B Plus Operations Runbook

**Last Updated:** 2026-01-18
**Version:** 1.0
**Audience:** On-call engineers, DevOps, SRE

---

## Table of Contents

1. [Service Overview](#1-service-overview)
2. [Health Checks](#2-health-checks)
3. [Monitoring & Alerts](#3-monitoring--alerts)
4. [Common Issues & Troubleshooting](#4-common-issues--troubleshooting)
5. [Incident Response](#5-incident-response)
6. [Rollback Procedures](#6-rollback-procedures)
7. [Useful Commands](#7-useful-commands)
8. [Appendix](#appendix)

---

## 1. Service Overview

### Application Architecture

B2B Plus is a B2B e-commerce platform built with the following stack:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Web App   │  │ Mobile App  │  │    Admin Dashboard      │  │
│  │  (Next.js)  │  │   (Expo)    │  │      (Next.js)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Edge/CDN Layer                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Vercel Edge Network                    │    │
│  │        (CDN, SSL termination, Edge Functions)           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  API Routes  │  │  Middleware  │  │   Server Components   │   │
│  │  (Next.js)   │  │ (Rate Limit) │  │       (RSC)           │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │ Supabase │  │ Upstash  │  │  Sentry  │  │  AI Services   │   │
│  │   (DB)   │  │ (Redis)  │  │ (Errors) │  │ (Grok/Gemini)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Dependencies and External Services

| Service | Purpose | Dashboard URL | Status Page |
|---------|---------|---------------|-------------|
| **Vercel** | Hosting & Deployment | https://vercel.com/dashboard | https://www.vercel-status.com/ |
| **Supabase** | PostgreSQL Database & Auth | https://app.supabase.com | https://status.supabase.com/ |
| **Upstash** | Redis (Rate Limiting, Cache) | https://console.upstash.com | https://status.upstash.com/ |
| **Sentry** | Error Tracking | https://sentry.io | https://status.sentry.io/ |
| **SendGrid** | Email Service | https://app.sendgrid.com | https://status.sendgrid.com/ |
| **xAI (Grok)** | AI/ML Services | https://console.x.ai | N/A |
| **Google AI (Gemini)** | AI/ML Services | https://console.cloud.google.com | https://status.cloud.google.com/ |

### Environment URLs

| Environment | URL | Purpose |
|-------------|-----|---------|
| **Production** | https://b2bplus.com | Live application |
| **Staging** | https://staging.b2bplus.com | Pre-production testing |
| **Development** | http://localhost:3000 | Local development |

### Critical Environment Variables

Reference: `apps/web/lib/env.ts`

```
# Required in Production
NEXT_PUBLIC_SUPABASE_URL      - Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase public key
SUPABASE_SERVICE_ROLE_KEY     - Supabase service key (server-side only)
GOOGLE_API_KEY                - Google Gemini API key
SENDGRID_API_KEY              - SendGrid API key
SENDGRID_FROM_EMAIL           - Sender email address
NEXT_PUBLIC_APP_URL           - Application base URL

# Optional but Recommended
UPSTASH_REDIS_REST_URL        - Redis URL for rate limiting
UPSTASH_REDIS_REST_TOKEN      - Redis auth token
SENTRY_DSN                    - Sentry error tracking DSN
NEXT_PUBLIC_SENTRY_DSN        - Client-side Sentry DSN
```

---

## 2. Health Checks

### Health Endpoint

**Endpoint:** `GET /api/health`

**Location:** `apps/web/app/api/health/route.ts`

### Expected Response Format

**Healthy Response (HTTP 200):**
```json
{
  "status": "ok",
  "timestamp": "2026-01-18T12:00:00.000Z",
  "uptime": 86400.123,
  "environment": "production"
}
```

**Unhealthy Response (HTTP 503):**
```json
{
  "status": "error",
  "timestamp": "2026-01-18T12:00:00.000Z",
  "error": "Database connection failed"
}
```

### Health Check Verification

```bash
# Basic health check
curl -s https://b2bplus.com/api/health | jq .

# Health check with response time
curl -w "\nResponse time: %{time_total}s\n" -s https://b2bplus.com/api/health

# Automated health monitoring
watch -n 30 'curl -s https://b2bplus.com/api/health | jq .status'
```

### What Each Check Verifies

| Check | Component | Failure Indicates |
|-------|-----------|-------------------|
| `status: ok` | Application | Server is running and responding |
| `uptime` | Process | Time since last restart |
| `environment` | Config | Environment variables loaded correctly |

### Extended Health Checks

For deeper diagnostics, use the logging stats endpoint (if available):

```bash
# Get API metrics (requires admin auth)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://b2bplus.com/api/admin/stats | jq .
```

---

## 3. Monitoring & Alerts

### Sentry Error Tracking

**Configuration:** `apps/web/instrumentation.ts` and `apps/web/sentry.server.config.ts`

#### Sentry Setup
- **DSN:** Set via `SENTRY_DSN` environment variable
- **Environment:** Automatically detected from `NODE_ENV`
- **Traces Sample Rate:** 10% in production, 100% in development
- **Ignored Errors:** `NetworkError`, `AbortError`

#### Accessing Sentry

1. Log in to https://sentry.io
2. Navigate to B2B Plus project
3. Check Issues tab for new errors
4. Use Discover for error trends

#### Key Sentry Queries

```
# High volume errors in last hour
is:unresolved firstSeen:-1h

# Database-related errors
is:unresolved message:*database* OR message:*connection*

# Authentication errors
is:unresolved message:*auth* OR message:*unauthorized*

# Rate limit errors
is:unresolved status:429
```

### Key Metrics to Monitor

| Metric | Normal Range | Warning | Critical |
|--------|--------------|---------|----------|
| **Error Rate** | < 1% | > 3% | > 5% |
| **Response Time (P95)** | < 1s | > 3s | > 5s |
| **Response Time (P99)** | < 3s | > 5s | > 10s |
| **Database Connections** | < 60% | > 80% | > 90% |
| **Cache Hit Rate** | > 80% | < 50% | < 20% |
| **API Availability** | > 99.9% | < 99.5% | < 99% |
| **Memory Usage** | < 70% | > 85% | > 95% |

### Alert Thresholds

Reference: `docs/deployment/deployment-guide.md`

| Alert Type | Threshold | Severity | Response Time |
|------------|-----------|----------|---------------|
| Error rate > 5% | Critical | P1 | 15 minutes |
| Response time > 5s | Warning | P2 | 1 hour |
| Database connections > 90% | Warning | P2 | 1 hour |
| API availability < 99% | Critical | P1 | 15 minutes |
| Memory usage > 95% | Critical | P1 | 15 minutes |

### Logging System

Reference: `apps/web/src/lib/api/logging.ts`

#### Log Levels
- `debug` - Detailed debugging information
- `info` - Normal operational messages
- `warn` - Warning conditions (non-critical)
- `error` - Error conditions requiring attention

#### Log Format
```
[CORRELATION_ID] METHOD /path - STATUS_CODE (DURATION_MS)
```

Example:
```
[1705579200000-abc123] POST /api/orders - 201 (245ms)
```

#### Correlation IDs
Every request includes a `X-Correlation-ID` header for tracing:
- Use this ID to trace requests across services
- Search logs by correlation ID for full request trace
- Included in error responses for debugging

### Metrics Collection

The API logger tracks:
- Total requests per time window
- Average response time
- Error count and error rate
- Requests by status code

Access via:
```typescript
import { apiLogger } from '@/src/lib/api/logging';

// Get metrics for last hour
const metrics = apiLogger.getMetrics(3600000);
// Returns: { totalRequests, avgResponseTime, errorCount, errorRate }

// Get recent error logs
const errors = apiLogger.getErrorLogs(100);
```

---

## 4. Common Issues & Troubleshooting

### Database Connection Issues

**Symptoms:**
- 500 errors on API requests
- "Connection timeout" in logs
- Health check returns error status

**Reference:** `apps/web/lib/database/connection-pool.ts`

#### Connection Pool Configuration

| Environment | Max Connections | Connection Timeout | Idle Timeout |
|-------------|-----------------|-------------------|--------------|
| Production | 20 | 10s | 60s |
| Staging | 15 | 10s | 60s |
| Development | 5 | 3s | 10s |

#### Diagnostic Steps

1. **Check Supabase status:**
   ```bash
   # Check Supabase status page
   open https://status.supabase.com/
   ```

2. **Check connection pool metrics:**
   ```typescript
   import { poolMonitor } from '@/lib/database/connection-pool';

   const metrics = poolMonitor.getMetrics();
   const health = poolMonitor.getHealthStatus();
   ```

3. **Verify database connectivity:**
   ```bash
   # Test connection (from secure environment only)
   psql $SUPABASE_DB_URL -c "SELECT 1"
   ```

#### Resolution Steps

1. **If connection pool exhausted:**
   - Check for connection leaks in recent deployments
   - Temporarily increase `maxConnections` in pool config
   - Consider adding read replicas

2. **If Supabase is down:**
   - Check Supabase status page
   - Activate maintenance mode if available
   - Notify users of degraded service

3. **If network issues:**
   - Check Vercel region configuration
   - Verify firewall rules
   - Check DNS resolution

---

### Rate Limiting (429 Errors)

**Symptoms:**
- HTTP 429 "Too Many Requests" responses
- `X-RateLimit-Remaining: 0` header
- Users reporting blocked requests

**Reference:** `apps/web/lib/middleware/rate-limit.ts` and `apps/web/lib/rate-limiting/rate-limit-config.ts`

#### Rate Limit Configuration

| Endpoint Type | Requests | Window | Use Case |
|---------------|----------|--------|----------|
| Public | 30 | 15 min | Unauthenticated endpoints |
| Auth | 5 | 15 min | Login/signup (brute force protection) |
| API | 100 | 1 min | General authenticated API |
| AI | 100 | 1 hour | AI endpoints (cost control) |
| Admin | 500 | 1 min | Admin operations |
| Upload | 20 | 1 hour | File uploads |
| Webhook | 1000 | 1 min | External webhooks |

#### User Tier Multipliers

| Tier | Multiplier | Description |
|------|------------|-------------|
| Free | 0.5x | 50% of standard limits |
| Standard | 1.0x | Base limits |
| Premium | 2.0x | 200% of standard |
| Enterprise | 5.0x | 500% of standard |
| Admin | 100x | Effectively no limits |

#### Diagnostic Steps

1. **Check rate limit headers:**
   ```bash
   curl -I https://b2bplus.com/api/orders
   # Look for X-RateLimit-* headers
   ```

2. **Check Redis (Upstash) status:**
   ```bash
   open https://console.upstash.com
   ```

3. **Review rate limit logs:**
   - Search for "Rate limit exceeded" in logs
   - Check IP addresses hitting limits

#### Resolution Steps

1. **For legitimate traffic spikes:**
   - Temporarily increase limits for specific endpoints
   - Add user to higher tier if appropriate
   - Consider implementing request queuing

2. **For abuse/attacks:**
   - Block offending IP addresses
   - Enable additional security measures
   - Consider enabling CAPTCHA

3. **If Redis is unavailable:**
   - System falls back to in-memory rate limiting
   - Monitor for reduced accuracy
   - Restore Redis connection ASAP

---

### Authentication Failures

**Symptoms:**
- 401 Unauthorized responses
- "Invalid session" errors
- Users unable to log in

**Reference:** `apps/web/contexts/AuthContext.tsx`

#### Diagnostic Steps

1. **Check Supabase Auth status:**
   ```bash
   open https://app.supabase.com
   # Navigate to Authentication > Users
   ```

2. **Verify auth configuration:**
   - Check `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is valid
   - Check JWT expiry settings

3. **Check for session issues:**
   - Verify cookies are being set correctly
   - Check for CORS issues
   - Review browser console for auth errors

#### Common Auth Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `invalid_grant` | Expired refresh token | User must re-login |
| `user_not_found` | Deleted/disabled user | Check user status in Supabase |
| `invalid_credentials` | Wrong password | Password reset if needed |
| `email_not_confirmed` | Unverified email | Resend verification email |

#### Resolution Steps

1. **For individual user issues:**
   - Reset user password via admin
   - Clear user session in Supabase
   - Verify user email status

2. **For system-wide auth issues:**
   - Check Supabase Auth service status
   - Verify environment variables
   - Check for recent auth config changes

---

### AI Endpoint Timeouts

**Symptoms:**
- Requests to `/api/ai/*` timing out
- 504 Gateway Timeout errors
- Slow AI-powered features

**Reference:** `apps/web/lib/ai/`

#### AI Service Endpoints

| Service | Endpoint Pattern | Typical Response Time |
|---------|------------------|----------------------|
| Grok | `/api/ai/companion/*` | 2-10s |
| Gemini | `/api/ai/documents/*` | 3-15s |
| Recommendations | `/api/recommendations/*` | 1-5s |
| Chatbot | `/api/chatbot/*` | 2-8s |

#### Timeout Configuration

| Environment | Query Timeout | Statement Timeout |
|-------------|---------------|-------------------|
| Production | 60s | 60s |
| Development | 30s | 30s |

#### Diagnostic Steps

1. **Check AI provider status:**
   ```bash
   # Google AI
   open https://status.cloud.google.com/

   # Check AI endpoint directly (if API key available)
   curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent" \
     -H "Content-Type: application/json" \
     -H "x-goog-api-key: $GOOGLE_API_KEY" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
   ```

2. **Review AI endpoint logs:**
   - Search for timeout errors
   - Check request durations
   - Look for rate limit responses from providers

3. **Check AI rate limits:**
   - Review `apps/web/lib/middleware/ai-security.ts`
   - Check daily AI request counts

#### Resolution Steps

1. **For provider issues:**
   - Check provider status pages
   - Enable fallback to alternative provider
   - Cache AI responses where possible

2. **For rate limit issues:**
   - Reduce AI request frequency
   - Implement request queuing
   - Consider upgrading provider tier

3. **For slow responses:**
   - Optimize prompts for faster responses
   - Reduce context size
   - Consider using faster model variants

---

## 5. Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1 - Critical** | Service completely down or data breach | 15 minutes | Complete outage, security incident, data corruption |
| **P2 - High** | Major feature broken, high error rate | 1 hour | Payment failures, auth issues, >5% error rate |
| **P3 - Medium** | Degraded performance, minor features broken | 4 hours | Slow responses, non-critical feature failure |
| **P4 - Low** | Minor issues, cosmetic problems | 24 hours | UI glitches, minor bugs, documentation |

### Escalation Procedures

#### P1 - Critical Incident

```
0-15 min:  Primary On-Call acknowledges and begins investigation
15-30 min: If unresolved, escalate to Secondary On-Call
30-60 min: If unresolved, escalate to Engineering Lead
60+ min:   If unresolved, escalate to CTO
```

**Immediate Actions:**
1. Acknowledge alert in monitoring system
2. Create incident channel: `#incident-YYYY-MM-DD-brief-description`
3. Post initial assessment to incident channel
4. Page additional help if needed
5. Consider immediate rollback

#### P2 - High Priority

```
0-1 hour:  Primary On-Call investigates
1-2 hours: Escalate to Secondary if needed
2-4 hours: Escalate to Engineering Lead
```

#### P3 - Medium Priority

```
0-4 hours: Primary On-Call investigates
4-8 hours: Create ticket for follow-up if needed
```

#### P4 - Low Priority

```
Create ticket and add to backlog for normal prioritization.
```

### Communication Templates

#### Initial Incident Notification

```
**INCIDENT STARTED**
Severity: P[1/2/3/4]
Title: [Brief description]
Impact: [Who/what is affected]
Started: [Time in UTC]
Status: Investigating

Current Actions:
- [What we're doing now]

Updates will be posted every [15/30/60] minutes.
```

#### Status Update

```
**INCIDENT UPDATE** - [Time in UTC]
Severity: P[X]
Status: [Investigating/Identified/Monitoring/Resolved]

Summary:
- [What we've learned]
- [What we've done]
- [What we're doing next]

ETA to resolution: [Time estimate or "Unknown"]
```

#### Resolution Notification

```
**INCIDENT RESOLVED**
Severity: P[X]
Duration: [Total time]
Impact: [Summary of who/what was affected]

Root Cause: [Brief explanation]

Resolution:
- [What fixed the issue]

Follow-up Actions:
- [ ] Post-mortem scheduled for [date]
- [ ] [Other follow-up items]
```

### Incident Commander Responsibilities

1. **Own communication** - Single source of truth for updates
2. **Coordinate responders** - Assign tasks, avoid duplication
3. **Track timeline** - Document all actions and times
4. **Manage escalations** - Bring in additional help as needed
5. **Make decisions** - Rollback vs. fix forward, etc.
6. **Schedule post-mortem** - Within 48 hours of resolution

---

## 6. Rollback Procedures

### Vercel Rollback Steps

**Reference:** `docs/deployment/deployment-guide.md`

#### Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select B2B Plus project
3. Navigate to "Deployments" tab
4. Find the last known good deployment
5. Click "..." menu > "Promote to Production"
6. Confirm the rollback
7. Verify health check: `curl https://b2bplus.com/api/health`

#### Via Vercel CLI

```bash
# List recent deployments
vercel ls --scope b2b-plus

# Rollback to previous deployment
vercel rollback --scope b2b-plus

# Or rollback to specific deployment
vercel rollback [deployment-url] --scope b2b-plus

# Verify rollback
curl https://b2bplus.com/api/health
```

#### Rollback Verification Checklist

- [ ] Health endpoint returns 200
- [ ] No new errors in Sentry
- [ ] Key user flows working (login, orders, etc.)
- [ ] Database connections stable
- [ ] API response times normal

---

### Database Migration Rollback

**Reference:** `docs/operations/database-backup-strategy.md`

#### Rollback Recent Migration

```bash
# Connect to database (use secure method)
export SUPABASE_DB_URL="postgresql://..."

# View migration history
supabase migration list

# Rollback last migration
supabase migration down

# Verify rollback
psql $SUPABASE_DB_URL -c "\dt"
```

#### Restore from Backup

```bash
# 1. List available backups
aws s3 ls s3://b2b-plus-backups/

# 2. Download backup
aws s3 cp s3://b2b-plus-backups/backup_YYYYMMDD_HHMMSS.sql ./restore.sql

# 3. IMPORTANT: Test restore on staging first
psql $STAGING_DB_URL < restore.sql

# 4. Verify staging data
psql $STAGING_DB_URL -c "SELECT COUNT(*) FROM orders;"

# 5. If verified, restore to production (CAUTION)
psql $PRODUCTION_DB_URL < restore.sql

# 6. Verify production
curl https://b2bplus.com/api/health
```

**WARNING:** Database restores can cause data loss. Always:
1. Notify stakeholders before restore
2. Test on staging first
3. Document the restore decision
4. Prepare for customer communication

---

### Feature Flag Toggles

**Reference:** `packages/shared/src/services/feature-flags.ts`

Feature flags allow quick disabling of features without deployment.

#### Available Feature Flags

| Flag ID | Description | Default |
|---------|-------------|---------|
| `email-verification` | Require email verification | Enabled |
| `real-time-cart` | Real-time cart sync | Enabled |
| `new-checkout-flow` | New checkout UI | Disabled (10% rollout) |
| `ai-recommendations` | AI product recommendations | Enabled |
| `advanced-analytics` | Advanced org analytics | Disabled |
| `dark-mode` | Dark mode UI | Enabled |
| `beta-features` | Experimental features | Disabled |

#### Toggle via Admin API

```bash
# Disable a feature flag
curl -X PATCH https://b2bplus.com/api/admin/features \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feature_name": "ai-recommendations", "enabled": false}'
```

#### Toggle via Database

```sql
-- Disable feature flag
UPDATE feature_flags
SET enabled = false
WHERE name = 'ai-recommendations';

-- Enable feature flag
UPDATE feature_flags
SET enabled = true
WHERE name = 'ai-recommendations';

-- Check current state
SELECT name, enabled, updated_at
FROM feature_flags
ORDER BY name;
```

#### Emergency Feature Disable

For immediate feature disable without API access:

1. Connect to Supabase Dashboard
2. Navigate to Table Editor > `feature_flags`
3. Find the feature row
4. Set `enabled` to `false`
5. Save changes

Changes take effect immediately for new requests.

---

## 7. Useful Commands

### Log Viewing Commands

#### Vercel Logs

```bash
# View real-time logs
vercel logs --scope b2b-plus

# View logs for specific deployment
vercel logs [deployment-url]

# Filter by time
vercel logs --since 1h --scope b2b-plus

# View error logs only
vercel logs --scope b2b-plus 2>&1 | grep -i error
```

#### Supabase Logs

```bash
# View database logs (via Supabase CLI)
supabase db logs

# View auth logs
supabase auth logs

# Query logs via SQL
psql $SUPABASE_DB_URL -c "
SELECT * FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start DESC
LIMIT 10;
"
```

#### Search Logs by Correlation ID

```bash
# Search Vercel logs by correlation ID
vercel logs --scope b2b-plus | grep "1705579200000-abc123"
```

---

### Database Queries for Debugging

#### Connection Pool Status

```sql
-- Active connections by state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

-- Long-running queries (>30s)
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '30 seconds'
ORDER BY duration DESC;

-- Kill long-running query (use with caution)
SELECT pg_terminate_backend(pid);
```

#### User/Order Debugging

```sql
-- Find user by email
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
WHERE email = 'user@example.com';

-- Recent orders for user
SELECT o.id, o.status, o.total, o.created_at
FROM orders o
JOIN organizations org ON o.organization_id = org.id
WHERE org.id = 'user-org-id'
ORDER BY o.created_at DESC
LIMIT 10;

-- Order with items
SELECT o.*, oi.*
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = 'order-id';
```

#### Error Investigation

```sql
-- Recent failed requests (if logged)
SELECT * FROM api_logs
WHERE status_code >= 400
ORDER BY created_at DESC
LIMIT 50;

-- Failed auth attempts
SELECT * FROM auth.audit_log_entries
WHERE NOT (payload->>'success')::boolean
ORDER BY created_at DESC
LIMIT 20;
```

#### Performance Analysis

```sql
-- Slow queries in past hour
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
WHERE mean_time > 1000 -- > 1 second
ORDER BY mean_time DESC
LIMIT 10;

-- Table sizes
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

-- Index usage
SELECT
  relname as table_name,
  indexrelname as index_name,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 10;
```

---

### Cache Clearing

#### Clear Redis Cache (Upstash)

```bash
# Via Upstash CLI/Dashboard
# Navigate to https://console.upstash.com
# Select your database
# Use the CLI tab to run: FLUSHDB

# Via API (if configured)
curl -X POST "https://your-redis-url.upstash.io/flushdb" \
  -H "Authorization: Bearer $UPSTASH_TOKEN"
```

#### Clear Specific Cache Keys

```bash
# Delete rate limit entries for specific user/IP
# Via Upstash CLI:
DEL ratelimit:ip:192.168.1.1
DEL ratelimit:user:user-hash

# Clear all rate limit entries
KEYS ratelimit:* | xargs DEL
```

#### Clear Vercel Cache

```bash
# Purge all cached content
vercel --scope b2b-plus --force

# Or via dashboard:
# Vercel Dashboard > Project Settings > Edge Config > Purge Cache
```

#### Clear Next.js Cache

```bash
# Local development
rm -rf apps/web/.next/cache

# Force rebuild on Vercel
# Add cache-busting environment variable or use --force flag
```

---

### Quick Health Check Script

Save as `scripts/health-check.sh`:

```bash
#!/bin/bash

# B2B Plus Health Check Script

PROD_URL="https://b2bplus.com"
STAGING_URL="https://staging.b2bplus.com"

echo "=== B2B Plus Health Check ==="
echo ""

# Production
echo "Production ($PROD_URL):"
PROD_RESPONSE=$(curl -s -w "\n%{http_code}" "$PROD_URL/api/health")
PROD_STATUS=$(echo "$PROD_RESPONSE" | tail -1)
PROD_BODY=$(echo "$PROD_RESPONSE" | head -n -1)

if [ "$PROD_STATUS" = "200" ]; then
  echo "  Status: OK"
  echo "  Response: $PROD_BODY"
else
  echo "  Status: ERROR ($PROD_STATUS)"
  echo "  Response: $PROD_BODY"
fi

echo ""

# Staging
echo "Staging ($STAGING_URL):"
STAGING_RESPONSE=$(curl -s -w "\n%{http_code}" "$STAGING_URL/api/health")
STAGING_STATUS=$(echo "$STAGING_RESPONSE" | tail -1)
STAGING_BODY=$(echo "$STAGING_RESPONSE" | head -n -1)

if [ "$STAGING_STATUS" = "200" ]; then
  echo "  Status: OK"
  echo "  Response: $STAGING_BODY"
else
  echo "  Status: ERROR ($STAGING_STATUS)"
  echo "  Response: $STAGING_BODY"
fi

echo ""
echo "=== Check Complete ==="
```

---

## Appendix

### Related Documentation

| Document | Path | Description |
|----------|------|-------------|
| Deployment Guide | `docs/deployment/deployment-guide.md` | Deployment procedures |
| Production Checklist | `docs/audits/PRODUCTION_CHECKLIST.md` | Pre-launch requirements |
| Database Backup Strategy | `docs/operations/database-backup-strategy.md` | Backup procedures |
| Environment Configuration | `apps/web/lib/env.ts` | Environment variables |
| Logging Configuration | `apps/web/src/lib/api/logging.ts` | API logging setup |
| Connection Pool Config | `apps/web/lib/database/connection-pool.ts` | Database pooling |
| Rate Limiting | `apps/web/lib/middleware/rate-limit.ts` | Rate limit implementation |
| Feature Flags | `packages/shared/src/services/feature-flags.ts` | Feature flag system |

### Emergency Contacts

| Role | Responsibility | Contact Method |
|------|----------------|----------------|
| Primary On-Call | First responder | PagerDuty rotation |
| Secondary On-Call | Backup responder | PagerDuty escalation |
| Engineering Lead | Technical escalation | Slack @engineering-lead |
| DevOps Lead | Infrastructure issues | Slack @devops-lead |
| Security Lead | Security incidents | Slack @security-lead |
| CTO | Executive escalation | Emergency phone |

### Acronyms

| Term | Definition |
|------|------------|
| RLS | Row Level Security (Supabase) |
| RSC | React Server Components |
| CDN | Content Delivery Network |
| CORS | Cross-Origin Resource Sharing |
| JWT | JSON Web Token |
| TOTP | Time-based One-Time Password |
| APM | Application Performance Monitoring |
| RUM | Real User Monitoring |

---

**Document History:**
- 2026-01-18: Initial creation
