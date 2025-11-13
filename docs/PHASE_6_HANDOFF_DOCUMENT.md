# Phase 6 E2E Testing - Handoff Document
**Date:** November 7, 2025  
**Last Push to GitHub:** Commit `8737b518` - November 7, 2025  
**Current Status:** 54/101 tests passing (53.5%), Auth: 12/13 passing (92%)

---

## 🎯 CURRENT SITUATION

### What We Just Completed
✅ **Pushed to GitHub** - All Phase 6 work committed and pushed (272 files changed)
✅ **Auth Flow Fixes** - 12/13 auth tests passing (92% success rate)
✅ **Route Restructuring** - Consolidated admin pages, created (customer) route group
✅ **Component Migration** - Fully migrated to B2B design system
✅ **Database Trigger Fix** - Updated `handle_new_user()` for unique org slugs

### Test Results Summary
- **Overall:** 54 passing, 36 failing, 8 skipped, 3 did not run
- **Auth Tests:** 12/13 passing (only signup test failing)
- **Improvement:** +13 tests fixed in this session

---

## 🔴 CRITICAL ISSUE - SIGNUP TEST FAILURE

### The Problem
**Test:** `Authentication › Signup › should create new account with valid data`  
**Status:** FAILING  
**Error:** "Database error saving new user"

### Root Cause Analysis
The `handle_new_user()` database trigger is failing when creating new test users. The error appears on the register page after form submission.

**What We Know:**
1. ✅ Trigger exists in database and was updated with timestamp suffix for unique slugs
2. ✅ Test uses unique email: `generateTestEmail()` creates `test-{timestamp}-{random}@e2etest.com`
3. ✅ Test fills form with: fullName="Test User", password="NewPassword123!"
4. ❌ Error message: "Database error saving new user" appears on page
5. ❌ Test expects either success message OR redirect to `/chat` within 10 seconds

### Trigger Code (Current)
```sql
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
  existing_org_id UUID;
BEGIN
  existing_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  
  IF existing_org_id IS NOT NULL THEN
    new_org_id := existing_org_id;
  ELSE
    org_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization';
    org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || floor(extract(epoch from now()) * 1000)::text;
    
    INSERT INTO public.organizations (name, slug, type)
    VALUES (org_name, org_slug, 'restaurant')
    RETURNING id INTO new_org_id;
  END IF;
  
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');
  
  INSERT INTO public.profiles (id, email, full_name, current_organization_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', new_org_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Next Steps to Debug
1. **Check Supabase logs** - Look for actual database error in Supabase dashboard
2. **Test trigger manually** - Create test user via Supabase SQL editor to see exact error
3. **Check RLS policies** - Verify trigger has permissions to insert into all tables
4. **Verify schema** - Ensure all columns exist (profiles.full_name, organizations.slug, etc.)
5. **Test with simpler data** - Try creating user without full_name to test fallback logic

### Possible Causes
- RLS policy blocking trigger from inserting into `organizations`, `organization_members`, or `profiles`
- Missing column in one of the tables
- Unique constraint violation (despite timestamp suffix)
- Trigger doesn't have SECURITY DEFINER permissions on all tables
- NULL constraint violation on required fields

---

## 📊 REMAINING TEST FAILURES (36 tests)

### 1. Auth Tests (1 failure) - CRITICAL
- ❌ Signup: Create new account (database trigger error)

### 2. Customer Insights (4 failures) - Missing Embeddings
- ❌ All 4 tests failing: "No product embeddings found"
- **Fix:** Run `/api/admin/embeddings/generate` or seed embeddings

### 3. SKU Mapping (4 failures) - Embeddings & API
- ❌ All 4 tests failing: embedding/API issues
- **Fix:** Generate embeddings, verify API endpoints

### 4. Admin Pricing (4 failures) - NEW FAILURES
- ❌ Navigate to pricing page
- ❌ Filter by status
- ❌ Filter by confidence
- ❌ Sort by win probability
- **Note:** These were working before, broke after route changes

### 5. Campaign Workflow (2 failures) - API Issues
- ❌ Send campaign with AI
- ❌ Magic links
- **Fix:** Verify campaign API endpoints

### 6. Reorder Predictions (2 failures) - API Issues
- ❌ Generate predictions
- ❌ Filter by confidence
- **Fix:** Verify reorder prediction API endpoints

### 7. Public Chatbot (1 failure) - Lead Capture
- ❌ Confirmation after providing lead info
- **Fix:** Check lead capture flow and confirmation message

---

## 🗂️ FILE STRUCTURE (After Restructuring)

### Customer Pages (apps/web/app/(customer)/)
```
(customer)/
├── analytics/page.tsx
├── cart/page.tsx
├── chat/page.tsx
├── checkout/page.tsx
├── invoices/
│   ├── [id]/page.tsx
│   └── page.tsx
├── notifications/page.tsx
├── orders/
│   ├── [id]/page.tsx
│   ├── bulk-upload/page.tsx
│   ├── history/page.tsx
│   └── page.tsx
├── profile/page.tsx
└── settings/
    ├── notifications/page.tsx
    └── page.tsx
