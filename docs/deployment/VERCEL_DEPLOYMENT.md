# Vercel Deployment Guide for B2B Plus

This guide walks through deploying the B2B Plus application to Vercel with proper environment configuration and security settings.

## Prerequisites

- Vercel account ([sign up here](https://vercel.com/signup))
- Git repository connected to Vercel
- All required third-party service accounts (Supabase, SendGrid, Google AI, Upstash)

## Quick Start

1. **Connect Repository to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Select the `apps/web` directory as the root

2. **Configure Environment Variables** (see below)

3. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

## Required Environment Variables

### Supabase (Required)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Where to find:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Go to Settings → API
- Copy URL and keys

### Google Gemini AI (Required)

```bash
GOOGLE_API_KEY=your_google_api_key
```

**Where to find:**
- Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create or copy an API key

### SendGrid Email (Required)

```bash
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Your Company Name
SENDGRID_REPLY_TO_EMAIL=support@yourdomain.com
SENDGRID_WEBHOOK_SIGNING_KEY=your_webhook_signing_key
```

**Where to find:**
- Go to [SendGrid Dashboard](https://app.sendgrid.com)
- Settings → API Keys → Create API Key
- Select "Full Access" permissions
- Copy the key immediately (shown only once)

**Email Configuration:**
- Verify sender identity in SendGrid
- Set `SENDGRID_FROM_EMAIL` to a verified email

### Upstash Redis (Optional - for rate limiting)

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

**Where to find:**
- Go to [Upstash Console](https://console.upstash.com)
- Create a new Redis database
- Copy REST URL and token from database details

**Note:** If not configured, rate limiting will use in-memory fallback.

### Application Configuration

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**Important:**
- `NODE_ENV` must be set to `production` for production builds
- `NEXT_PUBLIC_APP_URL` should be your actual domain

### Sales Team (Optional)

```bash
SALES_TEAM_EMAILS=sales1@yourdomain.com,sales2@yourdomain.com
```

Comma-separated list of emails to receive lead notifications.

### Sentry Error Tracking (Optional)

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your_dsn@sentry.io/project_id
SENTRY_DSN=https://your_dsn@sentry.io/project_id
```

**Where to find:**
- Go to [Sentry](https://sentry.io)
- Create project
- Copy DSN from Settings → Client Keys (DSN)

## Build Configuration

The `vercel.json` file in the project root configures:

- **Build command:** `pnpm run build`
- **Install command:** `pnpm install`
- **Output directory:** `apps/web/.next`
- **Security headers:** CSP, X-Frame-Options, etc.
- **Function memory:** 1GB default, 2GB for AI endpoints
- **Max duration:** 300s (5 minutes) for AI streaming

## Deployment Process

### Production Deployment

1. **Push to main branch:**
   ```bash
   git push origin main
   ```

2. **Vercel automatically:**
   - Detects the push
   - Runs `pnpm install`
   - Runs `pnpm run build`
   - Deploys to production URL

3. **Monitor deployment:**
   - Check [Vercel Dashboard](https://vercel.com/dashboard)
   - View build logs
   - Check for errors

### Preview Deployments

Every pull request automatically gets a preview deployment:

1. Create a branch and make changes
2. Open a pull request
3. Vercel deploys to a unique preview URL
4. Test changes before merging

## Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test authentication flow (login/logout)
- [ ] Verify AI endpoints are working
- [ ] Check email sending (SendGrid)
- [ ] Test rate limiting (should see 429 after threshold)
- [ ] Verify CSP headers (check Network tab)
- [ ] Test cart functionality
- [ ] Check Sentry error tracking (if enabled)

## Monitoring & Maintenance

### View Logs

```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs <deployment-url>
```

### Environment Variable Updates

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add/update variables
3. Redeploy for changes to take effect

### Rollback Deployment

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production"

## Custom Domain Configuration

1. **Add domain in Vercel:**
   - Project Settings → Domains
   - Add your domain (e.g., `b2bplus.com`)

2. **Configure DNS:**
   - Add CNAME record: `your-domain.com` → `cname.vercel-dns.com`
   - Or A record to Vercel's IP (see Vercel docs)

3. **Update environment variable:**
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

4. **Enable HTTPS:**
   - Vercel automatically provisions SSL certificate
   - Wait 24-48 hours for DNS propagation

## Security Best Practices

1. **Never commit secrets:**
   - Keep `.env.local` in `.gitignore`
   - Use Vercel's environment variables UI

2. **Rotate keys regularly:**
   - SendGrid API keys every 90 days
   - Supabase service role key annually
   - Update in Vercel dashboard

3. **Use environment-specific configs:**
   - Separate Supabase projects for dev/prod
   - Different SendGrid API keys for testing

4. **Enable Vercel protection:**
   - Enable "Vercel Authentication" for preview deployments
   - Restrict access to internal team

## Troubleshooting

### Build Failures

**Error:** `Environment validation failed`
- **Solution:** Ensure all required env vars are set in Vercel dashboard

**Error:** `Module not found`
- **Solution:** Clear build cache in Vercel settings and redeploy

**Error:** `pnpm install failed`
- **Solution:** Check `package.json` for invalid dependencies

### Runtime Errors

**429 Too Many Requests:**
- Check Upstash Redis configuration
- Rate limits may be too strict for your usage

**500 Internal Server Error:**
- Check Vercel function logs
- Verify Supabase connection
- Check environment variables

**Email not sending:**
- Verify SendGrid API key has "Full Access"
- Check sender email is verified in SendGrid
- Review SendGrid activity logs

### Performance Issues

**Slow AI responses:**
- Check Google AI API quota
- Consider upgrading Vercel function memory (2GB+)
- Review AI prompt complexity

**Cold starts:**
- Vercel functions may have cold start latency
- Consider upgrading to Pro plan for better performance

## Key Rotation Guide

### Rotating Supabase Service Role Key

1. Generate new key in Supabase dashboard
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel
3. Redeploy application
4. Delete old key after verifying deployment

### Rotating SendGrid API Key

1. Create new API key in SendGrid
2. Update `SENDGRID_API_KEY` in Vercel
3. Redeploy application
4. Delete old key after verifying emails work

### Rotating Google API Key

1. Create new API key in Google AI Studio
2. Update `GOOGLE_API_KEY` in Vercel
3. Redeploy application
4. Delete old key after verifying AI works

## Support

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **SendGrid Docs:** [docs.sendgrid.com](https://docs.sendgrid.com)
- **Project Issues:** [GitHub Issues](https://github.com/your-org/b2b-plus/issues)

## Costs

Estimated monthly costs:

- **Vercel Pro:** $20/month (recommended for production)
- **Supabase Pro:** $25/month
- **SendGrid:** $15/month (40k emails)
- **Upstash:** $10/month (optional)
- **Google AI:** Pay-as-you-go (varies by usage)

**Total:** ~$70-100/month for small-medium business
