# Deployment Guide

This guide covers deploying B2B Plus to staging and production environments.

## Prerequisites

- AWS account with appropriate permissions
- Vercel account for web deployment
- Supabase project for database
- GitHub repository access
- Deployment scripts configured

## Deployment Environments

### Development
- **URL**: http://localhost:3000
- **Database**: Local Supabase
- **Purpose**: Local development

### Staging
- **URL**: https://staging.b2bplus.com
- **Database**: Staging Supabase project
- **Purpose**: Testing before production

### Production
- **URL**: https://b2bplus.com
- **Database**: Production Supabase project
- **Purpose**: Live application

## Pre-Deployment Checklist

Before deploying to any environment:

- [ ] All tests passing (`pnpm test`)
- [ ] Type checking passing (`pnpm type-check`)
- [ ] Linting passing (`pnpm lint`)
- [ ] Code review approved
- [ ] Security scan passed
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Backup created (for production)
- [ ] Rollback plan documented
- [ ] Team notified

## Staging Deployment

### 1. Prepare Code

```bash
# Ensure on develop branch
git checkout develop
git pull origin develop

# Install dependencies
pnpm install

# Run all checks
pnpm test
pnpm type-check
pnpm lint
```

### 2. Build Application

```bash
# Build web app
cd apps/web
pnpm build

# Build mobile app
cd ../mobile
pnpm build
```

### 3. Deploy to Staging

```bash
# Deploy web app to Vercel
vercel deploy --prod --scope b2b-plus

# Deploy mobile app
eas build --platform all --profile staging
eas submit --platform all --profile staging
```

### 4. Run Database Migrations

```bash
# Connect to staging database
export SUPABASE_DB_URL=<staging-db-url>

# Run migrations
supabase migration up

# Verify migrations
supabase db pull
```

### 5. Verify Deployment

```bash
# Check health endpoint
curl https://staging.b2bplus.com/api/health

# Run smoke tests
pnpm test:e2e --env staging

# Check logs
vercel logs --scope b2b-plus
```

### 6. Notify Team

- Post in #deployments channel
- Include deployment time and changes
- Link to staging environment

## Production Deployment

### 1. Prepare Code

```bash
# Ensure on main branch
git checkout main
git pull origin main

# Install dependencies
pnpm install

# Run all checks
pnpm test --coverage
pnpm type-check
pnpm lint
```

### 2. Create Backup

```bash
# Backup production database
./scripts/backup-database.sh production

# Verify backup
aws s3 ls s3://b2b-plus-backups/
```

### 3. Build Application

```bash
# Build web app
cd apps/web
pnpm build

# Build mobile app
cd ../mobile
pnpm build
```

### 4. Deploy to Production

```bash
# Deploy web app to Vercel
vercel deploy --prod --scope b2b-plus

# Deploy mobile app
eas build --platform all --profile production
eas submit --platform all --profile production
```

### 5. Run Database Migrations

```bash
# Connect to production database
export SUPABASE_DB_URL=<production-db-url>

# Run migrations
supabase migration up

# Verify migrations
supabase db pull
```

### 6. Verify Deployment

```bash
# Check health endpoint
curl https://b2bplus.com/api/health

# Run smoke tests
pnpm test:e2e --env production

# Check logs
vercel logs --scope b2b-plus

# Monitor metrics
# Check Sentry for errors
# Check CloudWatch for performance
```

### 7. Notify Team

- Post in #deployments channel
- Include deployment time and changes
- Link to production environment
- Mention any breaking changes

## Rollback Procedure

If deployment fails or issues are discovered:

### Quick Rollback

```bash
# Rollback to previous version
vercel rollback --scope b2b-plus

# Verify rollback
curl https://b2bplus.com/api/health
```

### Database Rollback

```bash
# If migrations failed
supabase migration down

# Restore from backup if needed
./scripts/restore-database.sh production <backup-file>
```

### Full Rollback

```bash
# Run rollback script
./scripts/rollback.sh production

# Verify rollback
pnpm test:e2e --env production

# Notify team
# Post incident report
```

## Environment Configuration

### Staging Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=<staging-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-key>
GEMINI_API_KEY=<staging-key>
SENDGRID_API_KEY=<staging-key>
STRIPE_SECRET_KEY=<staging-key>
SENTRY_DSN=<staging-dsn>
```

### Production Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=<production-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-key>
GEMINI_API_KEY=<production-key>
SENDGRID_API_KEY=<production-key>
STRIPE_SECRET_KEY=<production-key>
SENTRY_DSN=<production-dsn>
```

## Monitoring After Deployment

### Key Metrics to Monitor

- Error rate (should be < 1%)
- Response time (should be < 1s)
- Database connections (should be < 80% of max)
- Cache hit rate (should be > 50%)
- API availability (should be > 99.9%)

### Monitoring Tools

- **Sentry**: Error tracking
- **Vercel Analytics**: Performance metrics
- **CloudWatch**: Infrastructure metrics
- **Supabase Dashboard**: Database metrics

### Alert Thresholds

- Error rate > 5%: Critical alert
- Response time > 5s: Warning alert
- Database connections > 90%: Warning alert
- API availability < 99%: Critical alert

## Deployment Frequency

- **Staging**: Multiple times per day
- **Production**: Once per day (or as needed)

## Release Notes

After each production deployment, create release notes:

```markdown
# Release v1.2.0

## New Features
- Feature 1
- Feature 2

## Bug Fixes
- Bug fix 1
- Bug fix 2

## Performance Improvements
- Improvement 1

## Breaking Changes
- Change 1

## Migration Instructions
- Step 1
- Step 2
```

## Troubleshooting

### Deployment Fails

1. Check build logs
2. Verify environment variables
3. Check database connectivity
4. Review recent code changes
5. Rollback if necessary

### Performance Issues

1. Check database query performance
2. Review cache hit rates
3. Check API response times
4. Review error logs
5. Scale resources if needed

### Database Issues

1. Check database logs
2. Verify migrations ran successfully
3. Check RLS policies
4. Review connection pool status
5. Restore from backup if needed

## Support

For deployment issues:
- Check deployment logs
- Review error tracking (Sentry)
- Check infrastructure status
- Contact DevOps team
- Review runbooks for common issues

