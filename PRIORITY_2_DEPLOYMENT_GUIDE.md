# Priority 2 Features - Quick Deployment Guide

**Date:** November 1, 2025  
**Estimated Time:** 30-45 minutes

---

## 🚀 Quick Start (5 Steps)

### Step 1: Apply Database Migrations (10 min)

Open Supabase SQL Editor and run these migrations **in order**:

1. **Feature Flags:**
   ```
   File: supabase/migrations/20251101000003_create_feature_flags.sql
   ```

2. **Advanced Pricing:**
   ```
   File: supabase/migrations/20251101000004_create_advanced_pricing.sql
   ```

3. **Inventory/Warehouse (Dormant):**
   ```
   File: supabase/migrations/20251101000005_create_dormant_inventory_warehouse.sql
   ```

4. **Email Campaigns:**
   ```
   File: supabase/migrations/20251101000006_create_email_campaigns.sql
   ```

5. **Semantic Search & Recommendations:**
   ```
   File: supabase/migrations/20251101000007_create_semantic_search_recommendations.sql
   ```

6. **Recommendation Functions:**
   ```
   File: supabase/migrations/20251101000008_create_recommendation_functions.sql
   ```

**Verification:**
```sql
-- Check that all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'feature_flags',
  'pricing_tiers',
  'email_campaigns',
  'product_embeddings',
  'product_recommendations'
);
```

---

### Step 2: Install Dependencies (2 min)

```bash
cd /home/ubuntu/b2bplus
pnpm add resend openai
pnpm install
```

---

### Step 3: Configure Environment (5 min)

Add to `/home/ubuntu/b2bplus/apps/web/.env.local`:

```bash
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com

# OpenAI (should already be configured)
OPENAI_API_KEY=your_openai_api_key
```

**Get Resend API Key:**
1. Go to https://resend.com
2. Sign up for free account (50k emails/month free)
3. Create API key
4. Add to `.env.local`

---

### Step 4: Generate Embeddings (15 min)

Start the dev server:

```bash
cd /home/ubuntu/b2bplus/apps/web
pnpm dev
```

Then call the API (as admin):

```bash
curl -X POST http://localhost:3000/api/admin/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Or via browser console:**
```javascript
fetch('/api/admin/embeddings/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json()).then(console.log);
```

This will generate embeddings for all products (takes ~1-2 seconds per product).

---

### Step 5: Test Features (10 min)

#### Test 1: Pricing
```sql
-- Assign yourself to Gold tier
INSERT INTO customer_pricing_tiers (customer_id, tier_id)
SELECT 
  'your-user-id',
  id
FROM pricing_tiers
WHERE name = 'Gold';
```

Then check prices on the product page - you should see 15% discount!

#### Test 2: Semantic Search
```bash
curl -X POST http://localhost:3000/api/search/semantic \
  -H "Content-Type: application/json" \
  -d '{"query": "disposable cups for hot drinks", "limit": 5}'
```

#### Test 3: Recommendations
```bash
curl http://localhost:3000/api/recommendations?productId=YOUR_PRODUCT_ID&limit=5
```

#### Test 4: Email (Optional)
Create a test campaign via SQL:

```sql
INSERT INTO email_campaigns (name, subject, html_content, created_by)
VALUES (
  'Test Campaign',
  'Test Email',
  '<h1>Hello!</h1><p>This is a test.</p>',
  'your-user-id'
);
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] All migrations applied successfully (no SQL errors)
- [ ] Dependencies installed (`resend` and `openai` in package.json)
- [ ] Environment variables set (RESEND_API_KEY)
- [ ] Dev server starts without errors
- [ ] Feature flags table has 8 entries
- [ ] Pricing tiers table has 6 tiers (Standard through VIP)
- [ ] Product embeddings generated (check count)
- [ ] Semantic search returns results
- [ ] Recommendations API works
- [ ] Email templates exist (4 default templates)

**Quick Check SQL:**
```sql
-- Feature flags
SELECT COUNT(*) FROM feature_flags; -- Should be 8

-- Pricing tiers
SELECT COUNT(*) FROM pricing_tiers; -- Should be 6

-- Email templates
SELECT COUNT(*) FROM email_templates; -- Should be 4

-- Product embeddings
SELECT COUNT(*) FROM product_embeddings; -- Should match product count

-- Check enabled features
SELECT feature_name, enabled FROM feature_flags;
```

---

## 🔧 Troubleshooting

### Migration Errors

**Error: "relation already exists"**
- Solution: Migration already applied, skip it

**Error: "function is_feature_enabled does not exist"**
- Solution: Run feature flags migration first (20251101000003)

**Error: "extension vector does not exist"**
- Solution: Enable pgvector in Supabase dashboard

### API Errors

**Error: "Unauthorized" when calling admin APIs**
- Solution: Ensure you're logged in as admin/super_admin

**Error: "RESEND_API_KEY not set"**
- Solution: Add RESEND_API_KEY to .env.local and restart server

**Error: "Failed to generate embeddings"**
- Solution: Check OPENAI_API_KEY is set correctly

### Runtime Errors

**Error: "Cannot find module 'resend'"**
- Solution: Run `pnpm install` again

**Error: "Semantic search returns no results"**
- Solution: Generate embeddings first via /api/admin/embeddings/generate

---

## 📊 Post-Deployment Tasks

### 1. Generate Initial Data (30 min)

```bash
# Generate embeddings for all products
POST /api/admin/embeddings/generate

# Generate recommendations
POST /api/recommendations/generate
```

### 2. Configure Pricing (15 min)

