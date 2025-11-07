# 🤖 COMPREHENSIVE AI E2E TESTING PLAN
## Testing ALL 16 AI Integrations with Real Gemini API Calls

**Date**: 2025-01-11  
**Status**: READY TO EXECUTE  
**Philosophy**: NO MOCKING - Test with real AI to ensure production readiness

---

## 📊 CURRENT STATE AUDIT

### ✅ AI Integrations WITH E2E Tests (4 total)
| # | Feature | API Endpoint | E2E Test File | Status |
|---|---------|--------------|---------------|--------|
| 1 | Customer Chatbot | `/api/chatbot/message` | `customer-chatbot.spec.ts` | ⚠️ **PARTIAL** - Tests UI only, doesn't verify AI called |
| 2 | Public Chatbot | `/api/chatbot/public` | `public-chatbot.spec.ts` | ⚠️ **PARTIAL** - Tests UI only, doesn't verify AI called |
| 3 | Opportunities Detection | `/api/admin/opportunities/detect` | `admin-opportunities.spec.ts` | ⚠️ **PARTIAL** - Has "Detect" button test but doesn't verify AI |
| 4 | Pricing Recommendations | `/api/admin/pricing/recommendations` | `admin-pricing.spec.ts` | ⚠️ **PARTIAL** - Has "Generate" button test but doesn't verify AI |

**Current AI Coverage**: 12.5% (2 out of 16 features properly tested with real AI)

### ❌ AI Integrations WITHOUT E2E Tests (12 total)
| # | Feature | API Endpoint | Impact | Dependencies |
|---|---------|--------------|--------|--------------|
| 5 | Invoice Processing | `/api/admin/invoices/upload` | 🔴 HIGH | ⚠️ Needs vendor_invoices data + test PDF |
| 6 | Pricing Optimization | `/api/admin/pricing/optimize` | 🔴 HIGH | ✅ Has customer_purchase_analytics |
| 7 | Reorder Predictions | `/api/notifications/reorder` | 🔴 HIGH | ✅ Has orders data |
| 8 | SKU Mapping | `/api/admin/sku-mapping/analyze` | 🟡 MEDIUM | ⚠️ Needs sku_mappings + old SKUs |
| 9 | Semantic Search | `/api/search/semantic` | 🟡 MEDIUM | ⚠️ Needs product_embeddings |
| 10 | Customer Insights | `/api/admin/analytics/customer-insights` | 🟡 MEDIUM | ✅ Has analytics data |
| 11 | Campaign Personalization | `/api/admin/campaigns/send-personalized` | 🟡 MEDIUM | ⚠️ Needs campaigns data |
| 12 | Invoice Reconciliation | `/api/admin/invoices/reconcile` | 🔴 HIGH | ⚠️ Needs vendor_invoices + POs |
| 13 | Bulk Invoice Upload | `/api/admin/invoices/bulk-upload` | 🔴 HIGH | ⚠️ Needs multiple test PDFs |
| 14 | Visual Search | `/api/search/visual` | 🟢 LOW | ⚠️ Needs test product images |
| 15 | AI Excel Import | `/api/admin/import/ai-excel` | 🟡 MEDIUM | ⚠️ Needs test Excel file |
| 16 | Embeddings Generation | `/api/admin/embeddings/generate` | 🟢 LOW | ✅ Has products data |

---

## 🎯 EXECUTION PLAN

### Phase 1: Enhance Existing AI Tests (3 tasks)
**Goal**: Fix existing tests to VERIFY real AI calls, not just UI interactions

#### 1.1 Enhance Customer Chatbot E2E Test
- **File**: `e2e/customer-chatbot.spec.ts`
- **Dependencies**: ✅ Test data exists
- **Changes**:
  1. Add network monitoring to verify Gemini API called
  2. Check response time >500ms (indicates real AI call)
  3. Verify AI response quality (not empty, contextual)
  4. Confirm action execution works
  5. Verify token usage logged to database

#### 1.2 Enhance Admin Opportunities E2E Test
- **File**: `e2e/admin-opportunities.spec.ts` (line 236)
- **Dependencies**: ✅ Test data exists
- **Changes**:
  1. Click "Detect Opportunities" button
  2. Wait 10+ seconds for real AI processing
  3. Query database to verify new opportunities created
  4. Verify AI reasoning field populated
  5. Check confidence scores are realistic (0.0-1.0)

