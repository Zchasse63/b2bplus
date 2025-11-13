# B2B+ Production Deployment Checklist

**Version:** 1.0  
**Last Updated:** November 1, 2025  
**Purpose:** Step-by-step guide for deploying to production

---

## 🎯 Pre-Deployment Checklist

### Environment Setup
- [ ] Production Supabase project created
- [ ] Production database configured
- [ ] Environment variables set in production
- [ ] Domain name configured (if applicable)
- [ ] SSL certificate configured
- [ ] CDN configured (if applicable)

### Code Preparation
- [ ] All code committed to Git
- [ ] All tests passing
- [ ] No console.log statements in production code
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Production build tested locally

### Database
- [ ] All migrations applied to production database
- [ ] RLS policies verified
- [ ] Database indexes created
- [ ] Database backups configured
- [ ] Sample data removed (if any)

### API Keys & Secrets
- [ ] Resend API key configured
- [ ] OpenAI API key configured
- [ ] Supabase keys configured
- [ ] All secrets stored securely (not in code)
- [ ] Rate limits configured

---

## 📋 Deployment Steps

### Step 1: Database Migration
**Time:** 15-20 minutes

1. **Backup Production Database**
   ```bash
   # Via Supabase Dashboard
   # Settings → Database → Backups → Create Backup
   ```

2. **Apply Migrations in Order**
   ```sql
   -- Run each migration file in order:
   -- 20251101000003_create_feature_flags_v2.sql
   -- 20251101000004_create_advanced_pricing_v2.sql
   -- 20251101000005_create_dormant_inventory_warehouse.sql
   -- 20251101000006_create_email_campaigns.sql
   -- 20251101000007_create_semantic_search_recommendations.sql
   -- 20251101000008_create_recommendation_functions.sql
   -- 20251101000009_create_analytics_views.sql
   ```

3. **Verify Migrations**
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';

   -- Check RLS policies
   SELECT * FROM pg_policies;
   ```

### Step 2: Environment Variables
**Time:** 5-10 minutes

Create `.env.production` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SendGrid (Email)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=your-email@domain.com

# Google Gemini AI
GOOGLE_API_KEY=your-gemini-api-key

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

**Security Checklist:**
- [ ] No secrets committed to Git
- [ ] Service role key kept secret
- [ ] API keys have appropriate rate limits
- [ ] CORS configured correctly

### Step 3: Build & Deploy
**Time:** 10-15 minutes

1. **Install Dependencies**
   ```bash
   cd /home/ubuntu/b2bplus
   pnpm install
   ```

2. **Build for Production**
   ```bash
   cd apps/web
   pnpm build
   ```

3. **Test Production Build Locally**
   ```bash
   pnpm start
   # Visit http://localhost:3000
   # Test critical paths
   ```

4. **Deploy to Production**
   ```bash
   # If using Vercel:
   vercel --prod

   # If using custom server:
   pm2 start npm --name "b2bplus" -- start
   ```

### Step 4: Post-Deployment Verification
**Time:** 15-20 minutes

**Smoke Tests:**
- [ ] Homepage loads
- [ ] Login works
- [ ] Product listing loads
- [ ] Product detail page works
- [ ] Add to cart works
- [ ] Checkout flow works
- [ ] Admin dashboard accessible
- [ ] Analytics dashboard loads

**API Tests:**
- [ ] GET /api/products returns data
- [ ] POST /api/cart works
- [ ] GET /api/orders returns data
- [ ] Admin endpoints require authentication

**Database Tests:**
- [ ] Orders are created correctly
- [ ] RLS policies enforce security
- [ ] Pricing tiers apply correctly

### Step 5: Feature Flag Configuration
**Time:** 5 minutes

Enable features in production:

```sql
-- Enable Priority 2 features
UPDATE feature_flags SET is_enabled = true WHERE feature_name = 'advanced_pricing';
UPDATE feature_flags SET is_enabled = true WHERE feature_name = 'email_campaigns';
UPDATE feature_flags SET is_enabled = true WHERE feature_name = 'semantic_search';
UPDATE feature_flags SET is_enabled = true WHERE feature_name = 'recommendations';
UPDATE feature_flags SET is_enabled = true WHERE feature_name = 'bulk_order_upload';

