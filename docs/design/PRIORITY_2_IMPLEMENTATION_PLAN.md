# Priority 2 Features - Implementation Plan

**Date:** November 1, 2025  
**Status:** Planning Phase  
**Approach:** Full implementation of Priority 2 features + dormant foundations for Inventory/Warehouse

---

## 🎯 Features to Implement

### Active Features (Full Implementation)

1. **Advanced Role-Based Pricing** ⭐ HIGHEST PRIORITY
   - Customer-specific pricing tiers
   - Volume discounts
   - Customer group pricing
   - Price overrides per customer
   - Effective date ranges

2. **AI-Enhanced Excel Imports** ⭐ HIGH PRIORITY
   - Smart column mapping with AI
   - Auto-detect data types
   - Validation and error checking
   - Preview before import
   - Support for weekly price updates

3. **Email Campaigns**
   - Resend integration
   - Template management
   - Customer segmentation
   - Campaign tracking
   - Automated emails (order confirmations, etc.)

4. **OpenAI Semantic Search**
   - Natural language product search
   - "Find me 16oz cups" → intelligent results
   - Search by features, not just keywords
   - Typo tolerance
   - Related product suggestions

5. **Smart Product Recommendations**
   - "Customers also bought"
   - "Frequently bought together"
   - AI-driven suggestions
   - Based on order history
   - Personalized recommendations

### Dormant Features (Foundation Only)

6. **Inventory Management Integration**
   - Database schema ready
   - Feature flag (OFF by default)
   - API endpoints stubbed
   - No UI impact when disabled
   - Can be enabled later without code changes

7. **Multi-Warehouse Support**
   - Database schema ready
   - Feature flag (OFF by default)
   - Warehouse table structure
   - No UI impact when disabled
   - Can be enabled later without code changes

---

## 📊 Implementation Order

### Phase 1: Database Schema & Feature Flags (Day 1)
- Create feature flags table
- Design pricing tables
- Design inventory/warehouse tables (dormant)
- Create all migrations

### Phase 2: Advanced Role-Based Pricing (Days 2-3)
- Customer pricing tiers
- Volume discount rules
- Price calculation engine
- Admin UI for pricing management
- Customer-specific price display

### Phase 3: AI-Enhanced Excel Imports (Days 4-5)
- AI column mapping with Gemini
- Import preview UI
- Validation engine
- Error reporting
- Batch processing

### Phase 4: Email Campaigns (Days 6-7)
- Resend integration
- Email template system
- Campaign management UI
- Automated transactional emails
- Analytics tracking

### Phase 5: OpenAI Semantic Search (Day 8)
- Embedding generation for products
- Vector search implementation
- Search API with semantic matching
- Enhanced search UI
- Relevance scoring

### Phase 6: Smart Recommendations (Day 9)
- Recommendation algorithm
- Order history analysis
- Product affinity scoring
- Recommendation widgets
- A/B testing support

### Phase 7: Dormant Foundations (Day 10)
- Inventory management schema
- Multi-warehouse schema
- Feature flags
- Stub API endpoints
- Documentation for future activation

### Phase 8: Documentation & Testing (Day 11)
- Complete technical documentation
- Admin user guides
- Testing checklists
- Deployment guides

---

## 🗄️ Database Schema Overview

### Feature Flags Table
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY,
  feature_name TEXT UNIQUE,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  config JSONB
);
```

### Pricing Tables
```sql
-- Customer pricing tiers
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY,
  name TEXT,
  priority INTEGER,
  discount_percentage DECIMAL
);

-- Customer-specific pricing
CREATE TABLE customer_pricing (
  id UUID PRIMARY KEY,
  customer_id UUID,
  product_id UUID,
  custom_price DECIMAL,
  tier_id UUID,
  effective_from DATE,
  effective_to DATE
);

-- Volume discounts
CREATE TABLE volume_discounts (
  id UUID PRIMARY KEY,
  product_id UUID,
  min_quantity INTEGER,
  discount_percentage DECIMAL
);
```

### Email Campaign Tables
```sql
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY,
  name TEXT,
  subject TEXT,
  template_id TEXT,
  status TEXT,
  scheduled_at TIMESTAMP
);

CREATE TABLE email_campaign_recipients (
  id UUID PRIMARY KEY,
  campaign_id UUID,
  customer_id UUID,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP
);
```

### Product Embeddings (for Semantic Search)
```sql
CREATE TABLE product_embeddings (
  id UUID PRIMARY KEY,
  product_id UUID,
  embedding vector(1536), -- OpenAI embedding size
  created_at TIMESTAMP
);

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Recommendations
```sql
CREATE TABLE product_recommendations (
  id UUID PRIMARY KEY,
  product_id UUID,
  recommended_product_id UUID,
  score DECIMAL,
  recommendation_type TEXT, -- 'also_bought', 'frequently_together', 'similar'
  updated_at TIMESTAMP
);
```

### Dormant: Inventory Management
```sql
CREATE TABLE inventory_locations (
  id UUID PRIMARY KEY,
  name TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT false -- Controlled by feature flag
);

CREATE TABLE product_inventory (
  id UUID PRIMARY KEY,
  product_id UUID,
  location_id UUID,
  quantity INTEGER,
  reserved_quantity INTEGER,
  last_updated TIMESTAMP
);
```