#### 1.3 Enhance Admin Pricing E2E Test
- **File**: `e2e/admin-pricing.spec.ts` (line 206)
- **Dependencies**: ✅ Test data exists
- **Changes**:
  1. Click "Generate Recommendation" button
  2. Wait 15+ seconds for real AI processing
  3. Verify recommendation created with AI reasoning
  4. Check win probability calculated
  5. Verify expected revenue populated

---

### Phase 2: HIGH PRIORITY - Core AI Features (5 tests)
**Goal**: Test critical business features that drive revenue

#### 2.1 CREATE: Invoice Processing E2E Test
- **File**: `e2e/admin-invoice-processing.spec.ts` (NEW)
- **Dependencies**: ⚠️ NEEDS vendor_invoices seed data + test PDF file
- **Test Flow**:
  1. Login as admin
  2. Navigate to invoice upload page
  3. Upload test PDF invoice
  4. Wait 20+ seconds for AI extraction
  5. Verify extracted data: invoice_number, vendor, amounts, line_items
  6. Verify auto-matching to PO if exists
  7. Test approval workflow

#### 2.2 CREATE: Pricing Optimization E2E Test
- **File**: `e2e/admin-pricing-optimization.spec.ts` (NEW)
- **Dependencies**: ✅ Test data exists (customer_purchase_analytics, historical_orders)
- **Test Flow**:
  1. Login as admin
  2. Navigate to pricing optimization
  3. Select customer + product
  4. Click "Optimize Pricing"
  5. Wait 15+ seconds for AI analysis
  6. Verify optimized price calculated
  7. Check price sensitivity analysis
  8. Verify win probability

#### 2.3 CREATE: Reorder Predictions E2E Test
- **File**: `e2e/admin-reorder-predictions.spec.ts` (NEW)
- **Dependencies**: ✅ Test data exists (orders, order_items)
- **Test Flow**:
  1. Login as admin
  2. Navigate to reorder predictions
  3. Click "Generate Predictions"
  4. Wait 10+ seconds for AI
  5. Verify predictions created with confidence scores
  6. Test email notification sending
  7. Verify prediction accuracy metrics

#### 2.4 CREATE: SKU Mapping E2E Test
- **File**: `e2e/admin-sku-mapping.spec.ts` (NEW)
- **Dependencies**: ⚠️ NEEDS sku_mappings seed data + old SKUs
- **Test Flow**:
  1. Login as admin
  2. Navigate to SKU mapping
  3. Upload old SKU list (Bailey system format)
  4. Click "Analyze Mappings"
  5. Wait 20+ seconds for AI embeddings
  6. Verify SKU matches with confidence scores
  7. Check fuzzy matching logic
  8. Test manual override capability

#### 2.5 CREATE: Semantic Search E2E Test
- **File**: `e2e/customer-semantic-search.spec.ts` (NEW)
- **Dependencies**: ⚠️ NEEDS product_embeddings generated
- **Test Flow**:
  1. Login as customer
  2. Navigate to product search
  3. Enter natural language query ("disposable cups for hot drinks")
  4. Wait 5+ seconds for embedding generation
  5. Verify semantic results (not just keyword matching)
  6. Test similarity threshold
  7. Verify fallback to keyword search if semantic fails

---

### Phase 3: MEDIUM PRIORITY - Business Intelligence (4 tests)
**Goal**: Test AI analytics and insights features

#### 3.1 CREATE: Customer Insights E2E Test
- **File**: `e2e/admin-customer-insights.spec.ts` (NEW)
- **Dependencies**: ✅ Test data exists (customer_purchase_analytics)
- **Test Flow**:
  1. Login as admin
  2. Navigate to customer analytics
  3. Select customer
  4. Click "Generate Insights"
  5. Wait 15+ seconds for AI analysis
  6. Verify behavioral patterns identified
  7. Check churn risk score
  8. Verify retention recommendations

#### 3.2 CREATE: Campaign Personalization E2E Test
- **File**: `e2e/admin-campaign-personalization.spec.ts` (NEW)
- **Dependencies**: ⚠️ NEEDS campaigns + campaign_recipients seed data
- **Test Flow**:
  1. Login as admin
  2. Create new campaign
  3. Select recipients
  4. Click "Generate Personalized Content"
  5. Wait 10+ seconds per recipient for AI
  6. Verify unique content generated per customer
  7. Test quick-send variant
  8. Test regional-send variant

#### 3.3 CREATE: Invoice Reconciliation E2E Test
- **File**: `e2e/admin-invoice-reconciliation.spec.ts` (NEW)
- **Dependencies**: ⚠️ NEEDS vendor_invoices + purchase_orders seed data
- **Test Flow**:
  1. Login as admin
  2. Upload vendor invoice
  3. Click "Reconcile"
  4. Wait 10+ seconds for AI matching
  5. Verify PO match found
  6. Check discrepancy detection
  7. Test auto-approval rules