```

### Admin Pages (apps/web/app/admin/)
```
admin/
├── analytics/page.tsx
├── approvals/page.tsx
├── campaigns/
│   ├── [id]/page.tsx
│   └── page.tsx
├── crm/contacts/page.tsx
├── customers/
│   ├── [id]/page.tsx
│   └── page.tsx
├── documents/page.tsx
├── features/page.tsx
├── forecasts/page.tsx
├── inventory/page.tsx
├── invoices/
│   ├── bulk-upload/page.tsx
│   └── page.tsx
├── layout.tsx
├── monitoring/page.tsx
├── opportunities/page.tsx
├── page.tsx
├── pricing/
│   ├── page.tsx
│   └── recommendations/page.tsx
├── products/
│   ├── [id]/edit/page.tsx
│   ├── import/page.tsx
│   ├── new/page.tsx
│   └── page.tsx
├── recommendations/page.tsx
├── registrations/page.tsx
├── reports/page.tsx
└── shipping/page.tsx
```

### Auth Pages (apps/web/app/auth/)
```
auth/
├── forgot-password/page.tsx  ← NEW (created in this session)
├── login/page.tsx             ← MODIFIED (added noValidate, data-testid)
└── register/page.tsx          ← MODIFIED (added noValidate, data-testid)
```

---

## 🔧 KEY FIXES APPLIED

### 1. Auth Form Validation
**Problem:** HTML5 `required` attribute prevented custom validation from running  
**Fix:** Added `noValidate` to both login and register forms

**Files Changed:**
- `apps/web/app/auth/login/page.tsx` (line 135)
- `apps/web/app/auth/register/page.tsx` (line 122)

### 2. Forgot Password Page
**Problem:** `/auth/forgot-password` route didn't exist  
**Fix:** Created complete forgot-password page with Supabase integration

**File Created:**
- `apps/web/app/auth/forgot-password/page.tsx` (127 lines)

### 3. Data Test IDs
**Problem:** Tests using unreliable text-based selectors  
**Fix:** Added `data-testid` attributes to all form inputs

**Files Changed:**
- `apps/web/app/auth/register/page.tsx` - Added register-email, register-password, register-confirmPassword, register-fullName
- `apps/web/components/Header.tsx` - Added sign-out-button
- `apps/web/app/auth/forgot-password/page.tsx` - Added email-input

### 4. Test File Updates
**Files Changed:**
- `apps/web/e2e/auth.spec.ts` - Updated all selectors, fixed URLs, improved logout test

---

## 🗄️ DATABASE STATUS

### Recent Trigger Update
```sql
-- Updated handle_new_user() to add timestamp suffix for unique org slugs
-- Applied via Supabase API on November 7, 2025
-- Status: Applied successfully, but signup test still failing
```

### Test Data
- ✅ Customer user: `test@testmail.app` / `customer123`
- ✅ Admin user: `admin@testmail.app` / `admin123`
- ✅ Products seeded (10 products)
- ✅ Orders seeded
- ❌ Product embeddings: MISSING (causing 4+ test failures)
- ❌ Vendor invoices: Limited test data
- ❌ Campaigns: Draft campaign exists but may have issues

---

## 📝 IMPORTANT NOTES

### Password Standards
- **Customer:** `customer123`
- **Admin:** `admin123`
- **New signups:** Minimum 6 characters (enforced in register page)

### Route Standards
- **Customer redirect after login:** `/chat` (NOT `/`)
- **Admin redirect after login:** `/admin` (NOT `/`)
- **Auth pages:** `/auth/login`, `/auth/register`, `/auth/forgot-password`

### Test Selector Standards
- **Prefer:** `data-testid` attributes
- **Avoid:** Text-based selectors like `button:has-text("Sign In")`
- **Why:** More reliable, works with icon-only buttons, survives text changes

---

## 🚀 RECOMMENDED NEXT STEPS (Priority Order)

### CRITICAL (Do First)
1. **Fix signup test database error**
   - Check Supabase logs for actual error
   - Test trigger manually in SQL editor
   - Verify RLS policies allow trigger to insert
   - Consider adding error logging to trigger

2. **Generate product embeddings**
   - Run `/api/admin/embeddings/generate`
   - Will fix 4 semantic search tests
   - Will fix 4 SKU mapping tests

### HIGH PRIORITY
3. **Fix admin pricing route issues**
   - Tests expect `/admin/pricing/recommendations`
   - Verify page exists and loads correctly
   - Check if route change broke something

4. **Fix campaign workflow**
   - Verify draft campaign is visible
   - Check campaign send API endpoints
   - Test magic link generation

### MEDIUM PRIORITY
5. **Fix reorder predictions**
   - Verify API endpoints exist
   - Check prediction generation logic

6. **Fix public chatbot lead capture**
   - Check confirmation message display
   - Verify lead is saved to database

---

## 📚 REFERENCE LINKS

### Key Files
- Test suite: `apps/web/e2e/*.spec.ts`
- Auth pages: `apps/web/app/auth/*.tsx`
- Seed script: `apps/web/scripts/seed-test-data.ts`
- Trigger migration: `supabase/migrations/20251031000003_handle_new_user_trigger.sql`

### Documentation
- `PHASE_6_TESTING_RESULTS.md` - Detailed test results
- `COMPREHENSIVE_AI_E2E_TESTING_PLAN.md` - Original test plan
- `docs/PRODUCT_EMBEDDINGS_GUIDE.md` - Embeddings setup guide

### Supabase Project
- **Project ID:** ksprdklquoskvjqsicvv
- **Region:** us-east-1
- **Project Name:** B2B Plus

---

## ✅ WHAT'S WORKING WELL

- ✅ Auth flow (12/13 tests passing)
- ✅ Route structure (clean separation of customer/admin)
- ✅ Component system (B2B design system fully integrated)
- ✅ Test infrastructure (Playwright configured and running)
- ✅ Database seeding (comprehensive test data)
- ✅ Security (RLS policies, rate limiting, middleware)
- ✅ Performance (caching, indexes, parallel execution)

---

## 🎯 ACTIONABLE TASK LIST FOR NEW WINDOW

### Task 1: Debug Signup Test Failure (CRITICAL)
**Goal:** Fix the "Database error saving new user" issue

**Steps:**
1. Open Supabase dashboard → Logs → Filter for errors during test run
2. Look for trigger errors or constraint violations
3. Test trigger manually:
   ```sql
   -- In Supabase SQL Editor
   SELECT handle_new_user() -- See if it runs without errors
   ```
4. Check RLS policies on `organizations`, `organization_members`, `profiles`
5. Verify trigger has SECURITY DEFINER and proper permissions
6. Add error logging to trigger for better debugging
7. Re-run signup test: `pnpm playwright test e2e/auth.spec.ts --grep "create new account"`

**Success Criteria:** Signup test passes, all 13 auth tests passing

---

### Task 2: Generate Product Embeddings (HIGH PRIORITY)
**Goal:** Fix 8 tests that depend on product embeddings

**Steps:**
1. Navigate to admin embeddings page (or use API directly)
2. Call `/api/admin/embeddings/generate` endpoint
3. Wait for embeddings to generate (may take 30+ seconds for 10 products)
4. Verify embeddings in database:
   ```sql
   SELECT COUNT(*) FROM product_embeddings;
   -- Should return 10 (one per product)
   ```
5. Re-run semantic search tests: `pnpm playwright test e2e/admin-semantic-search.spec.ts`
6. Re-run SKU mapping tests: `pnpm playwright test e2e/admin-sku-mapping.spec.ts`

**Success Criteria:** 8 additional tests passing (semantic search + SKU mapping)

---

### Task 3: Fix Admin Pricing Routes (HIGH PRIORITY)
**Goal:** Fix 4 admin pricing test failures

**Steps:**
1. Verify `/admin/pricing/recommendations` page exists and loads
2. Check if tests are using correct URL
3. Run pricing tests: `pnpm playwright test e2e/admin-pricing.spec.ts`
4. Check test output for specific errors
5. Fix any routing or component issues
6. Verify filters and sorting work correctly

**Success Criteria:** 4 admin pricing tests passing

---

### Task 4: Fix Campaign Workflow (MEDIUM PRIORITY)
**Goal:** Fix 2 campaign workflow test failures

**Steps:**
1. Verify draft campaign exists in database:
   ```sql
   SELECT * FROM email_campaigns WHERE status = 'draft';
   ```
2. Check campaign page renders draft campaigns
3. Verify `/api/admin/campaigns/send` endpoint works
4. Test magic link generation
5. Re-run campaign tests: `pnpm playwright test e2e/admin-campaign-workflow.spec.ts`

**Success Criteria:** 2 campaign tests passing

---

### Task 5: Fix Remaining Tests (MEDIUM PRIORITY)
**Goal:** Fix reorder predictions and public chatbot

**Steps:**
1. **Reorder Predictions:**
   - Verify `/api/admin/reorder-predictions` endpoints exist
   - Check prediction generation logic
   - Run tests: `pnpm playwright test e2e/admin-reorder-predictions.spec.ts`

2. **Public Chatbot:**
   - Check lead capture confirmation message
   - Verify lead is saved to database
   - Run tests: `pnpm playwright test e2e/public-chatbot.spec.ts`

**Success Criteria:** 3 additional tests passing

---

### Task 6: Final Test Run & Documentation
**Goal:** Achieve 95%+ test pass rate and document results

**Steps:**
1. Run full test suite: `pnpm playwright test --reporter=list`
2. Document final results in `PHASE_6_FINAL_RESULTS.md`
3. Create summary of:
   - Total tests passing/failing
   - What was fixed
   - Any remaining known issues
   - Recommendations for production deployment
4. Update README with test status

**Success Criteria:** 95+ tests passing (94%+ pass rate)

---

## 🔍 DEBUGGING TIPS

### Viewing Test Results
```bash
# Run specific test file
pnpm playwright test e2e/auth.spec.ts

# Run specific test
pnpm playwright test e2e/auth.spec.ts --grep "create new account"

# Run with UI mode (helpful for debugging)
pnpm playwright test --ui

# View last test report
pnpm playwright show-report
```

### Checking Database State
```sql
-- Check if user was created
SELECT * FROM auth.users WHERE email LIKE 'test-%@e2etest.com' ORDER BY created_at DESC LIMIT 5;

-- Check if profile was created
SELECT * FROM profiles WHERE email LIKE 'test-%@e2etest.com';

-- Check if organization was created
SELECT * FROM organizations ORDER BY created_at DESC LIMIT 5;

-- Check product embeddings
SELECT COUNT(*) FROM product_embeddings;
```

### Common Issues
1. **Test timeout** - Usually means page didn't load or element not found
2. **"Database error"** - Check Supabase logs for actual error
3. **"Element not found"** - Check if data-testid exists in component
4. **"Navigation failed"** - Check if route exists and page loads

---

## 📦 WHAT'S IN THE LATEST COMMIT

**Commit:** `8737b518` - "feat: Phase 6 E2E testing improvements and auth fixes"

**Major Changes:**
- 272 files changed (55,709 insertions, 8,411 deletions)
- Created comprehensive E2E test suite (101 tests)
- Fixed auth flow (12/13 tests passing)
- Migrated to B2B design system
- Added AI-powered features
- Created admin tools
- Added security middleware
- Performance optimizations
- Comprehensive documentation

**Test Results:**
- Auth: 12/13 passing (92%)
- Overall: 54/101 passing (53.5%)

---

**END OF HANDOFF DOCUMENT**

*This document contains everything needed to continue Phase 6 testing in a fresh development window. Start with Task 1 (Debug Signup Test) as it's the most critical issue.*