### Dormant: Multi-Warehouse
```sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY,
  name TEXT,
  code TEXT UNIQUE,
  address TEXT,
  is_active BOOLEAN DEFAULT false -- Controlled by feature flag
);

CREATE TABLE warehouse_inventory (
  id UUID PRIMARY KEY,
  warehouse_id UUID,
  product_id UUID,
  quantity INTEGER,
  reorder_point INTEGER,
  reorder_quantity INTEGER
);
```

---

## 🔧 Feature Flag System

### How It Works
```typescript
// Check if feature is enabled
const isEnabled = await checkFeatureFlag('multi_warehouse_support');

if (isEnabled) {
  // Show warehouse selection
} else {
  // Use default single-location logic
}
```

### Default Feature States
```sql
INSERT INTO feature_flags (feature_name, enabled, description) VALUES
('advanced_pricing', true, 'Customer-specific pricing and volume discounts'),
('ai_excel_import', true, 'AI-powered Excel import with smart column mapping'),
('email_campaigns', true, 'Email marketing campaigns with Resend'),
('semantic_search', true, 'OpenAI-powered semantic product search'),
('smart_recommendations', true, 'AI-driven product recommendations'),
('inventory_management', false, 'Track inventory across locations'),
('multi_warehouse', false, 'Support for multiple warehouse locations');
```

---

## 💰 Cost Estimates

### Monthly Costs (Estimated)

**AI Services:**
- Gemini 2.5 Flash (Excel import): ~$5-10/month
- OpenAI Embeddings (semantic search): ~$10-20/month
- OpenAI GPT-4 (recommendations): ~$15-25/month

**Email Services:**
- Resend: $20/month (50k emails)

**Database:**
- Supabase (with vector extension): Existing plan

**Total: ~$50-75/month**

---

## 🎯 Success Metrics

### Advanced Pricing
- % of customers with custom pricing
- Average discount percentage
- Revenue impact of volume discounts

### AI Excel Import
- Import success rate
- Time saved vs manual entry
- Errors caught by validation

### Email Campaigns
- Open rate
- Click-through rate
- Conversion rate
- Revenue per campaign

### Semantic Search
- Search success rate
- Average results relevance
- User satisfaction

### Smart Recommendations
- Click-through rate on recommendations
- Add-to-cart rate
- Revenue from recommended products

---

## 🚀 Deployment Strategy

### Phase 1: Database & Infrastructure
1. Apply all migrations
2. Enable pgvector extension
3. Set up feature flags
4. Configure Resend API

### Phase 2: Gradual Rollout
1. Enable advanced pricing (immediate business value)
2. Enable AI Excel import (for your weekly updates)
3. Enable email campaigns
4. Enable semantic search
5. Enable recommendations

### Phase 3: Monitor & Optimize
1. Track usage metrics
2. Gather customer feedback
3. Optimize AI prompts
4. Tune recommendation algorithms

---

## 📚 Documentation Deliverables

1. **Technical Documentation**
   - API endpoints
   - Database schema
   - Feature flag usage
   - Integration guides

2. **Admin Guides**
   - How to set customer pricing
   - How to import via Excel
   - How to create email campaigns
   - How to enable dormant features

3. **Customer Guides**
   - How to use semantic search
   - Understanding personalized pricing

---

## ✅ Acceptance Criteria

### Advanced Pricing
- [ ] Admin can create pricing tiers
- [ ] Admin can assign customers to tiers
- [ ] Admin can set customer-specific prices
- [ ] Volume discounts apply automatically
- [ ] Prices display correctly for each customer

### AI Excel Import
- [ ] AI detects column types
- [ ] Preview shows mapped data
- [ ] Validation catches errors
- [ ] Import completes successfully
- [ ] Error report generated

### Email Campaigns
- [ ] Admin can create campaigns
- [ ] Templates are customizable
- [ ] Emails send successfully
- [ ] Open/click tracking works
- [ ] Automated emails trigger correctly

### Semantic Search
- [ ] Natural language queries work
- [ ] Results are relevant
- [ ] Typos are handled
- [ ] Related products suggested
- [ ] Fast response time (<500ms)

### Smart Recommendations
- [ ] "Also bought" shows on product pages
- [ ] "Frequently together" shows in cart
- [ ] Recommendations are relevant
- [ ] Click-through tracked
- [ ] Updates automatically

### Dormant Features
- [ ] Inventory tables created
- [ ] Warehouse tables created
- [ ] Feature flags work
- [ ] No UI impact when disabled
- [ ] Can be enabled without code changes

---

## 🔮 Future Activation Plan

### When to Enable Inventory Management
**Triggers:**
- You need to track stock levels
- You want low-stock alerts
- You need inventory reports

**Steps:**
1. Set feature flag to `true`
2. Import initial inventory data
3. Train staff on inventory UI
4. Monitor for 1 week

### When to Enable Multi-Warehouse
**Triggers:**
- You open a second warehouse
- You need location-based inventory
- You want warehouse-specific shipping

**Steps:**
1. Set feature flag to `true`
2. Create warehouse records
3. Assign inventory to warehouses
4. Update shipping logic
5. Train staff on multi-warehouse UI

---

**Next Step:** Start implementation with Phase 1 (Database Schema & Feature Flags)