#### 3.4 CREATE: Bulk Invoice Upload E2E Test
- **File**: `e2e/admin-bulk-invoice-upload.spec.ts` (NEW)
- **Dependencies**: ⚠️ NEEDS multiple test PDF invoices (5+)
- **Test Flow**:
  1. Login as admin
  2. Upload 5+ PDF invoices
  3. Wait 60+ seconds for batch AI processing
  4. Verify all invoices extracted
  5. Check parallel processing worked
  6. Verify error handling for bad PDFs

---

### Phase 4: LOW PRIORITY - Supporting Features (3 tests)
**Goal**: Test nice-to-have AI features

#### 4.1 CREATE: Visual Search E2E Test
- **File**: `e2e/customer-visual-search.spec.ts` (NEW)
- **Dependencies**: ⚠️ NEEDS test product images
- **Test Flow**:
  1. Login as customer
  2. Navigate to visual search
  3. Upload product image
  4. Wait 10+ seconds for AI vision analysis
  5. Verify product matches found
  6. Check confidence scores
  7. Test with various image types (clear, blurry, partial)

#### 4.2 CREATE: AI Excel Import E2E Test
- **File**: `e2e/admin-ai-excel-import.spec.ts` (NEW)
- **Dependencies**: ⚠️ NEEDS test Excel file with product data
- **Test Flow**:
  1. Login as admin
  2. Navigate to import page
  3. Upload Excel file
  4. Wait 15+ seconds for AI column mapping
  5. Verify intelligent field detection
  6. Check data validation
  7. Test import with messy/inconsistent data

#### 4.3 CREATE: Embeddings Generation E2E Test
- **File**: `e2e/admin-embeddings-generation.spec.ts` (NEW)
- **Dependencies**: ✅ Test data exists (products)
- **Test Flow**:
  1. Login as admin
  2. Navigate to embeddings admin
  3. Click "Generate Embeddings for All Products"
  4. Wait 30+ seconds for batch processing
  5. Verify embeddings created in database
  6. Check vector dimensions (768)
  7. Test incremental updates

---

### Phase 5: Execute All Tests & Verify 100% AI Coverage
**Goal**: Run all 16 AI E2E tests and verify production readiness

1. Run full Playwright test suite with all AI tests
2. Verify all tests pass with real Gemini API calls
3. Document AI response times and token usage
4. Create final AI testing report
5. Verify 100% AI feature coverage achieved

---

## 📦 DATA PREPARATION REQUIREMENTS

### Expand seed-test-data.ts
Add comprehensive seed data for:
- ✅ `customer_opportunities` - DONE
- ✅ `pricing_recommendations` - DONE
- ⚠️ `vendor_invoices` - NEEDED
- ⚠️ `purchase_orders` - NEEDED
- ⚠️ `campaigns` - NEEDED
- ⚠️ `campaign_recipients` - NEEDED
- ⚠️ `sku_mappings` - NEEDED
- ⚠️ `product_embeddings` - NEEDED (or generate via API)
- ✅ `customer_purchase_analytics` - Auto-generated from orders

### Create Test Files
Create `apps/web/e2e/fixtures/` directory with:
- `test-invoice.pdf` - Sample vendor invoice
- `test-invoices/` - Folder with 5+ test PDFs
- `test-products.xlsx` - Excel file with product data
- `test-images/` - Folder with product photos (cup, plate, napkin, etc.)

---

## ✅ SUCCESS CRITERIA

1. **All 16 AI integrations have E2E tests** ✅
2. **All tests call real Gemini API** (no mocking) ✅
3. **All tests verify AI response quality** ✅
4. **All tests verify data persistence** ✅
5. **All tests pass consistently** ✅
6. **AI response times documented** ✅
7. **Token usage tracked** ✅
8. **100% AI feature coverage achieved** ✅

---

## 🚀 NEXT STEPS

1. ✅ Add all tasks to task list - DONE
2. ⏭️ Expand seed-test-data.ts with missing data
3. ⏭️ Create test files (PDFs, Excel, images)
4. ⏭️ Start Phase 1: Enhance existing tests
5. ⏭️ Execute Phases 2-4: Create new tests
6. ⏭️ Run all tests and verify 100% passing
7. ⏭️ Document final results

**PRIORITY**: This is now our TOP PRIORITY before any other work.