```sql
-- Assign customers to tiers based on criteria
-- Example: Assign high-volume customers to Gold tier
INSERT INTO customer_pricing_tiers (customer_id, tier_id)
SELECT 
  o.customer_id,
  (SELECT id FROM pricing_tiers WHERE name = 'Gold')
FROM orders o
GROUP BY o.customer_id
HAVING COUNT(*) > 10;
```

### 3. Create Email Templates (30 min)

Customize the default templates or create new ones:

```sql
UPDATE email_templates
SET html_content = 'Your custom HTML here'
WHERE name = 'order_confirmation';
```

### 4. Set Up Volume Discounts (15 min)

```sql
-- Example: 10% off when buying 100+ units
INSERT INTO volume_discounts (
  product_id,
  min_quantity,
  discount_percentage,
  is_active
)
SELECT 
  id,
  100,
  10,
  true
FROM products
WHERE category = 'Cups';
```

---

## 🎯 Feature Activation

All Priority 2 features are **enabled by default** except:
- Inventory Management (dormant)
- Multi-Warehouse Support (dormant)

To enable dormant features:

```sql
-- Enable inventory management
UPDATE feature_flags 
SET enabled = true 
WHERE feature_name = 'inventory_management';

-- Enable multi-warehouse
UPDATE feature_flags 
SET enabled = true 
WHERE feature_name = 'multi_warehouse';
```

To disable a feature:

```sql
-- Disable semantic search
UPDATE feature_flags 
SET enabled = false 
WHERE feature_name = 'semantic_search';
```

---

## 💰 Cost Monitoring

### Check Usage

**Embeddings:**
```sql
SELECT COUNT(*) as total_embeddings FROM product_embeddings;
-- Cost: ~$0.0001 per embedding
```

**Search Queries:**
```sql
SELECT 
  query_type,
  COUNT(*) as count
FROM search_queries
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY query_type;
-- Cost: ~$0.0001 per semantic search
```

**Email Campaigns:**
```sql
SELECT 
  COUNT(*) as emails_sent
FROM email_campaign_recipients
WHERE sent_at > NOW() - INTERVAL '30 days';
-- Cost: ~$0.0004 per email (Resend pricing)
```

---

## 📈 Monitoring & Analytics

### Key Metrics to Track

**Pricing:**
```sql
-- Customers by tier
SELECT 
  pt.name,
  COUNT(DISTINCT cpt.customer_id) as customer_count
FROM customer_pricing_tiers cpt
JOIN pricing_tiers pt ON pt.id = cpt.tier_id
WHERE cpt.effective_to IS NULL OR cpt.effective_to >= CURRENT_DATE
GROUP BY pt.name;
```

**Search:**
```sql
-- Search success rate
SELECT 
  query_type,
  AVG(CASE WHEN results_count > 0 THEN 1 ELSE 0 END) * 100 as success_rate
FROM search_queries
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query_type;
```

**Recommendations:**
```sql
-- Recommendation click-through rate
SELECT 
  recommendation_type,
  COUNT(*) as total_shown,
  SUM(CASE WHEN clicked_product_id IS NOT NULL THEN 1 ELSE 0 END) as clicked,
  ROUND(SUM(CASE WHEN clicked_product_id IS NOT NULL THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2) as ctr
FROM search_queries sq
JOIN product_recommendations pr ON pr.recommended_product_id = sq.clicked_product_id
GROUP BY recommendation_type;
```

**Email Campaigns:**
```sql
-- Campaign performance
SELECT 
  ec.name,
  COUNT(ecr.id) as total_sent,
  COUNT(ecr.opened_at) as opened,
  COUNT(ecr.clicked_at) as clicked,
  ROUND(COUNT(ecr.opened_at)::DECIMAL / COUNT(ecr.id) * 100, 2) as open_rate,
  ROUND(COUNT(ecr.clicked_at)::DECIMAL / COUNT(ecr.opened_at) * 100, 2) as click_rate
FROM email_campaigns ec
LEFT JOIN email_campaign_recipients ecr ON ecr.campaign_id = ec.id
WHERE ec.status = 'sent'
GROUP BY ec.id, ec.name;
```

---

## 🎓 Training Resources

### For Admins

**Pricing Management:**
1. Create tiers: `INSERT INTO pricing_tiers ...`
2. Assign customers: Use `/api/admin/pricing/assign-tier`
3. Set volume discounts: Use `/api/admin/pricing/volume-discounts`

**Excel Imports:**
1. Prepare Excel file with product data
2. Upload via `/api/admin/import/ai-excel`
3. Review AI-suggested mappings
4. Execute import via `/api/admin/import/execute`

**Email Campaigns:**
1. Create templates in `email_templates` table
2. Create campaign via `/api/admin/campaigns`
3. Send via `/api/admin/campaigns/send`

### For Developers

**API Documentation:** See `PRIORITY_2_IMPLEMENTATION_COMPLETE.md`

**Database Schema:** Check migration files in `supabase/migrations/`

**Code Examples:** See API route files in `apps/web/app/api/`

---

## ✅ Deployment Complete!

Once all steps are complete, you'll have:

- ✅ Advanced pricing with tiers and volume discounts
- ✅ AI-powered Excel imports
- ✅ Email marketing campaigns
- ✅ Semantic product search
- ✅ Smart product recommendations
- ✅ Ready-to-activate inventory management
- ✅ Ready-to-activate multi-warehouse support

**Estimated Total Time:** 30-45 minutes  
**Complexity:** Medium  
**Risk Level:** Low (all features have fallbacks)

**Questions or issues?** Check `PRIORITY_2_IMPLEMENTATION_COMPLETE.md` for detailed documentation.

**Ready to go! 🚀**