-- Keep dormant features disabled
UPDATE feature_flags SET is_enabled = false WHERE feature_name = 'inventory_management';
UPDATE feature_flags SET is_enabled = false WHERE feature_name = 'multi_warehouse';
```

### Step 6: Data Import
**Time:** 30-60 minutes (depending on product count)

1. **Prepare Product CSV**
   - Export from existing system
   - Clean data
   - Validate format

2. **Import via Admin Dashboard**
   - Login as admin
   - Navigate to `/admin/import/excel`
   - Upload Excel file
   - Review AI column mappings
   - Execute import

3. **Verify Import**
   ```sql
   SELECT COUNT(*) FROM products;
   SELECT * FROM products LIMIT 10;
   ```

4. **Generate Product Embeddings**
   - Navigate to `/admin/embeddings`
   - Click "Generate Missing Embeddings"
   - Wait for completion (may take 5-10 minutes for 1,500 products)

### Step 7: Create Admin Users
**Time:** 5 minutes

1. **Register Admin Accounts**
   - Use signup flow
   - Verify email addresses

2. **Assign Admin Role**
   ```sql
   -- Find user ID
   SELECT id, email FROM auth.users WHERE email = 'admin@yourdomain.com';

   -- Assign admin role
   UPDATE organization_members 
   SET role = 'admin' 
   WHERE user_id = 'user-uuid-here';
   ```

3. **Test Admin Access**
   - Login as admin
   - Access `/admin/products`
   - Access `/admin/analytics`

### Step 8: Configure Email Templates
**Time:** 10-15 minutes

1. **Login to Resend Dashboard**
   - https://resend.com/dashboard

2. **Verify Domain**
   - Add DNS records
   - Verify ownership

3. **Create Email Templates**
   - Order confirmation
   - Invoice email
   - Password reset
   - Welcome email

4. **Test Email Sending**
   - Create test campaign
   - Send to yourself
   - Verify delivery

---

## 🔍 Monitoring & Alerts

### Setup Monitoring
- [ ] Supabase monitoring enabled
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Uptime monitoring configured (e.g., UptimeRobot)
- [ ] Performance monitoring configured

### Key Metrics to Monitor
- **Uptime:** 99.9% target
- **Response Time:** < 2 seconds for pages
- **API Response Time:** < 500ms for most endpoints
- **Error Rate:** < 1% of requests
- **Database Connections:** Monitor for leaks

### Alert Thresholds
- [ ] Downtime alert (immediate)
- [ ] High error rate (> 5% in 5 minutes)
- [ ] Slow response time (> 5 seconds)
- [ ] Database connection limit (> 80% of max)

---

## 🚨 Rollback Plan

### If Deployment Fails

1. **Identify Issue**
   - Check error logs
   - Check monitoring dashboard
   - Review recent changes

2. **Quick Rollback**
   ```bash
   # Vercel
   vercel rollback

   # Custom server
   pm2 stop b2bplus
   git checkout previous-stable-commit
   pnpm build
   pm2 restart b2bplus
   ```

3. **Database Rollback**
   ```bash
   # Restore from backup
   # Via Supabase Dashboard
   # Settings → Database → Backups → Restore
   ```

4. **Notify Users**
   - Post status update
   - Send email if needed
   - Update status page

---

## 📚 Post-Deployment Tasks

### Documentation
- [ ] Update user documentation
- [ ] Update admin guide
- [ ] Document known issues
- [ ] Create FAQ

### Training
- [ ] Train admin team (90 minutes)
- [ ] Create training videos
- [ ] Schedule Q&A session

### Marketing
- [ ] Announce new features
- [ ] Send email to customers
- [ ] Update website
- [ ] Social media posts

### Monitoring
- [ ] Monitor for 24 hours
- [ ] Check error logs daily
- [ ] Review analytics weekly
- [ ] Gather user feedback

---

## ✅ Launch Day Checklist

**Morning of Launch:**
- [ ] All team members available
- [ ] Rollback plan reviewed
- [ ] Monitoring dashboards open
- [ ] Support channels ready

**During Launch:**
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Respond to issues immediately

**After Launch:**
- [ ] Send launch announcement
- [ ] Monitor for 4 hours
- [ ] Review metrics
- [ ] Document lessons learned

---

## 🎯 Success Criteria

**Technical:**
- ✅ All features working
- ✅ No critical bugs
- ✅ Performance acceptable
- ✅ Security verified

**Business:**
- ✅ First customer order placed
- ✅ Admin team trained
- ✅ Users can complete key workflows
- ✅ Positive user feedback

---

## 📞 Emergency Contacts

**Technical Issues:**
- Lead Developer: [Your contact]
- DevOps: [Contact]
- Database Admin: [Contact]

**Business Issues:**
- Product Owner: [Contact]
- Customer Support: [Contact]

**Third-Party Services:**
- Supabase Support: https://supabase.com/support
- Resend Support: https://resend.com/support
- OpenAI Support: https://help.openai.com

---

## 📊 Post-Launch Metrics (First Week)

**Track:**
- [ ] Total orders placed
- [ ] Total revenue
- [ ] Active users
- [ ] Error rate
- [ ] Page load times
- [ ] Customer feedback
- [ ] Support tickets

**Review:**
- [ ] Daily metrics review
- [ ] Weekly team retrospective
- [ ] User feedback analysis
- [ ] Performance optimization opportunities

---

## 🎉 You're Ready to Launch!

**Final Checklist:**
- [ ] All pre-deployment tasks complete
- [ ] All deployment steps executed
- [ ] All post-deployment verification passed
- [ ] Monitoring configured
- [ ] Rollback plan ready
- [ ] Team trained
- [ ] Documentation complete

**Good luck with your launch! 🚀**
